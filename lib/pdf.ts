'use client'

import jsPDF from 'jspdf'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const SECTION_COLORS: Record<string, [number, number, number]> = {
  'EXECUTIVE SUMMARY':               [59,  130, 246],
  'FINANCIAL SUMMARY':               [16,  185, 129],
  'OCCUPANCY REPORT':                [96,  165, 250],
  'MAINTENANCE SUMMARY':             [245, 158, 11],
  'TENANT UPDATES':                  [167, 139, 250],
  'RECOMMENDATIONS':                 [52,  211, 153],
  'RECOMMENDATIONS FOR NEXT MONTH':  [52,  211, 153],
  'LOOKING AHEAD':                   [96,  165, 250],
  'CLOSING STATEMENT':               [148, 163, 184],
}

function fmtUSD(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function stripMd(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^[-*•]\s+/, '')
    .replace(/^\d+\.\s+/, '')
    .trim()
}

export async function downloadReportAsPDF(report: {
  building_name: string
  building_address: string
  report_month: number
  report_year: number
  generated_report: string
  total_rent_collected: number
  total_expenses: number
  net_income: number
  vacant_units: number
}): Promise<void> {
  const doc = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' })

  // Page geometry
  const PW = 612
  const PH = 792
  const ML = 54
  const MR = 54
  const CW = PW - ML - MR  // 504pt
  const TOP = 54
  const BOT = 54            // bottom margin — footer lives inside this space

  let y = TOP

  // ── Color helpers ──────────────────────────────────────────────────────────
  const col = {
    dark:   [26,  26,  46]  as [number, number, number],
    gray:   [55,  65,  81]  as [number, number, number],
    light:  [113, 128, 150] as [number, number, number],
    green:  [22,  101, 52]  as [number, number, number],
    red:    [185, 28,  28]  as [number, number, number],
    border: [218, 224, 232] as [number, number, number],
    bg:     [248, 249, 252] as [number, number, number],
  }

  const tc = (rgb: [number, number, number]) => doc.setTextColor(rgb[0], rgb[1], rgb[2])
  const dc = (rgb: [number, number, number]) => doc.setDrawColor(rgb[0], rgb[1], rgb[2])
  const fc = (rgb: [number, number, number]) => doc.setFillColor(rgb[0], rgb[1], rgb[2])

  const FOOTER_H = 36  // reserved at bottom of each page for footer
  const usableH = PH - TOP - BOT - FOOTER_H

  function need(h: number) {
    if (y + h > TOP + usableH) {
      doc.addPage()
      y = TOP
    }
  }

  // ── HEADER (page 1) ────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  tc(col.light)
  doc.text('KINYU REALTY AND MANAGEMENT CORP', ML, y)
  y += 22

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  tc(col.dark)
  doc.text('Monthly Owner Report', ML, y)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(13.5)
  tc(col.gray)
  const period = `${MONTHS[report.report_month - 1]} ${report.report_year}`
  doc.text(`${report.building_name}  ·  ${period}`, ML, y)
  y += 5

  doc.setFontSize(10.5)
  tc(col.light)
  doc.text(report.building_address, ML, y)
  y += 20

  // Thick divider
  dc(col.dark)
  doc.setLineWidth(2.5)
  doc.line(ML, y, PW - MR, y)
  y += 30

  // ── FINANCIAL SUMMARY BOX ──────────────────────────────────────────────────
  const boxH = 76
  fc(col.bg)
  dc(col.border)
  doc.setLineWidth(0.75)
  doc.roundedRect(ML, y, CW, boxH, 6, 6, 'FD')

  const financials = [
    { label: 'RENT COLLECTED', value: fmtUSD(report.total_rent_collected), color: col.dark },
    { label: 'TOTAL EXPENSES', value: fmtUSD(report.total_expenses),       color: col.dark },
    { label: 'NET INCOME',     value: fmtUSD(report.net_income),           color: report.net_income >= 0 ? col.green : col.red },
  ]

  const col3W = CW / 3
  for (let i = 0; i < financials.length; i++) {
    const { label, value, color } = financials[i]
    const cx = ML + col3W * i + col3W / 2

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    tc(col.light)
    doc.text(label, cx, y + 21, { align: 'center' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    tc(color)
    doc.text(value, cx, y + 53, { align: 'center' })
  }

  // Internal column dividers
  dc(col.border)
  doc.setLineWidth(0.5)
  for (let i = 1; i < 3; i++) {
    const x = ML + col3W * i
    doc.line(x, y + 10, x, y + boxH - 10)
  }

  y += boxH + 34

  // ── REPORT SECTIONS ────────────────────────────────────────────────────────
  const sections = report.generated_report.split(/^## /m).filter(Boolean)

  for (const section of sections) {
    const nlIdx = section.indexOf('\n')
    const heading = (nlIdx > -1 ? section.slice(0, nlIdx) : section).trim()
    const body    = (nlIdx > -1 ? section.slice(nlIdx + 1) : '').trim()

    const hColor: [number, number, number] = SECTION_COLORS[heading.toUpperCase()] ?? [59, 130, 246]

    // Section heading block
    need(48)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    tc(hColor)
    doc.text(heading.toUpperCase(), ML, y)
    y += 7

    dc(hColor)
    doc.setLineWidth(1.25)
    doc.line(ML, y, PW - MR, y)
    y += 14

    // Body lines
    const lines = body.split('\n').filter(Boolean)
    for (const line of lines) {
      const isBullet = /^[-*•]\s/.test(line) || /^\d+\.\s/.test(line)
      const clean = stripMd(line)

      if (isBullet) {
        const wrapped = doc.splitTextToSize(`•  ${clean}`, CW - 16)
        need(wrapped.length * 13 + 5)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10.5)
        tc(col.gray)
        doc.text(wrapped, ML + 10, y)
        y += wrapped.length * 13 + 5
      } else {
        const wrapped = doc.splitTextToSize(clean, CW)
        need(wrapped.length * 13 + 6)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10.5)
        tc(col.gray)
        doc.text(wrapped, ML, y)
        y += wrapped.length * 13 + 6
      }
    }

    y += 18
  }

  // ── FOOTER ON EVERY PAGE ───────────────────────────────────────────────────
  const totalPages = (doc as unknown as { internal: { getNumberOfPages(): number } }).internal.getNumberOfPages()
  const genDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    const fy = PH - BOT + 14

    dc(col.border)
    doc.setLineWidth(0.5)
    doc.line(ML, fy - 12, PW - MR, fy - 12)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    tc(col.light)
    doc.text('Property Management — Confidential', ML, fy)
    doc.text(`Page ${p} of ${totalPages}`, PW / 2, fy, { align: 'center' })
    doc.text(`Generated ${genDate}`, PW - MR, fy, { align: 'right' })
  }

  // ── DOWNLOAD ───────────────────────────────────────────────────────────────
  const slug = report.building_name.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  doc.save(`${slug}-${MONTHS[report.report_month - 1]}-${report.report_year}-Owner-Report.pdf`)
}
