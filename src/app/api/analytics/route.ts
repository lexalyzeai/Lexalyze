import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { FRIENDLY_ERRORS } from "@/lib/error-handling";
import { isLaunchAnalyticsEvent, sanitizeAnalyticsProperties } from "@/lib/analytics-events";

function cleanText(value: unknown, max = 120) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanProperties(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
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

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const event = cleanText(body.event, 80);

  if (!event) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.validation.message, code: "validation" }, { status: 400 });
  }

  if (!isLaunchAnalyticsEvent(event)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const { data: { user } } = await getUser();
    const admin = createSupabaseAdmin();

    const anonymousId = cleanText(body.anonymousId, 80) || null;
    const properties = sanitizeAnalyticsProperties(event, cleanProperties(body.properties));

    const { error } = await admin
      .from("analytics_events")
      .insert({
        event,
        properties,
        anonymous_id: anonymousId,
        user_id: user?.id ?? null,
        source: "web",
        user_agent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
      });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Analytics event save failed:", error);
    return NextResponse.json({ error: FRIENDLY_ERRORS.save_failed.message, code: "save_failed" }, { status: 500 });
  }
}
