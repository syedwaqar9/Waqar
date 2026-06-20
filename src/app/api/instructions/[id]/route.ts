import { NextRequest, NextResponse } from "next/server";
import { getInstructions, saveInstructions } from "@/lib/store";

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const list = await getInstructions();
  await saveInstructions(list.filter((i) => i.id !== id));
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { enabled } = await req.json();
  const list = await getInstructions();
  const item = list.find((i) => i.id === id);
  if (item && typeof enabled === "boolean") item.enabled = enabled;
  await saveInstructions(list);
  return NextResponse.json({ ok: true });
}
