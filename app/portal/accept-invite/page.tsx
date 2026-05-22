'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export default function AcceptInvitePage() {
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'no_token'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/sign-in'); return }

    const token = localStorage.getItem('pending_invite')
    if (!token) {
      setStatus('no_token')
      setTimeout(() => router.push('/portal'), 2000)
      return
    }

    fetch('/api/tenants/link-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async r => {
        if (r.ok) {
          localStorage.removeItem('pending_invite')
          setStatus('success')
          setTimeout(() => router.push('/portal'), 1500)
        } else {
          const d = await r.json()
          setErrorMsg(d.error ?? 'Failed to link account')
          setStatus('error')
        }
      })
      .catch(() => { setErrorMsg('Network error'); setStatus('error') })
  }, [isLoaded, isSignedIn, router])

  return (
    <div className="min-h-screen bg-[#0b0c09] flex flex-col items-center justify-center gap-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-sm border border-[#d4b070]/30 bg-[#d4b070]/06 flex items-center justify-center">
          <span className="font-display text-2xl font-semibold text-[#d4b070] leading-none">D</span>
        </div>
        <span className="font-display text-xl font-light text-[#eae6d6]" style={{ letterSpacing: '0.22em' }}>DOMIS</span>
      </div>

      {(status === 'loading' || status === 'no_token') && (
        <>
          <Loader2 size={18} className="animate-spin text-[#7a7468]" />
          <p className="text-sm text-[#9e9a8c]">Linking your account…</p>
        </>
      )}
      {status === 'success' && (
        <>
          <CheckCircle2 size={24} className="text-[#5bba7a]" />
          <p className="text-sm text-[#9e9a8c]">Account linked! Redirecting to your portal…</p>
        </>
      )}
      {status === 'error' && (
        <div className="bg-[#101210] border border-[#222620] rounded-sm p-6 max-w-sm text-center">
          <AlertCircle size={20} className="text-[#c45c5c] mx-auto mb-3" />
          <p className="text-sm text-[#c45c5c] mb-2">{errorMsg}</p>
          <p className="text-xs text-[#7a7468] mb-4">Your invite link may have already been used or has expired.</p>
          <button onClick={() => router.push('/portal')}
            className="text-[11px] text-[#d4b070] border border-[#d4b070]/30 hover:border-[#d4b070]/50 px-4 py-2 rounded-sm transition-all"
            style={{ letterSpacing: '0.12em' }}
          >
            GO TO PORTAL
          </button>
        </div>
      )}
    </div>
  )
}
