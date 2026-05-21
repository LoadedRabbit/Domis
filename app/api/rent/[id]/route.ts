export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'

function computeDaysOverdue(dueDate: string, status: string): number {
  if (status === 'paid') return 0
  const due = new Date(dueDate)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  const diff = Math.floor((now.getTime() - due.getTime()) / 86_400_000)
  return diff > 0 ? diff : 0
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('rent_ledger')
      .select(`
        *,
        tenant:tenants(id, full_name, unit_number, email, monthly_rent),
        building:buildings(id, name, address)
      `)
      .eq('id', id)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 404 })
    return NextResponse.json({ ...data, days_overdue: computeDaysOverdue(data.due_date, data.status) })
  } catch (err) {
    console.error('[/api/rent/[id] GET]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const { status, paid_date } = body

    if (!status || !['paid', 'unpaid'].includes(status)) {
      return NextResponse.json({ error: 'status must be paid or unpaid' }, { status: 400 })
    }

    const updates: Record<string, unknown> = { status }
    if (status === 'paid') {
      updates.paid_date = paid_date ?? new Date().toISOString().split('T')[0]
    } else {
      updates.paid_date = null
    }

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('rent_ledger')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        tenant:tenants(id, full_name, unit_number, email, monthly_rent),
        building:buildings(id, name, address)
      `)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ...data, days_overdue: computeDaysOverdue(data.due_date, data.status) })
  } catch (err) {
    console.error('[/api/rent/[id] PATCH]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
