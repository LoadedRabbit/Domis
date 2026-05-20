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

  const prompt = `You are a senior property management professional writing a formal monthly owner report for Kinyu Realty and Management Corp. Write a comprehensive, polished report that owners will find valuable and professional.

PROPERTY INFORMATION
Building: ${data.buildingName}
Address: ${data.address}
Report Period: ${MONTHS[data.month - 1]} ${data.year}

FINANCIAL PERFORMANCE
- Total Rent Collected: ${formatCurrency(data.totalRent)}
- Total Expenses: ${formatCurrency(data.totalExpenses)}
- Net Operating Income: ${formatCurrency(data.netIncome)}

OCCUPANCY STATUS
- Total Units: ${data.totalUnits}
- Vacant Units: ${data.vacantUnits}
- Occupied Units: ${data.totalUnits - data.vacantUnits}
- Occupancy Rate: ${occupancyRate}%

MAINTENANCE INCIDENTS THIS PERIOD
${data.maintenanceIssues.trim() || 'No maintenance issues reported this period.'}

TENANT UPDATES
${data.tenantIssues.trim() || 'No tenant issues reported this period.'}

MANAGER NOTES
${data.notes.trim() || 'No additional notes from management.'}

---

Generate a professional monthly owner report with the following exact sections. Use clear markdown-style headers (##) for each section. Be specific, data-driven, and professional:

## EXECUTIVE SUMMARY
Write 2-3 paragraphs giving a high-level overview of this month's performance. Reference specific numbers. Highlight the most important developments.

## FINANCIAL SUMMARY
Provide a detailed financial breakdown. Include:
- Income analysis (rent collected vs potential)
- Expense breakdown context
- Net operating income analysis
- Commentary on financial health

## OCCUPANCY REPORT
Current occupancy status, vacancy details, and any tenant movement. If there are vacancies, discuss marketing strategy.

## MAINTENANCE SUMMARY
Summary of all maintenance activities performed or outstanding. Note any recurring issues or preventative actions taken.

## TENANT UPDATES
Tenant relations summary including payment status, any concerns, move-ins/move-outs, and community matters.

## RECOMMENDATIONS FOR NEXT MONTH
Provide 4-5 specific, actionable bullet-point recommendations based on this month's data.

## CLOSING STATEMENT
A professional 1-2 paragraph closing statement from management.

Keep the tone professional, informative, and owner-focused. Use specific numbers throughout.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.content[0]
  return content.type === 'text' ? content.text : ''
}
