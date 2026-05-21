'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { MessageSquare, Plus, ChevronRight, Loader2, AlertCircle, Send, X } from 'lucide-react'
import type { CommunicationThread, Tenant, Urgency } from '@/types'

const URGENCY_LABELS: Record<Urgency, string> = { low: 'Low', medium: 'Medium', high: 'High' }
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

export default function PortalCommunicationsPage() {
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()
  const [tenant, setTenant]     = useState<Tenant | null>(null)
  const [threads, setThreads]   = useState<CommunicationThread[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ subject: '', urgency: 'medium' as Urgency, body: '' })

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
          return fetch(`/api/communications?tenant_id=${data.tenant.id}`).then(r => r.json()).then(setThreads)
        }
      })
      .finally(() => setLoading(false))
  }, [isLoaded, isSignedIn])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.subject || !form.body) return
    setSubmitting(true)
    const res = await fetch('/api/communications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (res.ok) {
      setThreads(prev => [data, ...prev])
      setForm({ subject: '', urgency: 'medium', body: '' })
      setShowForm(false)
    }
    setSubmitting(false)
  }

  if (!isLoaded || loading) {
    return <div className="p-8 flex items-center justify-center h-64"><Loader2 size={18} className="animate-spin text-[#7a7468]" /></div>
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
            <span className="text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.28em' }}>MESSAGES</span>
          </div>
          <h1 className="font-display text-4xl font-light text-[#eae6d6]">Communications</h1>
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
              <label className="block text-[10px] text-[#7a7468] mb-1.5" style={{ letterSpacing: '0.15em' }}>SUBJECT</label>
              <input
                type="text" required
                value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                placeholder="e.g. Noise complaint, Package delivery question…"
                className="w-full bg-[#0e100d] border border-[#222620] rounded-sm text-xs text-[#eae6d6] placeholder-[#7a7468] px-3 py-2.5 focus:outline-none focus:border-[#d4b070]/30 focus:ring-1 focus:ring-[#d4b070]/10 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#7a7468] mb-1.5" style={{ letterSpacing: '0.15em' }}>URGENCY</label>
              <select
                value={form.urgency} onChange={e => setForm(p => ({ ...p, urgency: e.target.value as Urgency }))}
                className="w-full bg-[#0e100d] border border-[#222620] rounded-sm text-xs text-[#eae6d6] px-3 py-2.5 focus:outline-none focus:border-[#d4b070]/30 transition-all"
              >
                <option value="low">Low — General inquiry</option>
                <option value="medium">Medium — Needs attention soon</option>
                <option value="high">High — Urgent issue</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-[#7a7468] mb-1.5" style={{ letterSpacing: '0.15em' }}>MESSAGE</label>
              <textarea
                required rows={4}
                value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                placeholder="Describe your request or concern…"
                className="w-full bg-[#0e100d] border border-[#222620] rounded-sm text-xs text-[#eae6d6] placeholder-[#7a7468] px-3 py-2.5 focus:outline-none focus:border-[#d4b070]/30 focus:ring-1 focus:ring-[#d4b070]/10 transition-all resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              type="submit" disabled={submitting}
              className="flex items-center gap-1.5 text-[11px] bg-[#d4b070]/10 hover:bg-[#d4b070]/18 disabled:opacity-40 text-[#d4b070] border border-[#d4b070]/30 hover:border-[#d4b070]/50 px-4 py-2 rounded-sm transition-all"
              style={{ letterSpacing: '0.12em' }}
            >
              {submitting ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
              {submitting ? 'SENDING…' : 'SEND REQUEST'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-[#101210] border border-[#222620] rounded-sm overflow-hidden animate-in" style={{ animationDelay: '80ms' }}>
        {threads.length === 0 ? (
          <div className="py-16 text-center">
            <MessageSquare size={24} className="text-[#222620] mx-auto mb-3" />
            <p className="text-sm font-display italic text-[#9e9a8c]">No messages yet</p>
            <p className="text-xs text-[#7a7468] mt-1">Submit your first request above.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#222620]">
            {threads.map(thread => (
              <Link
                key={thread.id}
                href={`/portal/communications/${thread.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-[#161914] transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${URGENCY_COLORS[thread.urgency]}`} style={{ letterSpacing: '0.15em' }}>
                      {URGENCY_LABELS[thread.urgency].toUpperCase()}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${thread.status === 'open' ? 'bg-[#0d2e1a] text-[#5bba7a] border-[#0f3a20]' : 'bg-[#1a1a1a] text-[#7a7468] border-[#2e3328]'}`} style={{ letterSpacing: '0.15em' }}>
                      {thread.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm text-[#c8c4b4] group-hover:text-[#eae6d6] transition-colors truncate">{thread.subject}</div>
                  <div className="text-[10px] text-[#7a7468] mt-0.5">{timeAgo(thread.updated_at)}</div>
                </div>
                <ChevronRight size={13} className="text-[#222620] group-hover:text-[#d4b070] transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
