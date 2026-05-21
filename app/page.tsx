import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Home } from 'lucide-react'
import { createServerClient } from '@/lib/supabase-server'

export default async function Root() {
  const { userId } = await auth()

  if (userId) {
    // Determine destination before calling redirect() — redirect() throws
    // internally and must never be inside a try/catch or the catch swallows it.
    let destination = '/dashboard'
    try {
      const supabase = createServerClient()
      const { data } = await supabase
        .from('tenants')
        .select('id')
        .eq('clerk_user_id', userId)
        .maybeSingle()
      if (data) destination = '/portal'
    } catch {
      // supabase error — default to /dashboard
    }
    redirect(destination)
  }

  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center p-6">
      {/* Branding */}
      <div className="mb-16 text-center">
        <div className="inline-flex items-center gap-2 mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00d4aa] status-pulse" />
          <span className="text-[10px] font-mono tracking-[0.28em] text-[#00d4aa] uppercase">System Online</span>
        </div>

        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-sm border border-[#d4b070]/30 bg-[#d4b070]/06 flex items-center justify-center">
            <span className="font-display text-3xl font-semibold text-[#d4b070] leading-none">K</span>
          </div>
          <div className="text-left">
            <div
              className="font-display text-3xl font-light text-[#eae6d6] leading-none"
              style={{ letterSpacing: '0.22em' }}
            >
              KINYU
            </div>
            <div
              className="text-[10px] text-[#7a7468] mt-1.5 leading-none"
              style={{ letterSpacing: '0.32em' }}
            >
              REALTY AND MANAGEMENT
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 mt-5">
          <div className="h-px w-20 bg-gradient-to-r from-transparent to-[#d4b070]/30" />
          <span className="text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.2em' }}>
            PROPERTY MANAGEMENT SYSTEM
          </span>
          <div className="h-px w-20 bg-gradient-to-l from-transparent to-[#d4b070]/30" />
        </div>
      </div>

      {/* Role selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
        {/* Manager */}
        <Link
          href="/sign-in"
          className="group bg-[#0e100d] border border-[#222620] hover:border-[#d4b070]/50 rounded-sm p-8 flex flex-col items-start gap-5 transition-all duration-200 hover:bg-[#121510]"
        >
          <div className="w-10 h-10 rounded-sm border border-[#d4b070]/20 bg-[#d4b070]/04 flex items-center justify-center group-hover:border-[#d4b070]/50 group-hover:bg-[#d4b070]/10 transition-all">
            <LayoutDashboard size={15} className="text-[#d4b070]" />
          </div>

          <div>
            <div className="font-display text-base font-medium text-[#eae6d6] leading-tight mb-2">
              Manager Access
            </div>
            <div className="text-xs text-[#7a7468] leading-relaxed">
              Dashboard, owner reports, tenant registry, rent tracking
            </div>
          </div>

          <div
            className="flex items-center gap-2 text-[10px] text-[#d4b070] mt-auto group-hover:gap-3 transition-all"
            style={{ letterSpacing: '0.2em' }}
          >
            SIGN IN
            <span className="text-base leading-none opacity-70">→</span>
          </div>
        </Link>

        {/* Tenant */}
        <Link
          href="/sign-in"
          className="group bg-[#0e100d] border border-[#222620] hover:border-[#00d4aa]/50 rounded-sm p-8 flex flex-col items-start gap-5 transition-all duration-200 hover:bg-[#0d1010]"
        >
          <div className="w-10 h-10 rounded-sm border border-[#00d4aa]/20 bg-[#00d4aa]/04 flex items-center justify-center group-hover:border-[#00d4aa]/50 group-hover:bg-[#00d4aa]/10 transition-all">
            <Home size={15} className="text-[#00d4aa]" />
          </div>

          <div>
            <div className="font-display text-base font-medium text-[#eae6d6] leading-tight mb-2">
              Tenant Portal
            </div>
            <div className="text-xs text-[#7a7468] leading-relaxed">
              Your unit, maintenance requests, messages with management
            </div>
          </div>

          <div
            className="flex items-center gap-2 text-[10px] text-[#00d4aa] mt-auto group-hover:gap-3 transition-all"
            style={{ letterSpacing: '0.2em' }}
          >
            SIGN IN
            <span className="text-base leading-none opacity-70">→</span>
          </div>
        </Link>
      </div>

      <p className="mt-10 text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.15em' }}>
        You will be routed automatically after signing in.
      </p>
    </div>
  )
}
