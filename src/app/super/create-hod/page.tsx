'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const BRANCHES = ['Lagos Mainland — Nigeria','Lagos Island — Nigeria','Port Harcourt — Nigeria','Abuja — Nigeria','Ghana','UK — London','UK — Ireland','Houston — USA']

export default function CreateHODPage() {
  const [form, setForm] = useState({ full_name: '', email: '', branch: '' })
  const [orgId, setOrgId] = useState('')
  const [userId, setUserId] = useState('')
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
      const { data: org } = await supabase.from('organisations').select('id').eq('slug', 'logic-church').single()
      if (org) setOrgId(org.id)
    }
    load()
  }, [])

  function upd(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name || !form.email || !form.branch) { setError('All fields are required'); return }
    setSending(true); setError('')

    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emails: [form.email],
        role: 'head',
        branch: form.branch,
        full_name: form.full_name,
        org_id: orgId,
        invited_by: userId
      })
    })

    const data = await res.json()
    if (!res.ok || data.error) { setError(data.error || 'Failed to send invite'); setSending(false); return }

    const result = data.results?.[0]
    if (!result?.success) { setError('Failed to create account. Email may already exist.'); setSending(false); return }

    setSuccess(true); setSending(false)
  }

  const S = {
    page: { minHeight: '100vh', display: 'flex', flexDirection: 'column' as const },
    topbar: { background: '#1A1A1A', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 },
    body: { flex: 1, padding: 14, background: 'var(--color-background-secondary)' },
    lbl: { fontSize: 12, fontWeight: 500, color: '#7B1818', display: 'block', marginBottom: 4 } as React.CSSProperties,
    inp: { width: '100%', padding: '10px 12px', border: '1px solid var(--color-border-tertiary)', borderRadius: 10, fontSize: 13, color: 'var(--color-text-primary)', background: 'var(--color-background-primary)', fontFamily: 'inherit', outline: 'none', marginBottom: 10 } as React.CSSProperties
  }

  if (success) return (
    <div style={S.page}>
      <div style={S.topbar}><Link href="/super" style={{ color: '#999', fontSize: 18, textDecoration: 'none' }}>←</Link><span style={{ fontSize: 13, fontWeight: 500, color: 'white' }}>Create head of department</span></div>
      <div style={{ ...S.body, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>Invite sent</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'center', marginBottom: 20 }}>
          {form.full_name} will receive an email with their login details for the {form.branch} branch.
        </div>
        <Link href="/super" style={{ padding: '11px 24px', background: '#B71C1C', color: 'white', borderRadius: 11, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>Back to dashboard</Link>
      </div>
    </div>
  )

  return (
    <div style={S.page}>
      <div style={S.topbar}><Link href="/super" style={{ color: '#999', fontSize: 18, textDecoration: 'none' }}>←</Link><span style={{ fontSize: 13, fontWeight: 500, color: 'white' }}>Create head of department</span></div>
      <div style={S.body}>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
          HOD will receive an email with a temporary password to sign in and complete their profile.
        </p>
        <form onSubmit={handleCreate}>
          <label style={S.lbl}>Full name *</label>
          <input style={S.inp} value={form.full_name} onChange={e => upd('full_name', e.target.value)} placeholder="HOD's full name" />
          <label style={S.lbl}>Email address *</label>
          <input style={S.inp} type="email" value={form.email} onChange={e => upd('email', e.target.value)} placeholder="hod@logicchurch.org" />
          <label style={S.lbl}>Branch *</label>
          <select style={S.inp} value={form.branch} onChange={e => upd('branch', e.target.value)}>
            <option value="">Select branch</option>
            {BRANCHES.map(b => <option key={b}>{b}</option>)}
          </select>
          {error && <div style={{ background: 'var(--color-background-danger)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--color-text-danger)', marginBottom: 8 }}>{error}</div>}
          <button type="submit" disabled={sending} style={{ width: '100%', padding: 12, background: '#B71C1C', color: 'white', border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4 }}>
            {sending ? 'Creating…' : 'Create and send invite'}
          </button>
        </form>
      </div>
    </div>
  )
}
