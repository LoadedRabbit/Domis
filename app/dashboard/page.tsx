'use client'

import { useEffect, useState, type ElementType } from 'react'
import Link from 'next/link'
import {
  Building2, FileText, Users, TrendingUp,
  ChevronRight, Plus, Clock, AlertCircle, Bell, X,
} from 'lucide-react'
import type { Building, Report } from '@/types'
import { formatCurrency, formatMonth } from '@/lib/utils'

interface RentEntry {
  id: string
  due_date: string
  amount_due: number
  status: string
  days_overdue: number
  tenant: { id: number; full_name: string; unit_number: string } | null
  building: { id: number; name: string } | null
}

export default function DashboardPage() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [recentReports, setRecentReports] = useState<Report[]>([])
  const [upcomingRent, setUpcomingRent] = useState<RentEntry[]>([])
  const [overdueRent, setOverdueRent] = useState<RentEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dismissedUpcoming, setDismissedUpcoming] = useState(false)
  const [dismissedOverdue, setDismissedOverdue]   = useState(false)
  const [sendingReminders, setSendingReminders]   = useState(false)
  const [remindersSent, setRemindersSent]         = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [bRes, rRes, rentRes] = await Promise.all([
          fetch('/api/buildings'),
          fetch('/api/reports?limit=5'),
          fetch('/api/rent?status=unpaid'),
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
        setBuildings(buildingsData)
        setRecentReports(await rRes.json())

        if (rentRes.ok) {
          const allUnpaid: RentEntry[] = await rentRes.json()
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const threeDays = new Date(today)
          threeDays.setDate(threeDays.getDate() + 3)

          setOverdueRent(allUnpaid.filter(e => e.days_overdue > 0))
          setUpcomingRent(allUnpaid.filter(e => {
            if (e.days_overdue > 0) return false
            const due = new Date(e.due_date)
            due.setHours(0, 0, 0, 0)
            return due <= threeDays
          }))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function sendReminders() {
    if (upcomingRent.length === 0) return
    setSendingReminders(true)
    try {
      const res = await fetch('/api/rent/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ledger_ids: upcomingRent.map(e => e.id) }),
      })
      const data = await res.json()
      setRemindersSent(data.count ?? upcomingRent.length)
      setTimeout(() => setRemindersSent(null), 4000)
    } finally {
      setSendingReminders(false)
    }
  }

  const totalUnits = buildings.reduce((sum, b) => sum + b.total_units, 0)

  const stats: { label: string; value: number | string; sub: string; icon: ElementType; color: string; href?: string }[] = [
    { label: 'Properties',  value: buildings.length,     sub: 'total',        icon: Building2,  color: '#d4b070' },
    { label: 'Total Units', value: totalUnits,            sub: 'residential',  icon: Users,      color: '#9e9a8c' },
    { label: 'Reports',     value: recentReports.length, sub: 'generated',    icon: FileText,   color: '#5bba7a' },
    { label: 'Finances',    value: '→',                  sub: 'income & expenses', icon: TrendingUp, color: '#d48f4a', href: '/dashboard/finances' },
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div
        className="animate-in mb-10"
        style={{ animationDelay: '0ms' }}
      >
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#5bba7a] status-pulse" />
          <span
            className="text-[10px] text-[#7a7468]"
            style={{ letterSpacing: '0.28em' }}
          >
            OPERATIONAL
          </span>
        </div>
        <h1 className="font-display text-5xl font-light text-[#eae6d6] leading-tight tracking-tight mb-1">
          Overview
        </h1>
        <div className="flex items-center gap-3 mt-2">
          <div className="h-px flex-1 bg-gradient-to-r from-[#d4b070]/40 to-transparent max-w-48" />
          <p className="text-xs text-[#7a7468]" style={{ letterSpacing: '0.15em' }}>
            PROPERTY MANAGEMENT
          </p>
        </div>
      </div>

      {error && (
        <div
          className="flex items-start gap-3 bg-[#2e1414] border border-[#c45c5c]/20 rounded-sm p-4 mb-8 animate-in"
          style={{ animationDelay: '40ms' }}
        >
          <AlertCircle size={14} className="text-[#c45c5c] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-[#c45c5c]">{error}</p>
            <p className="text-[11px] text-[#7a7468] mt-0.5">Check Supabase environment variables in Vercel.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {stats.map(({ label, value, sub, icon: Icon, color, href }, i) => {
          const inner = (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.2em' }}>
                  {label.toUpperCase()}
                </span>
                <Icon size={12} style={{ color, opacity: 0.5 }} />
              </div>
              <div className="font-display leading-none mb-2 transition-colors" style={{ fontSize: '52px', color, fontWeight: 300 }}>
                {loading ? <span style={{ color: '#222620' }}>—</span> : value}
              </div>
              <div className="text-[11px] text-[#7a7468]" style={{ letterSpacing: '0.15em' }}>{sub}</div>
            </>
          )
          const cls = 'animate-in bg-[#101210] border border-[#222620] rounded-sm p-5 hover:border-[#2e3328] transition-colors group'
          return href ? (
            <Link key={label} href={href} className={cls} style={{ animationDelay: `${80 + i * 60}ms` }}>{inner}</Link>
          ) : (
            <div key={label} className={cls} style={{ animationDelay: `${80 + i * 60}ms` }}>{inner}</div>
          )
        })}
      </div>

      {/* Rent reminder banners */}
      {!loading && overdueRent.length > 0 && !dismissedOverdue && (
        <div className="flex items-center justify-between gap-4 bg-[#2e1414] border border-[#c45c5c]/30 rounded-sm px-5 py-3 mb-4 animate-in" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center gap-3 min-w-0">
            <AlertCircle size={14} className="text-[#c45c5c] flex-shrink-0" />
            <p className="text-xs text-[#c45c5c]">
              <span className="font-medium">{overdueRent.length} unit{overdueRent.length !== 1 ? 's' : ''}</span> with unpaid rent that is past due
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link href="/dashboard/rent" className="text-[11px] text-[#c45c5c] border border-[#c45c5c]/30 rounded-sm px-3 py-1 hover:bg-[#c45c5c]/10 transition-colors" style={{ letterSpacing: '0.12em' }}>
              VIEW RENT
            </Link>
            <button onClick={() => setDismissedOverdue(true)} className="text-[#7a7468] hover:text-[#9e9a8c] transition-colors">
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {!loading && upcomingRent.length > 0 && !dismissedUpcoming && (
        <div className="flex items-center justify-between gap-4 bg-[#2a2100] border border-[#d4b070]/30 rounded-sm px-5 py-3 mb-4 animate-in" style={{ animationDelay: '340ms' }}>
          <div className="flex items-center gap-3 min-w-0">
            <Bell size={14} className="text-[#d4b070] flex-shrink-0" />
            <p className="text-xs text-[#d4b070]">
              Rent due within 3 days for <span className="font-medium">{upcomingRent.length} unit{upcomingRent.length !== 1 ? 's' : ''}</span>
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {remindersSent !== null ? (
              <span className="text-[11px] text-[#5bba7a]" style={{ letterSpacing: '0.12em' }}>
                SENT TO {remindersSent}
              </span>
            ) : (
              <button
                onClick={sendReminders}
                disabled={sendingReminders}
                className="text-[11px] text-[#d4b070] border border-[#d4b070]/30 rounded-sm px-3 py-1 hover:bg-[#d4b070]/10 transition-colors disabled:opacity-50"
                style={{ letterSpacing: '0.12em' }}
              >
                {sendingReminders ? 'SENDING…' : 'SEND REMINDERS'}
              </button>
            )}
            <button onClick={() => setDismissedUpcoming(true)} className="text-[#7a7468] hover:text-[#9e9a8c] transition-colors">
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Buildings */}
        <div className="lg:col-span-2 animate-in" style={{ animationDelay: '320ms' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Building2 size={12} className="text-[#7a7468]" />
              <span className="text-[11px] text-[#7a7468]" style={{ letterSpacing: '0.22em' }}>
                PROPERTIES
              </span>
            </div>
            {!loading && (
              <span
                className="text-[11px] text-[#d4b070]"
                style={{ letterSpacing: '0.15em' }}
              >
                {buildings.length} listed
              </span>
            )}
          </div>

          {loading ? (
            <div className="bg-[#101210] border border-[#222620] rounded-sm overflow-hidden">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-[62px] animate-pulse bg-[#161914]/60 border-b border-[#222620] last:border-b-0" />
              ))}
            </div>
          ) : (
            <div className="bg-[#101210] border border-[#222620] rounded-sm overflow-hidden">
              {buildings.map((building, i) => (
                <Link
                  key={building.id}
                  href={`/dashboard/buildings/${building.id}`}
                  className={`flex items-center justify-between px-5 py-4 hover:bg-[#161914] transition-all group ${
                    i !== buildings.length - 1 ? 'border-b border-[#222620]' : ''
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors"
                      style={{ background: '#2e3328' }}
                    />
                    <div className="min-w-0">
                      <div className="font-display text-base font-medium italic text-[#c8c4b4] group-hover:text-[#eae6d6] leading-tight truncate transition-colors">
                        {building.name}
                      </div>
                      <div className="text-[10px] text-[#7a7468] truncate mt-0.5">
                        {building.address}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                    <div className="text-right hidden sm:block">
                      <div className="font-display text-xl font-light text-[#9e9a8c]">{building.total_units}</div>
                      <div className="text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.15em' }}>UNITS</div>
                    </div>
                    <div className="flex items-center gap-1.5 border border-[#d4b070]/0 group-hover:border-[#d4b070]/20 bg-[#d4b070]/0 group-hover:bg-[#d4b070]/04 rounded-sm px-2.5 py-1 opacity-0 group-hover:opacity-100 transition-all">
                      <Plus size={9} className="text-[#d4b070]" />
                      <span className="text-[11px] text-[#d4b070]" style={{ letterSpacing: '0.1em' }}>REPORT</span>
                    </div>
                    <ChevronRight size={13} className="text-[#2e3328] group-hover:text-[#d4b070] transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Reports */}
        <div className="animate-in" style={{ animationDelay: '380ms' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <FileText size={12} className="text-[#7a7468]" />
              <span className="text-[11px] text-[#7a7468]" style={{ letterSpacing: '0.22em' }}>
                RECENT REPORTS
              </span>
            </div>
            <Link
              href="/dashboard/reports"
              className="text-[11px] text-[#d4b070] hover:text-[#eae6d6] transition-colors"
              style={{ letterSpacing: '0.1em' }}
            >
              VIEW ALL →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-[#101210] border border-[#222620] rounded-sm animate-pulse" />
              ))}
            </div>
          ) : recentReports.length === 0 ? (
            <div className="bg-[#101210] border border-[#222620] rounded-sm p-8 text-center">
              <div className="w-10 h-10 rounded-sm bg-[#161914] border border-[#222620] flex items-center justify-center mx-auto mb-3">
                <Clock size={14} className="text-[#7a7468]" />
              </div>
              <p className="text-xs text-[#9e9a8c]">No reports yet</p>
              <p className="text-[10px] text-[#7a7468] mt-1">Select a property to begin</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentReports.map((report) => (
                <Link
                  key={report.id}
                  href={`/dashboard/reports/${report.id}`}
                  className="block bg-[#101210] border border-[#222620] rounded-sm p-4 hover:border-[#2e3328] hover:bg-[#161914] transition-all group"
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="font-display text-sm italic font-medium text-[#c8c4b4] group-hover:text-[#eae6d6] leading-tight truncate pr-2 transition-colors">
                      {report.building_name}
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#5bba7a] flex-shrink-0 mt-1 status-pulse" />
                  </div>
                  <div className="text-[11px] text-[#7a7468] mb-3" style={{ letterSpacing: '0.12em' }}>
                    {formatMonth(report.report_month, report.report_year).toUpperCase()}
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div
                        className="font-display text-2xl font-light leading-none"
                        style={{ color: Number(report.net_income) >= 0 ? '#5bba7a' : '#c45c5c' }}
                      >
                        {formatCurrency(Number(report.net_income))}
                      </div>
                      <div className="text-[10px] text-[#7a7468] mt-0.5" style={{ letterSpacing: '0.15em' }}>
                        NET INCOME
                      </div>
                    </div>
                    <ChevronRight size={12} className="text-[#2e3328] group-hover:text-[#d4b070] transition-colors mb-1" />
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
