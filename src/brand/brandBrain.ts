// THE BRAND BRAIN
// Waqar's operating manual + the IAIMS strategy decks, encoded as data.
// Every generator, the linter, the planner, and the renderer read from here.
// This is editable: change a rule here (or later in the Brand Brain UI) and all
// future content follows it.

import type { ICP, PostType, SlideTheme } from "@/lib/types";

export const ORG = {
  name: "The Institute for AI Measurement Science",
  short: "IAIMS",
  url: "iaimscience.org",
  legal: "501(c)(3) nonprofit",
  founder: "Jaya Kandaswamy",
  founderTitle: "Founder, President and Executive Director",
  // Standardized language from the decks. "Evidence" is the operative noun.
  positioning: "Neutral, open evidence infrastructure for AI governance",
  mission: "A world where AI safety is proven by data, not claimed by marketing.",
  thesis:
    "Frameworks tell organizations what to do. IAIMS builds the open evidence layer that proves they did it.",
  // The product spine. Reuse as a scaffold for Framework Translation content.
  pipeline: ["Standards", "Controls", "Templates", "Collectors", "Bundles"],
  pipelineLine: "One control, multiple frameworks, deterministic evidence.",
  wedge:
    "IAIMS owns steps 1 to 4 (process identification, process documentation, risk identification, risk rating, control identification), the part nobody else is building. Most tools start at step 5.",
  trustLine: "Evidence stays in your organization. Nothing leaves your company.",
  payToPlay:
    "Without open infrastructure, governance becomes pay-to-play and under-resourced organizations are priced out of compliance.",
};

// Hard boundary. Never imply any of these. Neutrality is the differentiator.
export const NOT_LIST = [
  "IAIMS does not certify or assess organizations",
  "IAIMS does not make compliance determinations",
  "IAIMS does not set policy or standards",
  "IAIMS does not consult",
  "IAIMS does not operate a proprietary or SaaS platform",
  "IAIMS does not host customer data",
];

export const VOICE = {
  // Hard rules. The linter enforces these as errors.
  hardRules: [
    "No em dashes. Use commas, colons, periods, or parentheses.",
    "Exactly 3 hashtags per post.",
    "No comment-trigger CTAs (no 'comment X', no 'share in the comments').",
    "End every caption with the standard CTA.",
    "Sentence case headings, never title case or all caps in captions.",
    "No exclamation marks.",
    "No AI vocabulary or hype adjectives.",
  ],
  // Words that read as generic AI copy. Linter flags these.
  bannedTerms: [
    "leverage",
    "robust",
    "seamless",
    "optimize",
    "optimise",
    "unlock",
    "delve",
    "game-changer",
    "game changer",
    "cutting-edge",
    "cutting edge",
    "revolutionary",
    "supercharge",
    "effortless",
    "elevate",
    "transformative",
    "synergy",
    "best-in-class",
    "next-level",
    "paradigm",
  ],
  hedges: {
    // Use when making observational claims about the industry.
    observation: "In our assessment",
    // Use for composite practitioner quotes, never attributed to a person.
    composite: "A founder told us",
  },
  cta: "Follow along or reach out at iaimscience.org",
  // The Pranita Bajoria principle.
  pranita:
    "Adjectives do almost no work. Replace every adjective governance claim with the specific artifact behind it. 'Robust oversight' becomes 'a named accountable owner plus a decision log with dates.'",
  paragraphs: "One to two sentences per paragraph, three maximum.",
  structure: [
    "Hook: one or two short lines that create tension.",
    "Body: the specific facts, dates, and framework citations.",
    "Bridge: how this connects to the IAIMS evidence-layer thesis.",
    "CTA: the standard line.",
    "Hashtags: exactly 3.",
  ],
};

// Curated hashtag pool. The generator picks exactly 3 per post, relevant to topic.
export const HASHTAG_POOL = [
  "#AIGovernance",
  "#AICompliance",
  "#EUAIAct",
  "#NISTAIRMF",
  "#ISO42001",
  "#AIRiskManagement",
  "#ResponsibleAI",
  "#AIRegulation",
  "#AIAudit",
  "#AIEvidence",
  "#HealthcareAI",
  "#FinTechCompliance",
];

// Approved verbatim lines. The generator may reuse these. Keeps voice on-brand.
export const MESSAGE_BANK = [
  "The problem is not a lack of policy. It is a lack of neutral, reusable evidence infrastructure.",
  "We are not building another compliance tool. We are building the layer that makes every compliance tool more honest.",
  "Engineers can implement it. Auditors can accept it. Regulators can reference it. Startups can afford it.",
  "AI safety should be proven by data, not claimed by marketing.",
  "The frameworks describe what to do. Evidence is what auditors verify.",
  "We standardize how evidence is structured, not compliance outcomes.",
  "Build the evidence layer once. Use it across every framework, every deal, every deadline.",
];

// THE HOOK ENGINE
// The hook is the most important line in any post. If it fails, nothing else is
// read. Working principles distilled from behavioral science, used to write and
// score every hook.
export const HOOK_PRINCIPLES = [
  "Kahneman (System 1, loss aversion, framing): write for the fast, emotional brain. Frame the stakes as a loss or a risk, not a gain. 'You missed the deadline that was not delayed' beats 'here are the deadlines'. Anchor with one concrete number, date, or dollar amount.",
  "Berger, Contagious (STEPPS): give social currency so sharing makes the reader look informed, attach to a current trigger, carry high-arousal emotion such as surprise or concern, and promise practical value they can use today.",
  "Rory Sutherland (psycho-logic): reframe the obvious into the counterintuitive. Make the familiar strange. The reader should feel they are about to learn something most people have wrong.",
  "Heath brothers, Made to Stick (SUCCESs): Simple, Unexpected (open a curiosity gap, break the pattern), Concrete (name the specific artifact), Credible (a real source), Emotional. Lead with the unexpected, not the context.",
  "Thaler, Nudge (salience and friction): make the single most important fact impossible to miss, and remove friction to the next step. Salience over completeness.",
];

export const HOOK_RUBRIC = [
  "Curiosity gap: does the reader have to keep reading to resolve the tension?",
  "Stakes: is there a clear loss or risk to ignoring this?",
  "Concrete: is there a specific number, date, statute, or named artifact?",
  "Relevance: does it speak to a specific ICP's job?",
  "Credible: no hype, no banned words, a real source behind it.",
  "One breath: short enough to read at full scroll speed.",
];

export const ICPS: Record<
  ICP,
  { label: string; titles: string; cares: string; goal: string }
> = {
  compliance_pro: {
    label: "Compliance Pro",
    titles: "Chief AI Officer, CRO, VP Compliance, Head of AI Risk, Model Risk Manager",
    cares:
      "What changed, when, what evidence they need, how to document it defensibly.",
    goal: "Signal that IAIMS understands the regulatory landscape in depth. Drive to checklists and specs.",
  },
  startup_cto: {
    label: "Startup CTO",
    titles: "Founder, CTO, Head of Product, ML/AI Engineer at Series A/B startups",
    cares:
      "They passed SOC 2 and think they are compliant. They are losing enterprise deals over AI-specific questions SOC 2 does not answer.",
    goal: "Show what to build and how long it takes. Drive to the pilot.",
  },
  grant_officer: {
    label: "Grant Officer",
    titles: "Program officers at Google.org, Schmidt Futures, MacArthur, Mozilla, Omidyar",
    cares: "Is the mission real, is the infrastructure being built, is it open and sector-agnostic.",
    goal: "Show IAIMS is the credible open alternative. Drive partnership and funding interest.",
  },
  accelerator_university: {
    label: "Accelerator / University",
    titles: "YC, Techstars, university AI programs",
    cares: "A trustworthy, free AI governance resource to point portfolio companies and students to.",
    goal: "Position IAIMS as the open reference. Drive adoption and collaboration.",
  },
};

export const POST_TYPES: Record<
  PostType,
  { label: string; description: string; defaultFormat: "single" | "carousel"; icps: ICP[] }
> = {
  regulation_alert: {
    label: "Regulation Alert",
    description:
      "Breaking or recent regulatory news: EU AI Act deadlines, US state AI laws, FTC enforcement. Always cite the source in the visual. Connect the facts to the IAIMS evidence-layer thesis.",
    defaultFormat: "single",
    icps: ["compliance_pro", "startup_cto"],
  },
  framework_translation: {
    label: "Framework Translation",
    description:
      "Take a regulatory development and show the exact crosswalk: which NIST AI RMF controls apply, which ISO 42001 clauses apply, what evidence is needed. Slide 1 the hook, slides 2 to 6 the mapping, slide 7 the takeaway.",
    defaultFormat: "carousel",
    icps: ["compliance_pro"],
  },
  evidence_explainer: {
    label: "Evidence Explainer",
    description:
      "What audit-grade evidence looks like. Carousels walk through a specific artifact or question list. Apply the Pranita principle: every slide names a specific artifact, not a vague concept.",
    defaultFormat: "carousel",
    icps: ["compliance_pro", "startup_cto"],
  },
  founder_moment: {
    label: "Founder Moment",
    description:
      "Jaya's first-person, mission-level voice (I or we). A short reflection on why this work matters, NOT a regulation alert. The eyebrow must be a mission or founder label (for example FOUNDER NOTE or WHY THIS MATTERS), never an 'X ALERT' label. Frame the week's theme into the larger problem IAIMS is solving. No unsourced stats. Use 'In our assessment' for observational claims.",
    defaultFormat: "single",
    icps: ["grant_officer", "accelerator_university"],
  },
  sector_focus: {
    label: "Sector Focus",
    description:
      "How the evidence-layer approach applies to a vertical: Healthcare AI (FDA TPLC, PCCP), Financial Services (FFIEC SR 11-7). Sector-specific proof of portability.",
    defaultFormat: "single",
    icps: ["compliance_pro"],
  },
};

// Default Mon to Fri rhythm. The planner may swap a type to vary geography,
// but keeps Tuesday and Friday as Jaya reshares and keeps 2 carousels per week.
export const WEEK_RHYTHM: {
  dayIndex: number;
  day: string;
  type: PostType;
  format: "single" | "carousel";
  reshareBy: "jaya" | null;
}[] = [
  { dayIndex: 0, day: "Monday", type: "regulation_alert", format: "single", reshareBy: null },
  { dayIndex: 1, day: "Tuesday", type: "framework_translation", format: "carousel", reshareBy: "jaya" },
  { dayIndex: 2, day: "Wednesday", type: "sector_focus", format: "single", reshareBy: null },
  { dayIndex: 3, day: "Thursday", type: "evidence_explainer", format: "carousel", reshareBy: null },
  { dayIndex: 4, day: "Friday", type: "founder_moment", format: "single", reshareBy: "jaya" },
];

// LOCKED LinkedIn asset design system (separate from the Linear-style app UI).
export const DESIGN = {
  size: 1080,
  margin: 60,
  usableWidth: 960,
  headlineMaxWords: 10,
  colors: {
    nearBlack: "#0F0D30",
    navy: "#1A1464",
    teal: "#0D7377",
    lightTeal: "#7DD8DB",
    white: "#FFFFFF",
    lightBg: "#F0F2FA",
    lightCard: "#FFFFFF",
    yellowBg: "#FEF3C7",
    yellowText: "#92400E",
    steel: "rgba(255,255,255,0.45)",
    inkMuted: "rgba(15,13,48,0.55)",
  },
  fonts: { sans: "DM Sans", serif: "DM Serif Display" },
  brandMark: "IAIMS · iaimscience.org · 501(c)(3)",
  // Typical dark/light alternation across a 7-slide carousel (dark S1, S4, S6, S7).
  carouselRhythm: ["dark", "light", "light", "dark", "light", "dark", "dark"] as SlideTheme[],
};

// Geography variety. The planner avoids making a week look like an EU AI Act newsletter.
export const GEOGRAPHIES = [
  "EU",
  "US federal",
  "US state",
  "UK",
  "Global standards",
  "Sector: healthcare",
  "Sector: financial services",
];

// Where the audience grows, and the metrics that matter (Waqar's call).
export const GROWTH = {
  channels: ["IAIMS company page", "Jaya Kandaswamy personal profile (Tue + Fri reshares)"],
  metrics: ["Followers", "Profile views", "Engagement"],
  phase:
    "Foundation and signal phase. The goal is credibility and first inbound, not vanity metrics.",
};
