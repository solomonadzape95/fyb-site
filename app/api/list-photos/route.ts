import { NextRequest, NextResponse } from "next/server";
import { readdir } from "fs/promises";
import { join } from "path";
import { verifyAdmin } from "@/lib/admin-auth";
import { isImageFile } from "@/lib/photo-match";

export const runtime = "nodejs";

function getPhotoDir(): string {
  // fyb-images lives next to the fyb-site folder.
  return join(process.cwd(), "..", "fyb-images");
}

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const entries = await readdir(getPhotoDir());
    const files = entries.filter(isImageFile).sort();
    return NextResponse.json({ files });
  } catch (err) {
    console.error("list-photos error:", err);
    return NextResponse.json({ files: [], error: "photo folder not readable" });
  }
}
