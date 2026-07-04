import { getMetrics, listWeeks } from "@/lib/store";
import MetricsPanel from "@/components/MetricsPanel";
import type { PostMetric } from "@/lib/types";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  regulation_alert: "Regulation Alert",
  framework_translation: "Framework Translation",
  evidence_explainer: "Evidence Explainer",
  founder_moment: "Founder Moment",
  sector_focus: "Sector Focus",
};

const fmt = (n?: number) => (n === undefined ? "–" : n.toLocaleString("en-US"));
const er = (m?: PostMetric) => {
  if (!m?.impressions) return undefined;
  const eng = (m.reactions || 0) + (m.comments || 0) + (m.reposts || 0);
  return (eng / m.impressions) * 100;
};

export default async function InsightsPage() {
  const [weeks, metrics] = await Promise.all([listWeeks(), getMetrics()]);
  const byPost = new Map(metrics.filter((m) => m.postId).map((m) => [m.postId!, m]));
  const byDate = new Map(metrics.filter((m) => !m.postId && m.date).map((m) => [m.date!, m]));

  const rows = weeks
    .flatMap((w) => w.posts.map((p) => ({ week: w, post: p })))
    .map((r) => ({ ...r, metric: byPost.get(r.post.id) || (r.post.date ? byDate.get(r.post.date) : undefined) }));

  const measured = rows.filter((r) => r.metric?.impressions);

  // Averages per post type, only over measured posts.
  const typeAgg = new Map<string, { n: number; imp: number; erSum: number }>();
  for (const r of measured) {
    const t = TYPE_LABEL[r.post.type] || r.post.type;
    const a = typeAgg.get(t) || { n: 0, imp: 0, erSum: 0 };
    a.n += 1;
    a.imp += r.metric!.impressions!;
    a.erSum += er(r.metric) || 0;
    typeAgg.set(t, a);
  }

  const latestFollowers = metrics
    .filter((m) => m.followers !== undefined)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0]?.followers;

  return (
    <>
      <div className="topbar">
        <h1>Insights</h1>
        <span className="chip">
          {measured.length}/{rows.length} posts measured
        </span>
      </div>
      <div className="main-pad">
        <p className="muted" style={{ marginTop: 0 }}>
          Real LinkedIn numbers close the loop: the improvement agent reads them and proposes rules
          based on what actually performed. Followers, profile views, and engagement are the metrics
          that matter.
        </p>
        <MetricsPanel
          posts={rows.slice(0, 20).map((r) => ({
            id: r.post.id,
            label: `${r.post.day} · ${(r.post.topic || "Untitled").slice(0, 60)}`,
          }))}
        />

        {measured.length > 0 && (
          <div className="kv">
            <div className="block">
              <h3>Totals ({measured.length} measured posts{latestFollowers ? ` · ${fmt(latestFollowers)} followers` : ""})</h3>
              <div className="muted">
                Impressions {fmt(measured.reduce((s, r) => s + (r.metric!.impressions || 0), 0))} · Reactions{" "}
                {fmt(measured.reduce((s, r) => s + (r.metric!.reactions || 0), 0))} · Comments{" "}
                {fmt(measured.reduce((s, r) => s + (r.metric!.comments || 0), 0))} · Reposts{" "}
                {fmt(measured.reduce((s, r) => s + (r.metric!.reposts || 0), 0))}
              </div>
            </div>

            <div className="block">
              <h3>By post type (averages)</h3>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {[...typeAgg.entries()]
                  .sort((a, b) => b[1].imp / b[1].n - a[1].imp / a[1].n)
                  .map(([t, a]) => (
                    <li key={t} style={{ margin: "4px 0", color: "var(--muted)" }}>
                      <strong style={{ color: "var(--text)" }}>{t}</strong>: {fmt(Math.round(a.imp / a.n))} avg
                      impressions · {(a.erSum / a.n).toFixed(1)}% avg engagement
                    </li>
                  ))}
              </ul>
            </div>

            <div className="block">
              <h3>Per post</h3>
              {measured.map((r) => (
                <div key={r.post.id} className="hero-row" style={{ cursor: "default" }}>
                  <span className="hero-day">
                    {r.post.day}
                    <span className="hero-date">{r.post.date}</span>
                  </span>
                  <div className="hero-main">
                    <div className="hero-topic">{r.post.topic}</div>
                  </div>
                  <span className="chip">{fmt(r.metric!.impressions)} imp</span>
                  <span className="chip">{fmt(r.metric!.reactions)} reactions</span>
                  <span className="chip">{fmt(r.metric!.comments)} comments</span>
                  <span className="chip">{er(r.metric)?.toFixed(1)}% ER</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {measured.length === 0 && (
          <div className="empty">No measured posts yet. Import a CSV or enter one post above.</div>
        )}
      </div>
    </>
  );
}
