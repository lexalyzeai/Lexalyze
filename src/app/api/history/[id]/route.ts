import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data: { user } } = await getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createSupabaseAdmin();

    const { data: analysis, error: fetchError } = await admin
      .from("analyses")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !analysis) {
      return NextResponse.json({ error: "Analysis not found." }, { status: 404 });
    }

    const { error: followupError } = await admin
      .from("followups")
      .delete()
      .eq("analysis_id", id);

    if (followupError) {
      return NextResponse.json({ error: followupError.message }, { status: 500 });
    }

    const { error: analysisError } = await admin
      .from("analyses")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (analysisError) {
      return NextResponse.json({ error: analysisError.message }, { status: 500 });
    }

    return NextResponse.json({ deleted: id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis deletion failed." },
      { status: 500 }
    );
  }
}

