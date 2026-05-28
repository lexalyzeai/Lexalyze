import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { analyzeDocument } from '@/lib/groq'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { currentUsageMonth, normalizePlan, PLAN_LIMITS } from '@/lib/plans'

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

  const { text, language, filename } = await req.json()

  if (!text || text.trim().length === 0) {
    return NextResponse.json({ error: 'No document text provided.' }, { status: 400 })
  }

  try {
    const admin = createSupabaseAdmin()
    const usageMonth = currentUsageMonth()

    const { data: profile } = await admin
      .from('profiles')
      .select('id, full_name, analyses_used, plan, usage_month, monthly_analyses_used')
      .eq('id', user.id)
      .maybeSingle()

    const plan = normalizePlan(profile?.plan)
    const limit = PLAN_LIMITS[plan].monthlyDocuments
    const used = profile?.usage_month === usageMonth ? profile.monthly_analyses_used ?? 0 : 0

    if (limit !== null && used >= limit) {
      const nextPlan = plan === 'free' ? 'Solo' : 'Team'
      return NextResponse.json(
        { error: `Monthly limit reached (${limit} documents on ${plan === 'free' ? 'Starter' : 'Solo'} plan). Upgrade to ${nextPlan} to continue.` },
        { status: 429 }
      )
    }

    const result = await analyzeDocument(text, language || 'en')

    const { data: analysis, error: saveError } = await supabase
      .from('analyses')
      .insert({
        user_id: user.id,
        filename: filename || 'document',
        language: language || 'en',
        result,
        title: result.documentTitle,
        document_text: text,
      })
      .select()
      .single()

    if (saveError) {
      console.error('Save error:', saveError)
      return NextResponse.json({ error: 'Analysis could not be saved. Please try again.' }, { status: 500 })
    }

    await admin
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: profile?.full_name ?? user.user_metadata?.full_name ?? null,
        analyses_used: (profile?.analyses_used ?? 0) + 1,
        plan,
        usage_month: usageMonth,
        monthly_analyses_used: used + 1,
      })

    return NextResponse.json({ result, analysisId: analysis?.id })

  } catch (err) {
    console.error('Analysis error:', err)

    const message = err instanceof Error ? err.message : ''
    const isRateLimit = message.includes('429') || message.includes('rate_limit')

    return NextResponse.json(
      {
        error: isRateLimit
          ? 'Our AI is temporarily at capacity. Please try again in a few minutes.'
          : 'Analysis failed. Please try again.'
      },
      { status: isRateLimit ? 503 : 500 }
    )
  }
}
