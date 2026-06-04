import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { FRIENDLY_ERRORS } from "@/lib/error-handling";

const PLANS = new Set(["solo", "team"]);

function cleanEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email && email.includes("@") ? email.slice(0, 254) : null;
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
  const plan = typeof body.plan === "string" ? body.plan : "";

  if (!PLANS.has(plan)) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.validation.message, code: "validation" }, { status: 400 });
  }

  try {
    const { data: { user } } = await getUser();
    const admin = createSupabaseAdmin();

    const { error } = await admin
      .from("upgrade_interest")
      .insert({
        plan,
        email: cleanEmail(body.email),
        source: "pricing",
        user_id: user?.id ?? null,
        user_agent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
      });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Upgrade interest save failed:", error);
    return NextResponse.json({ error: FRIENDLY_ERRORS.save_failed.message, code: "save_failed" }, { status: 500 });
  }
}
