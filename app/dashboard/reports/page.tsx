'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  FileText, Building2, TrendingUp, TrendingDown,
  Search, ChevronRight, Plus,
} from 'lucide-react'
import type { Report } from '@/types'
import { formatCurrency, formatMonth } from '@/lib/utils'

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/reports')
      .then(r => r.json())
      .then(data => { setReports(data); setLoading(false) })
  }, [])

  const filtered = reports.filter(r =>
    r.building_name.toLowerCase().includes(search.toLowerCase()) ||
    formatMonth(r.report_month, r.report_year).toLowerCase().includes(search.toLowerCase())
  )

  const totalNOI = filtered.reduce((sum, r) => sum + Number(r.net_income), 0)
  const totalRent = filtered.reduce((sum, r) => sum + Number(r.total_rent_collected), 0)
  const totalExpenses = filtered.reduce((sum, r) => sum + Number(r.total_expenses), 0)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] status-pulse" />
            <span className="text-[10px] font-mono text-[#7a8aaa] tracking-widest uppercase">Archive</span>
          </div>
          <h1 className="text-2xl font-bold text-[#c8d3e8] tracking-tight">All Reports</h1>
          <p className="text-sm text-[#7a8aaa] mt-0.5">Complete report history across all properties</p>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs text-[#00d4aa] hover:text-[#00856a] transition-colors border border-[#00d4aa]/30 rounded-lg px-3 py-2"
        >
          <Plus size={12} />
          New Report
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Reports', value: loading ? '—' : filtered.length.toString(), color: '#c8d3e8' },
          { label: 'Total Rent', value: loading ? '—' : formatCurrency(totalRent), color: '#00d4aa' },
          { label: 'Total Expenses', value: loading ? '—' : formatCurrency(totalExpenses), color: '#f59e0b' },
          { label: 'Net Income', value: loading ? '—' : formatCurrency(totalNOI), color: totalNOI >= 0 ? '#22c55e' : '#ef4444' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#0d0f18] border border-[#1e2438] rounded-lg p-4">
            <div className="text-[9px] font-mono text-[#7a8aaa] uppercase tracking-widest mb-2">{label}</div>
            <div className="text-xl font-bold font-mono" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3d4a66]" />
        <input
          type="text"
          placeholder="Search by building name or period..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#0d0f18] border border-[#1e2438] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[#c8d3e8] placeholder-[#3d4a66] focus:outline-none focus:border-[#00d4aa]/60 transition-colors font-mono"
        />
      </div>

      {/* Table */}
      <div className="bg-[#0d0f18] border border-[#1e2438] rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-[#1e2438] bg-[#131726]">
          {['Building', 'Period', 'Rent', 'Expenses', 'NOI', ''].map((h, i) => (
            <div key={i} className={`text-[9px] font-mono text-[#3d4a66] uppercase tracking-widest ${
              i === 0 ? 'col-span-4' :
              i === 1 ? 'col-span-2' :
              i === 2 ? 'col-span-2 text-right' :
              i === 3 ? 'col-span-2 text-right' :
              i === 4 ? 'col-span-1 text-right' :
              'col-span-1'
            }`}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div className="divide-y divide-[#1e2438]">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-[#131726]/20" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <FileText size={28} className="text-[#3d4a66] mx-auto mb-3" />
            <p className="text-sm text-[#7a8aaa]">
              {search ? 'No reports match your search' : 'No reports generated yet'}
            </p>
            {!search && (
              <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-[#00d4aa] hover:text-[#00856a] transition-colors mt-3">
                <Plus size={12} />
                Generate your first report
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#1e2438]">
            {filtered.map((report) => (
              <Link
                key={report.id}
                href={`/dashboard/reports/${report.id}`}
                className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-[#131726] transition-colors group items-center"
              >
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-7 h-7 rounded bg-[#131726] border border-[#1e2438] flex items-center justify-center flex-shrink-0 group-hover:border-[#00d4aa]/30 transition-colors">
                    <Building2 size={12} className="text-[#7a8aaa]" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#c8d3e8] group-hover:text-white transition-colors leading-tight">
                      {report.building_name}
                    </div>
                    <div className="text-[10px] text-[#7a8aaa] leading-tight truncate max-w-44">
                      {report.building_address}
                    </div>
                  </div>
                </div>
                <div className="col-span-2 text-sm font-mono text-[#7a8aaa]">
                  {formatMonth(report.report_month, report.report_year)}
                </div>
                <div className="col-span-2 text-sm font-mono text-[#c8d3e8] text-right">
                  {formatCurrency(Number(report.total_rent_collected))}
                </div>
                <div className="col-span-2 text-sm font-mono text-[#7a8aaa] text-right">
                  {formatCurrency(Number(report.total_expenses))}
                </div>
                <div className={`col-span-1 text-sm font-bold font-mono text-right flex items-center justify-end gap-1 ${
                  Number(report.net_income) >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'
                }`}>
                  {Number(report.net_income) >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {formatCurrency(Math.abs(Number(report.net_income)))}
                </div>
                <div className="col-span-1 flex justify-end">
                  <ChevronRight size={14} className="text-[#3d4a66] group-hover:text-[#00d4aa] transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
