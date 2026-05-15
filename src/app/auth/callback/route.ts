import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const returnTo = requestUrl.searchParams.get('returnTo') || '/dashboard'
  const flow = requestUrl.searchParams.get('flow')

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },

          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data, error } =
      await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      if (
        error.message.includes('already registered') ||
        error.message.includes('already exists') ||
        error.message.includes('provider')
      ) {
        return NextResponse.redirect(
          new URL('/auth/login?error=account_exists', request.url)
        )
      }

      return NextResponse.redirect(
        new URL('/auth/login?error=auth_failed', request.url)
      )
    }

    if (data.user) {
      const providers =
        data.user.app_metadata?.providers || []

      const createdAt = new Date(
        data.user.created_at
      ).getTime()

      const now = Date.now()

      const isNewUser = now - createdAt < 10000

      // Block Google signup if email account already exists
      if (
        flow === 'signup' &&
        providers.includes('google') &&
        providers.includes('email') &&
        !isNewUser
      ) {
        await supabase.auth.signOut()

        return NextResponse.redirect(
          new URL(
            '/auth/signup?error=account_exists',
            request.url
          )
        )
      } 
    }

    if (next !== '/dashboard') {
      return NextResponse.redirect(
        new URL(next, request.url)
      )
    }

    return NextResponse.redirect(
      new URL(returnTo, request.url)
    )
  }

  return NextResponse.redirect(
    new URL('/auth/login?error=auth_failed', request.url)
  )
}