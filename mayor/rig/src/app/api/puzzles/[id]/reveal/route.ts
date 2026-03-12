import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { puzzles, guessSessions } from "@/lib/schema";
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
  const { type } = await req.json(); // "sub_portion" | "clue_photo" | "text_clue"

  if (!["sub_portion", "clue_photo", "text_clue"].includes(type)) {
    return NextResponse.json({ error: "Invalid reveal type" }, { status: 400 });
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

  const revealHistory = JSON.parse(guessSession.revealHistory);
  const subPortions = JSON.parse(puzzle.subPortions);
  const cluePhotoUrls = JSON.parse(puzzle.cluePhotoUrls);
  const textClues = JSON.parse(puzzle.textClues);

  // Find next index for this type
  const typeReveals = revealHistory.filter((r: { type: string }) => r.type === type);
  let maxItems = 0;
  if (type === "sub_portion") maxItems = subPortions.length;
  else if (type === "clue_photo") maxItems = cluePhotoUrls.length;
  else if (type === "text_clue") maxItems = textClues.length;

  const nextIndex = typeReveals.length;
  if (nextIndex >= maxItems) {
    return NextResponse.json({ error: "No more reveals of this type" }, { status: 400 });
  }

  revealHistory.push({ type, index: nextIndex });

  await db
    .update(guessSessions)
    .set({
      revealsUsed: guessSession.revealsUsed + 1,
      revealHistory: JSON.stringify(revealHistory),
    })
    .where(eq(guessSessions.id, guessSession.id));

  // Return the revealed item
  let revealedItem;
  if (type === "sub_portion") revealedItem = subPortions[nextIndex];
  else if (type === "clue_photo") revealedItem = cluePhotoUrls[nextIndex];
  else revealedItem = textClues[nextIndex];

  return NextResponse.json({
    type,
    index: nextIndex,
    item: revealedItem,
    revealsUsed: guessSession.revealsUsed + 1,
  });
}
