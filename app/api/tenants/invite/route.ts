export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'
import { Resend } from 'resend'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { building_id, unit_number, full_name, email, monthly_rent, phone, lease_start, lease_end } = await req.json()
    if (!building_id || !unit_number || !full_name || !email || monthly_rent == null) {
      return NextResponse.json({ error: 'building_id, unit_number, full_name, email, and monthly_rent are required' }, { status: 400 })
    }

    const invite_token = crypto.randomUUID()

    const supabase = createServerClient()
    const { data: tenant, error } = await supabase
      .from('tenants')
      .insert({
        building_id:  Number(building_id),
        unit_number,
        full_name,
        email,
        monthly_rent: Number(monthly_rent),
        phone:        phone || '',
        lease_start:  lease_start || null,
        lease_end:    lease_end || null,
        clerk_user_id: null,
        invite_token,
      })
      .select('*, building:buildings(name, address)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteLink = `${baseUrl}/invite/${invite_token}`

    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const resend = new Resend(resendKey)
      await resend.emails.send({
        from: 'Domis <onboarding@resend.dev>',
        to:   email,
        subject: "You've been invited to your tenant portal",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0b0c09; color: #eae6d6;">
            <div style="margin-bottom: 24px;">
              <span style="font-size: 20px; font-weight: 600; letter-spacing: 0.2em; color: #d4b070;">DOMIS</span>
            </div>
            <h1 style="font-size: 22px; font-weight: 300; margin-bottom: 8px; color: #eae6d6;">Welcome, ${full_name.split(' ')[0]}!</h1>
            <p style="color: #9e9a8c; line-height: 1.6; margin-bottom: 24px;">
              Your landlord has set up your tenant portal account for Unit ${unit_number}.
              Click below to create your account and access your portal.
            </p>
            <a href="${inviteLink}" style="display: inline-block; background: #d4b07018; color: #d4b070; border: 1px solid #d4b07050; padding: 12px 24px; text-decoration: none; font-size: 12px; letter-spacing: 0.12em; border-radius: 2px;">
              SET UP MY ACCOUNT →
            </a>
            <p style="color: #7a7468; font-size: 11px; margin-top: 24px;">
              This link is unique to you. If you didn't expect this email, you can safely ignore it.
            </p>
          </div>
        `,
      }).catch(err => console.error('[invite email]', err))
    }

    return NextResponse.json(tenant, { status: 201 })
  } catch (err) {
    console.error('[/api/tenants/invite POST]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
