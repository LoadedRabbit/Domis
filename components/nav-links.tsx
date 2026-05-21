'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText } from 'lucide-react'

const navItems = [
  { href: '/dashboard',         label: 'Operations', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/reports', label: 'Reports',    icon: FileText,        exact: false },
]

export function NavLinks() {
  const pathname = usePathname()
  return (
    <nav className="flex-1 py-4 px-3 space-y-0.5">
      <p
        className="text-[8px] text-[#5c5850] px-2 mb-3"
        style={{ letterSpacing: '0.28em' }}
      >
        NAVIGATION
      </p>
      {navItems.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-sm text-xs transition-all duration-200 group ${
              active
                ? 'bg-[#c8a86a]/06 text-[#eae6d6]'
                : 'text-[#9e9a8c] hover:text-[#eae6d6] hover:bg-[#c8a86a]/04'
            }`}
            style={{ letterSpacing: '0.08em' }}
          >
            {active && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-[#c8a86a] rounded-r-full" />
            )}
            <Icon
              size={13}
              className={`flex-shrink-0 transition-colors ${
                active ? 'text-[#c8a86a]' : 'text-[#5c5850] group-hover:text-[#9e9a8c]'
              }`}
            />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
