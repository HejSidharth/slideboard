import { readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const LIBRARY_DIR = path.join(
  process.cwd(),
  "public",
  "excalidraw-libraries",
);

export async function GET() {
  try {
    const entries = await readdir(LIBRARY_DIR, { withFileTypes: true });
    const libraries = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".excalidrawlib"))
      .map((entry) => `/excalidraw-libraries/${encodeURIComponent(entry.name)}`)
      .sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ libraries });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      return NextResponse.json({ libraries: [] });
    }

    return NextResponse.json({ libraries: [] }, { status: 500 });
  }
}
