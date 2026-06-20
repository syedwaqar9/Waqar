import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getInstructions, saveInstructions } from "@/lib/store";
import type { ICP, Instruction, PostType } from "@/lib/types";

export async function GET() {
  return NextResponse.json({ instructions: await getInstructions() });
}

export async function POST(req: NextRequest) {
  try {
    const { title, body, postType, icp } = await req.json();
    if (!body || !String(body).trim()) {
      return NextResponse.json({ error: "Rule text is required." }, { status: 400 });
    }
    const list = await getInstructions();
    const item: Instruction = {
      id: nanoid(10),
      title: (title && String(title).trim()) || String(body).slice(0, 40),
      body: String(body).trim(),
      source: "typed",
      postType: (postType as PostType) || undefined,
      icp: (icp as ICP) || undefined,
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
