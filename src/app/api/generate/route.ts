import { NextResponse } from "next/server";
import { generateWeek } from "@/lib/generate/generate";

export const maxDuration = 300;

export async function POST() {
  try {
    const week = await generateWeek();
    return NextResponse.json({ id: week.id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
