'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Building2, DollarSign, Home, FileText,
  Loader2, AlertCircle, ChevronRight, Plus, X,
} from 'lucide-react'
import type { Building, ReportFormData, Report, RentRollEntry } from '@/types'
import { MONTHS } from '@/types'
import { formatCurrency, formatMonth } from '@/lib/utils'

const currentYear  = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

const STATUS_COLORS: Record<string, string> = {
  Paid:        '#5bba7a',
  Outstanding: '#c45c5c',
  Partial:     '#d48f4a',
  Vacant:      '#7a7468',
}

const BLANK_ENTRY: RentRollEntry = { unit: '', tenant: '', rent: '', status: 'Paid', notes: '' }

export default function BuildingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router  = useRouter()
  const [building, setBuilding]             = useState<Building | null>(null)
  const [buildingReports, setBuildingReports] = useState<Report[]>([])
  const [loading, setLoading]               = useState(true)
  const [generating, setGenerating]         = useState(false)
  const [error, setError]                   = useState('')
  const [form, setForm] = useState<ReportFormData>({
    building_name: '', building_address: '',
    report_month: currentMonth, report_year: currentYear,
    total_rent_collected: '', total_expenses: '', late_payments: '', management_fee: '',
    vacant_units: '', outstanding_balances: '', upcoming_expirations: '',
    ytd_rent: '', ytd_expenses: '',
    maintenance_issues: '', tenant_issues: '', notes: '',
    rent_roll: [], next_month_outlook: '',
  })

  useEffect(() => {
    async function load() {
      try {
        const [bRes, rRes] = await Promise.all([
          fetch(`/api/buildings/${id}`),
          fetch(`/api/reports?building_id=${id}`),
        ])
        if (bRes.ok) {
          const b: Building = await bRes.json()
          setBuilding(b)
          setForm(f => ({ ...f, building_name: b.name, building_address: b.address }))
        }
        if (rRes.ok) setBuildingReports(await rRes.json())
      } catch {
        // building will show not-found state
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.total_rent_collected || !form.total_expenses || form.vacant_units === '') {
      setError('Please fill in all required financial and occupancy fields.')
      return
    }

    setGenerating(true)
    try {
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          building_id: id,
          total_units: building?.total_units ?? 0,
          total_rent_collected: parseFloat(form.total_rent_collected),
          total_expenses:       parseFloat(form.total_expenses),
          late_payments:        parseFloat(form.late_payments) || 0,
          management_fee:       parseFloat(form.management_fee) || 0,
          vacant_units:         parseInt(form.vacant_units),
          outstanding_balances: parseFloat(form.outstanding_balances) || 0,
          ytd_rent:             parseFloat(form.ytd_rent) || 0,
          ytd_expenses:         parseFloat(form.ytd_expenses) || 0,
        }),
      })

      if (!res.ok) {
        let errorMsg = `Server error (${res.status})`
        try {
          const data = await res.json()
          errorMsg = data.error || errorMsg
        } catch {
          if (res.status === 504 || res.status === 524) errorMsg = 'Report generation timed out. Please try again.'
        }
        throw new Error(errorMsg)
      }

      const report: Report = await res.json()
      router.push(`/dashboard/reports/${report.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setGenerating(false)
    }
  }

  function updateRentRollEntry(idx: number, field: keyof RentRollEntry, value: string) {
    setForm(f => ({
      ...f,
      rent_roll: f.rent_roll.map((e, i) => i === idx ? { ...e, [field]: value } : e),
    }))
  }

  const inputClass = 'w-full bg-[#0e100d] border border-[#222620] rounded-sm text-xs text-[#eae6d6] placeholder-[#7a7468] px-3 py-2.5 focus:outline-none focus:border-[#d4b070]/30 focus:ring-1 focus:ring-[#d4b070]/10 transition-all'
  const textareaClass = `${inputClass} resize-none`

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <Loader2 size={18} className="animate-spin text-[#7a7468]" />
      </div>
    )
  }

  if (!building) {
    return <div className="p-8 text-[#7a7468] text-sm">Building not found.</div>
  }

  const netPreview = form.total_rent_collected && form.total_expenses
    ? parseFloat(form.total_rent_collected) - parseFloat(form.total_expenses)
    : null

  const occupancyPreview = form.vacant_units !== '' && building
    ? Math.round(((building.total_units - parseInt(form.vacant_units)) / building.total_units) * 100)
    : null

  const rentRollTotals = form.rent_roll.reduce(
    (acc, e) => {
      const r = parseFloat(e.rent) || 0
      if (e.status === 'Paid')        { acc.collected += r;   acc.paidCount++ }
      else if (e.status === 'Outstanding') { acc.outstanding += r; acc.outstandingCount++ }
      else if (e.status === 'Partial')     { acc.outstanding += r; acc.partialCount++ }
      else if (e.status === 'Vacant')      { acc.vacantCount++ }
      return acc
    },
    { collected: 0, outstanding: 0, paidCount: 0, outstandingCount: 0, partialCount: 0, vacantCount: 0 }
  )

  const labelClass = 'block text-[10px] text-[#7a7468] mb-1.5'
  const sectionClass = 'bg-[#0e100d] border border-[#222620] rounded-sm p-4 space-y-3'
  const sectionLabelClass = 'text-[10px] text-[#7a7468]'

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div
        className="flex items-center gap-2 text-[10px] text-[#7a7468] mb-8 animate-in"
        style={{ letterSpacing: '0.1em', animationDelay: '0ms' }}
      >
        <Link href="/dashboard" className="hover:text-[#eae6d6] transition-colors">OPERATIONS</Link>
        <ChevronRight size={10} />
        <span className="font-display italic text-sm text-[#9e9a8c]">{building.name}</span>
      </div>

      {/* Building header */}
      <div className="flex items-start justify-between mb-8 animate-in" style={{ animationDelay: '60ms' }}>
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-sm bg-[#101210] border border-[#222620] flex items-center justify-center flex-shrink-0">
            <Building2 size={20} className="text-[#d4b070]" style={{ opacity: 0.6 }} />
          </div>
          <div>
            <h1 className="font-display text-4xl font-light italic text-[#eae6d6] leading-tight">{building.name}</h1>
            <p className="text-sm text-[#9e9a8c] mt-1">{building.address}</p>
            <p className="text-[11px] text-[#7a7468] mt-1" style={{ letterSpacing: '0.15em' }}>
              {building.total_units} UNITS REGISTERED
            </p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-[11px] text-[#9e9a8c] hover:text-[#eae6d6] transition-colors border border-[#222620] rounded-sm px-3 py-2 hover:border-[#2e3328]"
          style={{ letterSpacing: '0.1em' }}
        >
          <ArrowLeft size={11} />
          BACK
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 animate-in" style={{ animationDelay: '120ms' }}>
          <div className="bg-[#101210] border border-[#222620] rounded-sm p-6">
            <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-[#222620]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#d4b070] status-pulse" />
              <span className="text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.22em' }}>
                GENERATE OWNER REPORT
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Report period */}
              <div>
                <p className={sectionLabelClass} style={{ letterSpacing: '0.2em' }}>
                  REPORT PERIOD <span className="text-[#d4b070]">*</span>
                </p>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className={labelClass} style={{ letterSpacing: '0.15em' }}>MONTH</label>
                    <select
                      value={form.report_month}
                      onChange={e => setForm(f => ({ ...f, report_month: parseInt(e.target.value) }))}
                      className={inputClass}
                    >
                      {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass} style={{ letterSpacing: '0.15em' }}>YEAR</label>
                    <select
                      value={form.report_year}
                      onChange={e => setForm(f => ({ ...f, report_year: parseInt(e.target.value) }))}
                      className={inputClass}
                    >
                      {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Rent Roll */}
              <div className={sectionClass}>
                <div className="flex items-center justify-between">
                  <p className={sectionLabelClass} style={{ letterSpacing: '0.2em' }}>RENT ROLL</p>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, rent_roll: [...f.rent_roll, { ...BLANK_ENTRY }] }))}
                    className="flex items-center gap-1 text-[11px] text-[#d4b070] hover:text-[#eae6d6] transition-colors"
                    style={{ letterSpacing: '0.1em' }}
                  >
                    <Plus size={9} />
                    ADD UNIT
                  </button>
                </div>

                {form.rent_roll.length === 0 ? (
                  <p className="text-xs text-[#7a7468] text-center py-3 italic font-display">
                    No units added. Click &quot;Add Unit&quot; to build the rent roll.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-12 gap-1.5 px-0.5">
                      {[['Unit','col-span-2'],['Tenant','col-span-3'],['Rent','col-span-2'],['Status','col-span-2'],['Notes','col-span-2'],['','col-span-1']].map(([h, c]) => (
                        <span key={h} className={`text-[10px] text-[#7a7468] ${c}`} style={{ letterSpacing: '0.18em' }}>{h}</span>
                      ))}
                    </div>

                    {form.rent_roll.map((entry, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                        <input type="text" placeholder="1A" value={entry.unit}
                          onChange={e => updateRentRollEntry(idx, 'unit', e.target.value)}
                          className={`col-span-2 ${inputClass} py-2`} />
                        <input type="text" placeholder="Tenant" value={entry.tenant}
                          onChange={e => updateRentRollEntry(idx, 'tenant', e.target.value)}
                          className={`col-span-3 ${inputClass} py-2`} />
                        <div className="col-span-2 relative">
                          <DollarSign size={9} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#7a7468]" />
                          <input type="number" step="0.01" min="0" placeholder="0" value={entry.rent}
                            onChange={e => updateRentRollEntry(idx, 'rent', e.target.value)}
                            className={`${inputClass} py-2 pl-5`} />
                        </div>
                        <div className="col-span-2">
                          <select value={entry.status}
                            onChange={e => updateRentRollEntry(idx, 'status', e.target.value)}
                            className={`${inputClass} py-2`}
                            style={{ color: STATUS_COLORS[entry.status] }}>
                            {(['Paid','Outstanding','Partial','Vacant'] as const).map(s => (
                              <option key={s} value={s} style={{ color: STATUS_COLORS[s] }}>{s}</option>
                            ))}
                          </select>
                        </div>
                        <input type="text" placeholder="Notes" value={entry.notes}
                          onChange={e => updateRentRollEntry(idx, 'notes', e.target.value)}
                          className={`col-span-2 ${inputClass} py-2`} />
                        <button type="button"
                          onClick={() => setForm(f => ({ ...f, rent_roll: f.rent_roll.filter((_, i) => i !== idx) }))}
                          className="col-span-1 flex items-center justify-center text-[#7a7468] hover:text-[#c45c5c] transition-colors h-8">
                          <X size={11} />
                        </button>
                      </div>
                    ))}

                    <div className="flex items-center justify-between bg-[#0b0c09] border border-[#222620] rounded-sm px-3 py-2.5 mt-1">
                      <div className="flex items-center gap-3 text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.15em' }}>
                        <span>{form.rent_roll.length} UNITS</span>
                        {rentRollTotals.vacantCount > 0 && <span>{rentRollTotals.vacantCount} VACANT</span>}
                        {rentRollTotals.partialCount > 0 && <span className="text-[#d48f4a]">{rentRollTotals.partialCount} PARTIAL</span>}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.15em' }}>COLLECTED</div>
                          <div className="font-display text-base font-light text-[#5bba7a]">{formatCurrency(rentRollTotals.collected)}</div>
                        </div>
                        {rentRollTotals.outstanding > 0 && (
                          <div className="text-right">
                            <div className="text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.15em' }}>OUTSTANDING</div>
                            <div className="font-display text-base font-light text-[#c45c5c]">{formatCurrency(rentRollTotals.outstanding)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Financial data */}
              <div className={sectionClass}>
                <p className={sectionLabelClass} style={{ letterSpacing: '0.2em' }}>
                  FINANCIAL DATA <span className="text-[#d4b070]">*</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass} style={{ letterSpacing: '0.15em' }}>RENT COLLECTED</label>
                    <div className="relative">
                      <DollarSign size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a7468]" />
                      <input type="number" step="0.01" min="0" placeholder="0.00"
                        value={form.total_rent_collected}
                        onChange={e => setForm(f => ({ ...f, total_rent_collected: e.target.value }))}
                        className={`${inputClass} pl-7`} required />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass} style={{ letterSpacing: '0.15em' }}>TOTAL EXPENSES</label>
                    <div className="relative">
                      <DollarSign size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a7468]" />
                      <input type="number" step="0.01" min="0" placeholder="0.00"
                        value={form.total_expenses}
                        onChange={e => setForm(f => ({ ...f, total_expenses: e.target.value }))}
                        className={`${inputClass} pl-7`} required />
                    </div>
                  </div>
                </div>

                {netPreview !== null && (
                  <div className="flex items-center justify-between bg-[#0b0c09] border border-[#222620] rounded-sm p-3">
                    <span className="text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.2em' }}>NET OPERATING INCOME</span>
                    <div className="text-right">
                      <div className="font-display text-2xl font-light leading-none" style={{ color: netPreview >= 0 ? '#5bba7a' : '#c45c5c' }}>
                        {formatCurrency(netPreview)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Additional financial */}
              <div className={sectionClass}>
                <p className={sectionLabelClass} style={{ letterSpacing: '0.2em' }}>ADDITIONAL FINANCIAL</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass} style={{ letterSpacing: '0.15em' }}>LATE PAYMENTS</label>
                    <div className="relative">
                      <DollarSign size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a7468]" />
                      <input type="number" step="0.01" min="0" placeholder="0.00"
                        value={form.late_payments}
                        onChange={e => setForm(f => ({ ...f, late_payments: e.target.value }))}
                        className={`${inputClass} pl-7`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass} style={{ letterSpacing: '0.15em' }}>MANAGEMENT FEE</label>
                    <div className="relative">
                      <DollarSign size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a7468]" />
                      <input type="number" step="0.01" min="0" placeholder="0.00"
                        value={form.management_fee}
                        onChange={e => setForm(f => ({ ...f, management_fee: e.target.value }))}
                        className={`${inputClass} pl-7`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Occupancy */}
              <div>
                <label className={labelClass} style={{ letterSpacing: '0.15em' }}>
                  VACANT UNITS <span className="text-[#d4b070]">*</span>
                </label>
                <div className="relative">
                  <Home size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a7468]" />
                  <input type="number" min="0" max={building.total_units} placeholder="0"
                    value={form.vacant_units}
                    onChange={e => setForm(f => ({ ...f, vacant_units: e.target.value }))}
                    className={`${inputClass} pl-7`} required />
                </div>
                {occupancyPreview !== null && (
                  <div className="mt-2.5 flex items-center gap-3">
                    <div className="flex-1 h-px bg-[#222620] rounded-full overflow-hidden relative">
                      <div
                        className="absolute left-0 top-0 h-full rounded-full transition-all"
                        style={{ width: `${occupancyPreview}%`, background: '#d4b070' }}
                      />
                    </div>
                    <span className="text-[11px] text-[#d4b070]" style={{ letterSpacing: '0.1em' }}>
                      {occupancyPreview}% OCCUPIED
                    </span>
                  </div>
                )}
              </div>

              {/* Tenant status */}
              <div className={sectionClass}>
                <p className={sectionLabelClass} style={{ letterSpacing: '0.2em' }}>TENANT STATUS</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass} style={{ letterSpacing: '0.15em' }}>OUTSTANDING BALANCES</label>
                    <div className="relative">
                      <DollarSign size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a7468]" />
                      <input type="number" step="0.01" min="0" placeholder="0.00"
                        value={form.outstanding_balances}
                        onChange={e => setForm(f => ({ ...f, outstanding_balances: e.target.value }))}
                        className={`${inputClass} pl-7`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass} style={{ letterSpacing: '0.15em' }}>UPCOMING EXPIRATIONS</label>
                    <input type="text" placeholder="Unit 3A — Jun 30, Unit 7B — Jul 15"
                      value={form.upcoming_expirations}
                      onChange={e => setForm(f => ({ ...f, upcoming_expirations: e.target.value }))}
                      className={inputClass} />
                  </div>
                </div>
              </div>

              {/* Year to date */}
              <div className={sectionClass}>
                <p className={sectionLabelClass} style={{ letterSpacing: '0.2em' }}>YEAR-TO-DATE COMPARISON</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass} style={{ letterSpacing: '0.15em' }}>YTD RENT COLLECTED</label>
                    <div className="relative">
                      <DollarSign size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a7468]" />
                      <input type="number" step="0.01" min="0" placeholder="0.00"
                        value={form.ytd_rent}
                        onChange={e => setForm(f => ({ ...f, ytd_rent: e.target.value }))}
                        className={`${inputClass} pl-7`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass} style={{ letterSpacing: '0.15em' }}>YTD EXPENSES</label>
                    <div className="relative">
                      <DollarSign size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a7468]" />
                      <input type="number" step="0.01" min="0" placeholder="0.00"
                        value={form.ytd_expenses}
                        onChange={e => setForm(f => ({ ...f, ytd_expenses: e.target.value }))}
                        className={`${inputClass} pl-7`} />
                    </div>
                  </div>
                </div>
                {form.ytd_rent && form.ytd_expenses && (
                  <div className="flex items-center justify-between bg-[#0b0c09] border border-[#222620] rounded-sm p-3">
                    <span className="text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.2em' }}>YTD NET INCOME</span>
                    <div className="font-display text-2xl font-light leading-none" style={{
                      color: parseFloat(form.ytd_rent) - parseFloat(form.ytd_expenses) >= 0 ? '#5bba7a' : '#c45c5c'
                    }}>
                      {formatCurrency(parseFloat(form.ytd_rent) - parseFloat(form.ytd_expenses))}
                    </div>
                  </div>
                )}
              </div>

              {/* Narrative fields */}
              <div>
                <label className={labelClass} style={{ letterSpacing: '0.15em' }}>MAINTENANCE ISSUES</label>
                <textarea rows={3}
                  placeholder="Describe repairs, vendor work, ongoing issues, preventative maintenance…"
                  value={form.maintenance_issues}
                  onChange={e => setForm(f => ({ ...f, maintenance_issues: e.target.value }))}
                  className={textareaClass} />
              </div>

              <div>
                <label className={labelClass} style={{ letterSpacing: '0.15em' }}>TENANT ISSUES</label>
                <textarea rows={3}
                  placeholder="Late payments, complaints, lease renewals, move-ins/outs, disputes…"
                  value={form.tenant_issues}
                  onChange={e => setForm(f => ({ ...f, tenant_issues: e.target.value }))}
                  className={textareaClass} />
              </div>

              <div>
                <label className={labelClass} style={{ letterSpacing: '0.15em' }}>NOTES FOR OWNER</label>
                <textarea rows={3}
                  placeholder="Capital improvements, market conditions, upcoming decisions, special situations…"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className={textareaClass} />
              </div>

              {/* Next Month Outlook */}
              <div className={sectionClass}>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#d4b070] opacity-60" />
                  <p className={sectionLabelClass} style={{ letterSpacing: '0.2em' }}>NEXT MONTH OUTLOOK</p>
                </div>
                <textarea rows={4}
                  placeholder={`Planned maintenance or repairs\nExpected vacancies or move-outs\nPlanned rent increases\nKnown issues or risks`}
                  value={form.next_month_outlook}
                  onChange={e => setForm(f => ({ ...f, next_month_outlook: e.target.value }))}
                  className={textareaClass} />
                <p className="text-[11px] text-[#7a7468]">
                  The AI will include a dedicated &quot;Looking Ahead&quot; section based on these inputs.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-3 bg-[#2e1414] border border-[#c45c5c]/20 rounded-sm p-3">
                  <AlertCircle size={13} className="text-[#c45c5c] flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-[#c45c5c]">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={generating}
                className="w-full flex items-center justify-center gap-2.5 bg-[#d4b070]/10 hover:bg-[#d4b070]/16 border border-[#d4b070]/30 hover:border-[#d4b070]/50 disabled:opacity-40 disabled:cursor-not-allowed text-[#d4b070] text-[10px] py-4 rounded-sm transition-all"
                style={{ letterSpacing: '0.2em' }}
              >
                {generating ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    AI GENERATING REPORT…
                  </>
                ) : (
                  <>
                    <FileText size={13} />
                    GENERATE OWNER REPORT
                  </>
                )}
              </button>

              {generating && (
                <p className="text-center text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.1em' }}>
                  This takes 15–30 seconds. Sit tight.
                </p>
              )}
            </form>
          </div>
        </div>

        {/* Past reports */}
        <div className="animate-in" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-2.5 mb-4">
            <FileText size={11} className="text-[#7a7468]" />
            <h3 className="text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.22em' }}>PAST REPORTS</h3>
          </div>

          {buildingReports.length === 0 ? (
            <div className="bg-[#101210] border border-[#222620] rounded-sm p-6 text-center">
              <p className="font-display italic text-sm text-[#9e9a8c]">No reports yet</p>
              <p className="text-[10px] text-[#7a7468] mt-1">Generate your first report</p>
            </div>
          ) : (
            <div className="space-y-2">
              {buildingReports.map((r) => (
                <Link
                  key={r.id}
                  href={`/dashboard/reports/${r.id}`}
                  className="block bg-[#101210] border border-[#222620] rounded-sm p-4 hover:border-[#2e3328] hover:bg-[#161914] transition-all group"
                >
                  <div className="font-display italic text-sm text-[#c8c4b4] group-hover:text-[#eae6d6] transition-colors">
                    {formatMonth(r.report_month, r.report_year)}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="font-display text-xl font-light leading-none" style={{ color: Number(r.net_income) >= 0 ? '#5bba7a' : '#c45c5c' }}>
                      {formatCurrency(Number(r.net_income))}
                    </div>
                    <div className="text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.15em' }}>NOI</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
