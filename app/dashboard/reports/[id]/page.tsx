'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Building2, Download, FileText, DollarSign,
  Home, Wrench, Users, StickyNote, ChevronRight, Loader2,
  TrendingUp, TrendingDown,
} from 'lucide-react'
import type { Report } from '@/types'
import { formatCurrency, formatMonth } from '@/lib/utils'
import { downloadReportAsPDF } from '@/lib/pdf'

const SECTION_COLORS: Record<string, string> = {
  'EXECUTIVE SUMMARY':               '#d4b070',
  'FINANCIAL SUMMARY':               '#5bba7a',
  'OCCUPANCY REPORT':                '#7ab4e0',
  'MAINTENANCE SUMMARY':             '#d48f4a',
  'TENANT UPDATES':                  '#a89ec8',
  'RECOMMENDATIONS':                 '#5bba7a',
  'RECOMMENDATIONS FOR NEXT MONTH':  '#5bba7a',
  'LOOKING AHEAD':                   '#7ab4e0',
  'CLOSING STATEMENT':               '#9e9a8c',
}

function sectionColor(heading: string): string {
  return SECTION_COLORS[heading.toUpperCase()] ?? '#d4b070'
}

function ReportSection({ heading, body, index }: { heading: string; body: string; index: number }) {
  const color = sectionColor(heading)
  const lines = body.split('\n').filter(Boolean)
  const elements: React.ReactNode[] = []
  let listBuffer: string[] = []

  function flush(key: string) {
    if (listBuffer.length === 0) return
    elements.push(
      <ul key={key} className="space-y-2 mb-4">
        {listBuffer.map((item, j) => (
          <li key={j} className="flex items-start gap-3 text-[13px] text-[#9e9a8c] leading-relaxed">
            <span className="mt-2 w-px h-3 flex-shrink-0" style={{ background: color }} />
            <span
              dangerouslySetInnerHTML={{
                __html: item
                  .replace(/^[-*•\d.]\s*/, '')
                  .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#c8c4b4">$1</strong>'),
              }}
            />
          </li>
        ))}
      </ul>
    )
    listBuffer = []
  }

  lines.forEach((line, i) => {
    if (/^[-*•]\s/.test(line) || /^\d+\.\s/.test(line)) {
      listBuffer.push(line)
    } else {
      flush(`ul-${i}`)
      elements.push(
        <p
          key={i}
          className="text-[13px] text-[#c8c4b4] leading-relaxed mb-3"
          dangerouslySetInnerHTML={{
            __html: line
              .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#eae6d6">$1</strong>')
              .replace(/\*(.+?)\*/g, '<em>$1</em>'),
          }}
        />
      )
    }
  })
  flush('end')

  return (
    <div className="border border-[#222620] rounded-sm overflow-hidden bg-[#101210]">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#222620] bg-[#0e100d]">
        <span
          className="font-display text-2xl font-light leading-none"
          style={{ color, opacity: 0.35 }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="w-px h-4 bg-[#222620]" />
        <h3
          className="text-[11px]"
          style={{ color, letterSpacing: '0.2em' }}
        >
          {heading.toUpperCase()}
        </h3>
      </div>
      <div className="px-5 py-4">{elements}</div>
    </div>
  )
}

function ReportContent({ content }: { content: string }) {
  const sections = content.split(/^## /m).filter(Boolean)

  if (sections.length === 0) {
    return (
      <div className="bg-[#101210] border border-[#222620] rounded-sm p-5">
        <div className="whitespace-pre-wrap text-sm text-[#c8c4b4] leading-relaxed">{content}</div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sections.map((section, i) => {
        const nl = section.indexOf('\n')
        const heading = nl > -1 ? section.slice(0, nl).trim() : section.trim()
        const body    = nl > -1 ? section.slice(nl + 1).trim() : ''
        return <ReportSection key={i} heading={heading} body={body} index={i} />
      })}
    </div>
  )
}

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [report, setReport]         = useState<Report | null>(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then(async r => {
        if (!r.ok) {
          let msg = `Error ${r.status}`
          try { const b = await r.json(); msg = b.error || msg } catch { /* non-JSON */ }
          throw new Error(msg)
        }
        return r.json()
      })
      .then((data: Report) => setReport(data))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load report'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleDownload() {
    if (!report) return
    setDownloading(true)
    await downloadReportAsPDF(report)
    setDownloading(false)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <Loader2 size={18} className="animate-spin text-[#7a7468]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-[#c45c5c]">
        <span>Error:</span> {error}
      </div>
    )
  }

  if (!report) {
    return <div className="p-8 text-sm text-[#7a7468]">Report not found.</div>
  }

  const noi    = Number(report.net_income)
  const noiPos = noi >= 0

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[10px] text-[#7a7468] mb-8 animate-in" style={{ letterSpacing: '0.1em', animationDelay: '0ms' }}>
        <Link href="/dashboard" className="hover:text-[#eae6d6] transition-colors">OVERVIEW</Link>
        <ChevronRight size={10} />
        <Link href="/dashboard/reports" className="hover:text-[#eae6d6] transition-colors">REPORTS</Link>
        <ChevronRight size={10} />
        <span className="text-[#9e9a8c] font-display italic text-sm">{report.building_name}</span>
      </div>

      {/* Header */}
      <div className="bg-[#101210] border border-[#222620] rounded-sm p-6 mb-4 animate-in" style={{ animationDelay: '60ms' }}>
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#5bba7a] status-pulse" />
              <span className="text-[10px] text-[#5bba7a]" style={{ letterSpacing: '0.25em' }}>GENERATED</span>
            </div>
            <h1 className="font-display text-4xl font-light text-[#eae6d6] leading-tight mb-2">
              {formatMonth(report.report_month, report.report_year)}
              <span className="text-[#7a7468]"> / Owner Report</span>
            </h1>
            <div className="flex items-center gap-2">
              <Building2 size={11} className="text-[#7a7468] flex-shrink-0" />
              <span className="font-display text-lg italic text-[#d4b070]">{report.building_name}</span>
              <span className="text-[#222620]">·</span>
              <span className="text-xs text-[#7a7468] truncate">{report.building_address}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/dashboard/reports"
              className="flex items-center gap-1.5 text-[11px] text-[#9e9a8c] hover:text-[#eae6d6] transition-colors px-3 py-2 border border-[#222620] rounded-sm hover:border-[#2e3328]"
              style={{ letterSpacing: '0.1em' }}
            >
              <ArrowLeft size={11} />
              REPORTS
            </Link>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 text-[11px] bg-[#d4b070]/10 hover:bg-[#d4b070]/18 disabled:opacity-40 text-[#d4b070] border border-[#d4b070]/30 hover:border-[#d4b070]/50 px-3 py-2 rounded-sm transition-all"
              style={{ letterSpacing: '0.12em' }}
            >
              {downloading ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
              {downloading ? 'PREPARING…' : 'DOWNLOAD PDF'}
            </button>
          </div>
        </div>

        {/* Financial summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 border-t border-[#222620]">
          {[
            { label: 'Rent Collected', value: formatCurrency(Number(report.total_rent_collected)), icon: DollarSign, color: '#d4b070' },
            { label: 'Total Expenses', value: formatCurrency(Number(report.total_expenses)),       icon: DollarSign, color: '#d48f4a' },
            { label: 'Net Income',     value: formatCurrency(noi),                                icon: noiPos ? TrendingUp : TrendingDown, color: noiPos ? '#5bba7a' : '#c45c5c' },
            { label: 'Vacant Units',   value: report.vacant_units.toString(),                    icon: Home,       color: '#9e9a8c' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-[#0e100d] border border-[#222620] rounded-sm p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.18em' }}>{label.toUpperCase()}</span>
                <Icon size={10} style={{ color, opacity: 0.6 }} />
              </div>
              <div className="font-display text-xl font-light leading-none" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Context cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 animate-in" style={{ animationDelay: '120ms' }}>
        {[
          { icon: Wrench,     label: 'Maintenance',   value: report.maintenance_issues },
          { icon: Users,      label: 'Tenant Issues', value: report.tenant_issues },
          { icon: StickyNote, label: 'Manager Notes', value: report.notes },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-[#101210] border border-[#222620] rounded-sm p-3.5">
            <div className="flex items-center gap-1.5 mb-2">
              <Icon size={10} className="text-[#7a7468]" />
              <span className="text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.2em' }}>{label.toUpperCase()}</span>
            </div>
            <p className="text-xs text-[#9e9a8c] leading-relaxed line-clamp-3">
              {value || <span className="text-[#7a7468] italic">None reported</span>}
            </p>
          </div>
        ))}
      </div>

      {/* AI report sections */}
      <div className="flex items-center gap-3 mb-4 animate-in" style={{ animationDelay: '160ms' }}>
        <div className="h-px flex-1 bg-gradient-to-r from-[#d4b070]/30 to-transparent" />
        <div className="flex items-center gap-2">
          <FileText size={10} className="text-[#d4b070]" />
          <span className="text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.25em' }}>AI-GENERATED OWNER REPORT</span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-l from-[#d4b070]/30 to-transparent" />
      </div>

      <div className="animate-in" style={{ animationDelay: '200ms' }}>
        <ReportContent content={report.generated_report} />
      </div>
    </div>
  )
}
