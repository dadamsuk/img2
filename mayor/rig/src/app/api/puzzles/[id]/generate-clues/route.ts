import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateClues } from "@/lib/llm";
import fs from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { imageUrl } = await req.json();

  if (!imageUrl) {
    return NextResponse.json({ error: "Image URL required" }, { status: 400 });
  }

  try {
    // Read the image from the public directory
    const imagePath = path.join(process.cwd(), "public", imageUrl);
    const imageBuffer = await fs.readFile(imagePath);
    const base64 = imageBuffer.toString("base64");

    // Determine MIME type from extension
    const ext = path.extname(imageUrl).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
    };
    const mimeType = mimeMap[ext] || "image/webp";

    const clues = await generateClues(base64, mimeType);

    return NextResponse.json({ clues });
  } catch (error) {
    console.error("Clue generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate clues" },
      { status: 500 }
    );
  }
}
