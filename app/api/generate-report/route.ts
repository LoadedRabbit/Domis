import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'
import { generateOwnerReport } from '@/lib/anthropic'

export const runtime = 'nodejs'
export const maxDuration = 60

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  try {
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
    const totalUnitsNum = Number(total_units) || 0

    const generatedReport = await generateOwnerReport({
      buildingName: building_name,
      address: building_address,
      month: Number(report_month),
      year: Number(report_year),
      totalRent: Number(total_rent_collected),
      totalExpenses: Number(total_expenses),
      netIncome,
      vacantUnits: Number(vacant_units),
      totalUnits: totalUnitsNum,
      maintenanceIssues: maintenance_issues || '',
      tenantIssues: tenant_issues || '',
      notes: notes || '',
    })

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('reports')
      .insert({
        building_id: (building_id && UUID_RE.test(String(building_id))) ? building_id : null,
        building_name,
        building_address,
        report_month: Number(report_month),
        report_year: Number(report_year),
        total_rent_collected: Number(total_rent_collected),
        total_expenses: Number(total_expenses),
        net_income: netIncome,
        vacant_units: Number(vacant_units),
        total_units: totalUnitsNum,
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
    console.error('[/api/generate-report POST]', err)
    const message =
      err instanceof Error
        ? err.message
        : typeof (err as { error?: { message?: string } })?.error?.message === 'string'
          ? (err as { error: { message: string } }).error.message
          : 'Failed to generate report'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
