import Link from "next/link";
import { deleteWeek, listWeeks } from "@/lib/store";
import GenerateButton from "@/components/GenerateButton";
import InboxShowcase from "@/components/InboxShowcase";
import TestSlack from "@/components/TestSlack";
import PastWeeks from "@/components/PastWeeks";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  regulation_alert: "Regulation Alert",
  framework_translation: "Framework Translation",
  evidence_explainer: "Evidence Explainer",
  founder_moment: "Founder Moment",
  sector_focus: "Sector Focus",
};

function shortDate(iso: string): string {
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function when(at: string): string {
  try {
    return new Date(at).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function lintSummary(week: Awaited<ReturnType<typeof listWeeks>>[number]) {
  let errors = 0;
  let warns = 0;
  for (const p of week.posts) {
    for (const i of p.lint?.issues || []) {
      if (i.level === "error") errors++;
      else warns++;
    }
  }
  return { errors, warns };
}

export default async function Home() {
  const all = await listWeeks();
  // Garbage-collect ghost weeks: stuck "generating" with zero posts for over
  // 45 minutes (leftovers from interrupted runs). They never become content.
  const STALE_MS = 45 * 60 * 1000;
  const ghosts = all.filter(
    (w) =>
      w.status === "generating" &&
      w.posts.length === 0 &&
      Date.now() - new Date(w.createdAt).getTime() > STALE_MS,
  );
  for (const g of ghosts) {
    try {
      await deleteWeek(g.id);
    } catch {
      // best effort
    }
  }
  const ghostIds = new Set(ghosts.map((g) => g.id));
  const weeks = all.filter((w) => !ghostIds.has(w.id));
  const current = weeks[0];
  const past = weeks.slice(1);

  // Activity feed: every review action, in the product instead of Slack.
  const activity = weeks
    .flatMap((w) =>
      w.posts.flatMap((p) =>
        p.history
          .filter((h) => h.source !== "system" && (h.action === "approved" || h.note))
          .map((h) => ({
            at: h.at,
            actor: h.source === "jaya" ? "Jaya" : "Waqar",
            kind: h.action === "approved" ? ("approved" as const) : ("changes" as const),
            note: h.note,
            day: p.day,
            topic: p.topic,
            weekId: w.id,
            postId: p.id,
          })),
      ),
    )
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  return (
    <>
      <div className="topbar">
        <h1>Inbox</h1>
        <div className="row">
          <TestSlack />
          <Link href="/create" className="btn btn-ghost">
            Create from upload
          </Link>
          <GenerateButton />
        </div>
      </div>
      <div className="main-pad">
        {weeks.length === 0 ? (
          <div className="empty">
            <InboxShowcase />
            <p style={{ fontSize: 15, color: "var(--text)" }}>No weeks yet.</p>
            <p>Click Generate next week to research the latest AI-regulation news and draft five posts.</p>
          </div>
        ) : (
          <>
            {/* The upcoming week, front and center: per-post approval state and feedback. */}
            <div className="hero">
              <div className="hero-head">
                <div>
                  <div className="hero-title">
                    {current.label}
                    {/* Week ranges describe the Mon-Fri publishing schedule, which
                        only applies to generated weeks, not ad-hoc uploads. */}
                    {current.source === "auto" &&
                      current.posts.length > 0 &&
                      ` · Mon ${shortDate(current.startDate)} to Fri ${shortDate(
                        current.posts[current.posts.length - 1]?.date || current.startDate,
                      )}`}
                  </div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                    {current.posts.filter((p) => p.status === "approved").length} approved ·{" "}
                    {current.posts.filter((p) => p.status === "changes_requested").length} changes requested ·{" "}
                    {current.posts.filter((p) => p.status !== "approved" && p.status !== "changes_requested").length}{" "}
                    awaiting review
                    {current.source === "auto" &&
                      new Date(current.startDate).getTime() + 5 * 86400000 < Date.now() &&
                      " · these dates have passed, generate next week"}
                  </div>
                </div>
                <div className="row">
                  <span className={`chip s-${current.status}`}>{current.status.replace("_", " ")}</span>
                  <Link href={`/week/${current.id}`} className="btn btn-sm">
                    Open week
                  </Link>
                </div>
              </div>
              {[...current.posts]
                .sort((a, b) => a.dayIndex - b.dayIndex)
                .map((p) => {
                  const notes = p.history.filter((h) => h.note);
                  const last = notes[notes.length - 1];
                  return (
                    <Link key={p.id} href={`/week/${current.id}#post-${p.id}`} className="hero-row">
                      <span className="hero-day">
                        {p.day}
                        {current.source === "auto" && <span className="hero-date">{shortDate(p.date)}</span>}
                      </span>
                      <div className="hero-main">
                        <div className="hero-topic">
                          {TYPE_LABEL[p.type] || p.type} · {p.topic || "Untitled"}
                        </div>
                        {last && (
                          <div className="hero-note">
                            {last.source === "jaya" ? "Jaya" : "Waqar"}: “{last.note}”
                          </div>
                        )}
                      </div>
                      {notes.length > 0 && <span className="chip">{notes.length} note{notes.length > 1 ? "s" : ""}</span>}
                      <span className={`chip s-${p.status}`}>{p.status.replace("_", " ")}</span>
                    </Link>
                  );
                })}
              {current.status === "generating" && (
                <div className="muted" style={{ paddingTop: 10, fontSize: 12.5 }}>
                  Still building. Posts appear here as they finish.
                </div>
              )}
            </div>

            {activity.length > 0 && (
              <div style={{ marginTop: 22 }}>
                <h3
                  style={{
                    fontSize: 12,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    color: "var(--muted-2)",
                    margin: "0 0 8px",
                  }}
                >
                  Activity
                </h3>
                <div className="hero" style={{ padding: "6px 20px" }}>
                  {activity.map((a, i) => (
                    <Link
                      key={`${a.postId}-${a.at}-${i}`}
                      href={`/week/${a.weekId}#post-${a.postId}`}
                      className="hero-row"
                      style={i === 0 ? { borderTop: "none" } : undefined}
                    >
                      <span className="hero-day" style={{ width: 130 }}>
                        {when(a.at)}
                      </span>
                      <div className="hero-main">
                        <div className="hero-topic">
                          <strong style={{ color: "var(--text)" }}>{a.actor}</strong>{" "}
                          {a.kind === "approved" ? "approved" : "requested changes on"} {a.day} ·{" "}
                          {(a.topic || "").slice(0, 60)}
                        </div>
                        {a.note && <div className="hero-note">“{a.note}”</div>}
                      </div>
                      <span className={`chip ${a.kind === "approved" ? "s-approved" : "s-changes_requested"}`}>
                        {a.kind === "approved" ? "approved" : "changes"}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <PastWeeks count={past.length}>
                {past.map((w) => {
                    const { errors, warns } = lintSummary(w);
                    const approved = w.posts.filter((p) => p.status === "approved").length;
                    const changes = w.posts.filter((p) => p.status === "changes_requested").length;
                    const pending = w.posts.filter((p) => p.status === "in_review" || p.status === "draft").length;
                    return (
                      <Link key={w.id} href={`/week/${w.id}`} className="week-row">
                        <div className="meta">
                          <div className="title">{w.label}</div>
                          <div className="desc">
                            {w.posts.length} posts · {approved} approved · {changes} changes · {pending} pending
                            {errors ? ` · ${errors} blocking issues` : warns ? ` · ${warns} warnings` : " · checks passed"}
                            {w.source === "manual" ? " · from upload" : ""}
                          </div>
                        </div>
                        <span className={`chip s-${w.status}`}>{w.status.replace("_", " ")}</span>
                      </Link>
                    );
                  })}
              </PastWeeks>
            )}
          </>
        )}
      </div>
    </>
  );
}
