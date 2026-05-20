import Anthropic from '@anthropic-ai/sdk'
import { MONTHS } from '@/types'
import type { RentRollEntry } from '@/types'

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
  rentRoll: RentRollEntry[]
  nextMonthOutlook: string
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

  const rentRollCollected = data.rentRoll.reduce((s, e) => e.status === 'Paid' ? s + (parseFloat(e.rent) || 0) : s, 0)
  const rentRollOutstanding = data.rentRoll.reduce((s, e) => (e.status === 'Outstanding' || e.status === 'Partial') ? s + (parseFloat(e.rent) || 0) : s, 0)

  const rentRollBlock = data.rentRoll.length > 0
    ? `RENT ROLL (${data.rentRoll.length} units):
${data.rentRoll.map(e =>
      `- Unit ${e.unit}${e.tenant ? ` (${e.tenant})` : ''}: ${formatCurrency(parseFloat(e.rent) || 0)}/mo — ${e.status}${e.notes ? ` | ${e.notes}` : ''}`
    ).join('\n')}
Collected: ${formatCurrency(rentRollCollected)} | Outstanding/Partial: ${formatCurrency(rentRollOutstanding)}`
    : 'RENT ROLL: Not provided.'

  const prompt = `You are a property manager at Kinyu Realty writing a monthly owner report. Be concise, specific, and professional.

${data.buildingName} | ${data.address} | ${MONTHS[data.month - 1]} ${data.year}

FINANCIALS:
- Rent Collected: ${formatCurrency(data.totalRent)} | Expenses: ${formatCurrency(data.totalExpenses)} | NOI: ${formatCurrency(data.netIncome)}
- Late Payments Collected: ${formatCurrency(data.latePayments)} | Management Fee: ${formatCurrency(data.managementFee)}
- YTD Rent: ${formatCurrency(data.ytdRent)} | YTD Expenses: ${formatCurrency(data.ytdExpenses)} | YTD NOI: ${formatCurrency(ytdNOI)}

OCCUPANCY: ${data.totalUnits - data.vacantUnits}/${data.totalUnits} units occupied (${occupancyRate}%) — ${data.vacantUnits} vacant

${rentRollBlock}

TENANT STATUS:
- Outstanding Balances: ${formatCurrency(data.outstandingBalances)}
- Upcoming Lease Expirations: ${data.upcomingExpirations.trim() || 'None reported.'}

OPERATIONS:
- Maintenance: ${data.maintenanceIssues.trim() || 'None reported.'}
- Tenant Issues: ${data.tenantIssues.trim() || 'None reported.'}
- Manager Notes: ${data.notes.trim() || 'None.'}

NEXT MONTH OUTLOOK: ${data.nextMonthOutlook.trim() || 'No specific items noted.'}

Write a professional owner report using these ## sections:
## EXECUTIVE SUMMARY
## FINANCIAL SUMMARY
## OCCUPANCY REPORT
## MAINTENANCE SUMMARY
## TENANT UPDATES
## RECOMMENDATIONS
## LOOKING AHEAD
## CLOSING STATEMENT

Reference specific numbers throughout. Each section: 2-4 sentences or a short bullet list. In LOOKING AHEAD, frame the next month outlook inputs as action items and things the owner should be aware of.`

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const message = await stream.finalMessage()
  const content = message.content[0]
  return content.type === 'text' ? content.text : ''
}
