export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { filename, contentType } = body

    if (!filename || !contentType) {
      return NextResponse.json({ error: 'filename and contentType are required' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Look up tenant for path prefix
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    const prefix = tenant?.id ?? userId
    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${prefix}/${Date.now()}-${sanitized}`

    const { data, error } = await supabase.storage
      .from('maintenance-photos')
      .createSignedUploadUrl(path)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/maintenance-photos/${path}`

    return NextResponse.json({ signedUrl: data.signedUrl, publicUrl, path })
  } catch (err) {
    console.error('[/api/maintenance/upload POST]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
