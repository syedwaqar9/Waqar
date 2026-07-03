"use client";

import { useState } from "react";

type State = "idle" | "busy" | "sent" | "noconfig" | "failed";

export default function TestSlack() {
  const [state, setState] = useState<State>("idle");

  async function run() {
    setState("busy");
    try {
      const res = await fetch("/api/slack/test", { method: "POST" });
      const data = await res.json();
      setState(!data.configured ? "noconfig" : data.sent ? "sent" : "failed");
    } catch {
      setState("failed");
    }
  }

  const label =
    state === "busy"
      ? "Sending…"
      : state === "sent"
        ? "Sent ✓ check Slack"
        : state === "noconfig"
          ? "Slack not configured"
          : state === "failed"
            ? "Failed, check webhook"
            : "Test Slack";

  return (
    <button className="btn btn-ghost btn-sm" onClick={run} disabled={state === "busy"}>
      {label}
    </button>
  );
}
