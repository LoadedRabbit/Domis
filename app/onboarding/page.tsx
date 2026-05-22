'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Calendar, UserPlus, CheckCircle2, Loader2, ArrowRight } from 'lucide-react'

const STEPS = [
  { number: 1, label: 'Add Property',  icon: Building2  },
  { number: 2, label: 'Rent Due Date', icon: Calendar   },
  { number: 3, label: 'Invite Tenant', icon: UserPlus   },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep]           = useState(1)
  const [propertyId, setPropertyId] = useState<number | null>(null)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [inviteSent, setInviteSent] = useState(false)

  // Step 1 form
  const [p1, setP1] = useState({ name: '', address: '', total_units: '' })
  // Step 2 form
  const [rentDueDay, setRentDueDay] = useState('1')
  // Step 3 form
  const [p3, setP3] = useState({ full_name: '', unit_number: '', email: '', monthly_rent: '' })

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const res = await fetch('/api/buildings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: p1.name, address: p1.address, total_units: Number(p1.total_units) }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to create property'); setSaving(false); return }
    setPropertyId(data.id)
    setSaving(false)
    setStep(2)
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault()
    if (!propertyId) return
    setError('')
    setSaving(true)
    const res = await fetch(`/api/buildings/${propertyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rent_due_day: Number(rentDueDay) }),
    })
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed to save'); setSaving(false); return }
    setSaving(false)
    setStep(3)
  }

  async function handleStep3(e: React.FormEvent) {
    e.preventDefault()
    if (!propertyId) return
    setError('')
    setSaving(true)
    const res = await fetch('/api/tenants/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        building_id:  propertyId,
        unit_number:  p3.unit_number,
        full_name:    p3.full_name,
        email:        p3.email,
        monthly_rent: Number(p3.monthly_rent),
      }),
    })
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed to send invite'); setSaving(false); return }
    setInviteSent(true)
    setSaving(false)
  }

  const inputCls = 'w-full bg-[#0e100d] border border-[#222620] rounded-sm text-xs text-[#eae6d6] placeholder-[#7a7468] px-3 py-2.5 focus:outline-none focus:border-[#d4b070]/30 transition-all'
  const labelCls = 'block text-[10px] text-[#7a7468] mb-1.5'

  return (
    <div className="w-full max-w-md">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-10">
        {STEPS.map((s, i) => (
          <div key={s.number} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-[10px] transition-colors ${step === s.number ? 'text-[#d4b070]' : step > s.number ? 'text-[#5bba7a]' : 'text-[#7a7468]'}`} style={{ letterSpacing: '0.12em' }}>
              {step > s.number
                ? <CheckCircle2 size={12} className="text-[#5bba7a]" />
                : <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] ${step === s.number ? 'border-[#d4b070] text-[#d4b070]' : 'border-[#2e3328] text-[#7a7468]'}`}>{s.number}</span>
              }
              {s.label}
            </div>
            {i < STEPS.length - 1 && <div className="w-6 h-px bg-[#222620]" />}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="animate-in bg-[#101210] border border-[#222620] rounded-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-sm bg-[#d4b070]/08 border border-[#d4b070]/20 flex items-center justify-center">
              <Building2 size={16} className="text-[#d4b070]" />
            </div>
            <div>
              <h1 className="font-display text-xl font-light text-[#eae6d6]">Add your first property</h1>
              <p className="text-[11px] text-[#7a7468] mt-0.5">You can add more properties later from the dashboard.</p>
            </div>
          </div>
          {error && <p className="text-xs text-[#c45c5c] mb-4">{error}</p>}
          <form onSubmit={handleStep1} className="space-y-3">
            <div>
              <label className={labelCls} style={{ letterSpacing: '0.15em' }}>PROPERTY NAME *</label>
              <input required type="text" value={p1.name} onChange={e => setP1(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Maple Street Apartments" className={inputCls} />
            </div>
            <div>
              <label className={labelCls} style={{ letterSpacing: '0.15em' }}>ADDRESS *</label>
              <input required type="text" value={p1.address} onChange={e => setP1(p => ({ ...p, address: e.target.value }))}
                placeholder="123 Main St, City, State 12345" className={inputCls} />
            </div>
            <div>
              <label className={labelCls} style={{ letterSpacing: '0.15em' }}>TOTAL UNITS *</label>
              <input required type="number" min="1" max="200" value={p1.total_units} onChange={e => setP1(p => ({ ...p, total_units: e.target.value }))}
                placeholder="e.g. 4" className={inputCls} />
            </div>
            <button type="submit" disabled={saving}
              className="w-full flex items-center justify-center gap-2 mt-2 text-[11px] bg-[#d4b070]/10 hover:bg-[#d4b070]/18 disabled:opacity-40 text-[#d4b070] border border-[#d4b070]/30 hover:border-[#d4b070]/50 py-2.5 rounded-sm transition-all"
              style={{ letterSpacing: '0.12em' }}
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : <ArrowRight size={11} />}
              {saving ? 'SAVING…' : 'NEXT'}
            </button>
          </form>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="animate-in bg-[#101210] border border-[#222620] rounded-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-sm bg-[#d4b070]/08 border border-[#d4b070]/20 flex items-center justify-center">
              <Calendar size={16} className="text-[#d4b070]" />
            </div>
            <div>
              <h1 className="font-display text-xl font-light text-[#eae6d6]">Set your rent due date</h1>
              <p className="text-[11px] text-[#7a7468] mt-0.5">Which day of the month is rent due?</p>
            </div>
          </div>
          {error && <p className="text-xs text-[#c45c5c] mb-4">{error}</p>}
          <form onSubmit={handleStep2} className="space-y-3">
            <div>
              <label className={labelCls} style={{ letterSpacing: '0.15em' }}>DAY OF MONTH</label>
              <select value={rentDueDay} onChange={e => setRentDueDay(e.target.value)}
                className="w-full bg-[#0e100d] border border-[#222620] rounded-sm text-xs text-[#eae6d6] px-3 py-2.5 focus:outline-none focus:border-[#d4b070]/30 transition-all"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>
                    {d === 1 ? '1st' : d === 2 ? '2nd' : d === 3 ? '3rd' : `${d}th`} of the month
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={saving}
              className="w-full flex items-center justify-center gap-2 mt-2 text-[11px] bg-[#d4b070]/10 hover:bg-[#d4b070]/18 disabled:opacity-40 text-[#d4b070] border border-[#d4b070]/30 hover:border-[#d4b070]/50 py-2.5 rounded-sm transition-all"
              style={{ letterSpacing: '0.12em' }}
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : <ArrowRight size={11} />}
              {saving ? 'SAVING…' : 'NEXT'}
            </button>
          </form>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="animate-in bg-[#101210] border border-[#222620] rounded-sm p-8">
          {inviteSent ? (
            <div className="text-center py-4">
              <CheckCircle2 size={28} className="text-[#5bba7a] mx-auto mb-4" />
              <h2 className="font-display text-xl font-light text-[#eae6d6] mb-2">Invite sent!</h2>
              <p className="text-sm text-[#9e9a8c] mb-6">Your tenant will receive an email to set up their portal account.</p>
              <button onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 mx-auto text-[11px] bg-[#d4b070]/10 hover:bg-[#d4b070]/18 text-[#d4b070] border border-[#d4b070]/30 hover:border-[#d4b070]/50 px-5 py-2 rounded-sm transition-all"
                style={{ letterSpacing: '0.12em' }}
              >
                GO TO DASHBOARD <ArrowRight size={11} />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-sm bg-[#d4b070]/08 border border-[#d4b070]/20 flex items-center justify-center">
                  <UserPlus size={16} className="text-[#d4b070]" />
                </div>
                <div>
                  <h1 className="font-display text-xl font-light text-[#eae6d6]">Invite your first tenant</h1>
                  <p className="text-[11px] text-[#7a7468] mt-0.5">They'll get an email to set up their portal account.</p>
                </div>
              </div>
              {error && <p className="text-xs text-[#c45c5c] mb-4">{error}</p>}
              <form onSubmit={handleStep3} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className={labelCls} style={{ letterSpacing: '0.15em' }}>TENANT NAME *</label>
                    <input required type="text" value={p3.full_name} onChange={e => setP3(p => ({ ...p, full_name: e.target.value }))}
                      placeholder="Jane Smith" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls} style={{ letterSpacing: '0.15em' }}>UNIT *</label>
                    <input required type="text" value={p3.unit_number} onChange={e => setP3(p => ({ ...p, unit_number: e.target.value }))}
                      placeholder="e.g. 1A" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls} style={{ letterSpacing: '0.15em' }}>MONTHLY RENT *</label>
                    <input required type="number" min="0" step="0.01" value={p3.monthly_rent} onChange={e => setP3(p => ({ ...p, monthly_rent: e.target.value }))}
                      placeholder="1500" className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls} style={{ letterSpacing: '0.15em' }}>EMAIL *</label>
                    <input required type="email" value={p3.email} onChange={e => setP3(p => ({ ...p, email: e.target.value }))}
                      placeholder="tenant@example.com" className={inputCls} />
                  </div>
                </div>
                <button type="submit" disabled={saving}
                  className="w-full flex items-center justify-center gap-2 mt-2 text-[11px] bg-[#d4b070]/10 hover:bg-[#d4b070]/18 disabled:opacity-40 text-[#d4b070] border border-[#d4b070]/30 hover:border-[#d4b070]/50 py-2.5 rounded-sm transition-all"
                  style={{ letterSpacing: '0.12em' }}
                >
                  {saving ? <Loader2 size={11} className="animate-spin" /> : <UserPlus size={11} />}
                  {saving ? 'SENDING…' : 'SEND INVITE'}
                </button>
              </form>
              <button onClick={() => router.push('/dashboard')}
                className="w-full flex items-center justify-center gap-1.5 mt-3 text-[10px] text-[#7a7468] hover:text-[#9e9a8c] transition-colors py-1"
                style={{ letterSpacing: '0.12em' }}
              >
SKIP FOR NOW →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
