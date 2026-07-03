import { after, NextRequest, NextResponse } from "next/server";
import { getPost, saveWeek } from "@/lib/store";
import { learnFromFeedback, revisePost } from "@/lib/generate/generate";

export const maxDuration = 120;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const { weekId, note, by } = await req.json();
    if (!note || !weekId) {
      return NextResponse.json({ error: "weekId and note are required." }, { status: 400 });
    }
    const found = await getPost(weekId, id);
    if (!found) return NextResponse.json({ error: "Post not found." }, { status: 404 });

    const author = by === "waqar" ? "waqar" : "jaya";
    const revised = await revisePost(found.post, String(note), author);
    const idx = found.week.posts.findIndex((p) => p.id === id);
    found.week.posts[idx] = revised;
    // Only Jaya's requests flip the week's review state; Waqar's own edits
    // (hook swaps, tweaks) do not signal pending founder feedback.
    if (author === "jaya") found.week.status = "changes_requested";
    await saveWeek(found.week);
    // Learn from the feedback after responding: durable preferences become
    // permanent rules in Instructions and shape all future content.
    const postForLearning = revised;
    after(async () => {
      await learnFromFeedback(String(note), postForLearning, author);
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
