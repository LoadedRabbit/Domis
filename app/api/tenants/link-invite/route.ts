export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { token } = await req.json()
    if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 })

    const supabase = createServerClient()

    // Find tenant with this invite token
    const { data: tenant, error: findError } = await supabase
      .from('tenants')
      .select('id')
      .eq('invite_token', token)
      .maybeSingle()

    if (findError) return NextResponse.json({ error: findError.message }, { status: 500 })
    if (!tenant) return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 404 })

    // Link the Clerk user and clear the token
    const { data: updated, error: updateError } = await supabase
      .from('tenants')
      .update({
        clerk_user_id:       userId,
        invite_accepted_at:  new Date().toISOString(),
        invite_token:        null,
      })
      .eq('id', tenant.id)
      .select('*, building:buildings(name, address)')
      .single()

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[/api/tenants/link-invite POST]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
