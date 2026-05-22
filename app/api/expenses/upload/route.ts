export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { filename, contentType } = await req.json()
    if (!filename || !contentType) {
      return NextResponse.json({ error: 'filename and contentType are required' }, { status: 400 })
    }

    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${userId}/${Date.now()}-${sanitized}`

    const supabase = createServerClient()
    const { data, error } = await supabase.storage.from('receipts').createSignedUploadUrl(path)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/receipts/${path}`

    return NextResponse.json({ signedUrl: data.signedUrl, publicUrl, path })
  } catch (err) {
    console.error('[/api/expenses/upload POST]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
