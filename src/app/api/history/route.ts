import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { FRIENDLY_ERRORS } from "@/lib/error-handling";
import { deleteAnalysesById } from "@/lib/plan-maintenance";
import { getWorkspaceMembership, TEAM_WRITE_ROLES } from "@/lib/team-workspace";

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

function workspaceIdFrom(req: NextRequest) {
  return req.nextUrl.searchParams.get("workspaceId") || "";
}

export async function GET(req: NextRequest) {
  const { data: { user } } = await getUser();
  if (!user) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.unauthorized.message, code: "unauthorized" }, { status: 401 });
  }

  const workspaceId = workspaceIdFrom(req);

  try {
    const admin = createSupabaseAdmin();
    let query = admin
      .from("analyses")
      .select("*")
      .order("created_at", { ascending: false });

    if (workspaceId) {
      const member = await getWorkspaceMembership(admin, user, workspaceId);
      if (!member) {
        return NextResponse.json({ error: "You do not have access to this team workspace.", code: "forbidden" }, { status: 403 });
      }
      query = query.eq("workspace_id", workspaceId);
    } else {
      query = query.eq("user_id", user.id).is("workspace_id", null);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ analyses: data || [] });
  } catch (error) {
    console.error("History load failed:", error);
    return NextResponse.json({ error: FRIENDLY_ERRORS.load_failed.message, code: "load_failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { data: { user } } = await getUser();
  if (!user) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.unauthorized.message, code: "unauthorized" }, { status: 401 });
  }

  try {
    const admin = createSupabaseAdmin();
    const workspaceId = workspaceIdFrom(req);
    let canDelete = true;

    if (workspaceId) {
      const member = await getWorkspaceMembership(admin, user, workspaceId);
      canDelete = Boolean(member && TEAM_WRITE_ROLES.has(member.role));
      if (!member) {
        return NextResponse.json({ error: "You do not have access to this team workspace.", code: "forbidden" }, { status: 403 });
      }
    }

    if (!canDelete) {
      return NextResponse.json({ error: "Viewers can read team analyses but cannot delete them.", code: "forbidden" }, { status: 403 });
    }

    let query = admin
      .from("analyses")
      .select("id");

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    } else {
      query = query.eq("user_id", user.id).is("workspace_id", null);
    }

    const { data: rows, error: fetchError } = await query;

    if (fetchError) {
      console.error("History fetch before delete failed:", fetchError);
      return NextResponse.json({ error: FRIENDLY_ERRORS.delete_failed.message, code: "delete_failed" }, { status: 500 });
    }

    const ids = (rows || []).map((row) => row.id);

    await deleteAnalysesById(admin, user.id, ids, workspaceId || null);

    return NextResponse.json({ deleted: ids.length });
  } catch (error) {
    console.error("History delete failed:", error);
    return NextResponse.json(
      { error: FRIENDLY_ERRORS.delete_failed.message, code: "delete_failed" },
      { status: 500 }
    );
  }
}
