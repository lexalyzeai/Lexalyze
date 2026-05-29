import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { PLAN_CATALOG, type PlanId } from "@/lib/plans";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

const textEncoder = new TextEncoder();

export function textStorageBytes(text: unknown) {
  return textEncoder.encode(typeof text === "string" ? text : "").length;
}

export function getPlanStorageLimitBytes(plan: PlanId) {
  return PLAN_CATALOG[plan].storageMb * 1024 * 1024;
}

export async function deleteAnalysesById(admin: SupabaseAdmin, userId: string, ids: string[]) {
  if (ids.length === 0) return 0;

  const { error: followupError } = await admin
    .from("followups")
    .delete()
    .in("analysis_id", ids);

  if (followupError) throw followupError;

  const { error: analysisError } = await admin
    .from("analyses")
    .delete()
    .eq("user_id", userId)
    .in("id", ids);

  if (analysisError) throw analysisError;
  return ids.length;
}

export async function cleanupExpiredAnalyses(admin: SupabaseAdmin, userId: string, plan: PlanId) {
  const historyDays = PLAN_CATALOG[plan].historyDays;
  if (historyDays === null) return 0;

  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - historyDays);

  const { data, error } = await admin
    .from("analyses")
    .select("id")
    .eq("user_id", userId)
    .lt("created_at", cutoff.toISOString());

  if (error) throw error;
  return deleteAnalysesById(admin, userId, (data ?? []).map((row) => row.id));
}

export async function getStoredDocumentBytes(admin: SupabaseAdmin, userId: string) {
  const { data, error } = await admin
    .from("analyses")
    .select("document_text")
    .eq("user_id", userId);

  if (error) throw error;
  return (data ?? []).reduce((total, row) => total + textStorageBytes(row.document_text), 0);
}
