'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const SUBTEAMS = ['Camera', 'Roving', 'Live Streaming', 'Lighting', 'Multimedia']

export default function InvitePage() {
  const [emails, setEmails] = useState('')
  const [subTeam, setSubTeam] = useState('')
  const [branch, setBranch] = useState('')
  const [orgId, setOrgId] = useState('')
  const [userId, setUserId] = useState('')
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [count, setCount] = useState(0)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
      const { data: profile } = await supabase.from('profiles').select('branch, org_id').eq('id', user?.id).single()
      if (profile?.branch) setBranch(profile.branch)
      if (profile?.org_id) setOrgId(profile.org_id)
    }
    load()
  }, [])

  function parseEmails(raw: string): string[] {
    return raw.split(/[\n,;]+/).map(e => e.trim()).filter(e => e.includes('@'))
  }

  function handleEmailChange(val: string) {
    setEmails(val)
    setCount(parseEmails(val).length)
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    const emailList = parseEmails(emails)
    if (emailList.length === 0) { setError('Enter at least one valid email address'); return }
    setSending(true); setError('')

    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emails: emailList,
        role: 'volunteer',
        branch,
        org_id: orgId,
        invited_by: userId
      })
    })

    const data = await res.json()
    if (!res.ok || data.error) { setError(data.error || 'Failed to send invites'); setSending(false); return }

    setSuccess(true); setSending(false)
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    border: '1px solid var(--color-border-tertiary)',
    borderRadius: 10, fontSize: 13,
    color: 'var(--color-text-primary)',
    background: 'var(--color-background-primary)',
    fontFamily: 'inherit', outline: 'none', marginBottom: 10
  }
  const lbl: React.CSSProperties = {
    fontSize: 12, fontWeight: 500, color: '#7B1818', display: 'block', marginBottom: 4
  }

  if (success) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#1A1A1A', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/admin" style={{ color: '#999', fontSize: 18, textDecoration: 'none' }}>←</Link>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'white' }}>Invite members</span>
      </div>
      <div style={{ flex: 1, background: 'var(--color-background-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>Invites sent</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'center', marginBottom: 20 }}>
          {count} member{count !== 1 ? 's' : ''} will receive an email with their login details.
        </div>
        <Link href="/admin" style={{ padding: '11px 24px', background: '#B71C1C', color: 'white', borderRadius: 11, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>Back to dashboard</Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#1A1A1A', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/admin" style={{ color: '#999', fontSize: 18, textDecoration: 'none' }}>←</Link>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'white' }}>Invite members</span>
      </div>
      <div style={{ flex: 1, background: 'var(--color-background-secondary)', padding: 14 }}>
        {branch && (
          <div style={{ background: '#2D2D2D', borderRadius: 9, padding: '9px 11px', display: 'flex', alignItems: 'center', gap: 7, marginBottom: 13 }}>
            <span style={{ fontSize: 14 }}>🏢</span>
            <p style={{ fontSize: 12, color: '#bbb' }}>Inviting to {branch}</p>
          </div>
        )}
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 13, lineHeight: 1.5 }}>
          Each person will receive an email with a temporary password. They sign in and complete their profile on first login.
        </p>
        <form onSubmit={handleInvite}>
          <label style={lbl}>Email address(es)</label>
          <textarea
            style={{ ...inp, minHeight: 80, resize: 'none' }}
            value={emails}
            onChange={e => handleEmailChange(e.target.value)}
            placeholder={'john@gmail.com\njane@gmail.com\nor paste a comma-separated list'}
          />
          {count > 0 && (
            <span style={{ fontSize: 11, color: '#B71C1C', fontWeight: 500, display: 'block', marginBottom: 9, marginTop: -6 }}>
              {count} email{count !== 1 ? 's' : ''} detected
            </span>
          )}
          <label style={lbl}>Assign sub-team <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>(optional)</span></label>
          <select style={inp} value={subTeam} onChange={e => setSubTeam(e.target.value)}>
            <option value="">Member chooses during onboarding</option>
            {SUBTEAMS.map(s => <option key={s}>{s}</option>)}
          </select>
          {error && (
            <div style={{ background: 'var(--color-background-danger)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--color-text-danger)', marginBottom: 8 }}>{error}</div>
          )}
          <button type="submit" disabled={sending}
            style={{ width: '100%', padding: 12, background: '#B71C1C', color: 'white', border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4 }}>
            {sending ? 'Sending…' : `Send invite${count > 1 ? `s (${count})` : ''}`}
          </button>
        </form>
      </div>
    </div>
  )
}
