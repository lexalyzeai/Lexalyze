import { createSupabaseAdmin } from "@/lib/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type TeamRole = "owner" | "admin" | "member" | "viewer";

export type TeamMembership = {
  id: string;
  workspace_id: string;
  user_id?: string | null;
  email: string;
  role: TeamRole;
  status: "active" | "invited";
};

export const TEAM_WRITE_ROLES = new Set<TeamRole>(["owner", "admin", "member"]);
export const TEAM_MANAGER_ROLES = new Set<TeamRole>(["owner", "admin"]);

function cleanEmail(email?: string | null) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export async function getWorkspaceMembership(
  admin: SupabaseAdmin,
  user: { id: string; email?: string | null },
  workspaceId: string
) {
  const email = cleanEmail(user.email);

  const byUser = await admin
    .from("team_members")
    .select("id, workspace_id, user_id, email, role, status")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (byUser.error) throw byUser.error;
  let member = byUser.data as TeamMembership | null;

  if (!member && email) {
    const byEmail = await admin
      .from("team_members")
      .select("id, workspace_id, user_id, email, role, status")
      .eq("workspace_id", workspaceId)
      .eq("email", email)
      .maybeSingle();

    if (byEmail.error) throw byEmail.error;
    member = byEmail.data as TeamMembership | null;
  }

  if (!member) return null;

  if (member.status !== "active" || !member.user_id) {
    const activated = await admin
      .from("team_members")
      .update({ user_id: user.id, status: "active" })
      .eq("id", member.id)
      .select("id, workspace_id, user_id, email, role, status")
      .single();

    if (activated.error) throw activated.error;
    member = activated.data as TeamMembership;
  }

  return member;
}

export async function getAnalysisAccess(
  admin: SupabaseAdmin,
  user: { id: string; email?: string | null },
  analysisId: string
) {
  const { data: analysis, error } = await admin
    .from("analyses")
    .select("id, user_id, workspace_id")
    .eq("id", analysisId)
    .maybeSingle();

  if (error) throw error;
  if (!analysis) return null;

  const workspaceId = analysis.workspace_id as string | null;
  if (!workspaceId) {
    return analysis.user_id === user.id
      ? { analysis, role: "owner" as TeamRole, canWrite: true, canManage: true }
      : null;
  }

  const member = await getWorkspaceMembership(admin, user, workspaceId);
  if (!member) return null;

  return {
    analysis,
    role: member.role,
    canWrite: TEAM_WRITE_ROLES.has(member.role),
    canManage: TEAM_MANAGER_ROLES.has(member.role),
  };
}
