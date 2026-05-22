import { UserButton } from '@clerk/nextjs'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0b0c09] flex flex-col">
      <header className="flex items-center justify-between px-8 py-4 border-b border-[#222620]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm border border-[#d4b070]/30 bg-[#d4b070]/06 flex items-center justify-center">
            <span className="font-display text-lg font-semibold text-[#d4b070] leading-none">D</span>
          </div>
          <span className="font-display text-sm font-semibold text-[#eae6d6]" style={{ letterSpacing: '0.22em' }}>DOMIS</span>
        </div>
        <UserButton appearance={{ elements: { avatarBox: 'w-7 h-7' } }} />
      </header>
      <main className="flex-1 flex items-center justify-center p-6 dot-grid">
        {children}
      </main>
    </div>
  )
}
