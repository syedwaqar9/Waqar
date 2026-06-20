import { NextRequest, NextResponse } from "next/server";
import { generateFromUpload } from "@/lib/generate/generate";
import type { PostFormat } from "@/lib/types";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const note = String(form.get("note") || "");
    const format: PostFormat = String(form.get("format") || "single") === "carousel" ? "carousel" : "single";
    const file = form.get("file") as File | null;

    let imageBase64: string | undefined;
    let mediaType: string | undefined;
    if (file && typeof file.arrayBuffer === "function" && file.size > 0) {
      const buf = Buffer.from(await file.arrayBuffer());
      imageBase64 = buf.toString("base64");
      mediaType = file.type || "image/png";
    }

    if (!imageBase64 && !note.trim()) {
      return NextResponse.json({ error: "Add a note or upload a file." }, { status: 400 });
    }

    const week = await generateFromUpload({ note, imageBase64, mediaType, format });
    return NextResponse.json({ id: week.id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
