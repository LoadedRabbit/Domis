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

        // Auto-seed buildings on first load if table is empty.
        // Always re-fetch after the seed attempt — handles both the seeded:true
        // case and the seeded:false case (buildings existed but returned empty).
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00d4aa] status-pulse" />
          <span className="text-[10px] font-mono text-[#7a8aaa] tracking-widest uppercase">Operational</span>
        </div>
        <h1 className="text-2xl font-bold text-[#c8d3e8] tracking-tight">Operations Center</h1>
        <p className="text-sm text-[#7a8aaa] mt-0.5">Kinyu Realty and Management Corp</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-[#7f1d1d]/20 border border-[#ef4444]/30 rounded-lg p-3 mb-6">
          <AlertCircle size={14} className="text-[#ef4444] flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-mono text-[#ef4444]">Failed to load data: {error}</span>
            <p className="text-[10px] text-[#7a8aaa] mt-0.5">Check that Supabase environment variables are set correctly in Vercel.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Buildings', value: loading ? '—' : buildings.length.toString(), icon: Building2, color: '#00d4aa' },
          { label: 'Total Units', value: loading ? '—' : totalUnits.toString(), icon: Users, color: '#22d3ee' },
          { label: 'Reports', value: loading ? '—' : recentReports.length.toString(), icon: FileText, color: '#22c55e' },
          { label: 'Staff', value: '6', icon: TrendingUp, color: '#f59e0b' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#0d0f18] border border-[#1e2438] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-mono text-[#7a8aaa] uppercase tracking-widest">{label}</span>
              <Icon size={13} style={{ color }} />
            </div>
            <div className="text-3xl font-bold font-mono" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 size={12} className="text-[#7a8aaa]" />
                <h2 className="text-[10px] font-mono text-[#7a8aaa] uppercase tracking-widest">Buildings</h2>
              </div>
              <p className="text-xs text-[#3d4a66] mt-0.5">Click any building to generate an owner report</p>
            </div>
            <span className="text-[10px] font-mono text-[#00d4aa]">{buildings.length} properties</span>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 bg-[#0d0f18] border border-[#1e2438] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {buildings.map((building) => (
                <Link
                  key={building.id}
                  href={`/dashboard/buildings/${building.id}`}
                  className="flex items-center justify-between bg-[#0d0f18] border border-[#1e2438] rounded-lg p-4 hover:border-[#00d4aa]/40 hover:bg-[#131726] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#131726] border border-[#1e2438] flex items-center justify-center group-hover:border-[#00d4aa]/30 group-hover:bg-[#00d4aa]/5 transition-all">
                      <Building2 size={13} className="text-[#7a8aaa] group-hover:text-[#00d4aa] transition-colors" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#c8d3e8]">{building.name}</div>
                      <div className="text-xs text-[#7a8aaa] truncate max-w-64">{building.address}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-bold font-mono text-[#c8d3e8]">{building.total_units}</div>
                      <div className="text-[9px] text-[#3d4a66]">units</div>
                    </div>
                    <div className="flex items-center gap-1 bg-[#0d0f18] border border-[#1e2438] rounded px-2 py-1.5 group-hover:border-[#00d4aa]/40 group-hover:bg-[#00d4aa]/5 transition-all">
                      <Plus size={10} className="text-[#00d4aa]" />
                      <span className="text-[10px] text-[#00d4aa] font-mono">Report</span>
                    </div>
                    <ChevronRight size={14} className="text-[#3d4a66] group-hover:text-[#00d4aa] transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText size={12} className="text-[#7a8aaa]" />
              <h2 className="text-[10px] font-mono text-[#7a8aaa] uppercase tracking-widest">Recent Reports</h2>
            </div>
            <Link href="/dashboard/reports" className="text-[10px] text-[#00d4aa] hover:text-[#00856a] transition-colors font-mono">
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-[#0d0f18] border border-[#1e2438] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : recentReports.length === 0 ? (
            <div className="bg-[#0d0f18] border border-[#1e2438] rounded-lg p-6 text-center">
              <div className="w-10 h-10 rounded-full bg-[#131726] border border-[#1e2438] flex items-center justify-center mx-auto mb-3">
                <Clock size={16} className="text-[#3d4a66]" />
              </div>
              <p className="text-xs text-[#7a8aaa] font-medium">No reports yet</p>
              <p className="text-[10px] text-[#3d4a66] mt-1">Select a building to generate your first report</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentReports.map((report) => (
                <Link
                  key={report.id}
                  href={`/dashboard/reports/${report.id}`}
                  className="block bg-[#0d0f18] border border-[#1e2438] rounded-lg p-3.5 hover:border-[#00d4aa]/40 hover:bg-[#131726] transition-all group"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="text-xs font-semibold text-[#c8d3e8] leading-tight group-hover:text-white transition-colors">
                      {report.building_name}
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] flex-shrink-0 mt-1" />
                  </div>
                  <div className="text-[10px] text-[#7a8aaa] font-mono mb-2.5">
                    {formatMonth(report.report_month, report.report_year)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold font-mono ${
                      Number(report.net_income) >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'
                    }`}>
                      {formatCurrency(Number(report.net_income))}
                    </span>
                    <div className="flex items-center gap-1">
                      <Zap size={9} className="text-[#3d4a66]" />
                      <span className="text-[9px] text-[#3d4a66]">NOI</span>
                    </div>
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
