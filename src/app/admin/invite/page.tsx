'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function InvitePage() {
  const [emailInput, setEmailInput] = useState('')
  const [subTeam, setSubTeam] = useState('')
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState<{ email: string; ok: boolean; msg?: string }[]>([])
  const [error, setError] = useState('')

  const emails = emailInput.split(/[\n,;]+/).map(e => e.trim().toLowerCase()).filter(e => e.includes('@'))

  async function handleSend() {
    if (emails.length === 0) { setError('Enter at least one valid email address'); return }
    setSending(true); setError(''); setResults([])
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: adminProfile } = await supabase.from('profiles').select('org_id, branch').eq('id', user.id).single()
    const newResults: typeof results = []
    for (const email of emails) {
      await supabase.from('invites').insert({ org_id: adminProfile?.org_id, email, invited_by: user.id, sub_team: subTeam || null })
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/onboarding`, data: { role: 'volunteer', branch: adminProfile?.branch || '' } }
      })
      newResults.push({ email, ok: !otpErr, msg: otpErr?.message })
    }
    setResults(newResults); setSending(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#1A1A1A', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/admin" style={{ color: '#999', fontSize: 18, textDecoration: 'none' }}>←</Link>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'white' }}>Invite members</span>
      </div>
      <div style={{ flex: 1, padding: 14, background: 'var(--color-background-secondary)' }}>
        {results.length > 0 ? (
          <>
            <div style={{ background: 'var(--color-background-success)', border: '0.5px solid #16A34A', borderRadius: 10, padding: '12px 14px', textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-success)' }}>{results.filter(r => r.ok).length} invite{results.filter(r => r.ok).length !== 1 ? 's' : ''} sent</div>
            </div>
            {results.map((r, i) => (
              <div key={i} style={{ background: r.ok ? 'var(--color-background-success)' : 'var(--color-background-danger)', border: `0.5px solid ${r.ok ? '#16A34A' : '#B71C1C'}`, borderRadius: 8, padding: '8px 12px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{r.ok ? '✅' : '❌'}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-primary)' }}>{r.email}</span>
                {r.msg && <span style={{ fontSize: 11, color: 'var(--color-text-danger)' }}>{r.msg}</span>}
              </div>
            ))}
            <button onClick={() => { setResults([]); setEmailInput('') }} style={{ width: '100%', padding: 12, background: '#B71C1C', color: 'white', border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 500, cursor: 'pointer', marginTop: 8, fontFamily: 'inherit' }}>Send more invites</button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>Enter one or multiple email addresses. Paste a list separated by commas or new lines. Each person receives a unique invite link valid for 48 hours.</p>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#7B1818', display: 'block', marginBottom: 4 }}>Email address(es) *</label>
              <textarea value={emailInput} onChange={e => setEmailInput(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--color-border-tertiary)', borderRadius: 10, fontSize: 13, color: 'var(--color-text-primary)', background: 'var(--color-background-primary)', fontFamily: 'inherit', outline: 'none', resize: 'none', minHeight: 80 }} placeholder={"john@gmail.com\njane@gmail.com\nor paste a list"} />
              {emails.length > 0 && <span style={{ fontSize: 11, color: '#B71C1C', fontWeight: 500 }}>{emails.length} email{emails.length !== 1 ? 's' : ''} detected</span>}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#7B1818', display: 'block', marginBottom: 4 }}>Assign sub-team (optional)</label>
              <select value={subTeam} onChange={e => setSubTeam(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--color-border-tertiary)', borderRadius: 10, fontSize: 13, color: 'var(--color-text-primary)', background: 'var(--color-background-primary)', fontFamily: 'inherit', outline: 'none' }}>
                <option value="">Member chooses during onboarding</option>
                <option value="camera">Camera</option>
                <option value="roving">Roving</option>
                <option value="live_streaming">Live Streaming</option>
                <option value="lighting">Lighting</option>
                <option value="multimedia">Multimedia</option>
              </select>
            </div>
            {error && <div style={{ background: 'var(--color-background-danger)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--color-text-danger)', marginBottom: 8 }}>{error}</div>}
            <button onClick={handleSend} disabled={sending || emails.length === 0} style={{ width: '100%', padding: 12, background: emails.length > 0 ? '#B71C1C' : 'var(--color-background-secondary)', color: emails.length > 0 ? 'white' : 'var(--color-text-secondary)', border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 500, cursor: emails.length > 0 ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
              {sending ? `Sending…` : `Send ${emails.length > 0 ? emails.length : ''} invite${emails.length !== 1 ? 's' : ''}`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
