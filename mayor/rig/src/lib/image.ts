import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_WIDTH = 2000;
const THUMB_WIDTH = 400;

export interface ProcessedImage {
  url: string;
  thumbnailUrl: string;
  exifData: ExifData;
}

export interface ExifData {
  dateTaken?: string;
  gpsLat?: number;
  gpsLon?: number;
  location?: string;
}

export async function processImage(
  buffer: Buffer,
  groupId: string,
  puzzleId: string,
  filename: string
): Promise<ProcessedImage> {
  const dir = path.join(UPLOAD_DIR, groupId, puzzleId);
  await fs.mkdir(dir, { recursive: true });

  // Extract EXIF before stripping
  const exifData = await extractExif(buffer);

  const baseName = path.parse(filename).name;

  // Process main image
  const mainPath = path.join(dir, `${baseName}.webp`);
  await sharp(buffer)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(mainPath);

  // Generate thumbnail
  const thumbPath = path.join(dir, `${baseName}_thumb.webp`);
  await sharp(buffer)
    .resize({ width: THUMB_WIDTH })
    .webp({ quality: 75 })
    .toFile(thumbPath);

  const urlBase = `/uploads/${groupId}/${puzzleId}`;
  return {
    url: `${urlBase}/${baseName}.webp`,
    thumbnailUrl: `${urlBase}/${baseName}_thumb.webp`,
    exifData,
  };
}

async function extractExif(buffer: Buffer): Promise<ExifData> {
  try {
    const metadata = await sharp(buffer).metadata();
    const result: ExifData = {};

    if (metadata.exif) {
      // Sharp provides basic EXIF; for full GPS we parse the raw buffer
      // For now, extract what sharp gives us
      const { exif } = metadata;
      if (exif) {
        // Try to extract date from EXIF
        const exifStr = exif.toString("ascii");
        const dateMatch = exifStr.match(/(\d{4}):(\d{2}):(\d{2})/);
        if (dateMatch) {
          result.dateTaken = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
        }
      }
    }

    return result;
  } catch {
    return {};
  }
}

export async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}
