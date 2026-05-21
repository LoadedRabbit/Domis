export const runtime = 'nodejs'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'
import { generateRentNotice } from '@/lib/anthropic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: ledgerId } = await params
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('rent_notices')
      .select('*')
      .eq('ledger_id', ledgerId)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[/api/rent/[id]/notices GET]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: ledgerId } = await params
    const body = await req.json()
    const { notice_type } = body

    if (!notice_type || !['first_notice', 'second_notice', 'lawyer_referral'].includes(notice_type)) {
      return NextResponse.json({ error: 'notice_type must be first_notice, second_notice, or lawyer_referral' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data: ledger, error: ledgerErr } = await supabase
      .from('rent_ledger')
      .select(`
        *,
        tenant:tenants(id, full_name, unit_number, monthly_rent),
        building:buildings(name, address)
      `)
      .eq('id', ledgerId)
      .single()

    if (ledgerErr || !ledger) return NextResponse.json({ error: 'Ledger entry not found' }, { status: 404 })

    const { data: existingNotices } = await supabase
      .from('rent_notices')
      .select('notice_type')
      .eq('ledger_id', ledgerId)

    const previousNotices = (existingNotices ?? []).map(n => n.notice_type as string)

    const tenant  = ledger.tenant  as { id: string; full_name: string; unit_number: string; monthly_rent: number } | null
    const building = ledger.building as { name: string; address: string } | null

    const dueDate = new Date(ledger.due_date)
    const now     = new Date()
    now.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)
    const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / 86_400_000))

    const generatedText = await generateRentNotice({
      noticeType:      notice_type,
      tenantName:      tenant?.full_name   ?? 'Tenant',
      unit:            tenant?.unit_number ?? '',
      buildingName:    building?.name    ?? '',
      buildingAddress: building?.address ?? '',
      monthlyRent:     tenant?.monthly_rent ?? Number(ledger.amount_due),
      dueDate:         ledger.due_date,
      daysOverdue,
      amountDue:       Number(ledger.amount_due),
      previousNotices,
    })

    const { data, error } = await supabase
      .from('rent_notices')
      .upsert(
        {
          ledger_id:      ledgerId,
          tenant_id:      tenant?.id ?? '',
          notice_type,
          generated_text: generatedText,
          sent_at:        null,
        },
        { onConflict: 'ledger_id,notice_type' }
      )
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    console.error('[/api/rent/[id]/notices POST]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
