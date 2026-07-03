import { NextResponse } from "next/server";
import { sendTestMessage, slackConfigured } from "@/lib/slack";

export async function POST() {
  if (!slackConfigured()) {
    return NextResponse.json({ configured: false, sent: false });
  }
  const sent = await sendTestMessage();
  return NextResponse.json({ configured: true, sent });
}
