// THE VERIFIED-FACTS LEDGER
// Seeded from Waqar's web-verified regulatory facts (as of 2026-05-30).
// Generation may only cite facts with status "active". "blocked" facts carry a
// doNotCite guard (for example the stale Colorado June 30 date). Weekly research
// refreshes this ledger; conflicts are flagged for review.

import type { Fact } from "@/lib/types";

export const SEED_FACTS: Fact[] = [
  {
    id: "eu-omnibus-2026",
    topic: "EU AI Act Omnibus",
    jurisdiction: "EU",
    claim: "The Digital Omnibus moved high-risk deadlines but not transparency obligations.",
    detail:
      "Political agreement 7 May 2026, transmitted to Parliament ~13 May 2026. Annex III high-risk moved Aug 2026 to Dec 2027. Annex I embedded moved Aug 2026 to Aug 2028. SMEs get simplified Annex III documentation rules. Article 50 transparency still applies 2 August 2026, no extension. GPAI and Article 5 in force since Aug 2025. Watermarking Aug 2026 new systems, Dec 2026 existing. Penalties up to 35M EUR or 7% of global turnover.",
    sourceUrl: "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai",
    publisher: "European Commission",
    verifiedAt: "2026-05-30",
    status: "active",
  },
  {
    id: "colorado-sb26-189",
    topic: "Colorado AI Act",
    jurisdiction: "US state",
    claim: "Colorado repealed and replaced SB 24-205 with SB 26-189, effective 1 January 2027.",
    detail:
      "Gov. Polis signed SB 26-189 on 14 May 2026, repealing the original SB 24-205. The replacement drops risk-management programs, impact assessments, and algorithmic discrimination duties, and adds a narrower notice-and-transparency (ADMT) framework. New effective date 1 January 2027.",
    sourceUrl: "https://leg.colorado.gov/bills/sb26-189",
    publisher: "Colorado General Assembly",
    verifiedAt: "2026-05-30",
    status: "active",
  },
  {
    id: "colorado-stale-june30",
    topic: "Colorado AI Act",
    jurisdiction: "US state",
    claim: "STALE: Colorado deadline of 30 June 2026.",
    detail: "Most sources are stale. Do not cite June 30, 2026 as Colorado's deadline for 2026.",
    sourceUrl: "https://leg.colorado.gov/bills/sb26-189",
    publisher: "Colorado General Assembly",
    verifiedAt: "2026-05-30",
    status: "blocked",
    doNotCite: "Do not cite 30 June 2026 as Colorado's deadline. The law was repealed by SB 26-189.",
  },
  {
    id: "texas-traiga",
    topic: "Texas TRAIGA",
    jurisdiction: "US state",
    claim: "Texas TRAIGA (HB 149) is effective 1 January 2026 with intent-based liability.",
    detail:
      "Signed 22 June 2025 by Gov. Abbott. Texas AG exclusive enforcement, no private right of action, 60-day cure. Penalties curable 10k-12k, uncurable 80k-200k, continuing 2k-40k per day. Safe harbor rewards documented NIST AI RMF compliance, adversarial testing, and audit trails. Preempts local AI regulation, creates a regulatory sandbox up to 36 months. Intent-based, not impact-based.",
    sourceUrl: "https://capitol.texas.gov/BillLookup/History.aspx?LegSess=89R&Bill=HB149",
    publisher: "Texas Legislature",
    verifiedAt: "2026-05-30",
    status: "active",
  },
  {
    id: "take-it-down-act",
    topic: "Take It Down Act",
    jurisdiction: "US federal",
    claim: "FTC began enforcing the Take It Down Act on 19 May 2026.",
    detail:
      "First federal law targeting AI-generated content enforcement. Criminalizes nonconsensual distribution of AI-generated intimate images. 48-hour removal required. Civil penalty 53,088 USD per violation, no cap. Warning letters sent to Alphabet, Amazon, Apple, Meta, Microsoft, Reddit, TikTok, X and 12 nudify tools.",
    sourceUrl: "https://www.ftc.gov/",
    publisher: "US FTC",
    verifiedAt: "2026-05-30",
    status: "active",
  },
  {
    id: "fda-ai-tplc",
    topic: "FDA AI healthcare",
    jurisdiction: "Sector: healthcare",
    claim: "FDA's AI device draft guidance uses a Total Product Life Cycle (TPLC) approach.",
    detail:
      "Draft guidance 'AI-Enabled Device Software Functions' published 6-7 Jan 2025, still draft, comment period closed 7 Apr 2025, docket FDA-2024-D-4488. Final PCCP guidance 4 Dec 2024 requires Description of Modifications, Modification Protocol, Impact Assessment. TPLC turns submissions from snapshot validation into ongoing evidence. 97% of AI medical devices cleared via 510(k) as of Aug 2024.",
    sourceUrl: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents",
    publisher: "US FDA",
    verifiedAt: "2026-05-30",
    status: "active",
  },
  {
    id: "iso-42001-vs-soc2",
    topic: "ISO 42001 vs SOC 2",
    jurisdiction: "Global standards",
    claim: "You can pass SOC 2 with zero AI governance documentation.",
    detail:
      "ISO/IEC 42001 published Dec 2023, the first international AI management system standard, certifiable, industry-agnostic, covers data governance, transparency, bias mitigation, human oversight, full AI lifecycle. SOC 2 is an AICPA attestation of Trust Services Criteria with no AI-specific requirements. ISO 42001 is most comparable to NIST AI RMF, but NIST lacks international certification.",
    sourceUrl: "https://www.iso.org/standard/81230.html",
    publisher: "ISO",
    verifiedAt: "2026-05-30",
    status: "active",
  },
  {
    id: "us-federal-eo-14365",
    topic: "US federal AI policy",
    jurisdiction: "US federal",
    claim: "EO 14365 (Dec 2025) moves toward federal preemption of state AI laws.",
    detail:
      "Halts state-by-state AI regulation groundwork, 90-day Commerce triage of onerous state laws, AI Litigation Task Force. White House National Policy Framework for AI released ~20 Mar 2026 (nonbinding). Useful framing: the White House is the floor of AI governance pressure, the EU is the ceiling, build for the ceiling.",
    sourceUrl: "https://www.whitehouse.gov/",
    publisher: "The White House",
    verifiedAt: "2026-05-30",
    status: "active",
  },
];
