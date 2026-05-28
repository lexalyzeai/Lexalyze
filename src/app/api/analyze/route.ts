import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { analyzeDocument } from '@/lib/groq'

const FREE_MONTHLY_LIMIT = 5
const SOLO_MONTHLY_LIMIT = 30

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

  // Get user plan from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const plan = profile?.plan || 'free'

  // Count analyses this calendar month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count: monthlyCount } = await supabase
    .from('analyses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', startOfMonth.toISOString())

  const used = monthlyCount ?? 0

  if (plan === 'free' && used >= FREE_MONTHLY_LIMIT) {
    return NextResponse.json(
      { error: `Monthly limit reached (${FREE_MONTHLY_LIMIT} documents on Starter plan). Upgrade to Solo for 30 documents per month.` },
      { status: 429 }
    )
  }

  if (plan === 'solo' && used >= SOLO_MONTHLY_LIMIT) {
    return NextResponse.json(
      { error: `Monthly limit reached (${SOLO_MONTHLY_LIMIT} documents on Solo plan). Upgrade to Team for unlimited documents.` },
      { status: 429 }
    )
  }

  const { text, language, filename } = await req.json()

  if (!text || text.trim().length === 0) {
    return NextResponse.json({ error: 'No document text provided.' }, { status: 400 })
  }

  try {
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
    }

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
