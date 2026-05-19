import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'
import { generateOwnerReport } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    building_id,
    building_name,
    building_address,
    report_month,
    report_year,
    total_rent_collected,
    total_expenses,
    vacant_units,
    total_units,
    maintenance_issues,
    tenant_issues,
    notes,
  } = body

  if (!building_name || !report_month || !report_year) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const netIncome = Number(total_rent_collected) - Number(total_expenses)

  try {
    const generatedReport = await generateOwnerReport({
      buildingName: building_name,
      address: building_address,
      month: Number(report_month),
      year: Number(report_year),
      totalRent: Number(total_rent_collected),
      totalExpenses: Number(total_expenses),
      netIncome,
      vacantUnits: Number(vacant_units),
      totalUnits: Number(total_units) || 0,
      maintenanceIssues: maintenance_issues || '',
      tenantIssues: tenant_issues || '',
      notes: notes || '',
    })

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('reports')
      .insert({
        building_id: building_id || null,
        building_name,
        building_address,
        report_month: Number(report_month),
        report_year: Number(report_year),
        total_rent_collected: Number(total_rent_collected),
        total_expenses: Number(total_expenses),
        vacant_units: Number(vacant_units),
        maintenance_issues: maintenance_issues || '',
        tenant_issues: tenant_issues || '',
        notes: notes || '',
        generated_report: generatedReport,
        status: 'generated',
        created_by: userId,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json(data)
  } catch (err) {
    console.error('Report generation error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate report' },
      { status: 500 }
    )
  }
}
