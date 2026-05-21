import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { MessageSquare, Wrench, Home } from 'lucide-react'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex flex-col bg-[#0b0c09]">
      <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 border-b border-[#222620] bg-[#0e100d]">
        <Link href="/portal" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-sm border border-[#d4b070]/30 bg-[#d4b070]/06 flex items-center justify-center group-hover:border-[#d4b070]/50 transition-all">
            <span className="font-display text-lg font-semibold text-[#d4b070] leading-none">D</span>
          </div>
          <div>
            <div className="font-display text-sm font-semibold text-[#eae6d6] leading-none" style={{ letterSpacing: '0.2em' }}>DOMIS</div>
            <div className="text-[9px] text-[#7a7468] mt-0.5 leading-none" style={{ letterSpacing: '0.28em' }}>TENANT PORTAL</div>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          {[
            { href: '/portal', label: 'Home', icon: Home },
            { href: '/portal/communications', label: 'Messages', icon: MessageSquare },
            { href: '/portal/maintenance', label: 'Maintenance', icon: Wrench },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[11px] text-[#9e9a8c] hover:text-[#eae6d6] hover:bg-[#d4b070]/04 transition-all"
              style={{ letterSpacing: '0.08em' }}
            >
              <Icon size={12} />
              {label}
            </Link>
          ))}
        </nav>

        <UserButton appearance={{ elements: { avatarBox: 'w-7 h-7' } }} />
      </header>

      <main className="flex-1 overflow-auto dot-grid">
        {children}
      </main>
    </div>
  )
}
