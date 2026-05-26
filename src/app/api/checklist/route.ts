import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { analysisId, checklist } = await req.json()

  if (!analysisId || !Array.isArray(checklist) || checklist.some((item) => typeof item !== 'boolean')) {
    return NextResponse.json({ error: 'Invalid checklist payload.' }, { status: 400 })
  }

  const { data: analysis, error: fetchError } = await supabase
    .from('analyses')
    .select('id, result')
    .eq('id', analysisId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !analysis) {
    return NextResponse.json({ error: 'Analysis not found.' }, { status: 404 })
  }

  const nextResult = {
    ...((analysis.result as Record<string, unknown>) ?? {}),
    checkbox: checklist,
    checklistState: checklist,
  }

  const { error: resultError } = await supabase
    .from('analyses')
    .update({ result: nextResult })
    .eq('id', analysisId)
    .eq('user_id', user.id)

  if (resultError) {
    return NextResponse.json({ error: resultError.message || 'Checklist save failed.' }, { status: 500 })
  }

  await supabase
    .from('analyses')
    .update({ checkbox: checklist })
    .eq('id', analysisId)
    .eq('user_id', user.id)

  return NextResponse.json({ checklist })
}
