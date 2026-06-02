import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { FRIENDLY_ERRORS } from '@/lib/error-handling'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { getAnalysisAccess } from '@/lib/team-workspace'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.unauthorized.message, code: 'unauthorized' }, { status: 401 })
  }

  const { analysisId, checklist } = await req.json().catch(() => ({ analysisId: null, checklist: null }))

  if (!analysisId || !Array.isArray(checklist) || checklist.some((item) => typeof item !== 'boolean')) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.validation.message, code: 'validation' }, { status: 400 })
  }

  const admin = createSupabaseAdmin()
  const access = await getAnalysisAccess(admin, user, analysisId)

  if (!access) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.not_found.message, code: 'not_found' }, { status: 404 })
  }

  if (!access.canWrite) {
    return NextResponse.json({ error: 'Viewers can read team analyses but cannot edit checklist progress.', code: 'forbidden' }, { status: 403 })
  }

  const { data: analysis, error: fetchError } = await admin
    .from('analyses')
    .select('id, result')
    .eq('id', analysisId)
    .single()

  if (fetchError || !analysis) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.not_found.message, code: 'not_found' }, { status: 404 })
  }

  const nextResult = {
    ...((analysis.result as Record<string, unknown>) ?? {}),
    checkbox: checklist,
    checklistState: checklist,
  }

  const { error: resultError } = await admin
    .from('analyses')
    .update({ result: nextResult, checklist_state: checklist })
    .eq('id', analysisId)

  if (resultError) {
    console.error('Checklist save failed:', resultError)
    return NextResponse.json({ error: FRIENDLY_ERRORS.checklist_save_failed.message, code: 'checklist_save_failed' }, { status: 500 })
  }

  return NextResponse.json({ checklist })
}
