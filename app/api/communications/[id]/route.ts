export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const supabase = createServerClient()

    const { data: thread, error: threadErr } = await supabase
      .from('communication_threads')
      .select(`
        *,
        tenant:tenants(id, full_name, unit_number, email, building_id),
        building:buildings(id, name, address)
      `)
      .eq('id', id)
      .single()

    if (threadErr || !thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })

    const { data: messages, error: msgErr } = await supabase
      .from('communication_messages')
      .select('*')
      .eq('thread_id', id)
      .order('created_at', { ascending: true })

    if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 })

    return NextResponse.json({ ...thread, messages: messages ?? [] })
  } catch (err) {
    console.error('[/api/communications/[id] GET]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const { status } = body

    if (!status || !['open', 'resolved'].includes(status)) {
      return NextResponse.json({ error: 'status must be open or resolved' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('communication_threads')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    console.error('[/api/communications/[id] PATCH]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
