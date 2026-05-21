'use client'

import { useEffect, useState } from 'react'
import { Wrench, Loader2, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react'
import type { MaintenanceRequest, MaintenanceStatus, Urgency } from '@/types'

const STATUS_META: Record<MaintenanceStatus, { label: string; color: string }> = {
  submitted:            { label: 'Submitted',            color: 'bg-[#1e1e10] text-[#c8b44a] border-[#2e2c14]' },
  reviewed:             { label: 'Reviewed',             color: 'bg-[#0e1e2e] text-[#7ab4e0] border-[#142030]' },
  contractor_contacted: { label: 'Contractor Contacted', color: 'bg-[#1a1028] text-[#a98ae0] border-[#241638]' },
  in_progress:          { label: 'In Progress',          color: 'bg-[#2d1e0e] text-[#d48f4a] border-[#3a2510]' },
  completed:            { label: 'Completed',            color: 'bg-[#0d2e1a] text-[#5bba7a] border-[#0f3a20]'  },
}

const URGENCY_COLORS: Record<Urgency, string> = {
  low:    'bg-[#1a1a1a] text-[#7a7468] border-[#2e3328]',
  medium: 'bg-[#2d1e0e] text-[#d48f4a] border-[#3a2510]',
  high:   'bg-[#2e1414] text-[#c45c5c] border-[#3e1c1c]',
}

const STATUSES: MaintenanceStatus[] = ['submitted', 'reviewed', 'contractor_contacted', 'in_progress', 'completed']

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

type EditState = {
  status: MaintenanceStatus
  contractor_name: string
  contractor_contact: string
  scheduled_date: string
  manager_notes: string
}

export default function MaintenancePage() {
  const [requests, setRequests]   = useState<MaintenanceRequest[]>([])
  const [loading, setLoading]     = useState(true)
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [edits, setEdits]         = useState<Record<string, EditState>>({})
  const [saving, setSaving]       = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'Emergency' | 'Routine'>('all')
  const [statusFilter, setStatusFilter]     = useState<MaintenanceStatus | 'all'>('all')

  useEffect(() => {
    fetch('/api/maintenance')
      .then(r => r.json())
      .then(d => setRequests(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [])

  function openRequest(req: MaintenanceRequest) {
    if (expanded === req.id) { setExpanded(null); return }
    setExpanded(req.id)
    if (!edits[req.id]) {
      setEdits(prev => ({
        ...prev,
        [req.id]: {
          status:             req.status,
          contractor_name:    req.contractor_name    || '',
          contractor_contact: req.contractor_contact || '',
          scheduled_date:     req.scheduled_date     || '',
          manager_notes:      req.manager_notes      || '',
        },
      }))
    }
  }

  async function saveEdit(id: string) {
    setSaving(id)
    const edit = edits[id]
    const res = await fetch(`/api/maintenance/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(edit),
    })
    if (res.ok) {
      const updated: MaintenanceRequest = await res.json()
      setRequests(prev => prev.map(r => r.id === id ? updated : r))
    }
    setSaving(null)
  }

  function setEdit(id: string, field: keyof EditState, value: string) {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  const displayed = requests
    .filter(r => categoryFilter === 'all' || r.ai_category === categoryFilter)
    .filter(r => statusFilter === 'all' || r.status === statusFilter)

  const openCount = requests.filter(r => r.status !== 'completed').length
  const emergencyCount = requests.filter(r => r.ai_category === 'Emergency' && r.status !== 'completed').length

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#5bba7a] status-pulse" />
            <span className="text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.28em' }}>MAINTENANCE TRACKER</span>
          </div>
          <h1 className="font-display text-4xl font-light text-[#eae6d6]">Maintenance</h1>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-xs text-[#9e9a8c]">{openCount} open</span>
            {emergencyCount > 0 && (
              <span className="text-xs text-[#c45c5c]">{emergencyCount} emergency</span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 items-end mt-1">
          <div className="flex gap-1">
            {(['all', 'Emergency', 'Routine'] as const).map(c => (
              <button key={c} onClick={() => setCategoryFilter(c)}
                className={`text-[10px] px-2.5 py-1.5 rounded-sm border transition-all ${
                  categoryFilter === c
                    ? c === 'Emergency' ? 'bg-[#2e1414]/60 text-[#c45c5c] border-[#3e1c1c]' : 'bg-[#d4b070]/10 text-[#d4b070] border-[#d4b070]/30'
                    : 'text-[#7a7468] border-[#222620] hover:text-[#9e9a8c]'
                }`}
                style={{ letterSpacing: '0.1em' }}
              >
                {c.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <button onClick={() => setStatusFilter('all')}
              className={`text-[10px] px-2.5 py-1 rounded-sm border transition-all ${statusFilter === 'all' ? 'bg-[#d4b070]/10 text-[#d4b070] border-[#d4b070]/30' : 'text-[#7a7468] border-[#222620] hover:text-[#9e9a8c]'}`}
              style={{ letterSpacing: '0.1em' }}
            >ALL</button>
            {STATUSES.filter(s => s !== 'completed').map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`text-[10px] px-2.5 py-1 rounded-sm border transition-all ${statusFilter === s ? `${STATUS_META[s].color}` : 'text-[#7a7468] border-[#222620] hover:text-[#9e9a8c]'}`}
                style={{ letterSpacing: '0.1em' }}
              >
                {STATUS_META[s].label.toUpperCase().slice(0, 6)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 size={18} className="animate-spin text-[#7a7468]" /></div>
      ) : displayed.length === 0 ? (
        <div className="bg-[#101210] border border-[#222620] rounded-sm py-16 text-center">
          <Wrench size={24} className="text-[#222620] mx-auto mb-3" />
          <p className="text-sm font-display italic text-[#9e9a8c]">No requests</p>
        </div>
      ) : (
        <div className="bg-[#101210] border border-[#222620] rounded-sm overflow-hidden">
          <div className="divide-y divide-[#222620]">
            {displayed.map(req => {
              const tenant = req.tenant as { full_name?: string; unit_number?: string } | undefined
              const building = req.building as { name?: string } | undefined
              const isOpen = expanded === req.id
              const edit = edits[req.id]
              const meta = STATUS_META[req.status]
              return (
                <div key={req.id}>
                  <button
                    onClick={() => openRequest(req)}
                    className="w-full flex items-start gap-4 px-5 py-4 hover:bg-[#161914] transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {req.ai_category === 'Emergency' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded border bg-[#2e1414] text-[#c45c5c] border-[#3e1c1c]" style={{ letterSpacing: '0.15em' }}>EMERGENCY</span>
                        )}
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${URGENCY_COLORS[req.urgency]}`} style={{ letterSpacing: '0.15em' }}>{req.urgency.toUpperCase()}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${meta.color}`} style={{ letterSpacing: '0.15em' }}>{meta.label.toUpperCase()}</span>
                      </div>
                      <div className="text-sm text-[#c8c4b4] truncate">{req.description}</div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#7a7468]">
                        {tenant?.full_name && <span>{tenant.full_name}</span>}
                        {tenant?.unit_number && <span>· Unit {tenant.unit_number}</span>}
                        {building?.name && <span>· {building.name}</span>}
                        {req.location_in_unit && <span>· {req.location_in_unit}</span>}
                        <span>· {timeAgo(req.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 mt-0.5">
                      {req.status === 'completed'
                        ? <CheckCircle2 size={14} className="text-[#5bba7a]" />
                        : isOpen ? <ChevronUp size={13} className="text-[#7a7468]" /> : <ChevronDown size={13} className="text-[#7a7468]" />
                      }
                    </div>
                  </button>

                  {isOpen && edit && (
                    <div className="bg-[#0e100d] border-t border-[#1a1e18] px-5 pb-5">
                      <div className="pt-4 space-y-4">
                        <div>
                          <p className="text-[9px] text-[#7a7468] mb-1.5" style={{ letterSpacing: '0.2em' }}>FULL DESCRIPTION</p>
                          <p className="text-sm text-[#c8c4b4] leading-relaxed">{req.description}</p>
                          {req.photo_url && (
                            <a href={req.photo_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={req.photo_url} alt="Photo" className="w-28 h-20 object-cover rounded-sm border border-[#222620] hover:border-[#d4b070]/30 transition-colors" />
                            </a>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] text-[#7a7468] mb-1.5" style={{ letterSpacing: '0.15em' }}>STATUS</label>
                            <select value={edit.status} onChange={e => setEdit(req.id, 'status', e.target.value as MaintenanceStatus)}
                              className="w-full bg-[#0b0c09] border border-[#222620] rounded-sm text-xs text-[#eae6d6] px-3 py-2 focus:outline-none focus:border-[#d4b070]/30 transition-all"
                            >
                              {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] text-[#7a7468] mb-1.5" style={{ letterSpacing: '0.15em' }}>SCHEDULED DATE</label>
                            <input type="date" value={edit.scheduled_date}
                              onChange={e => setEdit(req.id, 'scheduled_date', e.target.value)}
                              className="w-full bg-[#0b0c09] border border-[#222620] rounded-sm text-xs text-[#eae6d6] px-3 py-2 focus:outline-none focus:border-[#d4b070]/30 transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-[#7a7468] mb-1.5" style={{ letterSpacing: '0.15em' }}>CONTRACTOR NAME</label>
                            <input type="text" value={edit.contractor_name}
                              onChange={e => setEdit(req.id, 'contractor_name', e.target.value)}
                              placeholder="Contractor name…"
                              className="w-full bg-[#0b0c09] border border-[#222620] rounded-sm text-xs text-[#eae6d6] placeholder-[#7a7468] px-3 py-2 focus:outline-none focus:border-[#d4b070]/30 transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-[#7a7468] mb-1.5" style={{ letterSpacing: '0.15em' }}>CONTRACTOR CONTACT</label>
                            <input type="text" value={edit.contractor_contact}
                              onChange={e => setEdit(req.id, 'contractor_contact', e.target.value)}
                              placeholder="Phone or email…"
                              className="w-full bg-[#0b0c09] border border-[#222620] rounded-sm text-xs text-[#eae6d6] placeholder-[#7a7468] px-3 py-2 focus:outline-none focus:border-[#d4b070]/30 transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] text-[#7a7468] mb-1.5" style={{ letterSpacing: '0.15em' }}>MANAGER NOTES</label>
                          <textarea rows={2} value={edit.manager_notes}
                            onChange={e => setEdit(req.id, 'manager_notes', e.target.value)}
                            placeholder="Internal notes…"
                            className="w-full bg-[#0b0c09] border border-[#222620] rounded-sm text-xs text-[#eae6d6] placeholder-[#7a7468] px-3 py-2 focus:outline-none focus:border-[#d4b070]/30 resize-none transition-all"
                          />
                        </div>

                        <div className="flex justify-end">
                          <button onClick={() => saveEdit(req.id)} disabled={saving === req.id}
                            className="flex items-center gap-1.5 text-[11px] bg-[#d4b070]/10 hover:bg-[#d4b070]/18 disabled:opacity-40 text-[#d4b070] border border-[#d4b070]/30 hover:border-[#d4b070]/50 px-4 py-1.5 rounded-sm transition-all"
                            style={{ letterSpacing: '0.12em' }}
                          >
                            {saving === req.id ? <Loader2 size={10} className="animate-spin" /> : null}
                            {saving === req.id ? 'SAVING…' : 'SAVE CHANGES'}
                          </button>
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
