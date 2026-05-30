import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let email = "";

  try {
    const body = await request.json();
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    const admin = createSupabaseAdmin();
    let page = 1;
    const perPage = 1000;

    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });

      if (error) {
        return NextResponse.json(
          { error: "Could not check this account right now. Please try again." },
          { status: 500 }
        );
      }

      const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
      if (user) {
        const providers = Array.isArray(user.app_metadata?.providers)
          ? user.app_metadata.providers.filter((provider): provider is string => typeof provider === "string")
          : [];

        return NextResponse.json({
          exists: true,
          providers,
          hasPassword: providers.includes("email"),
        });
      }

      if (data.users.length < perPage) break;
      page += 1;
    }

    return NextResponse.json({ exists: false, providers: [], hasPassword: false });
  } catch {
    return NextResponse.json(
      { error: "Could not check this account right now. Please try again." },
      { status: 500 }
    );
  }
}
