import { NextRequest, NextResponse } from "next/server";
import { getWeek, saveWeek } from "@/lib/store";
import { notifyApproved } from "@/lib/slack";

// Approve every remaining post in the week in one action.
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  let by = "waqar";
  try {
    const body = await req.json();
    if (body?.by === "jaya") by = "jaya";
  } catch {
    // no body sent
  }
  const week = await getWeek(id);
  if (!week) return NextResponse.json({ error: "Week not found." }, { status: 404 });

  const wasApproved = week.status === "approved";
  const at = new Date().toISOString();
  for (const p of week.posts) {
    if (p.status !== "approved") {
      p.status = "approved";
      p.history.push({ at, source: by as "jaya" | "waqar", action: "approved" });
    }
  }
  week.status = "approved";
  await saveWeek(week);
  if (!wasApproved) await notifyApproved(week);
  return NextResponse.json({ ok: true });
}
