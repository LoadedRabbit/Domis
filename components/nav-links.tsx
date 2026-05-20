'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Operations', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText, exact: false },
]

export function NavLinks() {
  const pathname = usePathname()
  return (
    <nav className="flex-1 py-3 px-2 space-y-0.5">
      <p className="text-[9px] font-mono text-[#64748b] uppercase tracking-widest px-2 mb-2.5">Menu</p>
      {navItems.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`relative flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all group ${
              active
                ? 'bg-[#3b82f6]/10 text-[#e2e8f0]'
                : 'text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#131822]'
            }`}
          >
            {active && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#3b82f6] rounded-r-full" />
            )}
            <Icon
              size={14}
              className={`flex-shrink-0 transition-colors ${
                active ? 'text-[#3b82f6]' : 'text-[#64748b] group-hover:text-[#94a3b8]'
              }`}
            />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
