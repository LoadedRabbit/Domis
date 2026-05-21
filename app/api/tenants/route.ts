export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const buildingId = searchParams.get('building_id')

    const supabase = createServerClient()
    let query = supabase
      .from('tenants')
      .select('*, building:buildings(id, name, address)')
      .order('full_name')

    if (buildingId) query = query.eq('building_id', buildingId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    console.error('[/api/tenants GET]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { building_id, unit_number, full_name, email, monthly_rent, phone, lease_start, lease_end } = body

    if (!building_id || !unit_number || !full_name || !email || monthly_rent === undefined) {
      return NextResponse.json({ error: 'Missing required fields: building_id, unit_number, full_name, email, monthly_rent' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('tenants')
      .insert({
        building_id,
        unit_number,
        full_name,
        email,
        monthly_rent: Number(monthly_rent),
        phone: phone || '',
        lease_start: lease_start || null,
        lease_end: lease_end || null,
      })
      .select('*, building:buildings(id, name, address)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[/api/tenants POST]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
