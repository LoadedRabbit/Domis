export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'

function computeDaysOverdue(dueDate: string, status: string): number {
  if (status === 'paid') return 0
  const due  = new Date(dueDate)
  const now  = new Date()
  now.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  const diff = Math.floor((now.getTime() - due.getTime()) / 86_400_000)
  return diff > 0 ? diff : 0
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const buildingId = searchParams.get('building_id')
    const status     = searchParams.get('status')

    const supabase = createServerClient()
    let query = supabase
      .from('rent_ledger')
      .select(`
        *,
        tenant:tenants(id, full_name, unit_number, email, monthly_rent),
        building:buildings(id, name, address)
      `)
      .order('due_date', { ascending: false })

    if (buildingId) query = query.eq('building_id', buildingId)
    if (status)     query = query.eq('status', status)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const enriched = (data ?? []).map(entry => ({
      ...entry,
      days_overdue: computeDaysOverdue(entry.due_date, entry.status),
    }))

    return NextResponse.json(enriched)
  } catch (err) {
    console.error('[/api/rent GET]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { tenant_id, due_date, amount_due } = body

    if (!tenant_id || !due_date || amount_due === undefined) {
      return NextResponse.json({ error: 'tenant_id, due_date, and amount_due are required' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Get building_id from tenant
    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .select('building_id')
      .eq('id', tenant_id)
      .single()

    if (tenantErr || !tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const { data, error } = await supabase
      .from('rent_ledger')
      .upsert(
        {
          tenant_id,
          building_id: tenant.building_id,
          due_date,
          amount_due:  Number(amount_due),
          status:      'unpaid',
        },
        { onConflict: 'tenant_id,due_date' }
      )
      .select(`
        *,
        tenant:tenants(id, full_name, unit_number, email, monthly_rent),
        building:buildings(id, name, address)
      `)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ...data, days_overdue: computeDaysOverdue(data.due_date, data.status) }, { status: 201 })
  } catch (err) {
    console.error('[/api/rent POST]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
