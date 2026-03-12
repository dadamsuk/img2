import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { puzzles, guessSessions, guesses, users } from "@/lib/schema";
import { eq } from "drizzle-orm";

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

  const sessions = await db.query.guessSessions.findMany({
    where: eq(guessSessions.puzzleId, puzzleId),
  });

  const guessersActivity = [];
  for (const gs of sessions) {
    const guesser = await db.query.users.findFirst({
      where: eq(users.id, gs.guesserId),
    });

    const sessionGuesses = await db.query.guesses.findMany({
      where: eq(guesses.sessionId, gs.id),
    });

    guessersActivity.push({
      guesserId: gs.guesserId,
      guesserName: guesser?.displayName || "Unknown",
      status: gs.status,
      revealsUsed: gs.revealsUsed,
      score: gs.score,
      setterScore: gs.setterScore,
      guesses: sessionGuesses.map((g) => ({
        field: g.field,
        value: g.value,
        isCorrect: g.isCorrect,
        pointsAwarded: g.pointsAwarded,
      })),
    });
  }

  return NextResponse.json({
    puzzleId: puzzle.id,
    turnDate: puzzle.turnDate,
    totalPoints: puzzle.totalPoints,
    guessers: guessersActivity,
  });
}
