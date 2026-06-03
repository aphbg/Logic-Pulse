import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import * as nodemailer from 'nodemailer'

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export async function POST(request: NextRequest) {
  try {
    const { emails, role, branch, full_name, org_id: orgIdParam, invited_by } = await request.json()

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'No emails provided' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // SMTP transporter using same Resend SMTP as Supabase
    const transporter = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY
      }
    })

    // Get org_id once
    let org_id = orgIdParam
    if (!org_id) {
      const { data: org } = await supabaseAdmin
        .from('organisations')
        .select('id')
        .eq('slug', 'logic-church')
        .single()
      org_id = org?.id
    }

    const results = []

    for (const email of emails) {
      const tempPassword = generateTempPassword()

      // Create user
      const { error: userError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { role, branch, full_name: full_name || '' }
      })

      if (userError) {
        results.push({ email, success: false, error: userError.message })
        continue
      }

      // Save invite record
      await supabaseAdmin.from('invites').insert({
        org_id,
        email,
        role: role || 'volunteer',
        branch,
        full_name: full_name || null,
        invited_by,
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      })

      // Send email via Resend SMTP
      await transporter.sendMail({
        from: 'Logic Pulse <onboarding@resend.dev>',
        to: email,
        subject: 'You have been invited to Logic Pulse',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <div style="background: #1A1A1A; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <div style="font-size: 32px; margin-bottom: 8px;">⚡</div>
              <h1 style="color: white; font-size: 22px; margin: 0;">Logic Pulse</h1>
              <p style="color: #888; font-size: 13px; margin: 6px 0 0;">Workforce Management System</p>
            </div>
            <h2 style="color: #1A1A1A; font-size: 18px;">You have been invited</h2>
            <p style="color: #444; font-size: 14px; line-height: 1.6;">
              You have been invited to join Logic Pulse${branch ? ` — ${branch} branch` : ''}.
              Use the details below to sign in and complete your profile.
            </p>
            <div style="background: #F5F5F5; border-radius: 10px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #666;">Sign in at:</p>
              <p style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #1A1A1A;">https://logic-pulse-chi.vercel.app/login</p>
              <p style="margin: 0 0 4px; font-size: 13px; color: #666;">Email:</p>
              <p style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #1A1A1A;">${email}</p>
              <p style="margin: 0 0 4px; font-size: 13px; color: #666;">Temporary password:</p>
              <p style="margin: 0; font-size: 18px; font-weight: 700; color: #B71C1C; letter-spacing: 2px;">${tempPassword}</p>
            </div>
            <p style="color: #444; font-size: 13px; line-height: 1.6;">
              You will be asked to set your own password when you first sign in.
            </p>
            <div style="border-top: 1px solid #EEE; margin-top: 24px; padding-top: 16px;">
              <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">Logic Pulse — Logic Church Media Department</p>
            </div>
          </div>
        `
      })

      results.push({ email, success: true })
    }

    return NextResponse.json({ results })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
