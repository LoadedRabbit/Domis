import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { LayoutDashboard, FileText, Zap } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Operations', icon: LayoutDashboard },
  { href: '/dashboard/reports', label: 'All Reports', icon: FileText },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full bg-[#07080d]">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r border-[#1e2438] bg-[#0d0f18]">
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-[#1e2438]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#00d4aa] flex items-center justify-center flex-shrink-0">
              <Zap size={14} className="text-[#07080d]" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-xs font-bold text-[#c8d3e8] leading-none tracking-wider">KINYU</div>
              <div className="text-[9px] text-[#7a8aaa] tracking-[0.2em] leading-none mt-0.5">REALTY</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-0.5">
          <p className="text-[9px] font-mono text-[#3d4a66] uppercase tracking-widest px-2 mb-2">Navigation</p>
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-2 py-2 rounded text-[#7a8aaa] hover:text-[#c8d3e8] hover:bg-[#131726] transition-colors group text-sm"
            >
              <Icon size={14} className="group-hover:text-[#00d4aa] transition-colors flex-shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Status + User */}
        <div className="p-3 border-t border-[#1e2438] space-y-2.5">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] status-pulse" />
            <span className="text-[10px] font-mono text-[#7a8aaa] tracking-widest">SYS ONLINE</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[9px] font-mono text-[#3d4a66] uppercase tracking-widest">Manager</div>
            </div>
            <UserButton
              appearance={{
                elements: { avatarBox: 'w-6 h-6' },
              }}
            />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto grid-bg">
        {children}
      </main>
    </div>
  )
}
