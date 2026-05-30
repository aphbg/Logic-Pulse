'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) { setError(authError.message); setLoading(false); return }
    if (data.user) {
      const { data: profile } = await supabase.from('profiles').select('role, onboarding_complete').eq('id', data.user.id).single()
      if (!profile?.onboarding_complete) { router.push('/onboarding'); return }
      if (profile?.role === 'super_admin') { router.push('/super'); return }
      if (profile?.role === 'head' || profile?.role === 'supervisor') { router.push('/admin'); return }
      router.push('/dashboard')
    }
    setLoading(false)
  }

  const s = {
    wrap: { minHeight: '100vh', background: '#1A1A1A', display: 'flex', flexDirection: 'column' as const, padding: '28px 24px', justifyContent: 'center' },
    back: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#666', fontSize: 12, marginBottom: 28, padding: 0, fontFamily: 'inherit' },
    logo: { width: 44, height: 44, background: '#B71C1C', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, fontSize: 20 },
    h1: { fontSize: 22, fontWeight: 600, color: 'white', marginBottom: 4, letterSpacing: '-0.3px' },
    sub: { fontSize: 13, color: '#666', marginBottom: 28 },
    label: { fontSize: 12, fontWeight: 500, color: '#777', display: 'block', marginBottom: 4 },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #3D3D3D', borderRadius: 10, fontSize: 13, color: 'white', background: '#2D2D2D', fontFamily: 'inherit', outline: 'none', marginBottom: 11 },
    btn: { width: '100%', padding: '13px', background: '#B71C1C', color: 'white', border: 'none', borderRadius: 11, fontSize: 14, fontWeight: 500, cursor: 'pointer', marginTop: 10, fontFamily: 'inherit' },
    err: { background: '#3D1515', border: '1px solid #7B1818', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#EF9A9A', marginBottom: 8 },
    hint: { textAlign: 'center' as const, fontSize: 11, color: '#555', marginTop: 14 },
  }

  return (
    <div style={s.wrap}>
      <Link href="/" style={s.back}>← Back</Link>
      <div style={s.logo}>⚡</div>
      <h1 style={s.h1}>Welcome back</h1>
      <p style={s.sub}>Sign in to Logic Pulse</p>
      <form onSubmit={handleLogin}>
        <label style={s.label}>Email address</label>
        <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required />
        <label style={s.label}>Password</label>
        <div style={{ position: 'relative', marginBottom: 11 }}>
          <input
            style={{ ...s.input, marginBottom: 0, paddingRight: 44 }}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(s => !s)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#666' }}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
        {error && <div style={s.err}>{error}</div>}
        <button style={s.btn} type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p style={s.hint}>Forgot password? Contact your department admin.</p>
    </div>
  )
}
