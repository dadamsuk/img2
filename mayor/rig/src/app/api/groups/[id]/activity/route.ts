import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { puzzles, guessSessions, guesses, users } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId } = await params;

  // Get puzzles set by current user in this group
  const userPuzzles = await db.query.puzzles.findMany({
    where: and(
      eq(puzzles.groupId, groupId),
      eq(puzzles.setterId, session.user.id)
    ),
  });

  const activity = [];

  for (const puzzle of userPuzzles) {
    const sessions = await db.query.guessSessions.findMany({
      where: eq(guessSessions.puzzleId, puzzle.id),
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

    activity.push({
      puzzleId: puzzle.id,
      turnDate: puzzle.turnDate,
      totalPoints: puzzle.totalPoints,
      guessers: guessersActivity,
    });
  }

  return NextResponse.json(activity);
}
