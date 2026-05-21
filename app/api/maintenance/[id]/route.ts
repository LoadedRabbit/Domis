export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'

const VALID_STATUSES = ['submitted', 'reviewed', 'contractor_contacted', 'in_progress', 'completed']

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select(`
        *,
        tenant:tenants(id, full_name, unit_number, email),
        building:buildings(id, name, address)
      `)
      .eq('id', id)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 404 })
    return NextResponse.json(data)
  } catch (err) {
    console.error('[/api/maintenance/[id] GET]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
    }

    const allowed = ['status', 'contractor_name', 'contractor_contact', 'scheduled_date', 'manager_notes']
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) {
        // Convert empty string to null for DATE columns so PostgreSQL doesn't reject it
        updates[key] = (key === 'scheduled_date' && body[key] === '') ? null : body[key]
      }
    }

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('maintenance_requests')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        tenant:tenants(id, full_name, unit_number, email),
        building:buildings(id, name, address)
      `)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    console.error('[/api/maintenance/[id] PATCH]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
