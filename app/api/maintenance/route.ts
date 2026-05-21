export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'
import { categorizeMaintenanceRequest } from '@/lib/anthropic'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const buildingId = searchParams.get('building_id')
    const status     = searchParams.get('status')
    const category   = searchParams.get('ai_category')
    const tenantId   = searchParams.get('tenant_id')

    const supabase = createServerClient()
    let query = supabase
      .from('maintenance_requests')
      .select(`
        *,
        tenant:tenants(id, full_name, unit_number, email),
        building:buildings(id, name, address)
      `)

    if (buildingId) query = query.eq('building_id', buildingId)
    if (status)     query = query.eq('status', status)
    if (category)   query = query.eq('ai_category', category)
    if (tenantId)   query = query.eq('tenant_id', tenantId)

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Emergency requests first
    const sorted = (data ?? []).sort((a, b) => {
      if (a.ai_category === 'Emergency' && b.ai_category !== 'Emergency') return -1
      if (a.ai_category !== 'Emergency' && b.ai_category === 'Emergency') return 1
      return 0
    })

    return NextResponse.json(sorted)
  } catch (err) {
    console.error('[/api/maintenance GET]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { description, location_in_unit, urgency, photo_url } = body

    if (!description) return NextResponse.json({ error: 'description is required' }, { status: 400 })

    const supabase = createServerClient()

    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .select('id, building_id')
      .eq('clerk_user_id', userId)
      .single()

    if (tenantErr || !tenant) {
      return NextResponse.json({ error: 'Tenant account not found' }, { status: 403 })
    }

    const { data: request, error: insertErr } = await supabase
      .from('maintenance_requests')
      .insert({
        tenant_id:        tenant.id,
        building_id:      tenant.building_id,
        description,
        location_in_unit: location_in_unit || '',
        urgency:          urgency || 'medium',
        photo_url:        photo_url || '',
      })
      .select()
      .single()

    if (insertErr || !request) {
      return NextResponse.json({ error: insertErr?.message ?? 'Insert failed' }, { status: 500 })
    }

    // AI categorize asynchronously (don't fail the request if AI errors)
    try {
      const category = await categorizeMaintenanceRequest({ description, urgency: urgency || 'medium' })
      const { data: updated } = await supabase
        .from('maintenance_requests')
        .update({ ai_category: category })
        .eq('id', request.id)
        .select()
        .single()

      return NextResponse.json(updated ?? request, { status: 201 })
    } catch {
      return NextResponse.json(request, { status: 201 })
    }
  } catch (err) {
    console.error('[/api/maintenance POST]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
