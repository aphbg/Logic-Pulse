'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const BRANCHES: Record<string, { lat: number; lng: number; radius: number }> = {
  'Lagos Mainland — Nigeria': { lat: 6.576421, lng: 3.365344, radius: 200 },
  'Lagos Island — Nigeria':   { lat: 6.42905,  lng: 3.46271,  radius: 200 },
  'Port Harcourt — Nigeria':  { lat: 4.8156,   lng: 7.0498,   radius: 200 },
  'Abuja — Nigeria':          { lat: 9.0579,   lng: 7.4951,   radius: 200 },
  'Ghana':                    { lat: 5.6037,   lng: -0.1870,  radius: 200 },
  'UK — London':              { lat: 51.5074,  lng: -0.1278,  radius: 200 },
  'UK — Ireland':             { lat: 53.3498,  lng: -6.2603,  radius: 200 },
  'Houston — USA':            { lat: 29.7604,  lng: -95.3698, radius: 200 },
}

function getDistanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

const SERVICES = [
  { id: 'sunday_first',  name: 'Sunday First Service',  time: '8:00 AM' },
  { id: 'sunday_second', name: 'Sunday Second Service', time: '10:30 AM' },
  { id: 'midweek',       name: 'Midweek Koinonia',      time: 'Wednesday · 6:00 PM' },
]

export default function AttendancePage() {
  const router = useRouter()
  const [selected, setSelected] = useState('sunday_first')
  const [locationStatus, setLocationStatus] = useState<'checking'|'verified'|'failed'|'denied'>('checking')
  const [distance, setDistance] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [userBranch, setUserBranch] = useState('')

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('branch').eq('id', user.id).single()
      const branch = profile?.branch || 'Lagos Island — Nigeria'
      setUserBranch(branch)
      checkLocation(branch)
    }
    init()
  }, [router])

  function checkLocation(branch: string) {
    if (!navigator.geolocation) { setLocationStatus('failed'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = BRANCHES[branch] || BRANCHES['Lagos Island — Nigeria']
        const dist = getDistanceMetres(pos.coords.latitude, pos.coords.longitude, coords.lat, coords.lng)
        setDistance(Math.round(dist))
        setLocationStatus(dist <= coords.radius ? 'verified' : 'failed')
      },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function handleSubmit() {
    if (locationStatus !== 'verified') return
    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: probation } = await supabase.from('probation_cases').select('id').eq('volunteer_id', user.id).eq('status', 'active').single()
    if (probation) {
      await supabase.from('attendance_logs').insert({
        case_id: probation.id,
        volunteer_id: user.id,
        service_type: selected,
        service_name: SERVICES.find(s => s.id === selected)?.name,
        status: 'present',
        punctuality: 'on_time',
        logged_at: new Date().toISOString()
      })
    }
    setSubmitted(true)
    setSubmitting(false)
  }

  const svcStyle = (sel: boolean): React.CSSProperties => ({
    background: sel ? '#B71C1C' : 'var(--color-background-primary)',
    border: `1.5px solid ${sel ? '#B71C1C' : 'var(--color-border-tertiary)'}`,
    borderRadius: 12, padding: 13, display: 'flex', alignItems: 'center',
    gap: 10, marginBottom: 10, cursor: 'pointer'
  })

  if (submitted) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-background-secondary)' }}>
      <div style={{ background: '#1A1A1A', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/dashboard" style={{ color: '#999', fontSize: 18, textDecoration: 'none' }}>←</Link>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'white' }}>Log attendance</span>
      </div>
      <div style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>Attendance logged</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'center', marginBottom: 20 }}>
          {SERVICES.find(s => s.id === selected)?.name} recorded successfully.
        </div>
        <Link href="/dashboard" style={{ padding: '11px 24px', background: '#B71C1C', color: 'white', borderRadius: 11, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>Back to dashboard</Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-background-secondary)' }}>
      <div style={{ background: '#1A1A1A', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/dashboard" style={{ color: '#999', fontSize: 18, textDecoration: 'none' }}>←</Link>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'white' }}>Log attendance</span>
      </div>
      <div style={{ flex: 1, padding: 14 }}>

        {locationStatus === 'checking' && (
          <div style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span>📍</span><p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Checking your location…</p>
          </div>
        )}
        {locationStatus === 'verified' && (
          <div style={{ background: 'var(--color-background-success)', border: '0.5px solid #16A34A', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span>📍</span><p style={{ fontSize: 12, color: 'var(--color-text-success)' }}>Location verified · You are at Logic Church</p>
          </div>
        )}
        {locationStatus === 'failed' && (
          <div style={{ background: 'var(--color-background-danger)', border: '0.5px solid #B71C1C', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-danger)', fontWeight: 600, marginBottom: 2 }}>You are not at Logic Church</p>
            <p style={{ fontSize: 11, color: 'var(--color-text-danger)' }}>
              {distance !== null
                ? `You are approximately ${distance > 1000 ? `${(distance/1000).toFixed(1)}km` : `${distance}m`} away. Attendance can only be logged on church premises.`
                : 'Could not verify your location.'}
            </p>
          </div>
        )}
        {locationStatus === 'denied' && (
          <div style={{ background: 'var(--color-background-danger)', border: '0.5px solid #B71C1C', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-danger)', fontWeight: 600, marginBottom: 2 }}>Location access denied</p>
            <p style={{ fontSize: 11, color: 'var(--color-text-danger)' }}>Please enable location permissions in your browser settings to log attendance.</p>
          </div>
        )}

        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12 }}>Select the one service you attended, then submit.</p>

        {SERVICES.map(svc => (
          <div key={svc.id} style={svcStyle(selected === svc.id)} onClick={() => setSelected(svc.id)}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${selected === svc.id ? 'white' : 'var(--color-border-secondary)'}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {selected === svc.id && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: selected === svc.id ? 'white' : 'var(--color-text-primary)' }}>{svc.name}</div>
              <div style={{ fontSize: 11, marginTop: 2, color: selected === svc.id ? 'rgba(255,255,255,0.7)' : 'var(--color-text-secondary)' }}>{svc.time}</div>
            </div>
          </div>
        ))}

        <div style={{ border: '1.5px solid #B71C1C', borderRadius: 9, padding: '9px 11px', margin: '12px 0', display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 13 }}>🔒</span>
          <p style={{ fontSize: 11, color: 'var(--color-text-primary)' }}>Once submitted, attendance is locked and cannot be changed.</p>
        </div>

        <button onClick={handleSubmit} disabled={locationStatus !== 'verified' || submitting}
          style={{ width: '100%', padding: 12, background: locationStatus === 'verified' ? '#B71C1C' : 'var(--color-background-secondary)', color: locationStatus === 'verified' ? 'white' : 'var(--color-text-secondary)', border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 500, cursor: locationStatus === 'verified' ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
          {submitting ? 'Submitting…' : locationStatus !== 'verified' ? 'Must be at church to submit' : 'Submit attendance'}
        </button>
      </div>
    </div>
  )
}
