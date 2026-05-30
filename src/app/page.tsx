'use client'
import Link from 'next/link'

const FEATURES = [
  { icon: '📍', text: 'Track attendance and punctuality' },
  { icon: '📋', text: 'Submit service reports after each service' },
  { icon: '⭐', text: 'Receive assessments from your sub-team lead' },
  { icon: '🏆', text: 'Earn milestone badges across your journey' },
]

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#1A1A1A', display: 'flex', flexDirection: 'column', padding: '32px 24px' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 64, height: 64, background: '#B71C1C', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, fontSize: 30 }}>⚡</div>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'white', marginBottom: 6, letterSpacing: '-0.3px' }}>Logic Pulse</h1>
        <p style={{ fontSize: 12, color: '#888', textAlign: 'center', lineHeight: 1.7, marginBottom: 32 }}>
          Workforce Management System<br />for the Media Department
        </p>
        <div style={{ width: '100%', background: '#2D2D2D', borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: i < FEATURES.length - 1 ? 10 : 0, marginBottom: i < FEATURES.length - 1 ? 10 : 0, borderBottom: i < FEATURES.length - 1 ? '0.5px solid #3D3D3D' : 'none' }}>
              <div style={{ width: 28, height: 28, background: '#B71C1C', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>{f.icon}</div>
              <span style={{ fontSize: 12, color: '#bbb' }}>{f.text}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: '#555', textAlign: 'center' }}>Invite-only system. Access granted by your admin.</p>
      </div>
      <Link href="/login" style={{ display: 'block', width: '100%', padding: '14px', background: '#B71C1C', color: 'white', border: 'none', borderRadius: 11, fontSize: 14, fontWeight: 500, cursor: 'pointer', textAlign: 'center', textDecoration: 'none', marginTop: 20 }}>
        Sign in
      </Link>
    </div>
  )
}
