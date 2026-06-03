'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const SUBTEAMS = ['Camera', 'Roving', 'Live Streaming', 'Lighting', 'Multimedia']

export default function OnboardingPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [branchLabel, setBranchLabel] = useState('')
  const [userRole, setUserRole] = useState('volunteer')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    full_name: '', phone: '',
    address1: '', address2: '', state: '', country: '',
    dob: '', sub_team: '',
    password: '', confirm_password: ''
  })

  useEffect(() => {
    async function init() {
      const supabase = createClient()

      // Step 1: Check if there is a hash in the URL with tokens (magic link)
      if (typeof window !== 'undefined') {
        const hash = window.location.hash
        if (hash && hash.includes('access_token')) {
          // Parse tokens from hash
          const params = new URLSearchParams(hash.substring(1))
          const access_token = params.get('access_token')
          const refresh_token = params.get('refresh_token')

          if (access_token && refresh_token) {
            // Set the session manually from the URL tokens
            const { data, error } = await supabase.auth.setSession({
              access_token,
              refresh_token
            })
            if (!error && data.user) {
              // Clear the hash from URL for cleanliness
              window.history.replaceState(null, '', window.location.pathname)
              await loadProfile(data.user, supabase)
              return
            }
          }
        }
      }

      // Step 2: No hash — check if already have a session
      // Try up to 3 times with a short delay — session cookie may not be readable immediately
      let session = null
      for (let i = 0; i < 3; i++) {
        const { data } = await supabase.auth.getSession()
        if (data.session?.user) {
          session = data.session
          break
        }
        if (i < 2) await new Promise(r => setTimeout(r, 1000))
      }

      if (session?.user) {
        await loadProfile(session.user, supabase)
        return
      }

      // Step 3: No session at all — redirect to login
      router.push('/login')
    }
    init()
  }, [router])

  async function loadProfile(user: any, supabase: any) {
    // Check invites table for role and branch
    const { data: invite } = await supabase
      .from('invites')
      .select('role, branch, full_name')
      .eq('email', user.email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (invite) {
      const role = invite.role || 'volunteer'
      setUserRole(role)
      if (invite.branch) setBranchLabel(invite.branch)
      if (invite.full_name && (role === 'head' || role === 'supervisor')) {
        setForm(f => ({ ...f, full_name: invite.full_name }))
      }
      await supabase.from('profiles').update({
        role,
        branch: invite.branch || null,
        full_name: (role === 'head' || role === 'supervisor') ? (invite.full_name || '') : ''
      }).eq('id', user.id)
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('branch, full_name, role')
        .eq('id', user.id)
        .single()
      if (profile?.branch) setBranchLabel(profile.branch)
      if (profile?.full_name && (profile?.role === 'head' || profile?.role === 'supervisor')) {
        setForm(f => ({ ...f, full_name: profile.full_name }))
      }
      if (profile?.role) setUserRole(profile.role)
    }
    setReady(true)
  }

  function upd(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name || !form.phone) { setError('Full name and phone are required'); return }
    if (!form.password) { setError('Please set a password'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (form.password !== form.confirm_password) { setError('Passwords do not match'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error: passErr } = await supabase.auth.updateUser({ password: form.password })
    if (passErr) { setError(passErr.message); setLoading(false); return }

    const { error: upErr } = await supabase.from('profiles').update({
      full_name: form.full_name,
      phone: form.phone,
      address: [form.address1, form.address2, form.state, form.country].filter(Boolean).join(', '),
      date_of_birth: form.dob || null,
      sub_team: form.sub_team ? form.sub_team.toLowerCase().replace(/ /g, '_') : null,
      onboarding_complete: true,
      updated_at: new Date().toISOString()
    }).eq('id', user.id)

    if (upErr) { setError(upErr.message); setLoading(false); return }

    if (userRole === 'super_admin') { router.push('/super'); return }
    if (userRole === 'head' || userRole === 'supervisor') { router.push('/admin'); return }

    const { data: org } = await supabase.from('organisations').select('id').eq('slug', 'logic-church').single()
    if (org) {
      await supabase.from('probation_cases').insert({
        volunteer_id: user.id, org_id: org.id, status: 'active', current_week: 1
      })
    }
    router.push('/dashboard')
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    border: '1px solid var(--color-border-tertiary, #e5e5e5)',
    borderRadius: 10, fontSize: 13,
    color: 'var(--color-text-primary)',
    background: 'var(--color-background-primary, white)',
    fontFamily: 'inherit', outline: 'none', marginBottom: 10
  }
  const lbl: React.CSSProperties = {
    fontSize: 12, fontWeight: 500, color: '#7B1818', display: 'block', marginBottom: 4
  }
  const divStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: '#7B1818',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    margin: '14px 0 10px', paddingTop: 8,
    borderTop: '0.5px solid var(--color-border-tertiary)'
  }

  const isHOD = userRole === 'head' || userRole === 'supervisor'

  if (!ready) return (
    <div style={{ minHeight: '100vh', background: '#1A1A1A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <div style={{ fontSize: 32 }}>⚡</div>
      <div style={{ fontSize: 14, color: 'white', fontWeight: 500 }}>Setting up your account…</div>
      <div style={{ fontSize: 12, color: '#666' }}>This will only take a moment</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#1A1A1A', padding: '13px 16px 11px' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 2 }}>
          {isHOD ? 'Set up your HOD account' : 'Create your profile'}
        </div>
        <div style={{ fontSize: 11, color: '#888' }}>
          {isHOD ? 'Fill in your details to access your dashboard' : 'Fill in your details to get started'}
        </div>
      </div>
      <div style={{ flex: 1, background: 'var(--color-background-secondary)', padding: 14 }}>
        {branchLabel && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 6, padding: '3px 9px', fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: 12 }}>
            🏢 {branchLabel} — auto assigned
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <label style={lbl}>Full name *</label>
          <input style={inp} value={form.full_name} onChange={e => upd('full_name', e.target.value)} placeholder="Your full name" />
          <label style={lbl}>Phone number *</label>
          <input style={inp} type="tel" value={form.phone} onChange={e => upd('phone', e.target.value)} placeholder="e.g. 08031234567" />
          <div style={divStyle}>Home address</div>
          <label style={lbl}>Street address</label>
          <input style={inp} value={form.address1} onChange={e => upd('address1', e.target.value)} placeholder="House number and street name" />
          <label style={lbl}>Address line 2 <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>(optional)</span></label>
          <input style={inp} value={form.address2} onChange={e => upd('address2', e.target.value)} placeholder="LGA, postal code..." />
          <label style={lbl}>State / Region</label>
          <input style={inp} value={form.state} onChange={e => upd('state', e.target.value)} placeholder="e.g. Lagos, Greater London" />
          <label style={lbl}>Country</label>
          <input style={inp} value={form.country} onChange={e => upd('country', e.target.value)} placeholder="e.g. Nigeria, United Kingdom" />
          <div style={divStyle}>Personal details</div>
          <label style={lbl}>Date of birth</label>
          <input style={inp} type="date" value={form.dob} onChange={e => upd('dob', e.target.value)} />
          {!isHOD && (
            <>
              <label style={lbl}>Sub-team</label>
              <select style={inp} value={form.sub_team} onChange={e => upd('sub_team', e.target.value)}>
                <option value="">Choose your sub-team</option>
                {SUBTEAMS.map(s => <option key={s}>{s}</option>)}
              </select>
            </>
          )}
          <div style={divStyle}>Set your password</div>
          <label style={lbl}>Password *</label>
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <input style={{ ...inp, marginBottom: 0, paddingRight: 44 }} type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => upd('password', e.target.value)} placeholder="Minimum 6 characters" />
            <button type="button" onClick={() => setShowPassword(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--color-text-secondary)' }}>
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          <label style={lbl}>Confirm password *</label>
          <input style={inp} type="password" value={form.confirm_password} onChange={e => upd('confirm_password', e.target.value)} placeholder="Re-enter your password" />
          {error && <div style={{ background: 'var(--color-background-danger)', border: '1px solid var(--color-border-danger)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--color-text-danger)', marginBottom: 8 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: 12, background: '#B71C1C', color: 'white', border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4 }}>
            {loading ? 'Saving…' : isHOD ? 'Save and go to dashboard' : 'Save and enter dashboard'}
          </button>
        </form>
      </div>
    </div>
  )
}
