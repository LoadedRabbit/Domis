'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Building2, DollarSign, Home, FileText,
  Loader2, AlertCircle, ChevronRight, Zap,
} from 'lucide-react'
import type { Building, ReportFormData, Report } from '@/types'
import { MONTHS } from '@/types'
import { formatCurrency, formatMonth } from '@/lib/utils'

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

export default function BuildingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [building, setBuilding] = useState<Building | null>(null)
  const [buildingReports, setBuildingReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<ReportFormData>({
    building_name: '',
    building_address: '',
    report_month: currentMonth,
    report_year: currentYear,
    total_rent_collected: '',
    total_expenses: '',
    vacant_units: '',
    maintenance_issues: '',
    tenant_issues: '',
    notes: '',
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
        // Network error — building will show not-found state
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
          total_expenses: parseFloat(form.total_expenses),
          vacant_units: parseInt(form.vacant_units),
        }),
      })

      if (!res.ok) {
        let errorMsg = `Server error (${res.status})`
        try {
          const data = await res.json()
          errorMsg = data.error || errorMsg
        } catch {
          // Vercel timeout or gateway error — response was not JSON
          if (res.status === 504 || res.status === 524) {
            errorMsg = 'Report generation timed out. Please try again.'
          }
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

  const inputClass = 'w-full bg-[#0d0f18] border border-[#1e2438] rounded-lg text-sm text-[#c8d3e8] placeholder-[#3d4a66] px-3 py-2.5 focus:outline-none focus:border-[#00d4aa]/60 transition-colors font-mono'
  const textareaClass = `${inputClass} resize-none`

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin text-[#7a8aaa]" />
      </div>
    )
  }

  if (!building) {
    return <div className="p-6 text-[#7a8aaa]">Building not found.</div>
  }

  const netPreview = form.total_rent_collected && form.total_expenses
    ? parseFloat(form.total_rent_collected) - parseFloat(form.total_expenses)
    : null

  const occupancyPreview = form.vacant_units !== '' && building
    ? Math.round(((building.total_units - parseInt(form.vacant_units)) / building.total_units) * 100)
    : null

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#7a8aaa] mb-6">
        <Link href="/dashboard" className="hover:text-[#c8d3e8] transition-colors">Operations</Link>
        <ChevronRight size={12} />
        <span className="text-[#c8d3e8]">{building.name}</span>
      </div>

      {/* Building header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[#0d0f18] border border-[#1e2438] flex items-center justify-center">
            <Building2 size={20} className="text-[#00d4aa]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#c8d3e8] tracking-tight">{building.name}</h1>
            <p className="text-sm text-[#7a8aaa]">{building.address}</p>
            <p className="text-[10px] text-[#3d4a66] mt-0.5 font-mono">{building.total_units} total units registered</p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs text-[#7a8aaa] hover:text-[#c8d3e8] transition-colors border border-[#1e2438] rounded-lg px-3 py-2"
        >
          <ArrowLeft size={13} />
          Back
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Form */}
        <div className="col-span-2">
          <div className="bg-[#0d0f18] border border-[#1e2438] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[#1e2438]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00d4aa] status-pulse" />
              <span className="text-[10px] font-mono text-[#7a8aaa] uppercase tracking-widest">Generate Owner Report</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Report period */}
              <div>
                <p className="text-[9px] font-mono text-[#3d4a66] uppercase tracking-widest mb-3">Report Period <span className="text-[#00d4aa]">*</span></p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-[#7a8aaa] uppercase tracking-widest mb-1.5">Month</label>
                    <select
                      value={form.report_month}
                      onChange={e => setForm(f => ({ ...f, report_month: parseInt(e.target.value) }))}
                      className={inputClass}
                    >
                      {MONTHS.map((m, i) => (
                        <option key={m} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-[#7a8aaa] uppercase tracking-widest mb-1.5">Year</label>
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

              {/* Financial data */}
              <div className="bg-[#131726] border border-[#1e2438] rounded-lg p-4 space-y-3">
                <p className="text-[9px] font-mono text-[#3d4a66] uppercase tracking-widest">Financial Data <span className="text-[#00d4aa]">*</span></p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-[#7a8aaa] uppercase tracking-widest mb-1.5">Rent Collected</label>
                    <div className="relative">
                      <DollarSign size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3d4a66]" />
                      <input
                        type="number" step="0.01" min="0" placeholder="0.00"
                        value={form.total_rent_collected}
                        onChange={e => setForm(f => ({ ...f, total_rent_collected: e.target.value }))}
                        className={`${inputClass} pl-7`}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-[#7a8aaa] uppercase tracking-widest mb-1.5">Total Expenses</label>
                    <div className="relative">
                      <DollarSign size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3d4a66]" />
                      <input
                        type="number" step="0.01" min="0" placeholder="0.00"
                        value={form.total_expenses}
                        onChange={e => setForm(f => ({ ...f, total_expenses: e.target.value }))}
                        className={`${inputClass} pl-7`}
                        required
                      />
                    </div>
                  </div>
                </div>

                {netPreview !== null && (
                  <div className="flex items-center justify-between bg-[#0d0f18] border border-[#1e2438] rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Zap size={11} className="text-[#7a8aaa]" />
                      <span className="text-[10px] font-mono text-[#7a8aaa] uppercase tracking-widest">Net Operating Income</span>
                    </div>
                    <span className={`text-base font-bold font-mono ${netPreview >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                      {formatCurrency(netPreview)}
                    </span>
                  </div>
                )}
              </div>

              {/* Occupancy */}
              <div>
                <label className="block text-[10px] font-mono text-[#7a8aaa] uppercase tracking-widest mb-1.5">
                  Vacant Units <span className="text-[#00d4aa]">*</span>
                </label>
                <div className="relative">
                  <Home size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3d4a66]" />
                  <input
                    type="number" min="0" max={building.total_units} placeholder="0"
                    value={form.vacant_units}
                    onChange={e => setForm(f => ({ ...f, vacant_units: e.target.value }))}
                    className={`${inputClass} pl-7`}
                    required
                  />
                </div>
                {occupancyPreview !== null && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[#131726] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#00d4aa] rounded-full transition-all"
                        style={{ width: `${occupancyPreview}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-[#00d4aa]">{occupancyPreview}% occupied</span>
                  </div>
                )}
              </div>

              {/* Narrative fields */}
              <div>
                <label className="block text-[10px] font-mono text-[#7a8aaa] uppercase tracking-widest mb-1.5">Maintenance Issues This Month</label>
                <textarea
                  rows={3}
                  placeholder="Describe repairs, vendor work, ongoing issues, preventative maintenance..."
                  value={form.maintenance_issues}
                  onChange={e => setForm(f => ({ ...f, maintenance_issues: e.target.value }))}
                  className={textareaClass}
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-[#7a8aaa] uppercase tracking-widest mb-1.5">Tenant Issues</label>
                <textarea
                  rows={3}
                  placeholder="Late payments, complaints, lease renewals, move-ins/move-outs, disputes..."
                  value={form.tenant_issues}
                  onChange={e => setForm(f => ({ ...f, tenant_issues: e.target.value }))}
                  className={textareaClass}
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-[#7a8aaa] uppercase tracking-widest mb-1.5">Notes for Owner</label>
                <textarea
                  rows={3}
                  placeholder="Capital improvements planned, market conditions, upcoming decisions, special situations..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className={textareaClass}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-[#7f1d1d]/20 border border-[#ef4444]/30 rounded-lg p-3">
                  <AlertCircle size={14} className="text-[#ef4444] flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-[#ef4444]">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={generating}
                className="w-full flex items-center justify-center gap-2.5 bg-[#00d4aa] hover:bg-[#00856a] disabled:opacity-50 disabled:cursor-not-allowed text-[#07080d] font-bold text-sm py-3 rounded-lg transition-colors"
              >
                {generating ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    AI Generating Report...
                  </>
                ) : (
                  <>
                    <Zap size={15} />
                    Generate Owner Report
                  </>
                )}
              </button>

              {generating && (
                <p className="text-center text-xs text-[#7a8aaa]">
                  This takes 15–30 seconds. Sit tight.
                </p>
              )}
            </form>
          </div>
        </div>

        {/* Past reports */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FileText size={12} className="text-[#7a8aaa]" />
            <h3 className="text-[10px] font-mono text-[#7a8aaa] uppercase tracking-widest">Past Reports</h3>
          </div>

          {buildingReports.length === 0 ? (
            <div className="bg-[#0d0f18] border border-[#1e2438] rounded-lg p-5 text-center">
              <p className="text-xs text-[#7a8aaa]">No reports yet</p>
              <p className="text-[10px] text-[#3d4a66] mt-1">Generate your first report</p>
            </div>
          ) : (
            <div className="space-y-2">
              {buildingReports.map((r) => (
                <Link
                  key={r.id}
                  href={`/dashboard/reports/${r.id}`}
                  className="block bg-[#0d0f18] border border-[#1e2438] rounded-lg p-3.5 hover:border-[#00d4aa]/40 hover:bg-[#131726] transition-all"
                >
                  <div className="text-xs font-medium text-[#c8d3e8]">{formatMonth(r.report_month, r.report_year)}</div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className={`text-xs font-bold font-mono ${Number(r.net_income) >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                      {formatCurrency(Number(r.net_income))}
                    </span>
                    <span className="text-[9px] text-[#3d4a66]">NOI</span>
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
