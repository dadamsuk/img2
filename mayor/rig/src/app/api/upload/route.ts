import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { processImage, ensureUploadDir, getMaxUploadBytes } from "@/lib/image";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureUploadDir();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const groupId = formData.get("groupId") as string;
  const puzzleId = formData.get("puzzleId") as string;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!groupId || !puzzleId) {
    return NextResponse.json({ error: "groupId and puzzleId required" }, { status: 400 });
  }

  const maxBytes = getMaxUploadBytes();
  if (file.size > maxBytes) {
    const maxMB = (maxBytes / (1024 * 1024)).toFixed(0);
    return NextResponse.json(
      { error: `File too large. Maximum size is ${maxMB}MB` },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await processImage(buffer, groupId, puzzleId, file.name);

  return NextResponse.json(result, { status: 201 });
}
