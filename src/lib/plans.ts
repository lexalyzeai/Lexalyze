export type PlanId = "free" | "solo" | "team";

export type PlanFeature = {
  text: string;
  sub?: string;
  tag?: string;
  included?: boolean;
};

export type PlanDetails = {
  id: PlanId;
  name: string;
  eyebrow?: string;
  description: string;
  monthlyPriceInr: number;
  monthlyDocuments: number | null;
  monthlyFollowUps: number | null;
  historyDays: number | null;
  storageMb: number;
  includedSeats: number;
  extraSeatPriceInr?: number;
  documents: PlanFeature[];
  storage: PlanFeature[];
  outputs: PlanFeature[];
  cta: string;
  highlighted?: boolean;
};

export const PLAN_CATALOG: Record<PlanId, PlanDetails> = {
  free: {
    id: "free",
    name: "Starter",
    description: "Try the full analysis -- no card required",
    monthlyPriceInr: 0,
    monthlyDocuments: 5,
    monthlyFollowUps: 3,
    historyDays: 14,
    storageMb: 5,
    includedSeats: 1,
    documents: [
      { text: "5 documents / month" },
      { text: "Full analysis on every doc" },
      { text: "3 follow-ups / month" },
      { text: "14-day history" },
    ],
    storage: [
      { text: "5 MB per user", sub: "~15-25 contracts" },
      { text: "Files purged after 14 days" },
    ],
    outputs: [
      { text: "No export", included: false },
      { text: "No sharing", included: false },
      { text: "No team workspace", included: false },
    ],
    cta: "Get started free",
  },
  solo: {
    id: "solo",
    name: "Solo",
    eyebrow: "Most popular",
    description: "For individuals who review contracts regularly",
    monthlyPriceInr: 299,
    monthlyDocuments: 30,
    monthlyFollowUps: null,
    historyDays: 365,
    storageMb: 50,
    includedSeats: 1,
    documents: [
      { text: "30 documents / month" },
      { text: "Full analysis on every doc" },
      { text: "Unlimited follow-ups" },
      { text: "1-year history" },
    ],
    storage: [
      { text: "50 MB per user", sub: "~150-250 contracts" },
      { text: "Files kept for 1 year", tag: "1 year" },
    ],
    outputs: [
      { text: "Export as PDF & DOCX" },
      { text: "Share via view-only link", sub: "Recipients need no account" },
      { text: "No team workspace", included: false },
    ],
    cta: "Start Solo",
    highlighted: true,
  },
  team: {
    id: "team",
    name: "Team",
    eyebrow: "For teams",
    description: "When a Solo user needs to loop in colleagues",
    monthlyPriceInr: 999,
    monthlyDocuments: null,
    monthlyFollowUps: null,
    historyDays: null,
    storageMb: 200,
    includedSeats: 3,
    extraSeatPriceInr: 999,
    documents: [
      { text: "Unlimited documents" },
      { text: "Full analysis on every doc" },
      { text: "Unlimited follow-ups" },
      { text: "Unlimited history" },
    ],
    storage: [
      { text: "200 MB per workspace", sub: "Shared across all seats" },
      { text: "Files kept permanently", tag: "Permanent" },
    ],
    outputs: [
      { text: "Export PDF, DOCX & CSV" },
      { text: "Share with comments & edits" },
      { text: "3 seats + roles", sub: "+\u20b9999/seat/month for more" },
      { text: "Shared workspace & folders" },
    ],
    cta: "Start Team trial",
  },
};

export const PLAN_LIMITS: Record<PlanId, { monthlyDocuments: number | null; monthlyFollowUps: number | null }> = {
  free: {
    monthlyDocuments: PLAN_CATALOG.free.monthlyDocuments,
    monthlyFollowUps: PLAN_CATALOG.free.monthlyFollowUps,
  },
  solo: {
    monthlyDocuments: PLAN_CATALOG.solo.monthlyDocuments,
    monthlyFollowUps: PLAN_CATALOG.solo.monthlyFollowUps,
  },
  team: {
    monthlyDocuments: PLAN_CATALOG.team.monthlyDocuments,
    monthlyFollowUps: PLAN_CATALOG.team.monthlyFollowUps,
  },
};

export function normalizePlan(plan?: string | null): PlanId {
  if (plan === "solo" || plan === "team") return plan;
  return "free";
}

export function currentUsageMonth(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function usageMonthRange(usageMonth = currentUsageMonth()) {
  const [year, month] = usageMonth.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}
