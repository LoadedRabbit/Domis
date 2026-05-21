'use client'

import { useEffect, useState } from 'react'
import { Users, Plus, X, Loader2, Building2, Mail, Phone, Calendar } from 'lucide-react'
import type { Tenant, Building } from '@/types'
import { formatCurrency } from '@/lib/utils'

const EMPTY_FORM = {
  building_id: '',
  unit_number: '',
  full_name: '',
  email: '',
  phone: '',
  monthly_rent: '',
  lease_start: '',
  lease_end: '',
}

export default function TenantsPage() {
  const [tenants, setTenants]     = useState<Tenant[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [filter, setFilter]       = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/tenants').then(r => r.json()),
      fetch('/api/buildings').then(r => r.json()),
    ]).then(([t, b]) => {
      setTenants(Array.isArray(t) ? t : [])
      setBuildings(Array.isArray(b) ? b : [])
    }).finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        building_id:  Number(form.building_id),
        monthly_rent: Number(form.monthly_rent),
        lease_start:  form.lease_start  || null,
        lease_end:    form.lease_end    || null,
        phone:        form.phone        || '',
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to save'); setSaving(false); return }
    setTenants(prev => [...prev, data].sort((a, b) => a.full_name.localeCompare(b.full_name)))
    setForm(EMPTY_FORM)
    setShowForm(false)
    setSaving(false)
  }

  const filtered = filter
    ? tenants.filter(t =>
        t.full_name.toLowerCase().includes(filter.toLowerCase()) ||
        t.email.toLowerCase().includes(filter.toLowerCase()) ||
        t.unit_number.toLowerCase().includes(filter.toLowerCase()) ||
        (t.building as Building | undefined)?.name?.toLowerCase().includes(filter.toLowerCase())
      )
    : tenants

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#5bba7a] status-pulse" />
            <span className="text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.28em' }}>TENANT REGISTRY</span>
          </div>
          <h1 className="font-display text-4xl font-light text-[#eae6d6]">Tenants</h1>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setError('') }}
          className="flex items-center gap-1.5 text-[11px] text-[#d4b070] border border-[#d4b070]/30 hover:border-[#d4b070]/50 hover:bg-[#d4b070]/06 rounded-sm px-3 py-2 transition-all mt-1"
          style={{ letterSpacing: '0.12em' }}
        >
          {showForm ? <X size={10} /> : <Plus size={10} />}
          {showForm ? 'CANCEL' : 'ADD TENANT'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[#101210] border border-[#222620] rounded-sm p-5 mb-6">
          <p className="text-[10px] text-[#7a7468] mb-4" style={{ letterSpacing: '0.2em' }}>NEW TENANT</p>
          {error && <p className="text-xs text-[#c45c5c] mb-3">{error}</p>}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="col-span-2">
              <label className="block text-[10px] text-[#7a7468] mb-1.5" style={{ letterSpacing: '0.15em' }}>BUILDING *</label>
              <select
                required value={form.building_id}
                onChange={e => setForm(p => ({ ...p, building_id: e.target.value }))}
                className="w-full bg-[#0e100d] border border-[#222620] rounded-sm text-xs text-[#eae6d6] px-3 py-2.5 focus:outline-none focus:border-[#d4b070]/30 transition-all"
              >
                <option value="">Select building…</option>
                {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-[#7a7468] mb-1.5" style={{ letterSpacing: '0.15em' }}>UNIT *</label>
              <input required type="text" value={form.unit_number}
                onChange={e => setForm(p => ({ ...p, unit_number: e.target.value }))}
                placeholder="e.g. 4B"
                className="w-full bg-[#0e100d] border border-[#222620] rounded-sm text-xs text-[#eae6d6] placeholder-[#7a7468] px-3 py-2.5 focus:outline-none focus:border-[#d4b070]/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#7a7468] mb-1.5" style={{ letterSpacing: '0.15em' }}>MONTHLY RENT *</label>
              <input required type="number" min="0" step="0.01" value={form.monthly_rent}
                onChange={e => setForm(p => ({ ...p, monthly_rent: e.target.value }))}
                placeholder="1500"
                className="w-full bg-[#0e100d] border border-[#222620] rounded-sm text-xs text-[#eae6d6] placeholder-[#7a7468] px-3 py-2.5 focus:outline-none focus:border-[#d4b070]/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#7a7468] mb-1.5" style={{ letterSpacing: '0.15em' }}>FULL NAME *</label>
              <input required type="text" value={form.full_name}
                onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                placeholder="Jane Smith"
                className="w-full bg-[#0e100d] border border-[#222620] rounded-sm text-xs text-[#eae6d6] placeholder-[#7a7468] px-3 py-2.5 focus:outline-none focus:border-[#d4b070]/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#7a7468] mb-1.5" style={{ letterSpacing: '0.15em' }}>EMAIL *</label>
              <input required type="email" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="jane@example.com"
                className="w-full bg-[#0e100d] border border-[#222620] rounded-sm text-xs text-[#eae6d6] placeholder-[#7a7468] px-3 py-2.5 focus:outline-none focus:border-[#d4b070]/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#7a7468] mb-1.5" style={{ letterSpacing: '0.15em' }}>PHONE</label>
              <input type="tel" value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="(555) 000-0000"
                className="w-full bg-[#0e100d] border border-[#222620] rounded-sm text-xs text-[#eae6d6] placeholder-[#7a7468] px-3 py-2.5 focus:outline-none focus:border-[#d4b070]/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#7a7468] mb-1.5" style={{ letterSpacing: '0.15em' }}>LEASE START</label>
              <input type="date" value={form.lease_start}
                onChange={e => setForm(p => ({ ...p, lease_start: e.target.value }))}
                className="w-full bg-[#0e100d] border border-[#222620] rounded-sm text-xs text-[#eae6d6] px-3 py-2.5 focus:outline-none focus:border-[#d4b070]/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#7a7468] mb-1.5" style={{ letterSpacing: '0.15em' }}>LEASE END</label>
              <input type="date" value={form.lease_end}
                onChange={e => setForm(p => ({ ...p, lease_end: e.target.value }))}
                className="w-full bg-[#0e100d] border border-[#222620] rounded-sm text-xs text-[#eae6d6] px-3 py-2.5 focus:outline-none focus:border-[#d4b070]/30 transition-all"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving}
              className="flex items-center gap-1.5 text-[11px] bg-[#d4b070]/10 hover:bg-[#d4b070]/18 disabled:opacity-40 text-[#d4b070] border border-[#d4b070]/30 hover:border-[#d4b070]/50 px-4 py-2 rounded-sm transition-all"
              style={{ letterSpacing: '0.12em' }}
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
              {saving ? 'SAVING…' : 'ADD TENANT'}
            </button>
          </div>
        </form>
      )}

      <div className="mb-4">
        <input
          type="text" value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter by name, email, unit, or building…"
          className="w-full max-w-sm bg-[#0e100d] border border-[#222620] rounded-sm text-xs text-[#eae6d6] placeholder-[#7a7468] px-3 py-2.5 focus:outline-none focus:border-[#d4b070]/30 transition-all"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 size={18} className="animate-spin text-[#7a7468]" /></div>
      ) : (
        <div className="bg-[#101210] border border-[#222620] rounded-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={24} className="text-[#222620] mx-auto mb-3" />
              <p className="text-sm font-display italic text-[#9e9a8c]">{filter ? 'No tenants match that filter' : 'No tenants yet'}</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#222620]">
                  {['TENANT', 'BUILDING / UNIT', 'CONTACT', 'RENT', 'LEASE END'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[9px] text-[#7a7468]" style={{ letterSpacing: '0.2em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1e18]">
                {filtered.map(t => {
                  const building = t.building as Building | undefined
                  const leaseEnd = t.lease_end
                    ? new Date(t.lease_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'
                  const isExpiringSoon = t.lease_end
                    ? (new Date(t.lease_end).getTime() - Date.now()) < 60 * 86_400_000
                    : false
                  return (
                    <tr key={t.id} className="hover:bg-[#111410] transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-[#c8c4b4] font-medium">{t.full_name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Building2 size={10} className="text-[#7a7468] flex-shrink-0" />
                          <span className="text-[#9e9a8c]">{building?.name ?? '—'}</span>
                          <span className="text-[#7a7468]">·</span>
                          <span className="text-[#d4b070] font-mono">{t.unit_number}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-[#9e9a8c]">
                          <Mail size={9} className="text-[#7a7468]" />
                          {t.email}
                        </div>
                        {t.phone && (
                          <div className="flex items-center gap-1 text-[#7a7468] mt-0.5">
                            <Phone size={9} />
                            {t.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[#d4b070] font-display">{formatCurrency(Number(t.monthly_rent))}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={9} className={isExpiringSoon ? 'text-[#c45c5c]' : 'text-[#7a7468]'} />
                          <span className={isExpiringSoon ? 'text-[#c45c5c]' : 'text-[#9e9a8c]'}>{leaseEnd}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
