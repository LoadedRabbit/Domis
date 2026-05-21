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

export async function draftCommunicationResponse(input: {
  tenantName: string
  unit: string
  buildingName: string
  subject: string
  urgency: string
  conversationHistory: { role: string; body: string; timestamp: string }[]
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is not set')
  const anthropic = new Anthropic({ apiKey })

  const historyBlock = input.conversationHistory
    .map(m => `[${m.timestamp}] ${m.role === 'tenant' ? input.tenantName : 'Manager'}: ${m.body}`)
    .join('\n\n')

  const prompt = `You are a professional property manager at Kinyu Realty and Management Corp.
Draft a professional, empathetic, and clear response to a tenant communication.

TENANT: ${input.tenantName}
UNIT: ${input.unit}
BUILDING: ${input.buildingName}
SUBJECT: ${input.subject}
URGENCY: ${input.urgency}

CONVERSATION HISTORY:
${historyBlock}

Write a professional manager response. Be specific, use a helpful and respectful tone.
Do not include greetings like "Dear [Name]" — start directly with the response body.
3-5 sentences. Sign off with "— Kinyu Realty Management"`

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  const message = await stream.finalMessage()
  const content = message.content[0]
  return content.type === 'text' ? content.text : ''
}

export async function categorizeMaintenanceRequest(input: {
  description: string
  urgency: string
}): Promise<'Emergency' | 'Routine'> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is not set')
  const anthropic = new Anthropic({ apiKey })

  const prompt = `You are a property management AI. Categorize this maintenance request as either "Emergency" or "Routine".

Emergency criteria (any one = Emergency):
- No heat or air conditioning in extreme weather
- Flooding or active water leak
- No electricity or major electrical hazard
- Gas leak or smell
- Sewage backup
- Broken locks or compromised building security
- Elevator outage in a building with disabled residents

Request description: "${input.description}"
Tenant urgency self-reported: ${input.urgency}

Respond with ONLY the word "Emergency" or "Routine" — nothing else.`

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 10,
    messages: [{ role: 'user', content: prompt }],
  })

  const message = await stream.finalMessage()
  const content = message.content[0]
  const result = content.type === 'text' ? content.text.trim() : 'Routine'
  return result === 'Emergency' ? 'Emergency' : 'Routine'
}

export async function generateRentNotice(input: {
  noticeType: 'first_notice' | 'second_notice' | 'lawyer_referral'
  tenantName: string
  unit: string
  buildingName: string
  buildingAddress: string
  monthlyRent: number
  dueDate: string
  daysOverdue: number
  amountDue: number
  previousNotices: string[]
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is not set')
  const anthropic = new Anthropic({ apiKey })

  const noticeLabels: Record<string, string> = {
    first_notice: 'First Notice — Friendly Payment Reminder',
    second_notice: 'Second Notice — Urgent Payment Request',
    lawyer_referral: 'Final Notice — Attorney Referral Package',
  }

  const prevNoticeBlock = input.previousNotices.length > 0
    ? `PRIOR NOTICES SENT: ${input.previousNotices.join(', ')}`
    : 'No prior notices sent.'

  const typeInstructions: Record<string, string> = {
    first_notice: `Write a professional but firm first payment reminder. Acknowledge it may be an oversight.
Reference the exact amount and due date. Request payment within 5 business days.
Mention late fees may apply. Keep it brief — 2-3 paragraphs.`,
    second_notice: `Write a formal second notice. Reference that a first notice was sent.
State clearly the account is ${input.daysOverdue} days past due.
Demand payment within 3 business days. Warn that continued non-payment may result in legal action.
3-4 paragraphs.`,
    lawyer_referral: `Write a formal attorney referral demand letter package. This is the final notice before legal action.
Include: full account summary, all amounts owed, timeline of prior notices, a demand for payment within 24 hours.
State that the file will be forwarded to legal counsel if payment is not received.
This should be comprehensive — 4-6 paragraphs. Include a formal letterhead format.`,
  }

  const prompt = `You are drafting a formal rent delinquency notice on behalf of Kinyu Realty and Management Corp.

NOTICE TYPE: ${noticeLabels[input.noticeType]}
TENANT: ${input.tenantName}
UNIT: ${input.unit}
BUILDING: ${input.buildingName}
ADDRESS: ${input.buildingAddress}
MONTHLY RENT: $${input.monthlyRent.toFixed(2)}
DUE DATE: ${input.dueDate}
DAYS OVERDUE: ${input.daysOverdue}
TOTAL AMOUNT DUE: $${input.amountDue.toFixed(2)}
${prevNoticeBlock}

${typeInstructions[input.noticeType]}

Use formal letter format. Include today's date. Sign as "Kinyu Realty and Management Corp — Management Office".`

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: input.noticeType === 'lawyer_referral' ? 1500 : 700,
    messages: [{ role: 'user', content: prompt }],
  })

  const message = await stream.finalMessage()
  const content = message.content[0]
  return content.type === 'text' ? content.text : ''
}
