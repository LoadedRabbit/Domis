'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { ArrowLeft, Send, Loader2 } from 'lucide-react'
import type { CommunicationThread, CommunicationMessage, Urgency } from '@/types'

const URGENCY_COLORS: Record<Urgency, string> = {
  low:    'bg-[#1a1a1a] text-[#7a7468] border-[#2e3328]',
  medium: 'bg-[#2d1e0e] text-[#d48f4a] border-[#3a2510]',
  high:   'bg-[#2e1414] text-[#c45c5c] border-[#3e1c1c]',
}

export default function PortalThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { isSignedIn, isLoaded, user } = useUser()
  const router = useRouter()
  const [thread, setThread]     = useState<(CommunicationThread & { messages: CommunicationMessage[] }) | null>(null)
  const [loading, setLoading]   = useState(true)
  const [reply, setReply]       = useState('')
  const [sending, setSending]   = useState(false)

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push('/sign-in')
  }, [isLoaded, isSignedIn, router])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    fetch(`/api/communications/${id}`)
      .then(r => r.json())
      .then(setThread)
      .finally(() => setLoading(false))
  }, [id, isLoaded, isSignedIn])

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!reply.trim()) return
    setSending(true)
    const res = await fetch(`/api/communications/${id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        body:        reply,
        sender_role: 'tenant',
        sender_name: user?.fullName ?? user?.firstName ?? 'Tenant',
      }),
    })
    const msg = await res.json()
    if (res.ok) {
      setThread(prev => prev ? { ...prev, messages: [...prev.messages, msg] } : prev)
      setReply('')
    }
    setSending(false)
  }

  if (!isLoaded || loading) {
    return <div className="p-8 flex items-center justify-center h-64"><Loader2 size={18} className="animate-spin text-[#7a7468]" /></div>
  }

  if (!thread) return <div className="p-8 text-sm text-[#7a7468]">Thread not found.</div>

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 text-[10px] text-[#7a7468] mb-6 animate-in" style={{ letterSpacing: '0.1em', animationDelay: '0ms' }}>
        <Link href="/portal/communications" className="hover:text-[#eae6d6] transition-colors flex items-center gap-1">
          <ArrowLeft size={10} /> MESSAGES
        </Link>
        <span>›</span>
        <span className="text-[#9e9a8c]">{thread.subject}</span>
      </div>

      <div className="bg-[#101210] border border-[#222620] rounded-sm p-5 mb-4 animate-in" style={{ animationDelay: '40ms' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-light text-[#eae6d6] mb-2">{thread.subject}</h1>
            <div className="flex items-center gap-2">
              <span className={`text-[9px] px-1.5 py-0.5 rounded border ${URGENCY_COLORS[thread.urgency]}`} style={{ letterSpacing: '0.15em' }}>
                {thread.urgency.toUpperCase()}
              </span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded border ${thread.status === 'open' ? 'bg-[#0d2e1a] text-[#5bba7a] border-[#0f3a20]' : 'bg-[#1a1a1a] text-[#7a7468] border-[#2e3328]'}`} style={{ letterSpacing: '0.15em' }}>
                {thread.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-4 animate-in" style={{ animationDelay: '80ms' }}>
        {thread.messages.map(msg => {
          const isTenant = msg.sender_role === 'tenant'
          return (
            <div key={msg.id} className={`flex ${isTenant ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${isTenant ? 'bg-[#d4b070]/08 border-[#d4b070]/20' : 'bg-[#101210] border-[#222620]'} border rounded-sm px-4 py-3`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[9px] font-medium ${isTenant ? 'text-[#d4b070]' : 'text-[#7ab4e0]'}`} style={{ letterSpacing: '0.2em' }}>
                    {isTenant ? 'YOU' : 'LANDLORD'}
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
      </div>

      {thread.status === 'open' && (
        <form onSubmit={handleReply} className="bg-[#101210] border border-[#222620] rounded-sm p-4 animate-in" style={{ animationDelay: '120ms' }}>
          <label className="block text-[10px] text-[#7a7468] mb-2" style={{ letterSpacing: '0.15em' }}>REPLY</label>
          <textarea
            rows={3} required
            value={reply} onChange={e => setReply(e.target.value)}
            placeholder="Write your reply…"
            className="w-full bg-[#0e100d] border border-[#222620] rounded-sm text-xs text-[#eae6d6] placeholder-[#7a7468] px-3 py-2.5 focus:outline-none focus:border-[#d4b070]/30 focus:ring-1 focus:ring-[#d4b070]/10 transition-all resize-none mb-3"
          />
          <div className="flex justify-end">
            <button
              type="submit" disabled={sending}
              className="flex items-center gap-1.5 text-[11px] bg-[#d4b070]/10 hover:bg-[#d4b070]/18 disabled:opacity-40 text-[#d4b070] border border-[#d4b070]/30 hover:border-[#d4b070]/50 px-4 py-2 rounded-sm transition-all"
              style={{ letterSpacing: '0.12em' }}
            >
              {sending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
              {sending ? 'SENDING…' : 'SEND'}
            </button>
          </div>
        </form>
      )}

      {thread.status === 'resolved' && (
        <div className="text-center py-4 text-[11px] text-[#7a7468]" style={{ letterSpacing: '0.15em' }}>
          THIS REQUEST HAS BEEN RESOLVED
        </div>
      )}
    </div>
  )
}
