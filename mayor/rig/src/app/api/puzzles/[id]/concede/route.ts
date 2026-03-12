import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { puzzles, guessSessions, guesses, groupMemberships } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: puzzleId } = await params;

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

  // Calculate final scores — guesser keeps what they earned, setter gets the rest
  const guesserScore = guessSession.score;
  const setterScore = puzzle.totalPoints - guesserScore;

  await db
    .update(guessSessions)
    .set({
      status: "conceded",
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
        totalScore: guesserMembership.totalScore + guesserScore,
        guessingScore: guesserMembership.guessingScore + guesserScore,
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

  return NextResponse.json({
    status: "conceded",
    guesserScore,
    setterScore: Math.max(setterScore, 0),
    answers: {
      what: puzzle.answerWhat,
      who: puzzle.answerWho,
      where: puzzle.answerWhere,
      when: puzzle.answerWhen,
    },
    subjectPhotoUrl: puzzle.subjectPhotoUrl,
  });
}
