import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { NavLinks } from '@/components/nav-links'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full bg-[#0b0c09]">
      {/* Sidebar */}
      <aside className="noise w-56 flex-shrink-0 flex flex-col border-r border-[#222620] bg-[#0e100d]">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-[#222620]">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-sm border border-[#d4b070]/30 bg-[#d4b070]/06 flex items-center justify-center flex-shrink-0 group-hover:border-[#d4b070]/50 group-hover:bg-[#d4b070]/10 transition-all">
              <span className="font-display text-xl font-semibold text-[#d4b070] leading-none">D</span>
            </div>
            <div>
              <div
                className="font-display text-sm font-semibold text-[#eae6d6] leading-none"
                style={{ letterSpacing: '0.22em' }}
              >
                DOMIS
              </div>
              <div className="text-[10px] text-[#7a7468] mt-1 leading-none" style={{ letterSpacing: '0.3em' }}>
                PLATFORM
              </div>
            </div>
          </Link>
        </div>

        <NavLinks />

        {/* Status + User */}
        <div className="p-4 border-t border-[#222620]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#5bba7a] status-pulse" />
              <span className="text-[10px] text-[#7a7468]" style={{ letterSpacing: '0.22em' }}>ONLINE</span>
            </div>
            <UserButton appearance={{ elements: { avatarBox: 'w-6 h-6' } }} />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto dot-grid">
        {children}
      </main>
    </div>
  )
}
