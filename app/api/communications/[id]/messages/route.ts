export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: threadId } = await params
    const body = await req.json()
    const { body: messageBody, sender_role, sender_name } = body

    if (!messageBody || !sender_role) {
      return NextResponse.json({ error: 'body and sender_role are required' }, { status: 400 })
    }

    if (!['tenant', 'manager'].includes(sender_role)) {
      return NextResponse.json({ error: 'sender_role must be tenant or manager' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('communication_messages')
      .insert({
        thread_id:   threadId,
        sender_role,
        sender_name: sender_name || '',
        body:        messageBody,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Update thread updated_at to bubble it to the top
    await supabase
      .from('communication_threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', threadId)

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[/api/communications/[id]/messages POST]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
