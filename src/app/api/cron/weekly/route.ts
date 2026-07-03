import { NextRequest, NextResponse } from "next/server";
import { generateWeek } from "@/lib/generate/generate";

export const maxDuration = 300;

// Saturday cron. Protected by CRON_SECRET when set (Vercel Cron sends it as a
// bearer token). Generates the upcoming week and pings Jaya to review.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  try {
    // generateWeek notifies Jaya on Slack itself once the content is ready.
    const week = await generateWeek();
    return NextResponse.json({ id: week.id, status: week.status });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
