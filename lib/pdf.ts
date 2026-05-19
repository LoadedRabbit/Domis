'use client'

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
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Georgia', serif;
      color: #1a1a2e;
      background: #ffffff;
      padding: 48px;
      max-width: 800px;
      margin: 0 auto;
      line-height: 1.6;
    }
    .header {
      border-bottom: 3px solid #1a1a2e;
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .company-name {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #4a5568;
      margin-bottom: 8px;
    }
    .report-title {
      font-size: 28px;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 6px;
    }
    .report-subtitle {
      font-size: 15px;
      color: #4a5568;
    }
    .financials {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin: 32px 0;
      background: #f8f9fc;
      border: 1px solid #e2e8f0;
      padding: 24px;
      border-radius: 8px;
    }
    .financial-item { text-align: center; }
    .financial-label {
      font-size: 11px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #718096;
      margin-bottom: 4px;
    }
    .financial-value {
      font-size: 22px;
      font-weight: 700;
      color: #1a1a2e;
    }
    .financial-value.positive { color: #276749; }
    .financial-value.negative { color: #c53030; }
    .report-content { margin-top: 24px; }
    h2 {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #2d3748;
      margin-top: 32px;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;
    }
    p {
      font-size: 14px;
      color: #2d3748;
      margin-bottom: 12px;
    }
    ul { margin: 8px 0 12px 20px; }
    li { font-size: 14px; color: #2d3748; margin-bottom: 6px; }
    .footer {
      margin-top: 48px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #718096;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">Kinyu Realty and Management Corp</div>
    <div class="report-title">Monthly Owner Report</div>
    <div class="report-subtitle">${report.building_name} &mdash; ${months[report.report_month - 1]} ${report.report_year}</div>
    <div class="report-subtitle" style="margin-top:4px;font-size:13px;">${report.building_address}</div>
  </div>

  <div class="financials">
    <div class="financial-item">
      <div class="financial-label">Rent Collected</div>
      <div class="financial-value">${formatCurrency(report.total_rent_collected)}</div>
    </div>
    <div class="financial-item">
      <div class="financial-label">Total Expenses</div>
      <div class="financial-value">${formatCurrency(report.total_expenses)}</div>
    </div>
    <div class="financial-item">
      <div class="financial-label">Net Income</div>
      <div class="financial-value ${report.net_income >= 0 ? 'positive' : 'negative'}">${formatCurrency(report.net_income)}</div>
    </div>
  </div>

  <div class="report-content">
    ${report.generated_report
      .replace(/## (.+)/g, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.+)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[hul])/gm, '<p>')
      .replace(/<p><\/p>/g, '')
    }
  </div>

  <div class="footer">
    <span>Kinyu Realty and Management Corp &mdash; Confidential</span>
    <span>Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
  </div>
</body>
</html>`

  const blob = new Blob([htmlContent], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${report.building_name.replace(/\s+/g, '-')}-${months[report.report_month - 1]}-${report.report_year}-Report.html`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
