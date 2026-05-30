import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { FRIENDLY_ERRORS } from "@/lib/error-handling";

function cleanText(value: unknown, max = 1200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
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
