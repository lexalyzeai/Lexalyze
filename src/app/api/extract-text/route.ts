import { extractText } from 'unpdf'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_TEXT_LENGTH = 12000
const ALLOWED_TYPES = ['application/pdf', 'text/plain', 'image/png', 'image/jpeg']
const FREE_LIMIT = 10

export async function POST(req: NextRequest) {
  // Auth check
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

  // Get file from form data
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 })
  }

  // File size check
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 })
  }

  // File type check
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Unsupported file type. Please upload a PDF, TXT, PNG, or JPG.' },
      { status: 400 }
    )
  }

  try {
    let text = ''
    const buffer = Buffer.from(await file.arrayBuffer())

    if (file.type === 'application/pdf') {
      const { text: pdfText } = await extractText(new Uint8Array(buffer))
      text = pdfText.join('\n')
    } else if (file.type === 'text/plain') {
      text = buffer.toString('utf-8')
    } else if (file.type === 'image/png' || file.type === 'image/jpeg') {
      text = buffer.toString('base64')
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Could not extract text from this file.' },
        { status: 400 }
      )
    }

    // Trim to 50,000 characters
    // Strip HTML and script tags
text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
text = text.replace(/<[^>]+>/g, '')
text = text.trim()
// Trim to 50,000 characters
text = text.slice(0, MAX_TEXT_LENGTH) 

    return NextResponse.json({ text })

  } catch (err) {
    const error =
      err instanceof Error
        ? { message: err.message, stack: err.stack }
        : { message: String(err) }

    console.error('[/api/extract-text] Extraction error', {
      userId: user.id,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      error,
    })

    // Temporary: surface real error message to help debugging.
    const clientMessage =
      error.message || 'Could not read this file. It may be corrupted.'

    return NextResponse.json(
      {
        error: 'Could not read this file. It may be corrupted.',
        debugError: clientMessage,
      },
      { status: 400 }
    )
  }
}