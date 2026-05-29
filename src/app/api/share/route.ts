import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { FRIENDLY_ERRORS } from "@/lib/error-handling";
import { normalizePlan } from "@/lib/plans";

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

function shareUrl(req: NextRequest, token: string) {
  const origin = req.headers.get("origin") || new URL(req.url).origin;
  return `${origin}/share/${token}`;
}

export async function POST(req: NextRequest) {
  const { data: { user } } = await getUser();
  if (!user) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.unauthorized.message, code: "unauthorized" }, { status: 401 });
  }

  const { analysisId } = await req.json().catch(() => ({ analysisId: "" }));
  if (!analysisId || typeof analysisId !== "string") {
    return NextResponse.json({ error: FRIENDLY_ERRORS.validation.message, code: "validation" }, { status: 400 });
  }

  try {
    const admin = createSupabaseAdmin();
    const { data: profile } = await admin
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .maybeSingle();

    const plan = normalizePlan(profile?.plan);
    if (plan === "free") {
      return NextResponse.json({ error: "Sharing is available on Solo and Team plans.", code: "forbidden" }, { status: 403 });
    }

    const { data: analysis, error: fetchError } = await admin
      .from("analyses")
      .select("id, share_token, share_enabled")
      .eq("id", analysisId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!analysis) {
      return NextResponse.json({ error: FRIENDLY_ERRORS.not_found.message, code: "not_found" }, { status: 404 });
    }

    if (analysis.share_enabled && analysis.share_token) {
      return NextResponse.json({ url: shareUrl(req, analysis.share_token) });
    }

    const token = crypto.randomUUID().replace(/-/g, "");
    const { data: updated, error: updateError } = await admin
      .from("analyses")
      .update({ share_enabled: true, share_token: token, share_created_at: new Date().toISOString() })
      .eq("id", analysisId)
      .eq("user_id", user.id)
      .select("share_token")
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ url: shareUrl(req, updated.share_token) });
  } catch (error) {
    console.error("Share link creation failed:", error);
    return NextResponse.json({ error: FRIENDLY_ERRORS.share_failed.message, code: "share_failed" }, { status: 500 });
  }
}
