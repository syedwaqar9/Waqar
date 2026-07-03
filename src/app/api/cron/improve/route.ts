import { NextRequest, NextResponse } from "next/server";
import { improvementLoop } from "@/lib/generate/generate";
import { notifyReport } from "@/lib/slack";

export const maxDuration = 120;

// Weekly improvement loop (Sunday). Audits recent output, proposes rules, and
// sends Waqar the report on Slack.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  try {
    const { report, proposed } = await improvementLoop();
    await notifyReport(
      `Sunnyvale improvement loop:\n${report}\n${
        proposed
          ? `${proposed} proposed rule${proposed > 1 ? "s" : ""} await your enable in Instructions.`
          : "No new rules proposed this week."
      }`,
    );
    return NextResponse.json({ ok: true, proposed });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
