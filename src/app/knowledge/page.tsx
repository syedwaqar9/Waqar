import { getKnowledge } from "@/lib/store";
import KnowledgeManager from "@/components/KnowledgeManager";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const entries = await getKnowledge();
  return (
    <>
      <div className="topbar">
        <h1>Knowledge</h1>
        <span className="chip">
          {entries.filter((e) => e.enabled).length} active · {entries.length} total
        </span>
      </div>
      <div className="main-pad" style={{ maxWidth: 860 }}>
        <p className="muted" style={{ marginTop: 0 }}>
          The memory layer. Everything here is available to every generator: the weekly engine, the
          upload flow, and podcast posts can draw on it and cite it. Disable an entry to keep it
          without using it.
        </p>
        <KnowledgeManager initial={entries} />
      </div>
    </>
  );
}
