import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getInstructions, saveInstructions } from "@/lib/store";
import { extractInstruction } from "@/lib/generate/generate";
import type { ICP, Instruction, PostType } from "@/lib/types";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const kind = String(form.get("kind") || "") as "file" | "link" | "example";
    const url = String(form.get("url") || "");
    const text = String(form.get("text") || "");
    const postType = (String(form.get("postType") || "") || undefined) as PostType | undefined;
    const icp = (String(form.get("icp") || "") || undefined) as ICP | undefined;
    const file = form.get("file") as File | null;

    let imageBase64: string | undefined;
    let mediaType: string | undefined;
    if (file && typeof file.arrayBuffer === "function" && file.size > 0) {
      imageBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
      mediaType = file.type || "application/octet-stream";
    }

    if (kind === "link" && !url) return NextResponse.json({ error: "A URL is required." }, { status: 400 });
    if (kind === "example" && !text) return NextResponse.json({ error: "Paste the example post." }, { status: 400 });
    if (kind === "file" && !imageBase64 && !text)
      return NextResponse.json({ error: "Attach a file." }, { status: 400 });

    const { title, body } = await extractInstruction({ kind, url, text, imageBase64, mediaType });
    if (!body) return NextResponse.json({ error: "Could not extract a rule from that." }, { status: 422 });

    const list = await getInstructions();
    const item: Instruction = {
      id: nanoid(10),
      title,
      body,
      source: kind,
      postType,
      icp,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    list.unshift(item);
    await saveInstructions(list);
    return NextResponse.json({ ok: true, instruction: item });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
