import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { FRIENDLY_ERRORS } from "@/lib/error-handling";
import { normalizePlan } from "@/lib/plans";
import { cleanupExpiredAnalyses } from "@/lib/plan-maintenance";

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

export async function POST() {
  const { data: { user } } = await getUser();
  if (!user) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.unauthorized.message, code: "unauthorized" }, { status: 401 });
  }

  try {
    const admin = createSupabaseAdmin();
    const { data: profile } = await admin
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .maybeSingle();

    const deleted = await cleanupExpiredAnalyses(admin, user.id, normalizePlan(profile?.plan));
    return NextResponse.json({ deleted });
  } catch (error) {
    console.error("Retention cleanup failed:", error);
    return NextResponse.json({ error: FRIENDLY_ERRORS.delete_failed.message, code: "delete_failed" }, { status: 500 });
  }
}
