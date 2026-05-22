'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, Send, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import type { CommunicationThread, CommunicationMessage, Urgency, ThreadStatus } from '@/types'

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

type ThreadWithMessages = CommunicationThread & { messages?: CommunicationMessage[] }

export default function CommunicationsPage() {
  const [threads, setThreads]     = useState<ThreadWithMessages[]>([])
  const [loading, setLoading]     = useState(true)
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [loadingMsgs, setLoadingMsgs] = useState<string | null>(null)
  const [replies, setReplies]     = useState<Record<string, string>>({})
  const [sending, setSending]     = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ThreadStatus | 'all'>('all')

  useEffect(() => {
    fetch('/api/communications')
      .then(r => r.json())
      .then(d => setThreads(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [])

  async function openThread(id: string) {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    const thread = threads.find(t => t.id === id)
    if (thread?.messages) return
    setLoadingMsgs(id)
    const data = await fetch(`/api/communications/${id}`).then(r => r.json())
    setThreads(prev => prev.map(t => t.id === id ? { ...t, messages: data.messages ?? [] } : t))
    setLoadingMsgs(null)
  }

  async function sendReply(threadId: string) {
    const body = replies[threadId]?.trim()
    if (!body) return
    setSending(threadId)
    const res = await fetch(`/api/communications/${threadId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, sender_role: 'manager', sender_name: 'Landlord' }),
    })
    if (res.ok) {
      const msg: CommunicationMessage = await res.json()
      setThreads(prev => prev.map(t =>
        t.id === threadId ? { ...t, messages: [...(t.messages ?? []), msg], updated_at: msg.created_at } : t
      ))
      setReplies(prev => ({ ...prev, [threadId]: '' }))
    }
    setSending(null)
  }

  async function resolveThread(threadId: string) {
    const res = await fetch(`/api/communications/${threadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' }),
    })
    if (res.ok) {
      setThreads(prev => prev.map(t => t.id === threadId ? { ...t, status: 'resolved' } : t))
    }
  }

  const displayed = threads.filter(t => statusFilter === 'all' || t.status === statusFilter)
    .sort((a, b) => {
      if (a.urgency === 'high' && b.urgency !== 'high') return -1
      if (a.urgency !== 'high' && b.urgency === 'high') return 1
      if (a.status === 'open' && b.status !== 'open') return -1
      if (a.status !== 'open' && b.status === 'open') return 1
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#5bba7a] status-pulse" />
            <span className="text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.28em' }}>COMMUNICATIONS</span>
          </div>
          <h1 className="font-display text-4xl font-light text-[#eae6d6]">Inbox</h1>
        </div>
        <div className="flex gap-1 mt-1">
          {(['all', 'open', 'resolved'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`text-[10px] px-3 py-1.5 rounded-sm border transition-all ${
                statusFilter === s
                  ? 'bg-[#d4b070]/10 text-[#d4b070] border-[#d4b070]/30'
                  : 'text-[#7a7468] border-[#222620] hover:border-[#2e3328] hover:text-[#9e9a8c]'
              }`}
              style={{ letterSpacing: '0.12em' }}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 size={18} className="animate-spin text-[#7a7468]" /></div>
      ) : displayed.length === 0 ? (
        <div className="bg-[#101210] border border-[#222620] rounded-sm py-16 text-center">
          <MessageSquare size={24} className="text-[#222620] mx-auto mb-3" />
          <p className="text-sm font-display italic text-[#9e9a8c]">No threads</p>
        </div>
      ) : (
        <div className="bg-[#101210] border border-[#222620] rounded-sm overflow-hidden">
          <div className="divide-y divide-[#222620]">
            {displayed.map(thread => {
              const tenant = thread.tenant as { full_name?: string; unit_number?: string } | undefined
              const building = thread.building as { name?: string } | undefined
              const isOpen = expanded === thread.id
              return (
                <div key={thread.id}>
                  <button
                    onClick={() => openThread(thread.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[#161914] transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${URGENCY_COLORS[thread.urgency]}`} style={{ letterSpacing: '0.15em' }}>
                          {thread.urgency.toUpperCase()}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${thread.status === 'open' ? 'bg-[#0d2e1a] text-[#5bba7a] border-[#0f3a20]' : 'bg-[#1a1a1a] text-[#7a7468] border-[#2e3328]'}`} style={{ letterSpacing: '0.15em' }}>
                          {thread.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-[#c8c4b4] truncate">{thread.subject}</div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#7a7468]">
                        {tenant?.full_name && <span>{tenant.full_name}</span>}
                        {tenant?.unit_number && <span>· Unit {tenant.unit_number}</span>}
                        {building?.name && <span>· {building.name}</span>}
                        <span>· {timeAgo(thread.updated_at)}</span>
                      </div>
                    </div>
                    {isOpen ? <ChevronUp size={13} className="text-[#7a7468] flex-shrink-0" /> : <ChevronDown size={13} className="text-[#7a7468] flex-shrink-0" />}
                  </button>

                  {isOpen && (
                    <div className="bg-[#0e100d] border-t border-[#1a1e18] px-5 pb-5">
                      {loadingMsgs === thread.id ? (
                        <div className="pt-4 flex justify-center"><Loader2 size={14} className="animate-spin text-[#7a7468]" /></div>
                      ) : (
                        <div className="pt-4 space-y-3">
                          {(thread.messages ?? []).map(msg => {
                            const isTenant = msg.sender_role === 'tenant'
                            return (
                              <div key={msg.id} className={`flex ${isTenant ? 'justify-start' : 'justify-end'}`}>
                                <div className={`max-w-[80%] border rounded-sm px-4 py-3 ${isTenant ? 'bg-[#101210] border-[#222620]' : 'bg-[#7ab4e0]/08 border-[#7ab4e0]/20'}`}>
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span className={`text-[9px] font-medium ${isTenant ? 'text-[#d4b070]' : 'text-[#7ab4e0]'}`} style={{ letterSpacing: '0.2em' }}>
                                      {isTenant ? (msg.sender_name || 'TENANT') : 'YOU'}
                                    </span>
                                    <span className="text-[9px] text-[#7a7468]">
                                      {new Date(msg.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="text-sm text-[#c8c4b4] leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                                </div>
                              </div>
                            )
                          })}

                          {thread.status === 'open' && (
                            <div className="pt-2 space-y-2">
                              <textarea
                                rows={2}
                                value={replies[thread.id] ?? ''}
                                onChange={e => setReplies(prev => ({ ...prev, [thread.id]: e.target.value }))}
                                placeholder="Write a reply…"
                                className="w-full bg-[#0b0c09] border border-[#222620] rounded-sm text-xs text-[#eae6d6] placeholder-[#7a7468] px-3 py-2.5 focus:outline-none focus:border-[#d4b070]/30 resize-none transition-all"
                              />
                              <div className="flex items-center gap-2 justify-between">
                                <button
                                  onClick={() => resolveThread(thread.id)}
                                  className="text-[10px] text-[#7a7468] border border-[#222620] hover:border-[#2e3328] hover:text-[#9e9a8c] px-3 py-1.5 rounded-sm transition-all"
                                  style={{ letterSpacing: '0.12em' }}
                                >
                                  MARK RESOLVED
                                </button>
                                <button
                                  onClick={() => sendReply(thread.id)}
                                  disabled={sending === thread.id || !replies[thread.id]?.trim()}
                                  className="flex items-center gap-1.5 text-[11px] bg-[#7ab4e0]/10 hover:bg-[#7ab4e0]/18 disabled:opacity-40 text-[#7ab4e0] border border-[#7ab4e0]/30 hover:border-[#7ab4e0]/50 px-4 py-1.5 rounded-sm transition-all"
                                  style={{ letterSpacing: '0.12em' }}
                                >
                                  {sending === thread.id ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                                  {sending === thread.id ? 'SENDING…' : 'REPLY'}
                                </button>
                              </div>
                            </div>
                          )}
                          {thread.status === 'resolved' && (
                            <p className="text-center text-[10px] text-[#7a7468] pt-2" style={{ letterSpacing: '0.15em' }}>RESOLVED</p>
                          )}
                        </div>
                      )}
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
