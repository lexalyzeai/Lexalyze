import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

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

export async function DELETE() {
  const { data: { user } } = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createSupabaseAdmin();

    const { data: rows, error: fetchError } = await admin
      .from("analyses")
      .select("id")
      .eq("user_id", user.id);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const ids = (rows || []).map((row) => row.id);

    if (ids.length > 0) {
      const { error: followupError } = await admin
        .from("followups")
        .delete()
        .in("analysis_id", ids);

      if (followupError) {
        return NextResponse.json({ error: followupError.message }, { status: 500 });
      }
    }

    const { error: analysisError } = await admin
      .from("analyses")
      .delete()
      .eq("user_id", user.id);

    if (analysisError) {
      return NextResponse.json({ error: analysisError.message }, { status: 500 });
    }

    return NextResponse.json({ deleted: ids.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "History deletion failed." },
      { status: 500 }
    );
  }
}

