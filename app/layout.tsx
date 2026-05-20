/*
 * DOMIS DESIGN SYSTEM
 * ─────────────────────────────────────────────
 * Background:  #0a0c10
 * Surface:     #10141c
 * Border:      #1e2535
 *
 * Text primary: #e2e8f0
 * Text muted:   #64748b
 *
 * Accent blue:  #3b82f6
 * Accent green: #10b981
 * Accent amber: #f59e0b
 * Accent red:   #ef4444
 *
 * Font body:    DM Sans
 * Font mono:    Space Mono  (labels, numbers, tags)
 *
 * Cards:   subtle border (#1e2535), no heavy shadows
 * Layout:  clean, minimal, professional, data-dense
 * CSS:     Tailwind only
 * Responsive: mobile-first
 * ─────────────────────────────────────────────
 */

import type { Metadata } from 'next'
import { DM_Sans, Space_Mono } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const dmSans = DM_Sans({ variable: '--font-dm-sans', subsets: ['latin'] })
const spaceMono = Space_Mono({ variable: '--font-space-mono', subsets: ['latin'], weight: ['400', '700'] })

export const metadata: Metadata = {
  title: 'Domis — Property Management',
  description: 'AI-powered property management platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${dmSans.variable} ${spaceMono.variable} h-full`}>
        <body className="h-full">{children}</body>
      </html>
    </ClerkProvider>
  )
}
