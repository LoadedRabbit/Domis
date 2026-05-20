import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { Zap } from 'lucide-react'
import { NavLinks } from '@/components/nav-links'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full bg-[#0a0c10]">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col border-r border-[#1e2535] bg-[#10141c]">
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-[#1e2535]">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#3b82f6] flex items-center justify-center flex-shrink-0">
              <Zap size={14} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-xs font-bold text-[#e2e8f0] leading-none tracking-wider">KINYU</div>
              <div className="text-[9px] text-[#64748b] tracking-[0.2em] leading-none mt-0.5">REALTY</div>
            </div>
          </Link>
        </div>

        <NavLinks />

        {/* Status + User */}
        <div className="p-3 border-t border-[#1e2535]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] status-pulse" />
              <span className="text-[10px] font-mono text-[#64748b] tracking-widest">ONLINE</span>
            </div>
            <UserButton appearance={{ elements: { avatarBox: 'w-6 h-6' } }} />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
