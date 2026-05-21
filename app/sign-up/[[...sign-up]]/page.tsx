'use client'

import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-[#00d4aa] status-pulse" />
          <span className="text-xs font-mono tracking-[0.2em] text-[#00d4aa] uppercase">System Online</span>
        </div>
        <h1 className="text-2xl font-bold text-[#c8d3e8] tracking-tight">Domis</h1>
        <p className="text-sm text-[#7a8aaa] mt-1">Property Management System</p>
      </div>

      <div className="w-full max-w-sm">
        <SignUp
          forceRedirectUrl="/"
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'bg-[#0d0f18] border border-[#1e2438] shadow-2xl rounded-lg',
              headerTitle: 'text-[#c8d3e8] text-lg font-semibold',
              headerSubtitle: 'text-[#7a8aaa] text-sm',
              socialButtonsBlockButton: 'border-[#1e2438] bg-[#131726] text-[#c8d3e8] hover:bg-[#1a1f32]',
              dividerLine: 'bg-[#1e2438]',
              dividerText: 'text-[#7a8aaa]',
              formFieldLabel: 'text-[#7a8aaa] text-xs uppercase tracking-wider',
              formFieldInput: 'bg-[#131726] border-[#1e2438] text-[#c8d3e8] placeholder-[#3d4a66] focus:border-[#00d4aa] focus:ring-[#00d4aa]/20',
              formButtonPrimary: 'bg-[#00d4aa] hover:bg-[#00856a] text-[#07080d] font-semibold',
              footerActionLink: 'text-[#00d4aa] hover:text-[#00856a]',
            },
          }}
        />
      </div>
    </div>
  )
}
