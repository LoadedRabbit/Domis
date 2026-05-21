'use client'

import jsPDF from 'jspdf'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function fmtUSD(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function buildSectionHTML(section: string): string {
  const nl = section.indexOf('\n')
  if (nl === -1) return ''
  const heading = section.slice(0, nl).trim()
  const body = section.slice(nl + 1).trim()
  if (!heading) return ''

  const lines = body.split('\n').filter(Boolean)
  const parts: string[] = []
  let listItems: string[] = []

  function flushList() {
    if (listItems.length === 0) return
    parts.push(
      `<ul style="margin:0 0 8px 0;padding-left:16px;list-style-type:disc;">${listItems.join('')}</ul>`,
    )
    listItems = []
  }

  for (const line of lines) {
    const isBullet = /^[-*•]\s/.test(line) || /^\d+\.\s/.test(line)
    const clean = line
      .replace(/^[-*•]\s+/, '')
      .replace(/^\d+\.\s+/, '')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .trim()
    if (isBullet) {
      listItems.push(`<li style="margin-bottom:3px;">${clean}</li>`)
    } else {
      flushList()
      parts.push(`<p style="margin:0 0 6px 0;">${clean}</p>`)
    }
  }
  flushList()

  return `
<div style="margin-bottom:22px;">
  <div style="font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;
              color:#555;border-bottom:1.5px solid #bbb;padding-bottom:5px;margin-bottom:9px;">
    ${heading}
  </div>
  <div style="font-size:11.5px;line-height:1.65;color:#333;">${parts.join('')}</div>
</div>`
}

function buildReportHTML(report: {
  building_name: string
  building_address: string
  report_month: number
  report_year: number
  generated_report: string
  total_rent_collected: number
  total_expenses: number
  net_income: number
  vacant_units: number
}): string {
  const period = `${MONTHS[report.report_month - 1]} ${report.report_year}`
  const noi = Number(report.net_income)
  const noiColor = noi >= 0 ? '#166534' : '#991b1b'

  const sectionsHTML = report.generated_report
    .split(/^## /m)
    .filter(Boolean)
    .map(buildSectionHTML)
    .join('')

  const genDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return `<div style="font-family:Helvetica,Arial,sans-serif;color:#1a1a1a;background:#fff;width:516px;box-sizing:border-box;">

  <div style="margin-bottom:20px;">
    <div style="font-size:7.5px;letter-spacing:3px;color:#888;text-transform:uppercase;margin-bottom:9px;font-weight:700;">Property Management</div>
    <div style="font-size:27px;font-weight:300;color:#111;margin-bottom:8px;line-height:1.1;">Monthly Owner Report</div>
    <div style="font-size:13px;color:#444;margin-bottom:4px;">${report.building_name}&nbsp;&nbsp;&middot;&nbsp;&nbsp;${period}</div>
    <div style="font-size:10.5px;color:#888;">${report.building_address}</div>
  </div>

  <div style="height:2.5px;background:#1a1a2e;margin-bottom:20px;"></div>

  <table style="width:100%;border-collapse:collapse;border:1px solid #ddd;border-radius:5px;margin-bottom:28px;background:#f8f9fc;">
    <tr>
      <td style="padding:14px 10px;text-align:center;border-right:1px solid #ddd;width:33.33%;">
        <div style="font-size:7.5px;letter-spacing:2px;color:#888;font-weight:700;margin-bottom:6px;text-transform:uppercase;">Rent Collected</div>
        <div style="font-size:18px;font-weight:700;color:#111;">${fmtUSD(report.total_rent_collected)}</div>
      </td>
      <td style="padding:14px 10px;text-align:center;border-right:1px solid #ddd;width:33.33%;">
        <div style="font-size:7.5px;letter-spacing:2px;color:#888;font-weight:700;margin-bottom:6px;text-transform:uppercase;">Total Expenses</div>
        <div style="font-size:18px;font-weight:700;color:#111;">${fmtUSD(report.total_expenses)}</div>
      </td>
      <td style="padding:14px 10px;text-align:center;width:33.33%;">
        <div style="font-size:7.5px;letter-spacing:2px;color:#888;font-weight:700;margin-bottom:6px;text-transform:uppercase;">Net Income</div>
        <div style="font-size:18px;font-weight:700;color:${noiColor};">${fmtUSD(noi)}</div>
      </td>
    </tr>
  </table>

  ${sectionsHTML}

  <table style="width:100%;border-collapse:collapse;border-top:1px solid #ddd;margin-top:12px;">
    <tr>
      <td style="padding-top:8px;font-size:7.5px;color:#aaa;">Property Management &mdash; Confidential</td>
      <td style="padding-top:8px;font-size:7.5px;color:#aaa;text-align:right;">Generated ${genDate}</td>
    </tr>
  </table>

</div>`
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
  const htmlContent = buildReportHTML(report)

  const container = document.createElement('div')
  container.style.cssText = 'position:absolute;left:-10000px;top:0;'
  container.innerHTML = htmlContent
  document.body.appendChild(container)

  const element = container.firstElementChild as HTMLElement

  const MARGIN = 48   // 48pt ≈ 0.67 inch
  const CONTENT_W = 516  // 612 - 48*2

  const doc = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' })

  try {
    await doc.html(element, {
      autoPaging: 'text',
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      },
      margin: [MARGIN, MARGIN, MARGIN, MARGIN],
      width: CONTENT_W,
      windowWidth: CONTENT_W,
      x: 0,
      y: 0,
    })

    const slug = report.building_name
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    doc.save(`${slug}-${MONTHS[report.report_month - 1]}-${report.report_year}-Owner-Report.pdf`)
  } finally {
    document.body.removeChild(container)
  }
}
