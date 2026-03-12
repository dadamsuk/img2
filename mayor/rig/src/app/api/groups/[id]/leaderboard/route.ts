import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { groupMemberships, users } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId } = await params;

  const memberships = await db.query.groupMemberships.findMany({
    where: eq(groupMemberships.groupId, groupId),
  });

  const leaderboard = [];
  for (const m of memberships) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, m.userId),
    });
    leaderboard.push({
      userId: m.userId,
      displayName: user?.displayName || "Unknown",
      avatarUrl: user?.avatarUrl,
      totalScore: m.totalScore,
      settingScore: m.settingScore,
      guessingScore: m.guessingScore,
    });
  }

  // Sort by total score descending
  leaderboard.sort((a, b) => b.totalScore - a.totalScore);

  return NextResponse.json(leaderboard);
}
