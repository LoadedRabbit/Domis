import type { Metadata } from 'next'
import { Playfair_Display, Plus_Jakarta_Sans, DM_Mono } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
})

const plusJakarta = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
})

const dmMono = DM_Mono({
  variable: '--font-dm-mono',
  subsets: ['latin'],
  weight: ['300', '400', '500'],
})

export const metadata: Metadata = {
  title: 'Domis — Property Management',
  description: 'AI-powered property management platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${playfair.variable} ${plusJakarta.variable} ${dmMono.variable} h-full`}>
        <body className="h-full">{children}</body>
      </html>
    </ClerkProvider>
  )
}
