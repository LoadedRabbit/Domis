export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'
import { draftCommunicationResponse } from '@/lib/anthropic'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: threadId } = await params
    const supabase = createServerClient()

    const { data: thread, error: threadErr } = await supabase
      .from('communication_threads')
      .select(`
        *,
        tenant:tenants(full_name, unit_number),
        building:buildings(name)
      `)
      .eq('id', threadId)
      .single()

    if (threadErr || !thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })

    const { data: messages, error: msgErr } = await supabase
      .from('communication_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })

    if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 })

    const tenant = thread.tenant as { full_name: string; unit_number: string } | null
    const building = thread.building as { name: string } | null

    const draft = await draftCommunicationResponse({
      tenantName:  tenant?.full_name ?? 'Tenant',
      unit:        tenant?.unit_number ?? '',
      buildingName: building?.name ?? '',
      subject:     thread.subject,
      urgency:     thread.urgency,
      conversationHistory: (messages ?? []).map(m => ({
        role:      m.sender_role,
        body:      m.body,
        timestamp: new Date(m.created_at).toLocaleString(),
      })),
    })

    return NextResponse.json({ draft })
  } catch (err) {
    console.error('[/api/communications/[id]/draft POST]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
