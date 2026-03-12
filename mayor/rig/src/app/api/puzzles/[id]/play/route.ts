import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { puzzles, guessSessions, guesses, users } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { currentPointsPerField } from "@/lib/scoring";

export async function GET(
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

  // Get or create guess session
  let guessSession = await db.query.guessSessions.findFirst({
    where: and(
      eq(guessSessions.puzzleId, puzzleId),
      eq(guessSessions.guesserId, session.user.id)
    ),
  });

  if (!guessSession) {
    const sessionId = uuid();
    await db.insert(guessSessions).values({
      id: sessionId,
      puzzleId,
      guesserId: session.user.id,
    });
    guessSession = await db.query.guessSessions.findFirst({
      where: eq(guessSessions.id, sessionId),
    });
  }

  // Get setter info
  const setter = await db.query.users.findFirst({
    where: eq(users.id, puzzle.setterId),
  });

  // Get previous guesses for this session
  const previousGuesses = guessSession
    ? await db.query.guesses.findMany({
        where: eq(guesses.sessionId, guessSession.id),
      })
    : [];

  // Determine which fields are active (non-N/A)
  const activeFields: string[] = [];
  if (puzzle.answerWhat !== null) activeFields.push("what");
  if (puzzle.answerWho !== null) activeFields.push("who");
  if (puzzle.answerWhere !== null) activeFields.push("where");
  if (puzzle.answerWhen !== null) activeFields.push("when");

  // Build revealed items based on reveal history
  const revealHistory = JSON.parse(guessSession?.revealHistory || "[]");
  const subPortions = JSON.parse(puzzle.subPortions);
  const cluePhotoUrls = JSON.parse(puzzle.cluePhotoUrls);
  const textClues = JSON.parse(puzzle.textClues);

  const revealed = {
    subPortions: [] as typeof subPortions,
    cluePhotos: [] as string[],
    textClues: [] as string[],
  };

  for (const reveal of revealHistory) {
    if (reveal.type === "sub_portion" && subPortions[reveal.index]) {
      revealed.subPortions.push(subPortions[reveal.index]);
    } else if (reveal.type === "clue_photo" && cluePhotoUrls[reveal.index]) {
      revealed.cluePhotos.push(cluePhotoUrls[reveal.index]);
    } else if (reveal.type === "text_clue" && textClues[reveal.index]) {
      revealed.textClues.push(textClues[reveal.index]);
    }
  }

  // Compute available reveals
  const revealedSubCount = revealed.subPortions.length;
  const revealedCluePhotoCount = revealed.cluePhotos.length;
  const revealedTextClueCount = revealed.textClues.length;

  const availableReveals = {
    subPortions: subPortions.length - revealedSubCount,
    cluePhotos: cluePhotoUrls.length - revealedCluePhotoCount,
    textClues: textClues.length - revealedTextClueCount,
  };

  // Correct fields (already guessed correctly)
  const correctFields: Record<string, boolean> = {};
  for (const g of previousGuesses) {
    if (g.isCorrect) correctFields[g.field] = true;
  }

  const ppf = currentPointsPerField(
    puzzle.totalPoints,
    guessSession?.revealsUsed || 0,
    activeFields.length
  );

  return NextResponse.json({
    puzzle: {
      id: puzzle.id,
      subjectPhotoUrl: puzzle.subjectPhotoUrl,
      turnDate: puzzle.turnDate,
      totalPoints: puzzle.totalPoints,
      setterName: setter?.displayName || "Unknown",
    },
    session: {
      id: guessSession!.id,
      status: guessSession!.status,
      revealsUsed: guessSession!.revealsUsed,
      score: guessSession!.score,
    },
    activeFields,
    correctFields,
    revealed,
    availableReveals,
    pointsPerField: ppf,
    previousGuesses: previousGuesses.map((g) => ({
      field: g.field,
      value: g.value,
      isCorrect: g.isCorrect,
      pointsAwarded: g.pointsAwarded,
      reasoning: g.llmReasoning,
    })),
  });
}
