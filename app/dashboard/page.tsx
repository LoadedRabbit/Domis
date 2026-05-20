'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Building2, FileText, Users, TrendingUp,
  ChevronRight, Plus, Clock, Zap, AlertCircle,
} from 'lucide-react'
import type { Building, Report } from '@/types'
import { formatCurrency, formatMonth } from '@/lib/utils'

export default function DashboardPage() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [recentReports, setRecentReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [bRes, rRes] = await Promise.all([
          fetch('/api/buildings'),
          fetch('/api/reports?limit=5'),
        ])

        if (!bRes.ok) {
          const body = await bRes.json().catch(() => ({ error: `HTTP ${bRes.status}` }))
          throw new Error(body.error || `Buildings API returned ${bRes.status}`)
        }
        if (!rRes.ok) {
          const body = await rRes.json().catch(() => ({ error: `HTTP ${rRes.status}` }))
          throw new Error(body.error || `Reports API returned ${rRes.status}`)
        }

        const buildingsData: Building[] = await bRes.json()

        if (buildingsData.length === 0) {
          await fetch('/api/seed', { method: 'POST' })
          const fresh = await fetch('/api/buildings')
          if (fresh.ok) setBuildings(await fresh.json())
        } else {
          setBuildings(buildingsData)
        }

        setRecentReports(await rRes.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const totalUnits = buildings.reduce((sum, b) => sum + b.total_units, 0)

  const stats = [
    { label: 'Properties',   value: buildings.length,      icon: Building2,   color: '#3b82f6' },
    { label: 'Total Units',  value: totalUnits,             icon: Users,       color: '#94a3b8' },
    { label: 'Reports',      value: recentReports.length,  icon: FileText,    color: '#10b981' },
    { label: 'Staff',        value: 6,                     icon: TrendingUp,  color: '#f59e0b' },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] status-pulse" />
          <span className="text-[10px] font-mono text-[#64748b] tracking-widest uppercase">Operational</span>
        </div>
        <h1 className="text-2xl font-bold text-[#e2e8f0] tracking-tight">Operations Center</h1>
        <p className="text-sm text-[#64748b] mt-0.5">Kinyu Realty and Management Corp</p>
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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#10141c] border border-[#1e2535] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-mono text-[#64748b] uppercase tracking-widest">{label}</span>
              <Icon size={13} style={{ color }} />
            </div>
            <div className="text-2xl font-bold font-mono" style={{ color }}>
              {loading ? <span className="text-[#64748b]">—</span> : value}
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Buildings list */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 size={13} className="text-[#64748b]" />
              <h2 className="text-[10px] font-mono text-[#64748b] uppercase tracking-widest">Properties</h2>
            </div>
            {!loading && (
              <span className="text-[10px] font-mono text-[#3b82f6]">{buildings.length} buildings</span>
            )}
          </div>

          {loading ? (
            <div className="space-y-px bg-[#10141c] border border-[#1e2535] rounded-lg overflow-hidden">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-[60px] animate-pulse bg-[#131822]/60" />
              ))}
            </div>
          ) : (
            <div className="bg-[#10141c] border border-[#1e2535] rounded-lg overflow-hidden">
              {buildings.map((building, i) => (
                <Link
                  key={building.id}
                  href={`/dashboard/buildings/${building.id}`}
                  className={`flex items-center justify-between px-4 py-3.5 hover:bg-[#131822] transition-colors group ${
                    i !== buildings.length - 1 ? 'border-b border-[#1e2535]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-md bg-[#131822] border border-[#1e2535] flex items-center justify-center flex-shrink-0 group-hover:border-[#3b82f6]/30 group-hover:bg-[#3b82f6]/5 transition-all">
                      <Building2 size={12} className="text-[#64748b] group-hover:text-[#3b82f6] transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#e2e8f0] leading-tight truncate">{building.name}</div>
                      <div className="text-[11px] text-[#64748b] truncate">{building.address}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-mono font-bold text-[#94a3b8]">{building.total_units}</div>
                      <div className="text-[9px] text-[#64748b]">units</div>
                    </div>
                    <div className="flex items-center gap-1 bg-[#3b82f6]/8 border border-[#3b82f6]/20 rounded-md px-2.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus size={10} className="text-[#3b82f6]" />
                      <span className="text-[10px] text-[#3b82f6] font-mono">Report</span>
                    </div>
                    <ChevronRight size={14} className="text-[#1e2535] group-hover:text-[#3b82f6] transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Reports */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText size={13} className="text-[#64748b]" />
              <h2 className="text-[10px] font-mono text-[#64748b] uppercase tracking-widest">Recent Reports</h2>
            </div>
            <Link href="/dashboard/reports" className="text-[10px] font-mono text-[#3b82f6] hover:text-[#60a5fa] transition-colors">
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-[#10141c] border border-[#1e2535] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : recentReports.length === 0 ? (
            <div className="bg-[#10141c] border border-[#1e2535] rounded-lg p-8 text-center">
              <div className="w-10 h-10 rounded-full bg-[#131822] border border-[#1e2535] flex items-center justify-center mx-auto mb-3">
                <Clock size={16} className="text-[#64748b]" />
              </div>
              <p className="text-xs font-medium text-[#94a3b8]">No reports yet</p>
              <p className="text-[11px] text-[#64748b] mt-1">Select a building to generate your first report</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentReports.map((report) => (
                <Link
                  key={report.id}
                  href={`/dashboard/reports/${report.id}`}
                  className="block bg-[#10141c] border border-[#1e2535] rounded-lg p-3.5 hover:border-[#2a3350] hover:bg-[#131822] transition-all group"
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="text-xs font-semibold text-[#e2e8f0] leading-tight truncate pr-2 group-hover:text-white transition-colors">
                      {report.building_name}
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] flex-shrink-0 mt-1" />
                  </div>
                  <div className="text-[10px] text-[#64748b] font-mono mb-2.5">
                    {formatMonth(report.report_month, report.report_year)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold font-mono ${Number(report.net_income) >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                      {formatCurrency(Number(report.net_income))}
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap size={9} className="text-[#64748b]" />
                      <span className="text-[9px] text-[#64748b]">NOI</span>
                    </span>
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
