import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

const GOOGLE_SIGNUP_MARKER = 'lexalyze_google_signup_completed_at'
const GOOGLE_SIGNUP_FRESHNESS_MS = 60000

function getProviders(user: { app_metadata?: { providers?: unknown } }) {
  const providers = user.app_metadata?.providers
  return Array.isArray(providers)
    ? providers.filter((provider): provider is string => typeof provider === 'string')
    : []
}

function getCreatedAtMs(value?: string) {
  if (!value) return 0
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

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
      const providers = getProviders(data.user)
      const createdAt = getCreatedAtMs(data.user.created_at)
      const now = Date.now()
      const hasCompletedGoogleSignup = Boolean(
        data.user.app_metadata?.[GOOGLE_SIGNUP_MARKER]
      )

      const isGoogleOnlyUser =
        providers.length === 1 &&
        providers.includes('google')
      const isFreshGoogleUser =
        isGoogleOnlyUser &&
        now - createdAt < GOOGLE_SIGNUP_FRESHNESS_MS
      const isAllowedNewGoogleSignup =
        isFreshGoogleUser && !hasCompletedGoogleSignup

      if (flow === 'signup') {
        if (!isAllowedNewGoogleSignup) {
          await supabase.auth.signOut()

          return NextResponse.redirect(
            new URL(
              '/auth/signup?error=account_exists',
              request.url
            )
          )
        }

        try {
          const admin = createSupabaseAdmin()
          const { error: markerError } = await admin.auth.admin.updateUserById(data.user.id, {
            app_metadata: {
              ...data.user.app_metadata,
              [GOOGLE_SIGNUP_MARKER]: new Date().toISOString(),
            },
          })

          if (markerError) {
            throw markerError
          }
        } catch (metadataError) {
          console.error('Could not mark completed Google signup:', metadataError)

          await supabase.auth.signOut()

          return NextResponse.redirect(
            new URL('/auth/signup?error=auth_failed', request.url)
          )
        }
      }

      if (
        flow === 'login' &&
        isFreshGoogleUser &&
        !hasCompletedGoogleSignup
      ) {
        try {
          const admin = createSupabaseAdmin()
          await admin.auth.admin.deleteUser(data.user.id)
        } catch (deleteError) {
          console.error('Could not delete blocked OAuth signup:', deleteError)
        }

        await supabase.auth.signOut()

        return NextResponse.redirect(
          new URL(
            '/auth/login?error=no_account',
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
