import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { FRIENDLY_ERRORS } from '@/lib/error-handling'

function cleanValue(value: unknown, fallback = '') {
  if (typeof value !== 'string') return fallback
  return value.trim().slice(0, 120) || fallback
}

async function getClients() {
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
  const { data: { session } } = await supabase.auth.getSession()
  return { supabase, admin: createSupabaseAdmin(), user, session }
}

export async function GET() {
  const { admin, user } = await getClients()
  if (!user) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.unauthorized.message, code: 'unauthorized' }, { status: 401 })
  }

  const { data, error } = await admin
    .from('user_sessions')
    .select('id, device_id, device_name, browser_name, os_name, created_at, last_seen')
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .order('last_seen', { ascending: false })

  if (error) {
    console.error('Session list failed:', error)
    return NextResponse.json({ error: FRIENDLY_ERRORS.load_failed.message, code: 'load_failed' }, { status: 500 })
  }

  return NextResponse.json({ sessions: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { admin, user } = await getClients()
  if (!user) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.unauthorized.message, code: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const deviceId = cleanValue(body.deviceId)

  if (!deviceId) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.validation.message, code: 'validation' }, { status: 400 })
  }

  const record = {
    user_id: user.id,
    device_id: deviceId,
    device_name: cleanValue(body.deviceName, 'Unknown device'),
    browser_name: cleanValue(body.browserName, 'Unknown browser'),
    os_name: cleanValue(body.osName, 'Unknown OS'),
    last_seen: new Date().toISOString(),
    revoked_at: null,
  }

  const { data, error } = await admin
    .from('user_sessions')
    .upsert(record, { onConflict: 'user_id,device_id' })
    .select('id, device_id, device_name, browser_name, os_name, created_at, last_seen')
    .single()

  if (error) {
    console.error('Session upsert failed:', error)
    return NextResponse.json({ error: FRIENDLY_ERRORS.save_failed.message, code: 'save_failed' }, { status: 500 })
  }

  return NextResponse.json({ session: data })
}

export async function DELETE(req: NextRequest) {
  const { admin, user, session } = await getClients()
  if (!user || !session?.access_token) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.unauthorized.message, code: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const deviceId = cleanValue(body.deviceId)

  if (deviceId) {
    const { error } = await admin
      .from('user_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('device_id', deviceId)
      .is('revoked_at', null)

    if (error) {
      console.error('Current session revoke marking failed:', error)
      return NextResponse.json({ error: FRIENDLY_ERRORS.save_failed.message, code: 'save_failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  const { error: markError } = await admin
    .from('user_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('revoked_at', null)

  if (markError) {
    console.error('Session revoke marking failed:', markError)
    return NextResponse.json({ error: FRIENDLY_ERRORS.save_failed.message, code: 'save_failed' }, { status: 500 })
  }

  const { error: signOutError } = await admin.auth.admin.signOut(session.access_token, 'global')
  if (signOutError) {
    console.error('Global sign out failed:', signOutError)
    return NextResponse.json({ error: 'Could not sign out all devices. Please try again.', code: 'api_failure' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
