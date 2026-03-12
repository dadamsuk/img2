import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { groups, groupMemberships } from "@/lib/schema";
import { v4 as uuid } from "uuid";
import { eq } from "drizzle-orm";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, turnDeadlineHour } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "Group name required" }, { status: 400 });
  }

  const groupId = uuid();
  const inviteCode = generateInviteCode();

  await db.insert(groups).values({
    id: groupId,
    name,
    inviteCode,
    turnDeadlineHour: turnDeadlineHour ?? 20,
    createdBy: session.user.id,
  });

  // Auto-add creator as member
  await db.insert(groupMemberships).values({
    id: uuid(),
    groupId,
    userId: session.user.id,
  });

  return NextResponse.json({ id: groupId, name, inviteCode }, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await db.query.groupMemberships.findMany({
    where: eq(groupMemberships.userId, session.user.id),
  });

  const groupIds = memberships.map((m) => m.groupId);
  if (groupIds.length === 0) {
    return NextResponse.json([]);
  }

  const userGroups = [];
  for (const gid of groupIds) {
    const group = await db.query.groups.findFirst({
      where: eq(groups.id, gid),
    });
    if (group) {
      const members = await db.query.groupMemberships.findMany({
        where: eq(groupMemberships.groupId, gid),
      });
      userGroups.push({ ...group, memberCount: members.length });
    }
  }

  return NextResponse.json(userGroups);
}
