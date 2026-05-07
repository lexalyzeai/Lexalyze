import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { analyzeDocument } from '@/lib/gemini'

const FREE_LIMIT = 10

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

  // Rate limit check
  const { data: profile } = await supabase
    .from('profiles')
    .select('analyses_used')
    .eq('id', user.id)
    .single()

  if (profile && profile.analyses_used >= FREE_LIMIT) {
    return NextResponse.json(
      { error: 'Daily limit reached. Try again tomorrow.' },
      { status: 429 }
    )
  }

  const { text, language, filename } = await req.json()

  if (!text || text.trim().length === 0) {
    return NextResponse.json({ error: 'No document text provided.' }, { status: 400 })
  }

  try {
    const result = await analyzeDocument(text, language || 'en')

    // Save to analyses table
    const { data: analysis, error: saveError } = await supabase
      .from('analyses')
      .insert({
        user_id: user.id,
        filename: filename || 'document',
        language: language || 'en',
        result,
        title: result.documentTitle,
      })
      .select()
      .single()

    if (saveError) {
      console.error('Save error:', saveError)
    }

    // Increment analyses_used
    await supabase
      .from('profiles')
      .update({ analyses_used: (profile?.analyses_used ?? 0) + 1 })
      .eq('id', user.id)

    return NextResponse.json({ result, analysisId: analysis?.id })

  } catch (err) {
    console.error('Analysis error:', err)
    return NextResponse.json(
      { error: 'Analysis failed. Please try again.' },
      { status: 500 }
    )
  }
}