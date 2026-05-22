export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'
import { generateTaxReport } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { year } = await req.json()
    if (!year) return NextResponse.json({ error: 'year is required' }, { status: 400 })

    const supabase = createServerClient()

    const [{ data: rentData, error: rentError }, { data: expenseData, error: expenseError }] = await Promise.all([
      supabase
        .from('rent_ledger')
        .select('amount_due, building_id, building:buildings(id, name, address)')
        .eq('status', 'paid')
        .gte('due_date', `${year}-01-01`)
        .lte('due_date', `${year}-12-31`),
      supabase
        .from('expenses')
        .select('amount, category, property_id, building:buildings(id, name, address)')
        .gte('date', `${year}-01-01`)
        .lte('date', `${year}-12-31`),
    ])

    if (rentError)    return NextResponse.json({ error: rentError.message },    { status: 500 })
    if (expenseError) return NextResponse.json({ error: expenseError.message }, { status: 500 })

    const propertyMap = new Map<number, {
      property_id: number
      property_name: string
      property_address: string
      total_income: number
      expenses: Record<string, number>
    }>()

    const CATEGORIES = ['mortgage', 'insurance', 'repairs', 'utilities', 'taxes', 'management_fees', 'other']

    function ensureProperty(id: number, name: string, address: string) {
      if (!propertyMap.has(id)) {
        propertyMap.set(id, {
          property_id: id,
          property_name: name,
          property_address: address,
          total_income: 0,
          expenses: Object.fromEntries(CATEGORIES.map(c => [c, 0])),
        })
      }
      return propertyMap.get(id)!
    }

    for (const entry of (rentData ?? [])) {
      const b = entry.building as unknown as { id: number; name: string; address: string } | null
      if (!b) continue
      ensureProperty(b.id, b.name, b.address).total_income += Number(entry.amount_due)
    }

    for (const exp of (expenseData ?? [])) {
      const b = exp.building as unknown as { id: number; name: string; address: string } | null
      if (!b) continue
      const prop = ensureProperty(b.id, b.name, b.address)
      const cat = exp.category as string
      if (cat in prop.expenses) prop.expenses[cat] += Number(exp.amount)
    }

    const properties = Array.from(propertyMap.values()).map(p => {
      const total_expenses = Object.values(p.expenses).reduce((s, v) => s + v, 0)
      return { ...p, total_expenses, net_income_loss: p.total_income - total_expenses }
    })

    const report_text = await generateTaxReport({ year: Number(year), properties })

    return NextResponse.json({ report_text, year: Number(year), properties })
  } catch (err) {
    console.error('[/api/tax-report POST]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
