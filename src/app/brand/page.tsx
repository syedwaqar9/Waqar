import { ORG, VOICE, NOT_LIST, ICPS, POST_TYPES, GROWTH, MESSAGE_BANK } from "@/brand/brandBrain";
import { SEED_FACTS } from "@/brand/facts";
import type { ICP, PostType } from "@/lib/types";
import InboxShowcase from "@/components/InboxShowcase";

export const dynamic = "force-dynamic";

export default function BrandPage() {
  const icpKeys = Object.keys(ICPS) as ICP[];
  const typeKeys = Object.keys(POST_TYPES) as PostType[];
  return (
    <>
      <div className="topbar">
        <h1>Brand Brain</h1>
        <span className="chip">read-only in this build</span>
      </div>
      <div className="main-pad">
        <InboxShowcase />
        <p className="muted" style={{ marginTop: 0 }}>
          The single source of truth every generator reads from. Learned rules from Jaya&apos;s and
          Waqar&apos;s feedback appear in the Instructions tab automatically.
        </p>

        <div className="kv">
          <div className="block">
            <h3>Identity</h3>
            <div>{ORG.name} · {ORG.legal}</div>
            <div className="muted">{ORG.positioning}</div>
            <div className="muted">Mission: {ORG.mission}</div>
            <div className="muted">Spine: {ORG.pipeline.join(" → ")}. {ORG.pipelineLine}</div>
            <div className="muted">Wedge: {ORG.wedge}</div>
          </div>

          <div className="block">
            <h3>Never imply (neutrality guardrails)</h3>
            <ul>
              {NOT_LIST.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>

          <div className="block">
            <h3>Voice (hard rules)</h3>
            <ul>
              {VOICE.hardRules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <div className="note">Banned words: {VOICE.bannedTerms.join(", ")}</div>
            <div className="note">CTA: {VOICE.cta}</div>
          </div>

          <div className="block">
            <h3>ICPs (treated equally)</h3>
            <ul>
              {icpKeys.map((k) => (
                <li key={k}>
                  <strong>{ICPS[k].label}</strong>: {ICPS[k].goal}
                </li>
              ))}
            </ul>
          </div>

          <div className="block">
            <h3>Post types</h3>
            <ul>
              {typeKeys.map((k) => (
                <li key={k}>
                  <strong>{POST_TYPES[k].label}</strong> ({POST_TYPES[k].defaultFormat}): {POST_TYPES[k].description}
                </li>
              ))}
            </ul>
          </div>

          <div className="block">
            <h3>Message bank</h3>
            <ul>
              {MESSAGE_BANK.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>

          <div className="block">
            <h3>Verified-facts ledger ({SEED_FACTS.filter((f) => f.status === "active").length} active)</h3>
            <ul>
              {SEED_FACTS.map((f) => (
                <li key={f.id} style={{ color: f.status === "blocked" ? "var(--red)" : undefined }}>
                  <strong>[{f.jurisdiction}]</strong> {f.claim}{" "}
                  {f.status === "blocked" ? "(BLOCKED)" : `· ${f.publisher}, verified ${f.verifiedAt}`}
                </li>
              ))}
            </ul>
          </div>

          <div className="block">
            <h3>Growth</h3>
            <div className="muted">Channels: {GROWTH.channels.join(", ")}</div>
            <div className="muted">Metrics: {GROWTH.metrics.join(", ")}</div>
            <div className="muted">{GROWTH.phase}</div>
          </div>
        </div>
      </div>
    </>
  );
}
