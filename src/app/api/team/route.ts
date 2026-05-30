import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { FRIENDLY_ERRORS } from "@/lib/error-handling";
import { normalizePlan } from "@/lib/plans";

const INCLUDED_TEAM_SEATS = 3;
const ROLES = new Set(["admin", "member", "viewer"]);
const MANAGER_ROLES = new Set(["owner", "admin"]);

async function getUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  return supabase.auth.getUser();
}

function cleanEmail(email: unknown) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

async function getTeamContext(
  admin: ReturnType<typeof createSupabaseAdmin>,
  user: { id: string; email?: string | null; user_metadata?: { full_name?: string | null } },
) {
  const { data: profile, error } = await admin
    .from("profiles")
    .select("plan, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;

  if (normalizePlan(profile?.plan) === "team") {
    const workspace = await ensureWorkspace(admin, user, profile?.full_name || user.user_metadata?.full_name);
    const ownerMemberLookup = await admin
      .from("team_members")
      .select("id, user_id, email, role, status, created_at")
      .eq("workspace_id", workspace.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (ownerMemberLookup.error) throw ownerMemberLookup.error;
    let member = ownerMemberLookup.data;

    if (!member) {
      const { data: createdMember, error: createMemberError } = await admin
        .from("team_members")
        .upsert({
          workspace_id: workspace.id,
          user_id: user.id,
          email: user.email || "owner@lexalyze.local",
          role: "owner",
          status: "active",
        }, { onConflict: "workspace_id,email" })
        .select("id, user_id, email, role, status, created_at")
        .single();

      if (createMemberError) throw createMemberError;
      member = createdMember;
    }

    return { profile, workspace, member, canManage: true };
  }

  const email = cleanEmail(user.email);
  if (!email) {
    return { error: NextResponse.json({ error: "Team workspace is available on the Team plan or by invitation.", code: "forbidden" }, { status: 403 }) };
  }

  const memberLookup = await admin
    .from("team_members")
    .select("id, workspace_id, user_id, email, role, status, created_at")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (memberLookup.error) throw memberLookup.error;
  let member = memberLookup.data;

  if (!member) {
    const invite = await admin
      .from("team_members")
      .select("id, workspace_id, user_id, email, role, status, created_at")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (invite.error) throw invite.error;
    member = invite.data;
  }

  if (!member) {
    return { error: NextResponse.json({ error: "Team workspace is available on the Team plan or by invitation.", code: "forbidden" }, { status: 403 }) };
  }

  if (member.status !== "active" || !member.user_id) {
    const { data: activated, error: activateError } = await admin
      .from("team_members")
      .update({ user_id: user.id, status: "active" })
      .eq("id", member.id)
      .select("id, workspace_id, user_id, email, role, status, created_at")
      .single();

    if (activateError) throw activateError;
    member = activated;
  }

  const { data: workspace, error: workspaceError } = await admin
    .from("team_workspaces")
    .select("*")
    .eq("id", member.workspace_id)
    .maybeSingle();

  if (workspaceError) throw workspaceError;
  if (!workspace) {
    return { error: NextResponse.json({ error: FRIENDLY_ERRORS.not_found.message, code: "not_found" }, { status: 404 }) };
  }

  return { profile, workspace, member, canManage: MANAGER_ROLES.has(member.role) };
}

async function ensureWorkspace(admin: ReturnType<typeof createSupabaseAdmin>, user: { id: string; email?: string | null }, fullName?: string | null) {
  const { data: existing, error: existingError } = await admin
    .from("team_workspaces")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing;

  const { data: workspace, error: createError } = await admin
    .from("team_workspaces")
    .insert({ owner_id: user.id, name: `${fullName || user.email || "Lexalyze"} Team` })
    .select("*")
    .single();

  if (createError) throw createError;

  const ownerMember = await admin
    .from("team_members")
    .upsert({
      workspace_id: workspace.id,
      user_id: user.id,
      email: user.email || "owner@lexalyze.local",
      role: "owner",
      status: "active",
    }, { onConflict: "workspace_id,email" });

  if (ownerMember.error) throw ownerMember.error;

  return workspace;
}

async function workspacePayload(admin: ReturnType<typeof createSupabaseAdmin>, workspaceId: string) {
  const { data: members, error: membersError } = await admin
    .from("team_members")
    .select("id, email, role, status, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (membersError) throw membersError;
  return { members: members ?? [] };
}

export async function GET() {
  const { data: { user } } = await getUser();
  if (!user) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.unauthorized.message, code: "unauthorized" }, { status: 401 });
  }

  try {
    const admin = createSupabaseAdmin();
    const teamCheck = await getTeamContext(admin, user);
    if (teamCheck.error) return teamCheck.error;

    const { workspace, member, canManage } = teamCheck;
    const payload = await workspacePayload(admin, workspace.id);
    return NextResponse.json({ workspace, currentMember: member, canManage, seatLimit: INCLUDED_TEAM_SEATS, ...payload });
  } catch (error) {
    console.error("Team workspace load failed:", error);
    return NextResponse.json({ error: FRIENDLY_ERRORS.load_failed.message, code: "load_failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { data: { user } } = await getUser();
  if (!user) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.unauthorized.message, code: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";

  try {
    const admin = createSupabaseAdmin();
    const teamCheck = await getTeamContext(admin, user);
    if (teamCheck.error) return teamCheck.error;

    const { workspace, member, canManage } = teamCheck;

    if (!canManage) {
      return NextResponse.json({ error: "Only owners and admins can manage seats and roles.", code: "forbidden" }, { status: 403 });
    }

    if (action === "invite") {
      const email = cleanEmail(body.email);
      const role = typeof body.role === "string" && ROLES.has(body.role) ? body.role : "member";
      if (!email || !email.includes("@")) {
        return NextResponse.json({ error: "Enter a valid teammate email.", code: "validation" }, { status: 400 });
      }

      const { count, error: countError } = await admin
        .from("team_members")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspace.id);

      if (countError) throw countError;
      if ((count ?? 0) >= INCLUDED_TEAM_SEATS) {
        return NextResponse.json(
          { error: "The Team plan includes 3 seats. Remove a teammate before inviting another, or add paid seats when payments are connected.", code: "rate_limit_hit" },
          { status: 429 }
        );
      }

      const { error: insertError } = await admin
        .from("team_members")
        .upsert({ workspace_id: workspace.id, email, role, status: "invited" }, { onConflict: "workspace_id,email" });

      if (insertError) throw insertError;
    }

    if (action === "role") {
      const memberId = typeof body.memberId === "string" ? body.memberId : "";
      const role = typeof body.role === "string" && ROLES.has(body.role) ? body.role : "";
      if (!memberId || !role) {
        return NextResponse.json({ error: FRIENDLY_ERRORS.validation.message, code: "validation" }, { status: 400 });
      }

      const { error: updateError } = await admin
        .from("team_members")
        .update({ role })
        .eq("workspace_id", workspace.id)
        .eq("id", memberId)
        .neq("role", "owner");

      if (updateError) throw updateError;
    }

    if (action === "remove") {
      const memberId = typeof body.memberId === "string" ? body.memberId : "";
      if (!memberId) {
        return NextResponse.json({ error: FRIENDLY_ERRORS.validation.message, code: "validation" }, { status: 400 });
      }

      const { error: deleteError } = await admin
        .from("team_members")
        .delete()
        .eq("workspace_id", workspace.id)
        .eq("id", memberId)
        .neq("role", "owner");

      if (deleteError) throw deleteError;
    }

    const payload = await workspacePayload(admin, workspace.id);
    return NextResponse.json({ workspace, currentMember: member, canManage, seatLimit: INCLUDED_TEAM_SEATS, ...payload });
  } catch (error) {
    console.error("Team workspace update failed:", error);
    return NextResponse.json({ error: FRIENDLY_ERRORS.save_failed.message, code: "save_failed" }, { status: 500 });
  }
}
