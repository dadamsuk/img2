import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { puzzles, groupMemberships } from "@/lib/schema";
import { v4 as uuid } from "uuid";
import { and, eq } from "drizzle-orm";
import { calculateTotalPoints } from "@/lib/scoring";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    groupId,
    subjectPhotoUrl,
    subPortions,
    cluePhotoUrls,
    answerWhat,
    answerWho,
    answerWhere,
    answerWhen,
    textClues,
  } = body;

  if (!groupId || !subjectPhotoUrl) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify membership
  const membership = await db.query.groupMemberships.findFirst({
    where: and(
      eq(groupMemberships.groupId, groupId),
      eq(groupMemberships.userId, session.user.id)
    ),
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a group member" }, { status: 403 });
  }

  // Count total reveals available
  const subPortionCount = Array.isArray(subPortions) ? subPortions.length : 0;
  const cluePhotoCount = Array.isArray(cluePhotoUrls) ? cluePhotoUrls.length : 0;
  const textClueCount = Array.isArray(textClues) ? textClues.length : 0;
  const totalReveals = subPortionCount + cluePhotoCount + textClueCount;
  const totalPoints = calculateTotalPoints(totalReveals);

  const id = uuid();
  const turnDate = new Date().toISOString().split("T")[0];

  await db.insert(puzzles).values({
    id,
    groupId,
    setterId: session.user.id,
    turnDate,
    subjectPhotoUrl,
    subPortions: JSON.stringify(subPortions || []),
    cluePhotoUrls: JSON.stringify(cluePhotoUrls || []),
    answerWhat: answerWhat || null,
    answerWho: answerWho || null,
    answerWhere: answerWhere || null,
    answerWhen: answerWhen || null,
    textClues: JSON.stringify(textClues || []),
    totalPoints,
  });

  return NextResponse.json({ id, totalPoints }, { status: 201 });
}
