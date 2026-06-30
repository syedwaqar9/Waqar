import { NextRequest, NextResponse } from "next/server";
import { regeneratePost } from "@/lib/generate/generate";

export const maxDuration = 120;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { weekId } = await req.json();
    const post = await regeneratePost(weekId, id);
    if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
