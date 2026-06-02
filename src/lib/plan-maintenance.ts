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

export async function deleteAnalysesById(
  admin: SupabaseAdmin,
  userId: string,
  ids: string[],
  workspaceId?: string | null
) {
  if (ids.length === 0) return 0;

  const { error: feedbackError } = await admin
    .from("share_feedback")
    .delete()
    .in("analysis_id", ids);

  if (feedbackError) throw feedbackError;

  const { error: followupError } = await admin
    .from("followups")
    .delete()
    .in("analysis_id", ids);

  if (followupError) throw followupError;

  let deleteQuery = admin
    .from("analyses")
    .delete()
    .in("id", ids);

  if (workspaceId) {
    deleteQuery = deleteQuery.eq("workspace_id", workspaceId);
  } else {
    deleteQuery = deleteQuery.eq("user_id", userId).is("workspace_id", null);
  }

  const { error: analysisError } = await deleteQuery;

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
    .is("workspace_id", null)
    .lt("created_at", cutoff.toISOString());

  if (error) throw error;
  return deleteAnalysesById(admin, userId, (data ?? []).map((row) => row.id));
}

export async function getStoredDocumentBytes(
  admin: SupabaseAdmin,
  userId: string,
  workspaceId?: string | null
) {
  let query = admin
    .from("analyses")
    .select("document_text");

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  } else {
    query = query.eq("user_id", userId).is("workspace_id", null);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []).reduce((total, row) => total + textStorageBytes(row.document_text), 0);
}
