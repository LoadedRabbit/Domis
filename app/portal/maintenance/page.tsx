'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Wrench, Plus, Loader2, AlertCircle, X, Upload, ImageIcon, CheckCircle2 } from 'lucide-react'
import type { MaintenanceRequest, MaintenanceStatus, Urgency, Tenant } from '@/types'

const STATUS_META: Record<MaintenanceStatus, { label: string; color: string }> = {
  submitted:            { label: 'Submitted',           color: 'bg-[#1e1e10] text-[#c8b44a] border-[#2e2c14]' },
  reviewed:             { label: 'Reviewed',            color: 'bg-[#0e1e2e] text-[#7ab4e0] border-[#142030]' },
  contractor_contacted: { label: 'Contractor Contacted', color: 'bg-[#1a1028] text-[#a98ae0] border-[#241638]' },
  in_progress:          { label: 'In Progress',         color: 'bg-[#2d1e0e] text-[#d48f4a] border-[#3a2510]' },
  completed:            { label: 'Completed',           color: 'bg-[#0d2e1a] text-[#5bba7a] border-[#0f3a20]' },
}

const URGENCY_COLORS: Record<Urgency, string> = {
  low:    'bg-[#1a1a1a] text-[#7a7468] border-[#2e3328]',
  medium: 'bg-[#2d1e0e] text-[#d48f4a] border-[#3a2510]',
  high:   'bg-[#2e1414] text-[#c45c5c] border-[#3e1c1c]',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function PortalMaintenancePage() {
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tenant, setTenant]       = useState<Tenant | null>(null)
  const [requests, setRequests]   = useState<MaintenanceRequest[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    description:      '',
    location_in_unit: '',
    urgency:          'medium' as Urgency,
  })
  const [photoFile, setPhotoFile]   = useState<File | null>(null)
  const [uploading, setUploading]   = useState(false)
  const [expanded, setExpanded]     = useState<string | null>(null)

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push('/sign-in')
  }, [isLoaded, isSignedIn, router])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    fetch('/api/tenants/me')
      .then(r => r.json())
      .then(data => {
        setTenant(data.tenant ?? null)
        if (data.tenant) {
          return fetch(`/api/maintenance?tenant_id=${data.tenant.id}`)
            .then(r => r.json())
            .then(d => setRequests(Array.isArray(d) ? d : []))
        }
      })
      .finally(() => setLoading(false))
  }, [isLoaded, isSignedIn])

  async function uploadPhoto(file: File): Promise<string> {
    setUploading(true)
    const res = await fetch('/api/maintenance/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    })
    const { signedUrl, publicUrl } = await res.json()
    await fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
    setUploading(false)
    return publicUrl
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description) return
    setSubmitting(true)

    let photo_url = ''
    if (photoFile) {
      try { photo_url = await uploadPhoto(photoFile) } catch { /* proceed without photo */ }
    }

    const res = await fetch('/api/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, photo_url }),
    })
    const data = await res.json()
    if (res.ok) {
      setRequests(prev => [data, ...prev])
      setForm({ description: '', location_in_unit: '', urgency: 'medium' })
      setPhotoFile(null)
      setShowForm(false)
    }
    setSubmitting(false)
  }

  if (!isLoaded || loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <Loader2 size={18} className="animate-spin text-[#7a7468]" />
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <div className="bg-[#101210] border border-[#222620] rounded-sm p-8 text-center">
          <AlertCircle size={24} className="text-[#7a7468] mx-auto mb-4" />
          <p className="text-sm text-[#9e9a8c]">Your account is not linked to a unit.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-start justify-between mb-8 animate-in" style={{ animationDelay: '0ms' }}>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#5bba7a] status-pulse" />
            <span className="text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.28em' }}>MAINTENANCE</span>
          </div>
          <h1 className="font-display text-4xl font-light text-[#eae6d6]">Maintenance</h1>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 text-[11px] text-[#d4b070] border border-[#d4b070]/30 hover:border-[#d4b070]/50 hover:bg-[#d4b070]/06 rounded-sm px-3 py-2 transition-all mt-1"
          style={{ letterSpacing: '0.12em' }}
        >
          {showForm ? <X size={10} /> : <Plus size={10} />}
          {showForm ? 'CANCEL' : 'NEW REQUEST'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[#101210] border border-[#222620] rounded-sm p-5 mb-4 animate-in" style={{ animationDelay: '0ms' }}>
          <p className="text-[10px] text-[#7a7468] mb-4" style={{ letterSpacing: '0.2em' }}>NEW REQUEST</p>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-[#7a7468] mb-1.5" style={{ letterSpacing: '0.15em' }}>DESCRIPTION *</label>
              <textarea
                required rows={3}
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe the issue in detail…"
                className="w-full bg-[#0e100d] border border-[#222620] rounded-sm text-xs text-[#eae6d6] placeholder-[#7a7468] px-3 py-2.5 focus:outline-none focus:border-[#d4b070]/30 focus:ring-1 focus:ring-[#d4b070]/10 transition-all resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-[#7a7468] mb-1.5" style={{ letterSpacing: '0.15em' }}>LOCATION IN UNIT</label>
                <input
                  type="text"
                  value={form.location_in_unit}
                  onChange={e => setForm(p => ({ ...p, location_in_unit: e.target.value }))}
                  placeholder="e.g. Kitchen, Bathroom…"
                  className="w-full bg-[#0e100d] border border-[#222620] rounded-sm text-xs text-[#eae6d6] placeholder-[#7a7468] px-3 py-2.5 focus:outline-none focus:border-[#d4b070]/30 focus:ring-1 focus:ring-[#d4b070]/10 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#7a7468] mb-1.5" style={{ letterSpacing: '0.15em' }}>URGENCY</label>
                <select
                  value={form.urgency}
                  onChange={e => setForm(p => ({ ...p, urgency: e.target.value as Urgency }))}
                  className="w-full bg-[#0e100d] border border-[#222620] rounded-sm text-xs text-[#eae6d6] px-3 py-2.5 focus:outline-none focus:border-[#d4b070]/30 transition-all"
                >
                  <option value="low">Low — Minor issue</option>
                  <option value="medium">Medium — Needs attention</option>
                  <option value="high">High — Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-[#7a7468] mb-1.5" style={{ letterSpacing: '0.15em' }}>PHOTO (OPTIONAL)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => setPhotoFile(e.target.files?.[0] ?? null)}
              />
              {photoFile ? (
                <div className="flex items-center gap-2 bg-[#0e100d] border border-[#d4b070]/20 rounded-sm px-3 py-2.5">
                  <ImageIcon size={11} className="text-[#d4b070] flex-shrink-0" />
                  <span className="text-xs text-[#c8c4b4] truncate flex-1">{photoFile.name}</span>
                  <button type="button" onClick={() => setPhotoFile(null)} className="text-[#7a7468] hover:text-[#c45c5c] transition-colors">
                    <X size={11} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 bg-[#0e100d] border border-dashed border-[#2e3328] hover:border-[#d4b070]/30 rounded-sm py-4 text-xs text-[#7a7468] hover:text-[#9e9a8c] transition-all"
                >
                  <Upload size={12} />
                  Click to attach a photo
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              type="submit"
              disabled={submitting || uploading}
              className="flex items-center gap-1.5 text-[11px] bg-[#d4b070]/10 hover:bg-[#d4b070]/18 disabled:opacity-40 text-[#d4b070] border border-[#d4b070]/30 hover:border-[#d4b070]/50 px-4 py-2 rounded-sm transition-all"
              style={{ letterSpacing: '0.12em' }}
            >
              {submitting || uploading ? <Loader2 size={11} className="animate-spin" /> : <Wrench size={11} />}
              {uploading ? 'UPLOADING…' : submitting ? 'SUBMITTING…' : 'SUBMIT REQUEST'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-[#101210] border border-[#222620] rounded-sm overflow-hidden animate-in" style={{ animationDelay: '80ms' }}>
        {requests.length === 0 ? (
          <div className="py-16 text-center">
            <Wrench size={24} className="text-[#222620] mx-auto mb-3" />
            <p className="text-sm font-display italic text-[#9e9a8c]">No maintenance requests</p>
            <p className="text-xs text-[#7a7468] mt-1">Submit your first request above.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#222620]">
            {requests.map(req => {
              const meta = STATUS_META[req.status]
              const isOpen = expanded === req.id
              return (
                <div key={req.id}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : req.id)}
                    className="w-full flex items-start gap-4 px-5 py-4 hover:bg-[#161914] transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {req.ai_category === 'Emergency' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded border bg-[#2e1414] text-[#c45c5c] border-[#3e1c1c]" style={{ letterSpacing: '0.15em' }}>
                            EMERGENCY
                          </span>
                        )}
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${URGENCY_COLORS[req.urgency]}`} style={{ letterSpacing: '0.15em' }}>
                          {req.urgency.toUpperCase()}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${meta.color}`} style={{ letterSpacing: '0.15em' }}>
                          {meta.label.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-[#c8c4b4] truncate">{req.description}</div>
                      <div className="flex items-center gap-3 mt-1">
                        {req.location_in_unit && (
                          <span className="text-[10px] text-[#7a7468]">{req.location_in_unit}</span>
                        )}
                        <span className="text-[10px] text-[#7a7468]">{timeAgo(req.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 mt-0.5">
                      {req.status === 'completed'
                        ? <CheckCircle2 size={14} className="text-[#5bba7a]" />
                        : <div className={`w-1.5 h-1.5 rounded-full mt-1 ${req.ai_category === 'Emergency' ? 'bg-[#c45c5c]' : 'bg-[#d48f4a]'}`} />
                      }
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 bg-[#0e100d] border-t border-[#1a1e18]">
                      <div className="pt-4 space-y-3">
                        <div>
                          <p className="text-[9px] text-[#7a7468] mb-1" style={{ letterSpacing: '0.2em' }}>FULL DESCRIPTION</p>
                          <p className="text-sm text-[#c8c4b4] leading-relaxed whitespace-pre-wrap">{req.description}</p>
                        </div>

                        {req.manager_notes && (
                          <div>
                            <p className="text-[9px] text-[#7ab4e0] mb-1" style={{ letterSpacing: '0.2em' }}>MANAGER NOTES</p>
                            <p className="text-sm text-[#c8c4b4] leading-relaxed">{req.manager_notes}</p>
                          </div>
                        )}

                        {req.contractor_name && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[9px] text-[#7a7468] mb-1" style={{ letterSpacing: '0.2em' }}>CONTRACTOR</p>
                              <p className="text-xs text-[#c8c4b4]">{req.contractor_name}</p>
                            </div>
                            {req.contractor_contact && (
                              <div>
                                <p className="text-[9px] text-[#7a7468] mb-1" style={{ letterSpacing: '0.2em' }}>CONTACT</p>
                                <p className="text-xs text-[#c8c4b4]">{req.contractor_contact}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {req.scheduled_date && (
                          <div>
                            <p className="text-[9px] text-[#7a7468] mb-1" style={{ letterSpacing: '0.2em' }}>SCHEDULED DATE</p>
                            <p className="text-xs text-[#c8c4b4]">
                              {new Date(req.scheduled_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        )}

                        {req.photo_url && (
                          <div>
                            <p className="text-[9px] text-[#7a7468] mb-2" style={{ letterSpacing: '0.2em' }}>PHOTO</p>
                            <a href={req.photo_url} target="_blank" rel="noopener noreferrer" className="block w-32">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={req.photo_url}
                                alt="Maintenance photo"
                                className="w-32 h-24 object-cover rounded-sm border border-[#222620] hover:border-[#d4b070]/30 transition-colors"
                              />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
