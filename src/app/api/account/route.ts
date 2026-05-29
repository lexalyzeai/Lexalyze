import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { FRIENDLY_ERRORS } from "@/lib/error-handling";

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
    return NextResponse.json({ error: FRIENDLY_ERRORS.unauthorized.message, code: "unauthorized" }, { status: 401 });
  }

  try {
    const admin = createSupabaseAdmin();

    const { data: rows, error: fetchError } = await admin
      .from("analyses")
      .select("id")
      .eq("user_id", user.id);

    if (fetchError) {
      console.error("Account delete fetch failed:", fetchError);
      return NextResponse.json({ error: FRIENDLY_ERRORS.delete_failed.message, code: "delete_failed" }, { status: 500 });
    }

    const ids = (rows || []).map((row) => row.id);

    if (ids.length > 0) {
      const { error: followupError } = await admin
        .from("followups")
        .delete()
        .in("analysis_id", ids);

      if (followupError) {
        console.error("Account followup delete failed:", followupError);
        return NextResponse.json({ error: FRIENDLY_ERRORS.delete_failed.message, code: "delete_failed" }, { status: 500 });
      }
    }

    const { error: analysisError } = await admin
      .from("analyses")
      .delete()
      .eq("user_id", user.id);

    if (analysisError) {
      console.error("Account analysis delete failed:", analysisError);
      return NextResponse.json({ error: FRIENDLY_ERRORS.delete_failed.message, code: "delete_failed" }, { status: 500 });
    }

    await admin.from("profiles").delete().eq("id", user.id);

    const { error: userError } = await admin.auth.admin.deleteUser(user.id);
    if (userError) {
      console.error("Supabase user delete failed:", userError);
      return NextResponse.json({ error: FRIENDLY_ERRORS.delete_failed.message, code: "delete_failed" }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json(
      { error: FRIENDLY_ERRORS.delete_failed.message, code: "delete_failed" },
      { status: 500 }
    );
  }
}
