import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { FRIENDLY_ERRORS } from "@/lib/error-handling";
import { normalizePlan } from "@/lib/plans";

const INCLUDED_TEAM_SEATS = 3;
const ROLES = new Set(["admin", "member", "viewer"]);

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

function cleanName(name: unknown) {
  return typeof name === "string" ? name.trim().slice(0, 80) : "";
}

async function assertTeamUser(admin: ReturnType<typeof createSupabaseAdmin>, userId: string) {
  const { data: profile, error } = await admin
    .from("profiles")
    .select("plan, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (normalizePlan(profile?.plan) !== "team") {
    return { error: NextResponse.json({ error: "Team workspace is available on the Team plan.", code: "forbidden" }, { status: 403 }) };
  }

  return { profile };
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

  await admin
    .from("team_members")
    .upsert({
      workspace_id: workspace.id,
      user_id: user.id,
      email: user.email || "owner@lexalyze.local",
      role: "owner",
      status: "active",
    }, { onConflict: "workspace_id,email" });

  return workspace;
}

async function workspacePayload(admin: ReturnType<typeof createSupabaseAdmin>, workspaceId: string) {
  const [{ data: members, error: membersError }, { data: folders, error: foldersError }] = await Promise.all([
    admin
      .from("team_members")
      .select("id, email, role, status, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true }),
    admin
      .from("team_folders")
      .select("id, name, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true }),
  ]);

  if (membersError) throw membersError;
  if (foldersError) throw foldersError;
  return { members: members ?? [], folders: folders ?? [] };
}

export async function GET() {
  const { data: { user } } = await getUser();
  if (!user) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.unauthorized.message, code: "unauthorized" }, { status: 401 });
  }

  try {
    const admin = createSupabaseAdmin();
    const teamCheck = await assertTeamUser(admin, user.id);
    if (teamCheck.error) return teamCheck.error;

    const workspace = await ensureWorkspace(admin, user, teamCheck.profile?.full_name);
    const payload = await workspacePayload(admin, workspace.id);
    return NextResponse.json({ workspace, seatLimit: INCLUDED_TEAM_SEATS, ...payload });
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
    const teamCheck = await assertTeamUser(admin, user.id);
    if (teamCheck.error) return teamCheck.error;

    const workspace = await ensureWorkspace(admin, user, teamCheck.profile?.full_name);

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

    if (action === "folder") {
      const name = cleanName(body.name);
      if (!name) {
        return NextResponse.json({ error: "Folder name is required.", code: "validation" }, { status: 400 });
      }

      const { error: folderError } = await admin
        .from("team_folders")
        .insert({ workspace_id: workspace.id, name, created_by: user.id });

      if (folderError) throw folderError;
    }

    if (action === "assignFolder") {
      const analysisId = typeof body.analysisId === "string" ? body.analysisId : "";
      const folderId = typeof body.folderId === "string" && body.folderId ? body.folderId : null;
      if (!analysisId) {
        return NextResponse.json({ error: FRIENDLY_ERRORS.validation.message, code: "validation" }, { status: 400 });
      }

      if (folderId) {
        const { data: folder } = await admin
          .from("team_folders")
          .select("id")
          .eq("workspace_id", workspace.id)
          .eq("id", folderId)
          .maybeSingle();

        if (!folder) {
          return NextResponse.json({ error: FRIENDLY_ERRORS.not_found.message, code: "not_found" }, { status: 404 });
        }
      }

      const { error: assignError } = await admin
        .from("analyses")
        .update({ folder_id: folderId })
        .eq("user_id", user.id)
        .eq("id", analysisId);

      if (assignError) throw assignError;
    }

    const payload = await workspacePayload(admin, workspace.id);
    return NextResponse.json({ workspace, seatLimit: INCLUDED_TEAM_SEATS, ...payload });
  } catch (error) {
    console.error("Team workspace update failed:", error);
    return NextResponse.json({ error: FRIENDLY_ERRORS.save_failed.message, code: "save_failed" }, { status: 500 });
  }
}
