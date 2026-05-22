export interface Building {
  id: number
  name: string
  address: string
  total_units: number
  rent_due_day?: number
  created_at: string
  updated_at: string
}

export type ExpenseCategory = 'mortgage' | 'insurance' | 'repairs' | 'utilities' | 'taxes' | 'management_fees' | 'other'

export interface Expense {
  id: string
  property_id: number
  date: string
  amount: number
  category: ExpenseCategory
  description: string
  receipt_url: string
  created_at: string
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

export type PaymentStatus = 'Paid' | 'Outstanding' | 'Partial' | 'Vacant'

export interface RentRollEntry {
  unit: string
  tenant: string
  rent: string
  status: PaymentStatus
  notes: string
}

export interface ReportFormData {
  building_name: string
  building_address: string
  report_month: number
  report_year: number
  // Financial
  total_rent_collected: string
  total_expenses: string
  late_payments: string
  management_fee: string
  // Occupancy
  vacant_units: string
  // Tenant status
  outstanding_balances: string
  upcoming_expirations: string
  // Year to date
  ytd_rent: string
  ytd_expenses: string
  // Narrative
  maintenance_issues: string
  tenant_issues: string
  notes: string
  // Rent roll
  rent_roll: RentRollEntry[]
  // Next month
  next_month_outlook: string
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// ── Tenant ────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string
  building_id: number
  unit_number: string
  full_name: string
  email: string
  phone: string
  monthly_rent: number
  lease_start: string | null
  lease_end: string | null
  clerk_user_id: string | null
  invite_token: string | null
  invite_accepted_at: string | null
  created_at: string
  updated_at: string
  building?: Building
}

// ── Communications ────────────────────────────────────────────────────────

export type Urgency = 'low' | 'medium' | 'high'
export type ThreadStatus = 'open' | 'resolved'
export type SenderRole = 'tenant' | 'manager'

export interface CommunicationThread {
  id: string
  tenant_id: string
  building_id: number
  subject: string
  urgency: Urgency
  status: ThreadStatus
  created_at: string
  updated_at: string
  tenant?: Tenant
  building?: Building
  latest_message?: CommunicationMessage
  message_count?: number
}

export interface CommunicationMessage {
  id: string
  thread_id: string
  sender_role: SenderRole
  sender_name: string
  body: string
  created_at: string
}

// ── Maintenance ───────────────────────────────────────────────────────────

export type MaintenanceStatus =
  | 'submitted'
  | 'reviewed'
  | 'contractor_contacted'
  | 'in_progress'
  | 'completed'

export type MaintenanceCategory = 'Emergency' | 'Routine'

export interface MaintenanceRequest {
  id: string
  tenant_id: string
  building_id: number
  description: string
  location_in_unit: string
  urgency: Urgency
  ai_category: MaintenanceCategory
  status: MaintenanceStatus
  photo_url: string
  contractor_name: string
  contractor_contact: string
  scheduled_date: string | null
  manager_notes: string
  created_at: string
  updated_at: string
  tenant?: Tenant
  building?: Building
}

// ── Rent ──────────────────────────────────────────────────────────────────

export type LedgerStatus = 'paid' | 'unpaid'

export interface RentLedgerEntry {
  id: string
  tenant_id: string
  building_id: number
  due_date: string
  amount_due: number
  status: LedgerStatus
  paid_date: string | null
  created_at: string
  updated_at: string
  tenant?: Tenant
  building?: Building
  days_overdue?: number
}

export type NoticeType = 'first_notice' | 'second_notice' | 'lawyer_referral'

export interface RentNotice {
  id: string
  ledger_id: string
  tenant_id: string
  notice_type: NoticeType
  generated_text: string
  sent_at: string | null
  created_at: string
  updated_at: string
  ledger?: RentLedgerEntry
  tenant?: Tenant
}
