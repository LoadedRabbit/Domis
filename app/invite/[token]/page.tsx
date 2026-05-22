'use client'

import { useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()

  useEffect(() => {
    if (!token) return
    localStorage.setItem('pending_invite', token)
    router.push('/sign-up?redirect_url=/portal/accept-invite')
  }, [token, router])

  return (
    <div className="min-h-screen bg-[#0b0c09] flex flex-col items-center justify-center gap-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-sm border border-[#d4b070]/30 bg-[#d4b070]/06 flex items-center justify-center">
          <span className="font-display text-2xl font-semibold text-[#d4b070] leading-none">D</span>
        </div>
        <span className="font-display text-xl font-light text-[#eae6d6]" style={{ letterSpacing: '0.22em' }}>DOMIS</span>
      </div>
      <Loader2 size={18} className="animate-spin text-[#7a7468]" />
      <p className="text-sm text-[#9e9a8c]">Setting up your portal…</p>
    </div>
  )
}
