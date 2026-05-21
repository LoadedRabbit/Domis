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

  const summaryStats = [
    { label: 'Reports',    value: loading ? '—' : String(filtered.length), color: '#eae6d6' },
    { label: 'Rent',       value: loading ? '—' : formatCurrency(totalRent), color: '#c8a86a' },
    { label: 'Expenses',   value: loading ? '—' : formatCurrency(totalExpenses), color: '#d48f4a' },
    { label: 'Net Income', value: loading ? '—' : formatCurrency(totalNOI), color: totalNOI >= 0 ? '#5bba7a' : '#c45c5c' },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="animate-in flex items-start justify-between mb-10" style={{ animationDelay: '0ms' }}>
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#5bba7a] status-pulse" />
            <span className="text-[8px] text-[#5c5850]" style={{ letterSpacing: '0.28em' }}>ARCHIVE</span>
          </div>
          <h1 className="font-display text-5xl font-light text-[#eae6d6] leading-tight tracking-tight mb-1">
            Reports
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <div className="h-px flex-1 bg-gradient-to-r from-[#c8a86a]/40 to-transparent max-w-36" />
            <p className="text-xs text-[#5c5850]" style={{ letterSpacing: '0.15em' }}>
              COMPLETE HISTORY
            </p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-[9px] text-[#c8a86a] hover:text-[#eae6d6] transition-colors border border-[#c8a86a]/25 hover:border-[#c8a86a]/50 rounded-sm px-3 py-2"
          style={{ letterSpacing: '0.12em', marginTop: '4px' }}
        >
          <Plus size={10} />
          NEW REPORT
        </Link>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-[#2e1414] border border-[#c45c5c]/20 rounded-sm p-4 mb-8 animate-in" style={{ animationDelay: '40ms' }}>
          <AlertCircle size={14} className="text-[#c45c5c] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-[#c45c5c]">{error}</p>
            <p className="text-[11px] text-[#5c5850] mt-0.5">Check Supabase environment variables in Vercel.</p>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 animate-in" style={{ animationDelay: '80ms' }}>
        {summaryStats.map(({ label, value, color }) => (
          <div key={label} className="bg-[#101210] border border-[#222620] rounded-sm p-4">
            <div className="text-[8px] text-[#5c5850] mb-3" style={{ letterSpacing: '0.2em' }}>{label.toUpperCase()}</div>
            <div className="font-display text-2xl font-light leading-none" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5 animate-in" style={{ animationDelay: '140ms' }}>
        <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5c5850]" />
        <input
          type="text"
          placeholder="Search by building or period…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#101210] border border-[#222620] rounded-sm pl-10 pr-4 py-2.5 text-xs text-[#eae6d6] placeholder-[#5c5850] focus:outline-none focus:border-[#c8a86a]/30 focus:ring-1 focus:ring-[#c8a86a]/10 transition-all"
          style={{ letterSpacing: '0.04em' }}
        />
      </div>

      {/* Table */}
      <div className="bg-[#101210] border border-[#222620] rounded-sm overflow-hidden animate-in" style={{ animationDelay: '200ms' }}>
        {/* Header row */}
        <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-[#222620] bg-[#0e100d]">
          {[
            { label: 'Building',  cls: 'col-span-4' },
            { label: 'Period',    cls: 'col-span-2' },
            { label: 'Rent',      cls: 'col-span-2 text-right' },
            { label: 'Expenses',  cls: 'col-span-2 text-right' },
            { label: 'NOI',       cls: 'col-span-1 text-right' },
            { label: '',          cls: 'col-span-1' },
          ].map(({ label, cls }) => (
            <div key={label} className={`text-[8px] text-[#5c5850] ${cls}`} style={{ letterSpacing: '0.2em' }}>
              {label}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="divide-y divide-[#222620]">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-[64px] animate-pulse bg-[#161914]/40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <FileText size={24} className="text-[#222620] mx-auto mb-3" />
            <p className="text-sm font-display italic text-[#9e9a8c]">
              {search ? 'No reports match your search' : 'No reports generated yet'}
            </p>
            {!search && (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-[9px] text-[#c8a86a] hover:text-[#eae6d6] transition-colors mt-4"
                style={{ letterSpacing: '0.12em' }}
              >
                <Plus size={10} />
                GENERATE FIRST REPORT
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#222620]">
            {filtered.map((report) => (
              <Link
                key={report.id}
                href={`/dashboard/reports/${report.id}`}
                className="grid grid-cols-12 gap-4 px-5 py-4 hover:bg-[#161914] transition-colors group items-center"
              >
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#222620] group-hover:bg-[#c8a86a] flex-shrink-0 transition-colors" />
                  <div className="min-w-0">
                    <div className="font-display text-base italic font-medium text-[#c8c4b4] group-hover:text-[#eae6d6] transition-colors leading-tight truncate">
                      {report.building_name}
                    </div>
                    <div className="text-[10px] text-[#5c5850] leading-tight truncate mt-0.5">
                      {report.building_address}
                    </div>
                  </div>
                </div>

                <div className="col-span-2 text-[10px] text-[#9e9a8c]" style={{ letterSpacing: '0.08em' }}>
                  {formatMonth(report.report_month, report.report_year)}
                </div>

                <div className="col-span-2 font-display text-base font-light text-[#eae6d6] text-right">
                  {formatCurrency(Number(report.total_rent_collected))}
                </div>

                <div className="col-span-2 font-display text-base font-light text-[#9e9a8c] text-right">
                  {formatCurrency(Number(report.total_expenses))}
                </div>

                <div className={`col-span-1 font-display text-base font-light text-right flex items-center justify-end gap-1 ${
                  Number(report.net_income) >= 0 ? 'text-[#5bba7a]' : 'text-[#c45c5c]'
                }`}>
                  {Number(report.net_income) >= 0
                    ? <TrendingUp size={11} />
                    : <TrendingDown size={11} />
                  }
                  {formatCurrency(Math.abs(Number(report.net_income)))}
                </div>

                <div className="col-span-1 flex justify-end">
                  <ChevronRight size={13} className="text-[#222620] group-hover:text-[#c8a86a] transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
