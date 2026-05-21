export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createServerClient()

    // First: look up by clerk_user_id
    const { data: byId } = await supabase
      .from('tenants')
      .select('*, building:buildings(*)')
      .eq('clerk_user_id', userId)
      .single()

    if (byId) return NextResponse.json({ tenant: byId })

    // Second: look up by email (auto-link)
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const primaryEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress

    if (!primaryEmail) return NextResponse.json({ tenant: null })

    const { data: byEmail, error: emailErr } = await supabase
      .from('tenants')
      .select('*, building:buildings(*)')
      .eq('email', primaryEmail)
      .single()

    if (emailErr || !byEmail) return NextResponse.json({ tenant: null })

    // Link clerk_user_id to tenant row
    await supabase.from('tenants').update({ clerk_user_id: userId }).eq('id', byEmail.id)
    return NextResponse.json({ tenant: { ...byEmail, clerk_user_id: userId } })
  } catch (err) {
    console.error('[/api/tenants/me GET]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
