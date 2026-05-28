export type PlanId = "free" | "solo" | "team";

export const PLAN_LIMITS: Record<PlanId, { monthlyDocuments: number | null; followUpsPerDocument: number | null }> = {
  free: { monthlyDocuments: 5, followUpsPerDocument: 3 },
  solo: { monthlyDocuments: 30, followUpsPerDocument: null },
  team: { monthlyDocuments: null, followUpsPerDocument: null },
};

export function normalizePlan(plan?: string | null): PlanId {
  if (plan === "solo" || plan === "team") return plan;
  return "free";
}

export function currentUsageMonth(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

