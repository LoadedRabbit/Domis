'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { Building2, Home, Calendar, DollarSign, MessageSquare, Wrench, Loader2, AlertCircle, ChevronRight } from 'lucide-react'
import type { Tenant } from '@/types'
import { formatCurrency } from '@/lib/utils'

export default function PortalPage() {
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()
  const [tenant, setTenant]   = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push('/sign-in')
  }, [isLoaded, isSignedIn, router])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    fetch('/api/tenants/me')
      .then(r => r.json())
      .then(data => setTenant(data.tenant ?? null))
      .catch(() => setTenant(null))
      .finally(() => setLoading(false))
  }, [isLoaded, isSignedIn])

  if (!isLoaded || loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <Loader2 size={18} className="animate-spin text-[#7a7468]" />
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="p-8 max-w-lg mx-auto animate-in" style={{ animationDelay: '0ms' }}>
        <div className="bg-[#101210] border border-[#222620] rounded-sm p-8 text-center">
          <AlertCircle size={24} className="text-[#7a7468] mx-auto mb-4" />
          <h2 className="font-display text-xl font-light text-[#eae6d6] mb-2">Account Not Linked</h2>
          <p className="text-sm text-[#9e9a8c] leading-relaxed">
            Your account is not linked to a unit. Please contact your property manager to get set up.
          </p>
        </div>
      </div>
    )
  }

  const building = tenant.building as { name?: string; address?: string } | undefined

  const leaseEnd = tenant.lease_end
    ? new Date(tenant.lease_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="animate-in mb-8" style={{ animationDelay: '0ms' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#5bba7a] status-pulse" />
          <span className="text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.28em' }}>TENANT PORTAL</span>
        </div>
        <h1 className="font-display text-4xl font-light text-[#eae6d6] leading-tight">
          Welcome, <span className="italic text-[#d4b070]">{tenant.full_name.split(' ')[0]}</span>
        </h1>
      </div>

      <div className="bg-[#101210] border border-[#222620] rounded-sm p-6 mb-4 animate-in" style={{ animationDelay: '60ms' }}>
        <div className="flex items-start gap-4 mb-5">
          <div className="w-10 h-10 rounded-sm bg-[#d4b070]/08 border border-[#d4b070]/20 flex items-center justify-center flex-shrink-0">
            <Home size={16} className="text-[#d4b070]" />
          </div>
          <div>
            <div className="font-display text-lg italic text-[#d4b070] leading-tight">Unit {tenant.unit_number}</div>
            {building?.name && (
              <div className="flex items-center gap-1.5 mt-1">
                <Building2 size={11} className="text-[#7a7468]" />
                <span className="text-xs text-[#9e9a8c]">{building.name}</span>
              </div>
            )}
            {building?.address && (
              <div className="text-[11px] text-[#7a7468] mt-0.5">{building.address}</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#0e100d] border border-[#222620] rounded-sm p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.18em' }}>MONTHLY RENT</span>
              <DollarSign size={10} className="text-[#d4b070] opacity-60" />
            </div>
            <div className="font-display text-xl font-light text-[#d4b070]">{formatCurrency(Number(tenant.monthly_rent))}</div>
          </div>
          <div className="bg-[#0e100d] border border-[#222620] rounded-sm p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.18em' }}>LEASE ENDS</span>
              <Calendar size={10} className="text-[#9e9a8c] opacity-60" />
            </div>
            <div className="font-display text-xl font-light text-[#9e9a8c]">{leaseEnd ?? '—'}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 animate-in" style={{ animationDelay: '120ms' }}>
        {[
          { href: '/portal/communications', icon: MessageSquare, label: 'Messages', desc: 'Submit requests and view responses', color: '#7ab4e0' },
          { href: '/portal/maintenance',    icon: Wrench,        label: 'Maintenance', desc: 'Report and track maintenance issues', color: '#d48f4a' },
        ].map(({ href, icon: Icon, label, desc, color }) => (
          <Link
            key={href}
            href={href}
            className="bg-[#101210] border border-[#222620] rounded-sm p-5 hover:bg-[#161914] hover:border-[#2e3328] transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-sm flex items-center justify-center" style={{ background: `${color}12` }}>
                <Icon size={15} style={{ color }} />
              </div>
              <ChevronRight size={13} className="text-[#222620] group-hover:text-[#d4b070] transition-colors" />
            </div>
            <div className="font-display text-base font-medium text-[#c8c4b4] group-hover:text-[#eae6d6] transition-colors mb-1">{label}</div>
            <p className="text-[11px] text-[#7a7468] leading-relaxed">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
