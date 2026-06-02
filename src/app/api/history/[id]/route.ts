import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { FRIENDLY_ERRORS } from "@/lib/error-handling";
import { deleteAnalysesById } from "@/lib/plan-maintenance";
import { getAnalysisAccess } from "@/lib/team-workspace";

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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data: { user } } = await getUser();

  if (!user) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.unauthorized.message, code: "unauthorized" }, { status: 401 });
  }

  try {
    const admin = createSupabaseAdmin();

    const access = await getAnalysisAccess(admin, user, id);

    if (!access) {
      return NextResponse.json({ error: FRIENDLY_ERRORS.not_found.message, code: "not_found" }, { status: 404 });
    }

    if (!access.canWrite) {
      return NextResponse.json({ error: "Viewers can read team analyses but cannot delete them.", code: "forbidden" }, { status: 403 });
    }

    await deleteAnalysesById(admin, user.id, [id], access.analysis.workspace_id || null);

    return NextResponse.json({ deleted: id });
  } catch (error) {
    console.error("Analysis delete failed:", error);
    return NextResponse.json(
      { error: FRIENDLY_ERRORS.delete_failed.message, code: "delete_failed" },
      { status: 500 }
    );
  }
}
