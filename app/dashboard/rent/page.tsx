'use client'

import { useEffect, useState } from 'react'
import { DollarSign, Plus, Loader2, ChevronDown, ChevronUp, FileText, Send, X } from 'lucide-react'
import type { RentLedgerEntry, NoticeType, RentNotice, Tenant } from '@/types'
import { formatCurrency } from '@/lib/utils'

const NOTICE_META: Record<NoticeType, { label: string; color: string }> = {
  first_notice:     { label: '1st Notice',        color: 'bg-[#2d1e0e] text-[#d48f4a] border-[#3a2510]' },
  second_notice:    { label: '2nd Notice',         color: 'bg-[#2e1a0e] text-[#d47a3a] border-[#3e2210]' },
  lawyer_referral:  { label: 'Lawyer Referral',    color: 'bg-[#2e1414] text-[#c45c5c] border-[#3e1c1c]' },
}

const NOTICE_ORDER: NoticeType[] = ['first_notice', 'second_notice', 'lawyer_referral']

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function RentPage() {
  const [entries, setEntries]     = useState<RentLedgerEntry[]>([])
  const [tenants, setTenants]     = useState<Tenant[]>([])
  const [loading, setLoading]     = useState(true)
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [notices, setNotices]     = useState<Record<string, RentNotice[]>>({})
  const [generating, setGenerating] = useState<string | null>(null)
  const [generatedPreview, setGeneratedPreview] = useState<{ id: string; text: string } | null>(null)
  const [statusFilter, setStatusFilter] = useState<'unpaid' | 'all'>('unpaid')
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ tenant_id: '', due_date: '', amount_due: '' })
  const [addSaving, setAddSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/rent').then(r => r.json()),
      fetch('/api/tenants').then(r => r.json()),
    ]).then(([r, t]) => {
      setEntries(Array.isArray(r) ? r : [])
      setTenants(Array.isArray(t) ? t : [])
    }).finally(() => setLoading(false))
  }, [])

  async function openEntry(id: string) {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (!notices[id]) {
      const data = await fetch(`/api/rent/${id}/notices`).then(r => r.json())
      setNotices(prev => ({ ...prev, [id]: Array.isArray(data) ? data : [] }))
    }
  }

  async function generateNotice(ledgerId: string, noticeType: NoticeType) {
    setGenerating(`${ledgerId}:${noticeType}`)
    const res = await fetch(`/api/rent/${ledgerId}/notices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notice_type: noticeType }),
    })
    const data: RentNotice = await res.json()
    if (res.ok) {
      setNotices(prev => {
        const existing = (prev[ledgerId] ?? []).filter(n => n.notice_type !== noticeType)
        return { ...prev, [ledgerId]: [...existing, data] }
      })
      setGeneratedPreview({ id: data.id, text: data.generated_text })
    }
    setGenerating(null)
  }

  async function markPaid(ledgerId: string) {
    const res = await fetch(`/api/rent/${ledgerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid', paid_date: new Date().toISOString().split('T')[0] }),
    })
    if (res.ok) {
      setEntries(prev => prev.map(e => e.id === ledgerId ? { ...e, status: 'paid', days_overdue: 0 } : e))
    }
  }

  async function addLedgerEntry(e: React.FormEvent) {
    e.preventDefault()
    setAddSaving(true)
    const res = await fetch('/api/rent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...addForm, amount_due: Number(addForm.amount_due) }),
    })
    const data = await res.json()
    if (res.ok) {
      setEntries(prev => [data, ...prev])
      setAddForm({ tenant_id: '', due_date: '', amount_due: '' })
      setShowAddForm(false)
    }
    setAddSaving(false)
  }

  const displayed = entries
    .filter(e => statusFilter === 'all' || e.status === statusFilter)
    .sort((a, b) => (b.days_overdue ?? 0) - (a.days_overdue ?? 0))

  const totalUnpaid = entries.filter(e => e.status === 'unpaid').reduce((s, e) => s + Number(e.amount_due), 0)

  return (
    <div className="p-8">
      {generatedPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07080d]/80 backdrop-blur-sm p-6">
          <div className="bg-[#0e100d] border border-[#222620] rounded-sm w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#222620]">
              <span className="text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.2em' }}>GENERATED NOTICE</span>
              <button onClick={() => setGeneratedPreview(null)}><X size={14} className="text-[#7a7468] hover:text-[#eae6d6] transition-colors" /></button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              <pre className="text-xs text-[#c8c4b4] leading-relaxed whitespace-pre-wrap font-sans">{generatedPreview.text}</pre>
            </div>
            <div className="px-5 py-4 border-t border-[#222620] flex justify-end gap-2">
              <button onClick={() => { navigator.clipboard.writeText(generatedPreview.text) }}
                className="text-[11px] text-[#7a7468] border border-[#222620] hover:border-[#2e3328] hover:text-[#9e9a8c] px-3 py-1.5 rounded-sm transition-all"
                style={{ letterSpacing: '0.1em' }}
              >COPY</button>
              <button onClick={() => setGeneratedPreview(null)}
                className="text-[11px] text-[#d4b070] border border-[#d4b070]/30 hover:border-[#d4b070]/50 hover:bg-[#d4b070]/06 px-3 py-1.5 rounded-sm transition-all"
                style={{ letterSpacing: '0.1em' }}
              >CLOSE</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#5bba7a] status-pulse" />
            <span className="text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.28em' }}>RENT LEDGER</span>
          </div>
          <h1 className="font-display text-4xl font-light text-[#eae6d6]">Rent</h1>
          {totalUnpaid > 0 && (
            <p className="text-sm text-[#c45c5c] mt-1">{formatCurrency(totalUnpaid)} outstanding</p>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex gap-1">
            {(['unpaid', 'all'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`text-[10px] px-3 py-1.5 rounded-sm border transition-all ${
                  statusFilter === s ? 'bg-[#d4b070]/10 text-[#d4b070] border-[#d4b070]/30' : 'text-[#7a7468] border-[#222620] hover:text-[#9e9a8c]'
                }`}
                style={{ letterSpacing: '0.12em' }}
              >
                {s === 'unpaid' ? 'UNPAID' : 'ALL'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="flex items-center gap-1.5 text-[11px] text-[#d4b070] border border-[#d4b070]/30 hover:border-[#d4b070]/50 hover:bg-[#d4b070]/06 rounded-sm px-3 py-1.5 transition-all"
            style={{ letterSpacing: '0.12em' }}
          >
            {showAddForm ? <X size={10} /> : <Plus size={10} />}
            {showAddForm ? 'CANCEL' : 'ADD ENTRY'}
          </button>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={addLedgerEntry} className="bg-[#101210] border border-[#222620] rounded-sm p-5 mb-6">
          <p className="text-[10px] text-[#7a7468] mb-4" style={{ letterSpacing: '0.2em' }}>NEW LEDGER ENTRY</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[9px] text-[#7a7468] mb-1.5" style={{ letterSpacing: '0.15em' }}>TENANT *</label>
              <select required value={addForm.tenant_id} onChange={e => setAddForm(p => ({ ...p, tenant_id: e.target.value }))}
                className="w-full bg-[#0e100d] border border-[#222620] rounded-sm text-xs text-[#eae6d6] px-3 py-2 focus:outline-none focus:border-[#d4b070]/30 transition-all"
              >
                <option value="">Select tenant…</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.full_name} · {t.unit_number}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[9px] text-[#7a7468] mb-1.5" style={{ letterSpacing: '0.15em' }}>DUE DATE *</label>
              <input required type="date" value={addForm.due_date}
                onChange={e => setAddForm(p => ({ ...p, due_date: e.target.value }))}
                className="w-full bg-[#0e100d] border border-[#222620] rounded-sm text-xs text-[#eae6d6] px-3 py-2 focus:outline-none focus:border-[#d4b070]/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-[9px] text-[#7a7468] mb-1.5" style={{ letterSpacing: '0.15em' }}>AMOUNT DUE *</label>
              <input required type="number" min="0" step="0.01" value={addForm.amount_due}
                onChange={e => setAddForm(p => ({ ...p, amount_due: e.target.value }))}
                placeholder="1500"
                className="w-full bg-[#0e100d] border border-[#222620] rounded-sm text-xs text-[#eae6d6] placeholder-[#7a7468] px-3 py-2 focus:outline-none focus:border-[#d4b070]/30 transition-all"
              />
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button type="submit" disabled={addSaving}
              className="flex items-center gap-1.5 text-[11px] bg-[#d4b070]/10 hover:bg-[#d4b070]/18 disabled:opacity-40 text-[#d4b070] border border-[#d4b070]/30 px-4 py-1.5 rounded-sm transition-all"
              style={{ letterSpacing: '0.12em' }}
            >
              {addSaving ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
              {addSaving ? 'ADDING…' : 'ADD'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 size={18} className="animate-spin text-[#7a7468]" /></div>
      ) : displayed.length === 0 ? (
        <div className="bg-[#101210] border border-[#222620] rounded-sm py-16 text-center">
          <DollarSign size={24} className="text-[#222620] mx-auto mb-3" />
          <p className="text-sm font-display italic text-[#9e9a8c]">No entries</p>
        </div>
      ) : (
        <div className="bg-[#101210] border border-[#222620] rounded-sm overflow-hidden">
          <div className="divide-y divide-[#222620]">
            {displayed.map(entry => {
              const tenant = entry.tenant as { full_name?: string; unit_number?: string; email?: string } | undefined
              const building = entry.building as { name?: string } | undefined
              const isOpen = expanded === entry.id
              const entryNotices = notices[entry.id] ?? []
              const isPaid = entry.status === 'paid'
              return (
                <div key={entry.id}>
                  <button
                    onClick={() => openEntry(entry.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[#161914] transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${isPaid ? 'bg-[#0d2e1a] text-[#5bba7a] border-[#0f3a20]' : (entry.days_overdue ?? 0) > 30 ? 'bg-[#2e1414] text-[#c45c5c] border-[#3e1c1c]' : 'bg-[#2d1e0e] text-[#d48f4a] border-[#3a2510]'}`} style={{ letterSpacing: '0.15em' }}>
                          {isPaid ? 'PAID' : (entry.days_overdue ?? 0) > 0 ? `${entry.days_overdue}d OVERDUE` : 'UNPAID'}
                        </span>
                        {entryNotices.length > 0 && entryNotices.map(n => (
                          <span key={n.id} className={`text-[9px] px-1.5 py-0.5 rounded border ${NOTICE_META[n.notice_type].color}`} style={{ letterSpacing: '0.12em' }}>
                            {NOTICE_META[n.notice_type].label.toUpperCase()}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-[#c8c4b4] font-medium">{tenant?.full_name ?? '—'}</span>
                        {tenant?.unit_number && <span className="text-[#d4b070] font-mono text-xs">Unit {tenant.unit_number}</span>}
                        {building?.name && <span className="text-[#7a7468] text-xs">· {building.name}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[10px] text-[#7a7468]">
                        <span>Due {formatDate(entry.due_date)}</span>
                        <span className="text-[#d4b070] font-display">{formatCurrency(Number(entry.amount_due))}</span>
                      </div>
                    </div>
                    {isOpen ? <ChevronUp size={13} className="text-[#7a7468] flex-shrink-0" /> : <ChevronDown size={13} className="text-[#7a7468] flex-shrink-0" />}
                  </button>

                  {isOpen && (
                    <div className="bg-[#0e100d] border-t border-[#1a1e18] px-5 pb-5">
                      <div className="pt-4 space-y-4">
                        {!isPaid && (
                          <div>
                            <p className="text-[9px] text-[#7a7468] mb-2" style={{ letterSpacing: '0.2em' }}>AI NOTICES</p>
                            <div className="flex flex-wrap gap-2">
                              {NOTICE_ORDER.map(nt => {
                                const existing = entryNotices.find(n => n.notice_type === nt)
                                const isGenerating = generating === `${entry.id}:${nt}`
                                return (
                                  <div key={nt} className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => generateNotice(entry.id, nt)}
                                      disabled={!!generating}
                                      className={`flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-sm border transition-all ${existing ? NOTICE_META[nt].color : 'text-[#7a7468] border-[#222620] hover:border-[#2e3328] hover:text-[#9e9a8c]'} disabled:opacity-40`}
                                      style={{ letterSpacing: '0.1em' }}
                                    >
                                      {isGenerating ? <Loader2 size={9} className="animate-spin" /> : <FileText size={9} />}
                                      {NOTICE_META[nt].label.toUpperCase()}
                                    </button>
                                    {existing && (
                                      <button
                                        onClick={() => setGeneratedPreview({ id: existing.id, text: existing.generated_text })}
                                        className="text-[9px] text-[#7ab4e0] hover:text-[#a0c8e8] transition-colors flex items-center gap-1"
                                      >
                                        <Send size={8} /> VIEW
                                      </button>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          {tenant?.email && (
                            <span className="text-xs text-[#7a7468]">{tenant.email}</span>
                          )}
                          {!isPaid && (
                            <button
                              onClick={() => markPaid(entry.id)}
                              className="flex items-center gap-1.5 text-[11px] bg-[#5bba7a]/10 hover:bg-[#5bba7a]/18 text-[#5bba7a] border border-[#5bba7a]/30 hover:border-[#5bba7a]/50 px-4 py-1.5 rounded-sm transition-all ml-auto"
                              style={{ letterSpacing: '0.12em' }}
                            >
                              MARK PAID
                            </button>
                          )}
                          {isPaid && entry.paid_date && (
                            <span className="text-xs text-[#5bba7a] ml-auto">Paid {formatDate(entry.paid_date)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
