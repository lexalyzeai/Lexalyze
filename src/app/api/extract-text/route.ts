import { extractText } from 'unpdf'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { FRIENDLY_ERRORS } from '@/lib/error-handling'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_TEXT_LENGTH = 12000
const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]

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

  const formData = await req.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.validation.message, code: 'validation' }, { status: 400 })
  }
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.validation.message, code: 'validation' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.file_too_large.message, code: 'file_too_large' }, { status: 400 })
  }

  const isDocx = file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')
  const effectiveType = isDocx
    ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    : file.type

  if (!ALLOWED_TYPES.includes(effectiveType)) {
    return NextResponse.json(
      { error: FRIENDLY_ERRORS.unsupported_file_type.message, code: 'unsupported_file_type' },
      { status: 400 }
    )
  }

  try {
    let text = ''
    const buffer = Buffer.from(await file.arrayBuffer())

    if (effectiveType === 'application/pdf') {
      const { text: pdfText } = await extractText(new Uint8Array(buffer))
      text = pdfText.join('\n')
    } else if (effectiveType === 'text/plain') {
      text = buffer.toString('utf-8')
    } else if (effectiveType === 'image/png' || effectiveType === 'image/jpeg') {
      text = buffer.toString('base64')
    } else if (
      effectiveType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      effectiveType === 'application/msword'
    ) {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: FRIENDLY_ERRORS.no_text_extracted.message, code: 'no_text_extracted' },
        { status: 400 }
      )
    }

    text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    text = text.replace(/<[^>]+>/g, '')
    text = text.trim()
    text = text.slice(0, MAX_TEXT_LENGTH)

    return NextResponse.json({ text })

  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error('[/api/extract-text] Extraction error', { userId: user.id, fileName: file.name, error })
    return NextResponse.json(
      { error: FRIENDLY_ERRORS.parse_error.message, code: 'parse_error' },
      { status: 400 }
    )
  }
}
