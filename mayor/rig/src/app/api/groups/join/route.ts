import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { groups, groupMemberships } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { inviteCode } = await req.json();
  if (!inviteCode) {
    return NextResponse.json({ error: "Invite code required" }, { status: 400 });
  }

  const group = await db.query.groups.findFirst({
    where: eq(groups.inviteCode, inviteCode.toUpperCase()),
  });

  if (!group) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  const existing = await db.query.groupMemberships.findFirst({
    where: and(
      eq(groupMemberships.groupId, group.id),
      eq(groupMemberships.userId, session.user.id)
    ),
  });

  if (existing) {
    return NextResponse.json({ error: "Already a member", groupId: group.id }, { status: 409 });
  }

  await db.insert(groupMemberships).values({
    id: uuid(),
    groupId: group.id,
    userId: session.user.id,
  });

  return NextResponse.json({ success: true, groupId: group.id, groupName: group.name });
}
