import Link from "next/link";
import { getWeek } from "@/lib/store";
import { postSVGs } from "@/lib/render/svg";
import PostCard from "@/components/PostCard";
import SendToJaya from "@/components/SendToJaya";
import GeneratingWatcher from "@/components/GeneratingWatcher";
import CopyLink from "@/components/CopyLink";
import ApproveAll from "@/components/ApproveAll";

export const dynamic = "force-dynamic";

export default async function WeekPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  // Reviewer mode (?reviewer=1): the clean surface Jaya gets in her Slack link.
  const reviewer = (await searchParams)?.reviewer === "1";
  const week = await getWeek(id);

  if (!week) {
    return (
      <>
        <div className="topbar">
          <h1>Loading week</h1>
        </div>
        <div className="main-pad">
          <GeneratingWatcher />
          <div className="genbanner">
            <div className="spinner" />
            <div style={{ flex: 1 }}>
              <div className="loader-title">Preparing this week</div>
              <div className="loader-stage">
                This refreshes automatically. If it does not load in a few seconds, go back to the Inbox.
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const items = [...week.posts]
    .sort((a, b) => a.dayIndex - b.dayIndex)
    .map((p) => ({ post: p, svgs: postSVGs(p) }));
  const approved = week.posts.filter((p) => p.status === "approved").length;

  return (
    <>
      <div className="topbar">
        <h1>
          {reviewer ? (
            <>{week.label} · Review</>
          ) : (
            <>
              <Link href="/" className="crumb">
                Inbox
              </Link>{" "}
              / {week.label}
            </>
          )}
        </h1>
        <div className="row">
          {!reviewer && <CopyLink />}
          {!reviewer && <SendToJaya weekId={week.id} />}
          {week.posts.length > 0 && week.status !== "approved" && week.status !== "generating" && (
            <ApproveAll weekId={week.id} />
          )}
          {week.posts.length > 0 && (
            <span className="chip">
              {approved}/{week.posts.length} approved
            </span>
          )}
          <span className={`chip s-${week.status}`}>{week.status.replace("_", " ")}</span>
        </div>
      </div>
      <div className="main-pad">
        {reviewer && (
          <p className="muted" style={{ marginTop: 0 }}>
            Hi Jaya. Review each post below: Approve it, or Request changes and type what to change.
            The post is revised right away and ready for another look. Approve all (top right) clears
            the week in one click.
          </p>
        )}
        {week.status === "generating" && (
          <>
            <GeneratingWatcher />
            <div className="genbanner">
              <div className="spinner" />
              <div style={{ flex: 1 }}>
                <div className="loader-title">Building this week</div>
                <div className="loader-stage">
                  Drafted {week.posts.length} of 5. You can leave this page, it keeps building in the background.
                </div>
                <div className="bar">
                  <div className="bar-fill" style={{ width: `${Math.max(8, (week.posts.length / 5) * 100)}%` }} />
                </div>
              </div>
            </div>
          </>
        )}
        {!reviewer && week.theme && !week.theme.startsWith("Generation error") && (
          <p className="muted" style={{ marginTop: 0 }}>
            Geography mix: {week.theme}
          </p>
        )}
        {week.theme.startsWith("Generation error") && (
          <p style={{ color: "var(--red)", marginTop: 0 }}>{week.theme}</p>
        )}
        {items.map((it) => (
          <PostCard key={it.post.id} post={it.post} svgs={it.svgs} weekId={week.id} reviewer={reviewer} />
        ))}
        {week.status !== "generating" && items.length === 0 && (
          <div className="empty">No posts generated. Try Generate again.</div>
        )}
      </div>
    </>
  );
}
