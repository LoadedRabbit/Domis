import Anthropic from '@anthropic-ai/sdk'
import { MONTHS } from '@/types'

interface ReportInput {
  buildingName: string
  address: string
  month: number
  year: number
  totalRent: number
  totalExpenses: number
  netIncome: number
  latePayments: number
  managementFee: number
  vacantUnits: number
  totalUnits: number
  outstandingBalances: number
  upcomingExpirations: string
  ytdRent: number
  ytdExpenses: number
  maintenanceIssues: string
  tenantIssues: string
  notes: string
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

export async function generateOwnerReport(data: ReportInput): Promise<string> {
  // Instantiate inside the function so missing env var throws at request time,
  // not at module load time (which would crash the entire serverless function).
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set')
  }
  const anthropic = new Anthropic({ apiKey })

  const occupancyRate = data.totalUnits > 0
    ? Math.round(((data.totalUnits - data.vacantUnits) / data.totalUnits) * 100)
    : 0

  const ytdNOI = data.ytdRent - data.ytdExpenses

  const prompt = `You are a property manager at Kinyu Realty writing a monthly owner report. Be concise, specific, and professional.

${data.buildingName} | ${data.address} | ${MONTHS[data.month - 1]} ${data.year}

FINANCIALS:
- Rent Collected: ${formatCurrency(data.totalRent)}
- Total Expenses: ${formatCurrency(data.totalExpenses)}
- Net Operating Income: ${formatCurrency(data.netIncome)}
- Late Payments Collected: ${formatCurrency(data.latePayments)}
- Management Fee: ${formatCurrency(data.managementFee)}

YTD (Year-to-Date):
- YTD Rent: ${formatCurrency(data.ytdRent)} | YTD Expenses: ${formatCurrency(data.ytdExpenses)} | YTD NOI: ${formatCurrency(ytdNOI)}

OCCUPANCY:
- ${data.totalUnits - data.vacantUnits}/${data.totalUnits} units occupied (${occupancyRate}%)
- ${data.vacantUnits} vacant unit(s)

TENANT STATUS:
- Outstanding Balances: ${formatCurrency(data.outstandingBalances)}
- Upcoming Lease Expirations: ${data.upcomingExpirations.trim() || 'None reported.'}

OPERATIONS:
- Maintenance: ${data.maintenanceIssues.trim() || 'None reported.'}
- Tenant Issues: ${data.tenantIssues.trim() || 'None reported.'}
- Manager Notes: ${data.notes.trim() || 'None.'}

Write a professional owner report using these ## sections:
## EXECUTIVE SUMMARY
## FINANCIAL SUMMARY
## OCCUPANCY REPORT
## MAINTENANCE SUMMARY
## TENANT UPDATES
## RECOMMENDATIONS
## CLOSING STATEMENT

Reference specific numbers throughout. Each section should be 2-4 sentences or a short bullet list. Mention late payments, management fee, outstanding balances, and YTD figures naturally where relevant.`

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const message = await stream.finalMessage()
  const content = message.content[0]
  return content.type === 'text' ? content.text : ''
}
