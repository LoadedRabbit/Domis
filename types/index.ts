export interface Building {
  id: string
  name: string
  address: string
  total_units: number
  created_at: string
  updated_at: string
}

export interface Report {
  id: string
  building_id: string | null
  building_name: string
  building_address: string
  report_month: number
  report_year: number
  total_rent_collected: number
  total_expenses: number
  net_income: number
  vacant_units: number
  maintenance_issues: string
  tenant_issues: string
  notes: string
  generated_report: string
  status: 'generating' | 'generated' | 'error'
  created_by: string
  created_at: string
  updated_at: string
}

export interface ReportFormData {
  building_name: string
  building_address: string
  report_month: number
  report_year: number
  total_rent_collected: string
  total_expenses: string
  vacant_units: string
  maintenance_issues: string
  tenant_issues: string
  notes: string
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
