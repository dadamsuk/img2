import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { puzzles, users } from "@/lib/schema";
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

  const groupPuzzles = await db.query.puzzles.findMany({
    where: eq(puzzles.groupId, groupId),
  });

  const result = [];
  for (const p of groupPuzzles) {
    const setter = await db.query.users.findFirst({
      where: eq(users.id, p.setterId),
    });
    result.push({
      id: p.id,
      turnDate: p.turnDate,
      setterId: p.setterId,
      setterName: setter?.displayName || "Unknown",
    });
  }

  return NextResponse.json(result);
}
