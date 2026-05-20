'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Building2, Download, FileText, DollarSign,
  Home, Wrench, Users, StickyNote, ChevronRight, Loader2, Zap,
} from 'lucide-react'
import type { Report } from '@/types'
import { formatCurrency, formatMonth } from '@/lib/utils'
import { downloadReportAsPDF } from '@/lib/pdf'

function ReportSection({ heading, body }: { heading: string; body: string }) {
  const lines = body.split('\n').filter(Boolean)
  const elements: React.ReactNode[] = []
  let listBuffer: string[] = []

  function flush(key: string) {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={key} className="space-y-2 mb-3">
          {listBuffer.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-sm text-[#c8d3e8] leading-relaxed">
              <span className="text-[#00d4aa] font-bold mt-0.5 flex-shrink-0">›</span>
              <span dangerouslySetInnerHTML={{ __html: item.replace(/^[-*•\d.]\s*/, '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
            </li>
          ))}
        </ul>
      )
      listBuffer = []
    }
  }

  lines.forEach((line, i) => {
    if (/^[-*•]\s/.test(line) || /^\d+\.\s/.test(line)) {
      listBuffer.push(line)
    } else {
      flush(`ul-${i}`)
      const html = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')
      elements.push(
        <p key={i} className="text-sm text-[#c8d3e8] leading-relaxed mb-2"
          dangerouslySetInnerHTML={{ __html: html }} />
      )
    }
  })
  flush('end')

  return (
    <div className="bg-[#0d0f18] border border-[#1e2438] rounded-lg p-5">
      <h3 className="text-[10px] font-mono font-bold text-[#00d4aa] uppercase tracking-[0.15em] mb-4 pb-3 border-b border-[#1e2438]">
        {heading}
      </h3>
      <div>{elements}</div>
    </div>
  )
}

function ReportContent({ content }: { content: string }) {
  const sections = content.split(/^## /m).filter(Boolean)

  if (sections.length === 0) {
    return (
      <div className="bg-[#0d0f18] border border-[#1e2438] rounded-lg p-5">
        <div className="whitespace-pre-wrap text-sm text-[#c8d3e8] leading-relaxed">{content}</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sections.map((section, i) => {
        const nl = section.indexOf('\n')
        const heading = nl > -1 ? section.slice(0, nl).trim() : section.trim()
        const body = nl > -1 ? section.slice(nl + 1).trim() : ''
        return <ReportSection key={i} heading={heading} body={body} />
      })}
    </div>
  )
}

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
        <Loader2 size={20} className="animate-spin text-[#7a8aaa]" />
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
    return <div className="p-6 text-[#7a8aaa]">Report not found.</div>
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#7a8aaa] mb-6">
        <Link href="/dashboard" className="hover:text-[#c8d3e8] transition-colors">Operations</Link>
        <ChevronRight size={12} />
        <Link href="/dashboard/reports" className="hover:text-[#c8d3e8] transition-colors">Reports</Link>
        <ChevronRight size={12} />
        <span className="text-[#c8d3e8]">{report.building_name}</span>
      </div>

      {/* Report header card */}
      <div className="bg-[#0d0f18] border border-[#1e2438] rounded-lg p-6 mb-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#131726] border border-[#1e2438] flex items-center justify-center">
              <FileText size={20} className="text-[#00d4aa]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                <span className="text-[9px] font-mono text-[#22c55e] uppercase tracking-widest">Generated</span>
              </div>
              <h1 className="text-xl font-bold text-[#c8d3e8]">
                {formatMonth(report.report_month, report.report_year)} Owner Report
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Building2 size={11} className="text-[#7a8aaa]" />
                <span className="text-sm text-[#7a8aaa]">{report.building_name}</span>
                <span className="text-[#3d4a66]">·</span>
                <span className="text-xs text-[#3d4a66]">{report.building_address}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/dashboard/reports"
              className="flex items-center gap-1.5 text-xs text-[#7a8aaa] hover:text-[#c8d3e8] transition-colors px-3 py-2 border border-[#1e2438] rounded-lg"
            >
              <ArrowLeft size={13} />
              Reports
            </Link>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 text-xs bg-[#00d4aa] hover:bg-[#00856a] disabled:opacity-50 text-[#07080d] font-bold px-3 py-2 rounded-lg transition-colors"
            >
              {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              {downloading ? 'Preparing...' : 'Download'}
            </button>
          </div>
        </div>

        {/* Financial summary */}
        <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-[#1e2438]">
          {[
            { label: 'Rent Collected', value: formatCurrency(Number(report.total_rent_collected)), icon: DollarSign, color: '#00d4aa' },
            { label: 'Total Expenses', value: formatCurrency(Number(report.total_expenses)), icon: DollarSign, color: '#f59e0b' },
            { label: 'Net Income', value: formatCurrency(Number(report.net_income)), icon: Zap, color: Number(report.net_income) >= 0 ? '#22c55e' : '#ef4444' },
            { label: 'Vacant Units', value: report.vacant_units.toString(), icon: Home, color: '#7a8aaa' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-[#131726] border border-[#1e2438] rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-mono text-[#7a8aaa] uppercase tracking-widest">{label}</span>
                <Icon size={11} style={{ color }} />
              </div>
              <div className="text-lg font-bold font-mono" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Input context */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { icon: Wrench, label: 'Maintenance', value: report.maintenance_issues },
          { icon: Users, label: 'Tenant Issues', value: report.tenant_issues },
          { icon: StickyNote, label: 'Manager Notes', value: report.notes },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-[#0d0f18] border border-[#1e2438] rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Icon size={11} className="text-[#7a8aaa]" />
              <span className="text-[9px] font-mono text-[#7a8aaa] uppercase tracking-widest">{label}</span>
            </div>
            <p className="text-xs text-[#c8d3e8] leading-relaxed line-clamp-2">
              {value || <span className="text-[#3d4a66]">None reported</span>}
            </p>
          </div>
        ))}
      </div>

      {/* AI Report sections */}
      <div className="flex items-center gap-2 mb-4">
        <Zap size={12} className="text-[#00d4aa]" />
        <span className="text-[10px] font-mono text-[#7a8aaa] uppercase tracking-widest">AI-Generated Owner Report</span>
      </div>

      <ReportContent content={report.generated_report} />
    </div>
  )
}
