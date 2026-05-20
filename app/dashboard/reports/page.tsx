'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  FileText, Building2, TrendingUp, TrendingDown,
  Search, ChevronRight, Plus, AlertCircle,
} from 'lucide-react'
import type { Report } from '@/types'
import { formatCurrency, formatMonth } from '@/lib/utils'

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/reports')
      .then(async r => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({ error: `HTTP ${r.status}` }))
          throw new Error(body.error || `API returned ${r.status}`)
        }
        return r.json()
      })
      .then((data: Report[]) => setReports(data))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load reports'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = reports.filter(r =>
    r.building_name.toLowerCase().includes(search.toLowerCase()) ||
    formatMonth(r.report_month, r.report_year).toLowerCase().includes(search.toLowerCase())
  )

  const totalNOI      = filtered.reduce((sum, r) => sum + Number(r.net_income), 0)
  const totalRent     = filtered.reduce((sum, r) => sum + Number(r.total_rent_collected), 0)
  const totalExpenses = filtered.reduce((sum, r) => sum + Number(r.total_expenses), 0)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] status-pulse" />
            <span className="text-[10px] font-mono text-[#64748b] tracking-widest uppercase">Archive</span>
          </div>
          <h1 className="text-2xl font-bold text-[#e2e8f0] tracking-tight">All Reports</h1>
          <p className="text-sm text-[#64748b] mt-0.5">Complete report history across all properties</p>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs text-[#3b82f6] hover:text-[#60a5fa] transition-colors border border-[#3b82f6]/30 rounded-lg px-3 py-2 hover:border-[#3b82f6]/60"
        >
          <Plus size={12} />
          New Report
        </Link>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-lg p-4 mb-6">
          <AlertCircle size={14} className="text-[#ef4444] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-mono text-[#ef4444]">{error}</p>
            <p className="text-[11px] text-[#64748b] mt-0.5">Check Supabase environment variables in Vercel.</p>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Reports', value: loading ? '—' : filtered.length.toString(),         color: '#e2e8f0' },
          { label: 'Total Rent',    value: loading ? '—' : formatCurrency(totalRent),          color: '#3b82f6' },
          { label: 'Expenses',      value: loading ? '—' : formatCurrency(totalExpenses),      color: '#f59e0b' },
          { label: 'Net Income',    value: loading ? '—' : formatCurrency(totalNOI),           color: totalNOI >= 0 ? '#10b981' : '#ef4444' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#10141c] border border-[#1e2535] rounded-lg p-4">
            <div className="text-[9px] font-mono text-[#64748b] uppercase tracking-widest mb-2">{label}</div>
            <div className="text-lg font-bold font-mono" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
        <input
          type="text"
          placeholder="Search by building or period…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#10141c] border border-[#1e2535] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none focus:border-[#3b82f6]/50 focus:ring-1 focus:ring-[#3b82f6]/20 transition-all font-mono"
        />
      </div>

      {/* Table */}
      <div className="bg-[#10141c] border border-[#1e2535] rounded-lg overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-[#1e2535] bg-[#131822]">
          {[
            { label: 'Building',  span: 'col-span-4' },
            { label: 'Period',    span: 'col-span-2' },
            { label: 'Rent',      span: 'col-span-2 text-right' },
            { label: 'Expenses',  span: 'col-span-2 text-right' },
            { label: 'NOI',       span: 'col-span-1 text-right' },
            { label: '',          span: 'col-span-1' },
          ].map(({ label, span }) => (
            <div key={label} className={`text-[9px] font-mono text-[#64748b] uppercase tracking-widest ${span}`}>
              {label}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="divide-y divide-[#1e2535]">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-[60px] animate-pulse bg-[#131822]/30" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <FileText size={28} className="text-[#1e2535] mx-auto mb-3" />
            <p className="text-sm text-[#94a3b8]">
              {search ? 'No reports match your search' : 'No reports generated yet'}
            </p>
            {!search && (
              <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-[#3b82f6] hover:text-[#60a5fa] transition-colors mt-3">
                <Plus size={12} />
                Generate your first report
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#1e2535]">
            {filtered.map((report) => (
              <Link
                key={report.id}
                href={`/dashboard/reports/${report.id}`}
                className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-[#131822] transition-colors group items-center"
              >
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-[#131822] border border-[#1e2535] flex items-center justify-center flex-shrink-0 group-hover:border-[#3b82f6]/30 transition-colors">
                    <Building2 size={12} className="text-[#64748b]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#e2e8f0] group-hover:text-white transition-colors leading-tight truncate">
                      {report.building_name}
                    </div>
                    <div className="text-[10px] text-[#64748b] leading-tight truncate">
                      {report.building_address}
                    </div>
                  </div>
                </div>

                <div className="col-span-2 text-sm font-mono text-[#94a3b8]">
                  {formatMonth(report.report_month, report.report_year)}
                </div>

                <div className="col-span-2 text-sm font-mono text-[#e2e8f0] text-right">
                  {formatCurrency(Number(report.total_rent_collected))}
                </div>

                <div className="col-span-2 text-sm font-mono text-[#94a3b8] text-right">
                  {formatCurrency(Number(report.total_expenses))}
                </div>

                <div className={`col-span-1 text-sm font-bold font-mono text-right flex items-center justify-end gap-1 ${
                  Number(report.net_income) >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'
                }`}>
                  {Number(report.net_income) >= 0
                    ? <TrendingUp size={11} />
                    : <TrendingDown size={11} />
                  }
                  {formatCurrency(Math.abs(Number(report.net_income)))}
                </div>

                <div className="col-span-1 flex justify-end">
                  <ChevronRight size={14} className="text-[#1e2535] group-hover:text-[#3b82f6] transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
