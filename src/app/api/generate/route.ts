import { after, NextResponse } from "next/server";
import { startWeek, runWeek } from "@/lib/generate/generate";

export const maxDuration = 300;

export async function POST() {
  try {
    const week = await startWeek();
    // Run the slow generation after the response is sent, so it keeps going no
    // matter where the user navigates next.
    after(async () => {
      try {
        await runWeek(week.id);
      } catch {
        // runWeek records failures on the week itself
      }
    });
    return NextResponse.json({ id: week.id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
