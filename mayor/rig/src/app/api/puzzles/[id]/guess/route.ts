import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { puzzles, guessSessions, guesses, groupMemberships } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { evaluateAnswer } from "@/lib/llm";
import { currentPointsPerField } from "@/lib/scoring";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: puzzleId } = await params;
  const body = await req.json();
  const { answers } = body as { answers: Record<string, string> };

  if (!answers || Object.keys(answers).length === 0) {
    return NextResponse.json({ error: "No answers provided" }, { status: 400 });
  }

  const puzzle = await db.query.puzzles.findFirst({
    where: eq(puzzles.id, puzzleId),
  });

  if (!puzzle) {
    return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
  }

  const guessSession = await db.query.guessSessions.findFirst({
    where: and(
      eq(guessSessions.puzzleId, puzzleId),
      eq(guessSessions.guesserId, session.user.id)
    ),
  });

  if (!guessSession || guessSession.status !== "active") {
    return NextResponse.json({ error: "No active session" }, { status: 400 });
  }

  const activeFields: string[] = [];
  const setterAnswers: Record<string, string> = {};
  if (puzzle.answerWhat !== null) { activeFields.push("what"); setterAnswers.what = puzzle.answerWhat; }
  if (puzzle.answerWho !== null) { activeFields.push("who"); setterAnswers.who = puzzle.answerWho; }
  if (puzzle.answerWhere !== null) { activeFields.push("where"); setterAnswers.where = puzzle.answerWhere; }
  if (puzzle.answerWhen !== null) { activeFields.push("when"); setterAnswers.when = puzzle.answerWhen; }

  // Get already correct fields
  const prevGuesses = await db.query.guesses.findMany({
    where: eq(guesses.sessionId, guessSession.id),
  });
  const alreadyCorrect = new Set<string>(prevGuesses.filter((g) => g.isCorrect).map((g) => g.field));

  const ppf = currentPointsPerField(
    puzzle.totalPoints,
    guessSession.revealsUsed,
    activeFields.length
  );

  const results: Array<{
    field: string;
    value: string;
    isCorrect: boolean;
    pointsAwarded: number;
    reasoning: string;
  }> = [];

  let newScore = guessSession.score;

  for (const [field, value] of Object.entries(answers)) {
    if (!activeFields.includes(field) || alreadyCorrect.has(field)) continue;

    const setterAnswer = setterAnswers[field];
    if (!setterAnswer) continue;

    // Evaluate with LLM
    let evalResult;
    try {
      evalResult = await evaluateAnswer(field, setterAnswer, value);
    } catch {
      // Fallback to exact match if LLM fails
      evalResult = {
        match: value.toLowerCase().trim() === setterAnswer.toLowerCase().trim(),
        reasoning: "Exact match comparison (LLM unavailable)",
      };
    }

    const pointsAwarded = evalResult.match ? ppf : 0;
    newScore += pointsAwarded;

    await db.insert(guesses).values({
      id: uuid(),
      sessionId: guessSession.id,
      field: field as "what" | "who" | "where" | "when",
      value,
      revealLevel: guessSession.revealsUsed,
      isCorrect: evalResult.match,
      pointsAwarded,
      llmReasoning: evalResult.reasoning,
    });

    results.push({
      field,
      value,
      isCorrect: evalResult.match,
      pointsAwarded,
      reasoning: evalResult.reasoning,
    });
  }

  // Update session score
  await db
    .update(guessSessions)
    .set({ score: newScore })
    .where(eq(guessSessions.id, guessSession.id));

  // Check if all fields correct → complete
  const allGuesses = await db.query.guesses.findMany({
    where: eq(guesses.sessionId, guessSession.id),
  });
  const correctFields = new Set<string>(allGuesses.filter((g) => g.isCorrect).map((g) => g.field));
  const allCorrect = activeFields.every((f) => correctFields.has(f));

  if (allCorrect) {
    const setterScore = puzzle.totalPoints - newScore;
    await db
      .update(guessSessions)
      .set({
        status: "completed",
        setterScore: Math.max(setterScore, 0),
        completedAt: new Date(),
      })
      .where(eq(guessSessions.id, guessSession.id));

    // Update leaderboard scores
    const guesserMembership = await db.query.groupMemberships.findFirst({
      where: and(
        eq(groupMemberships.groupId, puzzle.groupId),
        eq(groupMemberships.userId, session.user.id)
      ),
    });
    if (guesserMembership) {
      await db
        .update(groupMemberships)
        .set({
          totalScore: guesserMembership.totalScore + newScore,
          guessingScore: guesserMembership.guessingScore + newScore,
        })
        .where(eq(groupMemberships.id, guesserMembership.id));
    }

    const setterMembership = await db.query.groupMemberships.findFirst({
      where: and(
        eq(groupMemberships.groupId, puzzle.groupId),
        eq(groupMemberships.userId, puzzle.setterId)
      ),
    });
    if (setterMembership) {
      await db
        .update(groupMemberships)
        .set({
          totalScore: setterMembership.totalScore + Math.max(setterScore, 0),
          settingScore: setterMembership.settingScore + Math.max(setterScore, 0),
        })
        .where(eq(groupMemberships.id, setterMembership.id));
    }
  }

  return NextResponse.json({
    results,
    sessionScore: newScore,
    allCorrect,
    status: allCorrect ? "completed" : "active",
  });
}
