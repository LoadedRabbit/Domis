export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { ledger_ids } = await req.json()
    if (!Array.isArray(ledger_ids) || ledger_ids.length === 0) {
      return NextResponse.json({ error: 'ledger_ids array is required' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data: entries, error: entriesErr } = await supabase
      .from('rent_ledger')
      .select(`
        id, due_date, amount_due,
        tenant:tenants(id, full_name, unit_number, email, monthly_rent),
        building:buildings(id, name, address)
      `)
      .in('id', ledger_ids)

    if (entriesErr) return NextResponse.json({ error: entriesErr.message }, { status: 500 })

    let count = 0
    for (const entry of (entries ?? [])) {
      const tenant  = entry.tenant  as unknown as { id: number; full_name: string } | null
      const building = entry.building as unknown as { id: number; name: string; address: string } | null
      if (!tenant || !building) continue

      const { data: existing } = await supabase
        .from('communication_threads')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('subject', 'Rent Reminder')
        .eq('status', 'open')
        .maybeSingle()

      let threadId: string

      if (existing) {
        threadId = existing.id
      } else {
        const { data: newThread, error: threadErr } = await supabase
          .from('communication_threads')
          .insert({ tenant_id: tenant.id, building_id: building.id, subject: 'Rent Reminder', urgency: 'medium' })
          .select('id')
          .single()
        if (threadErr || !newThread) continue
        threadId = newThread.id
      }

      const firstName = tenant.full_name.split(' ')[0]
      const dueDate   = new Date(entry.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      const amount    = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(entry.amount_due))

      await supabase.from('communication_messages').insert({
        thread_id:   threadId,
        sender_role: 'manager',
        sender_name: 'Landlord',
        body: `Hi ${firstName}, just a reminder that your rent of ${amount} is due on ${dueDate}. Please reach out if you have any questions.`,
      })

      count++
    }

    return NextResponse.json({ count })
  } catch (err) {
    console.error('[/api/rent/remind POST]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
