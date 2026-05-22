export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const property_id = searchParams.get('property_id')
    const category    = searchParams.get('category')
    const year        = searchParams.get('year')
    const month       = searchParams.get('month')

    const supabase = createServerClient()
    let query = supabase.from('expenses').select('*, building:buildings(name)').order('date', { ascending: false })

    if (property_id) query = query.eq('property_id', Number(property_id))
    if (category)    query = query.eq('category', category)
    if (year)        query = query.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`)
    if (month && year) {
      const paddedMonth = month.padStart(2, '0')
      query = query.gte('date', `${year}-${paddedMonth}-01`).lte('date', `${year}-${paddedMonth}-31`)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    console.error('[/api/expenses GET]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { property_id, date, amount, category, description, receipt_url } = await req.json()
    if (!property_id || !date || amount == null || !category) {
      return NextResponse.json({ error: 'property_id, date, amount, and category are required' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('expenses')
      .insert({ property_id: Number(property_id), date, amount: Number(amount), category, description: description || '', receipt_url: receipt_url || '' })
      .select('*, building:buildings(name)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[/api/expenses POST]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
