import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { FRIENDLY_ERRORS } from "@/lib/error-handling";

function cleanText(value: unknown, max = 1200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

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

export async function GET(req: NextRequest) {
  const { data: { user } } = await getUser();
  if (!user) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.unauthorized.message, code: "unauthorized" }, { status: 401 });
  }

  const analysisId = req.nextUrl.searchParams.get("analysisId") || "";
  if (!analysisId) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.validation.message, code: "validation" }, { status: 400 });
  }

  try {
    const admin = createSupabaseAdmin();
    const { data: analysis, error: analysisError } = await admin
      .from("analyses")
      .select("id")
      .eq("id", analysisId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (analysisError) throw analysisError;
    if (!analysis) {
      return NextResponse.json({ error: FRIENDLY_ERRORS.not_found.message, code: "not_found" }, { status: 404 });
    }

    const { data, error } = await admin
      .from("share_feedback")
      .select("id, kind, author_name, body, suggested_text, created_at")
      .eq("analysis_id", analysis.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ feedback: data || [] });
  } catch (error) {
    console.error("Owner feedback lookup failed:", error);
    return NextResponse.json({ error: FRIENDLY_ERRORS.load_failed.message, code: "load_failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = cleanText(body.token, 64);
  const kind = body.kind === "edit" ? "edit" : "comment";
  const authorName = cleanText(body.authorName, 80) || "Reviewer";
  const text = cleanText(body.body);
  const suggestedText = cleanText(body.suggestedText);

  if (!/^[a-f0-9]{32}$/i.test(token) || !text) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.validation.message, code: "validation" }, { status: 400 });
  }

  try {
    const admin = createSupabaseAdmin();
    const { data: analysis, error: analysisError } = await admin
      .from("analyses")
      .select("id, share_token, share_enabled, share_mode")
      .eq("share_token", token)
      .eq("share_enabled", true)
      .maybeSingle();

    if (analysisError) throw analysisError;
    if (!analysis) {
      return NextResponse.json({ error: FRIENDLY_ERRORS.not_found.message, code: "not_found" }, { status: 404 });
    }

    if (analysis.share_mode === "view") {
      return NextResponse.json({ error: "This shared report is view-only.", code: "forbidden" }, { status: 403 });
    }

    if (kind === "edit" && analysis.share_mode !== "edit") {
      return NextResponse.json({ error: "Edit suggestions are not enabled for this shared report.", code: "forbidden" }, { status: 403 });
    }

    const { data, error } = await admin
      .from("share_feedback")
      .insert({
        analysis_id: analysis.id,
        share_token: token,
        kind,
        author_name: authorName,
        body: text,
        suggested_text: suggestedText || null,
      })
      .select("id, kind, author_name, body, suggested_text, created_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ feedback: data });
  } catch (error) {
    console.error("Shared feedback save failed:", error);
    return NextResponse.json({ error: FRIENDLY_ERRORS.save_failed.message, code: "save_failed" }, { status: 500 });
  }
}
