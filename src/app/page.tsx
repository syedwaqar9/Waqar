import Link from "next/link";
import { listWeeks } from "@/lib/store";
import GenerateButton from "@/components/GenerateButton";
import InboxShowcase from "@/components/InboxShowcase";
import TestSlack from "@/components/TestSlack";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  regulation_alert: "Regulation Alert",
  framework_translation: "Framework Translation",
  evidence_explainer: "Evidence Explainer",
  founder_moment: "Founder Moment",
  sector_focus: "Sector Focus",
};

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
  const weeks = await listWeeks();
  const current = weeks[0];
  const past = weeks.slice(1);

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
                  <div className="hero-title">{current.label}</div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                    {current.posts.filter((p) => p.status === "approved").length} approved ·{" "}
                    {current.posts.filter((p) => p.status === "changes_requested").length} changes requested ·{" "}
                    {current.posts.filter((p) => p.status !== "approved" && p.status !== "changes_requested").length}{" "}
                    awaiting review
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
                      <span className="hero-day">{p.day}</span>
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

            {past.length > 0 && (
              <>
                <h3 style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: "var(--muted-2)", margin: "26px 0 10px" }}>
                  Past weeks
                </h3>
                <div className="grid">
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
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
