'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Building2, Download, FileText, DollarSign,
  Home, Wrench, Users, StickyNote, ChevronRight, Loader2, Zap,
  TrendingUp, TrendingDown,
} from 'lucide-react'
import type { Report } from '@/types'
import { formatCurrency, formatMonth } from '@/lib/utils'
import { downloadReportAsPDF } from '@/lib/pdf'

/* ─── Section icons map ─────────────────────────────────── */
const SECTION_META: Record<string, { color: string; dot: string }> = {
  'EXECUTIVE SUMMARY':         { color: '#3b82f6', dot: '#3b82f6' },
  'FINANCIAL SUMMARY':         { color: '#10b981', dot: '#10b981' },
  'OCCUPANCY REPORT':          { color: '#60a5fa', dot: '#60a5fa' },
  'MAINTENANCE SUMMARY':       { color: '#f59e0b', dot: '#f59e0b' },
  'TENANT UPDATES':            { color: '#a78bfa', dot: '#a78bfa' },
  'RECOMMENDATIONS':           { color: '#34d399', dot: '#34d399' },
  'RECOMMENDATIONS FOR NEXT MONTH': { color: '#34d399', dot: '#34d399' },
  'LOOKING AHEAD':             { color: '#60a5fa', dot: '#60a5fa' },
  'CLOSING STATEMENT':         { color: '#94a3b8', dot: '#94a3b8' },
}

function defaultMeta() {
  return { color: '#3b82f6', dot: '#3b82f6' }
}

/* ─── Individual section card ───────────────────────────── */
function ReportSection({ heading, body, index }: { heading: string; body: string; index: number }) {
  const meta = SECTION_META[heading.toUpperCase()] ?? defaultMeta()
  const lines = body.split('\n').filter(Boolean)
  const elements: React.ReactNode[] = []
  let listBuffer: string[] = []

  function flush(key: string) {
    if (listBuffer.length === 0) return
    elements.push(
      <ul key={key} className="space-y-2 mb-3">
        {listBuffer.map((item, j) => (
          <li key={j} className="flex items-start gap-2.5 text-sm text-[#e2e8f0] leading-relaxed">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: meta.dot }} />
            <span
              dangerouslySetInnerHTML={{
                __html: item
                  .replace(/^[-*•\d.]\s*/, '')
                  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'),
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
          className="text-sm text-[#e2e8f0] leading-relaxed mb-2"
          dangerouslySetInnerHTML={{
            __html: line
              .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.+?)\*/g, '<em>$1</em>'),
          }}
        />
      )
    }
  })
  flush('end')

  return (
    <div className="bg-[#10141c] border border-[#1e2535] rounded-lg overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#1e2535] bg-[#131822]">
        <span
          className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-[10px] font-mono font-bold"
          style={{ background: `${meta.color}18`, color: meta.color }}
        >
          {index + 1}
        </span>
        <h3
          className="text-[10px] font-mono font-bold uppercase tracking-[0.15em]"
          style={{ color: meta.color }}
        >
          {heading}
        </h3>
      </div>
      {/* Section body */}
      <div className="px-5 py-4">{elements}</div>
    </div>
  )
}

/* ─── Report content splitter ───────────────────────────── */
function ReportContent({ content }: { content: string }) {
  const sections = content.split(/^## /m).filter(Boolean)

  if (sections.length === 0) {
    return (
      <div className="bg-[#10141c] border border-[#1e2535] rounded-lg p-5">
        <div className="whitespace-pre-wrap text-sm text-[#e2e8f0] leading-relaxed">{content}</div>
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

/* ─── Page ───────────────────────────────────────────────── */
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
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin text-[#64748b]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 flex items-center gap-2 text-sm text-[#ef4444]">
        <span className="font-mono">Error:</span> {error}
      </div>
    )
  }

  if (!report) {
    return <div className="p-6 text-sm text-[#64748b]">Report not found.</div>
  }

  const noi    = Number(report.net_income)
  const noiPos = noi >= 0

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#64748b] mb-6">
        <Link href="/dashboard" className="hover:text-[#e2e8f0] transition-colors">Operations</Link>
        <ChevronRight size={12} />
        <Link href="/dashboard/reports" className="hover:text-[#e2e8f0] transition-colors">Reports</Link>
        <ChevronRight size={12} />
        <span className="text-[#e2e8f0] truncate max-w-48">{report.building_name}</span>
      </div>

      {/* Header card */}
      <div className="bg-[#10141c] border border-[#1e2535] rounded-lg p-6 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-[#131822] border border-[#1e2535] flex items-center justify-center flex-shrink-0">
              <FileText size={20} className="text-[#3b82f6]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                <span className="text-[9px] font-mono text-[#10b981] uppercase tracking-widest">Generated</span>
              </div>
              <h1 className="text-xl font-bold text-[#e2e8f0] leading-tight">
                {formatMonth(report.report_month, report.report_year)} Owner Report
              </h1>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <Building2 size={11} className="text-[#64748b] flex-shrink-0" />
                <span className="text-sm text-[#94a3b8]">{report.building_name}</span>
                <span className="text-[#1e2535]">·</span>
                <span className="text-xs text-[#64748b] truncate">{report.building_address}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/dashboard/reports"
              className="flex items-center gap-1.5 text-xs text-[#94a3b8] hover:text-[#e2e8f0] transition-colors px-3 py-2 border border-[#1e2535] rounded-lg hover:border-[#2a3350]"
            >
              <ArrowLeft size={13} />
              Reports
            </Link>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 text-xs bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white font-bold px-3 py-2 rounded-lg transition-colors"
            >
              {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              {downloading ? 'Preparing…' : 'Download PDF'}
            </button>
          </div>
        </div>

        {/* Financial summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-[#1e2535]">
          {[
            {
              label: 'Rent Collected',
              value: formatCurrency(Number(report.total_rent_collected)),
              icon: DollarSign,
              color: '#3b82f6',
            },
            {
              label: 'Total Expenses',
              value: formatCurrency(Number(report.total_expenses)),
              icon: DollarSign,
              color: '#f59e0b',
            },
            {
              label: 'Net Income',
              value: formatCurrency(noi),
              icon: noiPos ? TrendingUp : TrendingDown,
              color: noiPos ? '#10b981' : '#ef4444',
            },
            {
              label: 'Vacant Units',
              value: report.vacant_units.toString(),
              icon: Home,
              color: '#94a3b8',
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-[#131822] border border-[#1e2535] rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-mono text-[#64748b] uppercase tracking-widest">{label}</span>
                <Icon size={11} style={{ color }} />
              </div>
              <div className="text-base font-bold font-mono" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Input context */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {[
          { icon: Wrench,     label: 'Maintenance',   value: report.maintenance_issues },
          { icon: Users,      label: 'Tenant Issues', value: report.tenant_issues },
          { icon: StickyNote, label: 'Manager Notes', value: report.notes },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-[#10141c] border border-[#1e2535] rounded-lg p-3.5">
            <div className="flex items-center gap-1.5 mb-2">
              <Icon size={11} className="text-[#64748b]" />
              <span className="text-[9px] font-mono text-[#64748b] uppercase tracking-widest">{label}</span>
            </div>
            <p className="text-xs text-[#94a3b8] leading-relaxed line-clamp-3">
              {value || <span className="text-[#64748b] italic">None reported</span>}
            </p>
          </div>
        ))}
      </div>

      {/* AI report sections */}
      <div className="flex items-center gap-2 mb-3">
        <Zap size={12} className="text-[#3b82f6]" />
        <span className="text-[10px] font-mono text-[#64748b] uppercase tracking-widest">AI-Generated Owner Report</span>
      </div>

      <ReportContent content={report.generated_report} />
    </div>
  )
}
