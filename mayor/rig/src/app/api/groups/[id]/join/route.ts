import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { groups, groupMemberships } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { inviteCode } = await req.json();
  const { id: groupId } = await params;

  const group = await db.query.groups.findFirst({
    where: and(eq(groups.id, groupId), eq(groups.inviteCode, inviteCode)),
  });

  if (!group) {
    return NextResponse.json({ error: "Invalid group or invite code" }, { status: 404 });
  }

  const existing = await db.query.groupMemberships.findFirst({
    where: and(
      eq(groupMemberships.groupId, groupId),
      eq(groupMemberships.userId, session.user.id)
    ),
  });

  if (existing) {
    return NextResponse.json({ error: "Already a member" }, { status: 409 });
  }

  await db.insert(groupMemberships).values({
    id: uuid(),
    groupId,
    userId: session.user.id,
  });

  return NextResponse.json({ success: true, groupName: group.name });
}
