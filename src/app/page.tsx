import Link from "next/link";
import { listWeeks } from "@/lib/store";
import GenerateButton from "@/components/GenerateButton";

export const dynamic = "force-dynamic";

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
  return (
    <>
      <div className="topbar">
        <h1>Inbox</h1>
        <div className="row">
          <Link href="/create" className="btn btn-ghost">
            Create from upload
          </Link>
          <GenerateButton />
        </div>
      </div>
      <div className="main-pad">
        {weeks.length === 0 ? (
          <div className="empty">
            <p style={{ fontSize: 15, color: "var(--text)" }}>No weeks yet.</p>
            <p>Click Generate next week to research the latest AI-regulation news and draft five posts.</p>
          </div>
        ) : (
          <div className="grid">
            {weeks.map((w) => {
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
        )}
      </div>
    </>
  );
}
