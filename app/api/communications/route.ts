export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'

const URGENCY_WEIGHT: Record<string, number> = { high: 0, medium: 1, low: 2 }

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const buildingId = searchParams.get('building_id')
    const status     = searchParams.get('status')
    const urgency    = searchParams.get('urgency')
    const tenantId   = searchParams.get('tenant_id')

    const supabase = createServerClient()
    let query = supabase
      .from('communication_threads')
      .select(`
        *,
        tenant:tenants(id, full_name, unit_number, email),
        building:buildings(id, name, address)
      `)

    if (buildingId) query = query.eq('building_id', buildingId)
    if (status)     query = query.eq('status', status)
    if (urgency)    query = query.eq('urgency', urgency)
    if (tenantId)   query = query.eq('tenant_id', tenantId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Sort: urgency weight ASC, then updated_at DESC
    const sorted = (data ?? []).sort((a, b) => {
      const wA = URGENCY_WEIGHT[a.urgency] ?? 1
      const wB = URGENCY_WEIGHT[b.urgency] ?? 1
      if (wA !== wB) return wA - wB
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })

    return NextResponse.json(sorted)
  } catch (err) {
    console.error('[/api/communications GET]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { subject, urgency, body: messageBody } = body

    if (!subject || !messageBody) {
      return NextResponse.json({ error: 'subject and body are required' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Look up the tenant submitting this request
    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .select('id, building_id, full_name')
      .eq('clerk_user_id', userId)
      .single()

    if (tenantErr || !tenant) {
      return NextResponse.json({ error: 'Tenant account not found' }, { status: 403 })
    }

    const { data: thread, error: threadErr } = await supabase
      .from('communication_threads')
      .insert({
        tenant_id:   tenant.id,
        building_id: tenant.building_id,
        subject,
        urgency:     urgency || 'medium',
      })
      .select()
      .single()

    if (threadErr || !thread) {
      return NextResponse.json({ error: threadErr?.message ?? 'Failed to create thread' }, { status: 500 })
    }

    const { error: msgErr } = await supabase
      .from('communication_messages')
      .insert({
        thread_id:   thread.id,
        sender_role: 'tenant',
        sender_name: tenant.full_name,
        body:        messageBody,
      })

    if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 })

    return NextResponse.json(thread, { status: 201 })
  } catch (err) {
    console.error('[/api/communications POST]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
