import { NextRequest, NextResponse } from "next/server";
import { getKnowledge, saveKnowledge } from "@/lib/store";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { enabled } = await req.json();
  const list = await getKnowledge();
  const item = list.find((e) => e.id === id);
  if (item && typeof enabled === "boolean") item.enabled = enabled;
  await saveKnowledge(list);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const list = await getKnowledge();
  await saveKnowledge(list.filter((e) => e.id !== id));
  return NextResponse.json({ ok: true });
}
