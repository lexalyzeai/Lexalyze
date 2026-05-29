export type PlanId = "free" | "solo" | "team";

export const PLAN_LIMITS: Record<PlanId, { monthlyDocuments: number | null; monthlyFollowUps: number | null }> = {
  free: { monthlyDocuments: 5, monthlyFollowUps: 3 },
  solo: { monthlyDocuments: 30, monthlyFollowUps: null },
  team: { monthlyDocuments: null, monthlyFollowUps: null },
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
