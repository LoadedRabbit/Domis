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
  vacantUnits: number
  totalUnits: number
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

  const prompt = `You are a property manager at Kinyu Realty writing a monthly owner report. Be concise, specific, and professional.

${data.buildingName} | ${data.address} | ${MONTHS[data.month - 1]} ${data.year}
Rent: ${formatCurrency(data.totalRent)} | Expenses: ${formatCurrency(data.totalExpenses)} | NOI: ${formatCurrency(data.netIncome)}
Occupancy: ${data.totalUnits - data.vacantUnits}/${data.totalUnits} units (${occupancyRate}%)
Maintenance: ${data.maintenanceIssues.trim() || 'None reported.'}
Tenant updates: ${data.tenantIssues.trim() || 'None reported.'}
Notes: ${data.notes.trim() || 'None.'}

Write a professional owner report using these ## sections:
## EXECUTIVE SUMMARY
## FINANCIAL SUMMARY
## OCCUPANCY REPORT
## MAINTENANCE SUMMARY
## TENANT UPDATES
## RECOMMENDATIONS
## CLOSING STATEMENT

Reference specific numbers throughout. Each section should be 2-4 sentences or a short bullet list.`

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  })

  const message = await stream.finalMessage()
  const content = message.content[0]
  return content.type === 'text' ? content.text : ''
}
