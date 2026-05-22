'use client'

import { useEffect, useState, useRef } from 'react'
import {
  TrendingUp, TrendingDown, DollarSign, Plus, X, Loader2,
  Trash2, FileText, Upload, ImageIcon, ReceiptText,
} from 'lucide-react'
import type { Expense, ExpenseCategory, Building, RentLedgerEntry } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { downloadTaxReportPDF } from '@/lib/pdf'

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'mortgage',       label: 'Mortgage'       },
  { value: 'insurance',      label: 'Insurance'      },
  { value: 'repairs',        label: 'Repairs'        },
  { value: 'utilities',      label: 'Utilities'      },
  { value: 'taxes',          label: 'Taxes'          },
  { value: 'management_fees',label: 'Management Fees'},
  { value: 'other',          label: 'Other'          },
]

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  mortgage:        'bg-[#0e1e2e] text-[#7ab4e0] border-[#142030]',
  insurance:       'bg-[#1a1028] text-[#a98ae0] border-[#241638]',
  repairs:         'bg-[#2d1e0e] text-[#d48f4a] border-[#3a2510]',
  utilities:       'bg-[#1e1e10] text-[#c8b44a] border-[#2e2c14]',
  taxes:           'bg-[#2e1414] text-[#c45c5c] border-[#3e1c1c]',
  management_fees: 'bg-[#0d2e1a] text-[#5bba7a] border-[#0f3a20]',
  other:           'bg-[#1a1a1a] text-[#7a7468] border-[#2e3328]',
}

function currentYear() { return new Date().getFullYear() }

const EMPTY_FORM = {
  property_id:  '',
  date:         new Date().toISOString().slice(0, 10),
  amount:       '',
  category:     'repairs' as ExpenseCategory,
  description:  '',
}

export default function FinancesPage() {
  const [view, setView] = useState<'income' | 'expenses'>('income')
  const [year, setYear] = useState(currentYear())
  const [propertyFilter, setPropertyFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const [buildings, setBuildings]   = useState<Building[]>([])
  const [income, setIncome]         = useState<RentLedgerEntry[]>([])
  const [expenses, setExpenses]     = useState<Expense[]>([])
  const [loading, setLoading]       = useState(true)

  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  const [formError, setFormError]   = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [uploading, setUploading]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Tax report modal
  const [showTax, setShowTax]       = useState(false)
  const [taxYear, setTaxYear]       = useState(currentYear())
  const [taxLoading, setTaxLoading] = useState(false)
  const [taxReport, setTaxReport]   = useState('')
  const [taxError, setTaxError]     = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/buildings').then(r => r.json()),
      fetch(`/api/rent?status=paid`).then(r => r.json()),
      fetch(`/api/expenses`).then(r => r.json()),
    ]).then(([b, i, e]) => {
      setBuildings(Array.isArray(b) ? b : [])
      setIncome(Array.isArray(i) ? i : [])
      setExpenses(Array.isArray(e) ? e : [])
    }).finally(() => setLoading(false))
  }, [])

  // Filtered & year-scoped
  const filteredIncome = income.filter(e => {
    const y = new Date(e.due_date).getFullYear()
    if (y !== year) return false
    if (propertyFilter && String(e.building_id) !== propertyFilter) return false
    return true
  })

  const filteredExpenses = expenses.filter(e => {
    const y = new Date(e.date).getFullYear()
    if (y !== year) return false
    if (propertyFilter && String(e.property_id) !== propertyFilter) return false
    if (categoryFilter && e.category !== categoryFilter) return false
    return true
  })

  const totalIncome    = filteredIncome.reduce((s, e)   => s + Number(e.amount_due), 0)
  const totalExpenses  = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0)
  const net            = totalIncome - totalExpenses

  async function uploadReceipt(file: File): Promise<string> {
    setUploading(true)
    const res = await fetch('/api/expenses/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    })
    const { signedUrl, publicUrl } = await res.json()
    await fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
    setUploading(false)
    return publicUrl
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    let receipt_url = ''
    if (receiptFile) {
      try { receipt_url = await uploadReceipt(receiptFile) } catch { /* skip */ }
    }
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, property_id: Number(form.property_id), amount: Number(form.amount), receipt_url }),
    })
    const data = await res.json()
    if (!res.ok) { setFormError(data.error ?? 'Failed to save'); setSaving(false); return }
    setExpenses(prev => [data, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
    setForm(EMPTY_FORM)
    setReceiptFile(null)
    setShowForm(false)
    setSaving(false)
  }

  async function handleDeleteExpense(id: string) {
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  async function generateTaxReport() {
    setTaxLoading(true)
    setTaxError('')
    setTaxReport('')
    const res = await fetch('/api/tax-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: taxYear }),
    })
    const data = await res.json()
    if (!res.ok) { setTaxError(data.error ?? 'Failed to generate'); setTaxLoading(false); return }
    setTaxReport(data.report_text)
    setTaxLoading(false)
  }

  const inputCls = 'w-full bg-[#0e100d] border border-[#222620] rounded-sm text-xs text-[#eae6d6] placeholder-[#7a7468] px-3 py-2.5 focus:outline-none focus:border-[#d4b070]/30 transition-all'
  const labelCls = 'block text-[10px] text-[#7a7468] mb-1.5'
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear() - i)

  // Group income by month
  const incomeByMonth = filteredIncome.reduce<Record<string, RentLedgerEntry[]>>((acc, e) => {
    const key = e.due_date.slice(0, 7)
    ;(acc[key] ??= []).push(e)
    return acc
  }, {})
  const sortedMonths = Object.keys(incomeByMonth).sort().reverse()

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#5bba7a] status-pulse" />
            <span className="text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.28em' }}>FINANCES</span>
          </div>
          <h1 className="font-display text-4xl font-light text-[#eae6d6]">Finances</h1>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button onClick={() => { setShowTax(true); setTaxReport('') }}
            className="flex items-center gap-1.5 text-[11px] text-[#7ab4e0] border border-[#7ab4e0]/30 hover:border-[#7ab4e0]/50 hover:bg-[#7ab4e0]/06 rounded-sm px-3 py-2 transition-all"
            style={{ letterSpacing: '0.12em' }}
          >
            <ReceiptText size={10} /> TAX REPORT
          </button>
          {view === 'expenses' && (
            <button onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-1.5 text-[11px] text-[#d4b070] border border-[#d4b070]/30 hover:border-[#d4b070]/50 hover:bg-[#d4b070]/06 rounded-sm px-3 py-2 transition-all"
              style={{ letterSpacing: '0.12em' }}
            >
              {showForm ? <X size={10} /> : <Plus size={10} />}
              {showForm ? 'CANCEL' : 'LOG EXPENSE'}
            </button>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Income',   value: totalIncome,   color: '#5bba7a', icon: TrendingUp  },
          { label: 'Total Expenses', value: totalExpenses, color: '#c45c5c', icon: TrendingDown },
          { label: 'Net',            value: net,           color: net >= 0 ? '#5bba7a' : '#c45c5c', icon: DollarSign },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-[#101210] border border-[#222620] rounded-sm p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.2em' }}>{label.toUpperCase()}</span>
              <Icon size={12} style={{ color, opacity: 0.5 }} />
            </div>
            <div className="font-display text-2xl font-light" style={{ color }}>
              {loading ? '—' : formatCurrency(value)}
            </div>
            <div className="text-[10px] text-[#7a7468] mt-1" style={{ letterSpacing: '0.12em' }}>{year} TOTAL</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {/* View toggle */}
        <div className="flex gap-1">
          {(['income', 'expenses'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`text-[10px] px-3 py-1.5 rounded-sm border transition-all ${view === v ? 'bg-[#d4b070]/10 text-[#d4b070] border-[#d4b070]/30' : 'text-[#7a7468] border-[#222620] hover:text-[#9e9a8c]'}`}
              style={{ letterSpacing: '0.12em' }}
            >
              {v.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Year picker */}
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          className="bg-[#0e100d] border border-[#222620] rounded-sm text-xs text-[#eae6d6] px-3 py-1.5 focus:outline-none focus:border-[#d4b070]/30 transition-all"
        >
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        {/* Property filter */}
        <select value={propertyFilter} onChange={e => setPropertyFilter(e.target.value)}
          className="bg-[#0e100d] border border-[#222620] rounded-sm text-xs text-[#eae6d6] px-3 py-1.5 focus:outline-none focus:border-[#d4b070]/30 transition-all"
        >
          <option value="">All properties</option>
          {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        {/* Category filter (expenses only) */}
        {view === 'expenses' && (
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="bg-[#0e100d] border border-[#222620] rounded-sm text-xs text-[#eae6d6] px-3 py-1.5 focus:outline-none focus:border-[#d4b070]/30 transition-all"
          >
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        )}
      </div>

      {/* Add expense form */}
      {view === 'expenses' && showForm && (
        <form onSubmit={handleAddExpense} className="bg-[#101210] border border-[#222620] rounded-sm p-5 mb-5">
          <p className="text-[10px] text-[#7a7468] mb-4" style={{ letterSpacing: '0.2em' }}>NEW EXPENSE</p>
          {formError && <p className="text-xs text-[#c45c5c] mb-3">{formError}</p>}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="col-span-2">
              <label className={labelCls} style={{ letterSpacing: '0.15em' }}>PROPERTY *</label>
              <select required value={form.property_id} onChange={e => setForm(p => ({ ...p, property_id: e.target.value }))}
                className="w-full bg-[#0e100d] border border-[#222620] rounded-sm text-xs text-[#eae6d6] px-3 py-2.5 focus:outline-none focus:border-[#d4b070]/30 transition-all"
              >
                <option value="">Select property…</option>
                {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} style={{ letterSpacing: '0.15em' }}>DATE *</label>
              <input required type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} style={{ letterSpacing: '0.15em' }}>AMOUNT *</label>
              <input required type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls} style={{ letterSpacing: '0.15em' }}>CATEGORY *</label>
              <select required value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as ExpenseCategory }))}
                className="w-full bg-[#0e100d] border border-[#222620] rounded-sm text-xs text-[#eae6d6] px-3 py-2.5 focus:outline-none focus:border-[#d4b070]/30 transition-all"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} style={{ letterSpacing: '0.15em' }}>DESCRIPTION</label>
              <input type="text" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional note…" className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls} style={{ letterSpacing: '0.15em' }}>RECEIPT (OPTIONAL)</label>
              <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => setReceiptFile(e.target.files?.[0] ?? null)} />
              {receiptFile ? (
                <div className="flex items-center gap-2 bg-[#0e100d] border border-[#d4b070]/20 rounded-sm px-3 py-2.5">
                  <ImageIcon size={11} className="text-[#d4b070] flex-shrink-0" />
                  <span className="text-xs text-[#c8c4b4] truncate flex-1">{receiptFile.name}</span>
                  <button type="button" onClick={() => setReceiptFile(null)} className="text-[#7a7468] hover:text-[#c45c5c]"><X size={11} /></button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 bg-[#0e100d] border border-dashed border-[#2e3328] hover:border-[#d4b070]/30 rounded-sm py-3 text-xs text-[#7a7468] hover:text-[#9e9a8c] transition-all"
                >
                  <Upload size={11} /> Attach receipt
                </button>
              )}
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving || uploading}
              className="flex items-center gap-1.5 text-[11px] bg-[#d4b070]/10 hover:bg-[#d4b070]/18 disabled:opacity-40 text-[#d4b070] border border-[#d4b070]/30 hover:border-[#d4b070]/50 px-4 py-2 rounded-sm transition-all"
              style={{ letterSpacing: '0.12em' }}
            >
              {saving || uploading ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
              {uploading ? 'UPLOADING…' : saving ? 'SAVING…' : 'ADD EXPENSE'}
            </button>
          </div>
        </form>
      )}

      {/* Income view */}
      {view === 'income' && (
        loading ? (
          <div className="flex justify-center h-40 items-center"><Loader2 size={18} className="animate-spin text-[#7a7468]" /></div>
        ) : filteredIncome.length === 0 ? (
          <div className="bg-[#101210] border border-[#222620] rounded-sm py-16 text-center">
            <DollarSign size={24} className="text-[#222620] mx-auto mb-3" />
            <p className="text-sm font-display italic text-[#9e9a8c]">No paid rent recorded for {year}</p>
            <p className="text-xs text-[#7a7468] mt-1">Mark rent entries as paid from the Rent page.</p>
          </div>
        ) : (
          <div className="bg-[#101210] border border-[#222620] rounded-sm overflow-hidden">
            {sortedMonths.map(month => {
              const entries = incomeByMonth[month]
              const subtotal = entries.reduce((s, e) => s + Number(e.amount_due), 0)
              const [y, m] = month.split('-')
              const label = new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              return (
                <div key={month}>
                  <div className="flex items-center justify-between px-5 py-2.5 bg-[#0e100d] border-b border-[#222620]">
                    <span className="text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.2em' }}>{label.toUpperCase()}</span>
                    <span className="text-[11px] text-[#5bba7a]">{formatCurrency(subtotal)}</span>
                  </div>
                  {entries.map(e => {
                    const tenant = e.tenant as { full_name?: string; unit_number?: string } | undefined
                    const building = e.building as { name?: string } | undefined
                    return (
                      <div key={e.id} className="flex items-center justify-between px-5 py-3 border-b border-[#1a1e18] last:border-b-0 hover:bg-[#111410] transition-colors">
                        <div className="text-xs text-[#c8c4b4]">
                          {tenant?.full_name ?? '—'}
                          {tenant?.unit_number && <span className="text-[#7a7468] ml-2">Unit {tenant.unit_number}</span>}
                          {building?.name && <span className="text-[#7a7468] ml-2">· {building.name}</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-[#7a7468]">{new Date(e.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          <span className="text-sm text-[#5bba7a] font-display">{formatCurrency(Number(e.amount_due))}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Expenses view */}
      {view === 'expenses' && (
        loading ? (
          <div className="flex justify-center h-40 items-center"><Loader2 size={18} className="animate-spin text-[#7a7468]" /></div>
        ) : filteredExpenses.length === 0 ? (
          <div className="bg-[#101210] border border-[#222620] rounded-sm py-16 text-center">
            <FileText size={24} className="text-[#222620] mx-auto mb-3" />
            <p className="text-sm font-display italic text-[#9e9a8c]">No expenses for {year}</p>
            <p className="text-xs text-[#7a7468] mt-1">Click "Log Expense" to add your first entry.</p>
          </div>
        ) : (
          <div className="bg-[#101210] border border-[#222620] rounded-sm overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#222620]">
                  {['DATE', 'PROPERTY', 'CATEGORY', 'DESCRIPTION', 'AMOUNT', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[9px] text-[#7a7468]" style={{ letterSpacing: '0.2em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1e18]">
                {filteredExpenses.map(e => {
                  const building = (e as Expense & { building?: { name: string } }).building
                  return (
                    <tr key={e.id} className="hover:bg-[#111410] transition-colors">
                      <td className="px-4 py-3 text-[#9e9a8c] font-mono text-[10px]">{new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                      <td className="px-4 py-3 text-[#c8c4b4]">{building?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[e.category]}`} style={{ letterSpacing: '0.12em' }}>
                          {CATEGORIES.find(c => c.value === e.category)?.label ?? e.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#9e9a8c]">{e.description || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-[#c45c5c] font-display">{formatCurrency(Number(e.amount))}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDeleteExpense(e.id)} className="text-[#7a7468] hover:text-[#c45c5c] transition-colors">
                          <Trash2 size={11} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Tax Report Modal */}
      {showTax && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={e => { if (e.target === e.currentTarget) setShowTax(false) }}>
          <div className="bg-[#0e100d] border border-[#222620] rounded-sm w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#222620]">
              <div className="flex items-center gap-2">
                <ReceiptText size={14} className="text-[#7ab4e0]" />
                <span className="text-[11px] text-[#eae6d6]" style={{ letterSpacing: '0.15em' }}>SCHEDULE E TAX REPORT</span>
              </div>
              <button onClick={() => setShowTax(false)} className="text-[#7a7468] hover:text-[#eae6d6] transition-colors"><X size={14} /></button>
            </div>
            <div className="px-6 py-4 border-b border-[#222620] flex items-center gap-3">
              <label className="text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.15em' }}>TAX YEAR</label>
              <select value={taxYear} onChange={e => setTaxYear(Number(e.target.value))}
                className="bg-[#0b0c09] border border-[#222620] rounded-sm text-xs text-[#eae6d6] px-3 py-1.5 focus:outline-none focus:border-[#d4b070]/30"
              >
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <button onClick={generateTaxReport} disabled={taxLoading}
                className="flex items-center gap-1.5 text-[11px] bg-[#7ab4e0]/10 hover:bg-[#7ab4e0]/18 disabled:opacity-40 text-[#7ab4e0] border border-[#7ab4e0]/30 hover:border-[#7ab4e0]/50 px-4 py-1.5 rounded-sm transition-all ml-2"
                style={{ letterSpacing: '0.12em' }}
              >
                {taxLoading ? <Loader2 size={10} className="animate-spin" /> : <FileText size={10} />}
                {taxLoading ? 'GENERATING…' : 'GENERATE'}
              </button>
              {taxReport && (
                <button onClick={() => downloadTaxReportPDF(taxReport, taxYear)}
                  className="flex items-center gap-1.5 text-[11px] bg-[#5bba7a]/10 hover:bg-[#5bba7a]/18 text-[#5bba7a] border border-[#5bba7a]/30 hover:border-[#5bba7a]/50 px-4 py-1.5 rounded-sm transition-all"
                  style={{ letterSpacing: '0.12em' }}
                >
                  DOWNLOAD PDF
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {taxError && <p className="text-sm text-[#c45c5c]">{taxError}</p>}
              {!taxReport && !taxLoading && !taxError && (
                <p className="text-sm text-[#7a7468] italic">Select a year and click Generate to create your Schedule E summary.</p>
              )}
              {taxLoading && (
                <div className="flex items-center gap-3 text-[#7a7468]">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-sm">Generating your tax summary…</span>
                </div>
              )}
              {taxReport && (
                <pre className="text-xs text-[#c8c4b4] leading-relaxed whitespace-pre-wrap font-mono">{taxReport}</pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
