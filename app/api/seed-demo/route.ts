export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST() {
  const supabase = createServerClient()
  const results: Record<string, unknown> = {}

  // 1. Find Kinyu Tower A
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('id, name')
    .eq('name', 'Kinyu Tower A')
    .single()

  if (buildingError || !building) {
    return NextResponse.json({ error: 'Building not found', detail: buildingError?.message }, { status: 500 })
  }
  results.building = { id: building.id, name: building.name }

  // 2. Upsert tenant Alex Rivera in unit 4B
  const { data: existingTenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('building_id', building.id)
    .eq('unit_number', '4B')
    .maybeSingle()

  let tenantId: string

  if (existingTenant) {
    const { data: updated, error: updateErr } = await supabase
      .from('tenants')
      .update({
        full_name: 'Alex Rivera',
        email: 'alex.rivera@email.com',
        phone: '555-123-4567',
        monthly_rent: 2200,
        lease_start: '2024-01-01',
        lease_end: '2026-12-31',
        clerk_user_id: 'user_3Dy5vy3AlQ3Tn5PgYqIqCKFSgOk',
      })
      .eq('id', existingTenant.id)
      .select('id, full_name, unit_number, clerk_user_id')
      .single()
    if (updateErr) return NextResponse.json({ error: 'Failed to update tenant', detail: updateErr.message }, { status: 500 })
    results.tenant = { action: 'updated', ...updated }
    tenantId = existingTenant.id
  } else {
    const { data: created, error: insertErr } = await supabase
      .from('tenants')
      .insert({
        building_id: building.id,
        unit_number: '4B',
        full_name: 'Alex Rivera',
        email: 'alex.rivera@email.com',
        phone: '555-123-4567',
        monthly_rent: 2200,
        lease_start: '2024-01-01',
        lease_end: '2026-12-31',
        clerk_user_id: 'user_3Dy5vy3AlQ3Tn5PgYqIqCKFSgOk',
      })
      .select('id, full_name, unit_number, clerk_user_id')
      .single()
    if (insertErr) return NextResponse.json({ error: 'Failed to create tenant', detail: insertErr.message }, { status: 500 })
    results.tenant = { action: 'created', ...created }
    tenantId = created!.id
  }

  // 3. Clear existing threads for this tenant, then create fresh
  await supabase.from('communication_threads').delete().eq('tenant_id', tenantId)

  const { data: thread, error: threadErr } = await supabase
    .from('communication_threads')
    .insert({
      tenant_id: tenantId,
      building_id: building.id,
      subject: 'Heating not working in unit 4B',
      urgency: 'high',
      status: 'open',
    })
    .select('id, subject, urgency, status')
    .single()

  if (threadErr) return NextResponse.json({ error: 'Failed to create thread', detail: threadErr.message }, { status: 500 })
  results.thread = thread

  // 4. Add tenant message
  const { data: message, error: msgErr } = await supabase
    .from('communication_messages')
    .insert({
      thread_id: thread.id,
      sender_role: 'tenant',
      sender_name: 'Alex Rivera',
      body: "Hi, the heating in my unit has not been working for 2 days. It's very cold. Please help.",
    })
    .select('id, sender_role, body')
    .single()

  if (msgErr) return NextResponse.json({ error: 'Failed to create message', detail: msgErr.message }, { status: 500 })
  results.message = message

  // 5. Clear existing maintenance requests, then create fresh
  await supabase.from('maintenance_requests').delete().eq('tenant_id', tenantId)

  const { data: maintenance, error: maintErr } = await supabase
    .from('maintenance_requests')
    .insert({
      tenant_id: tenantId,
      building_id: building.id,
      description: 'Leaking pipe under kitchen sink, water is dripping onto the cabinet floor',
      location_in_unit: 'Kitchen',
      urgency: 'high',
      ai_category: 'Emergency',
      status: 'submitted',
    })
    .select('id, description, urgency, ai_category, status')
    .single()

  if (maintErr) return NextResponse.json({ error: 'Failed to create maintenance request', detail: maintErr.message }, { status: 500 })
  results.maintenance = maintenance

  // 6. Upsert rent ledger entry for March 2026
  const { data: rent, error: rentErr } = await supabase
    .from('rent_ledger')
    .upsert(
      {
        tenant_id: tenantId,
        building_id: building.id,
        due_date: '2026-03-01',
        amount_due: 2200,
        status: 'unpaid',
      },
      { onConflict: 'tenant_id,due_date' }
    )
    .select('id, due_date, amount_due, status')
    .single()

  if (rentErr) return NextResponse.json({ error: 'Failed to create rent entry', detail: rentErr.message }, { status: 500 })
  results.rent = rent

  return NextResponse.json({ success: true, results })
}
