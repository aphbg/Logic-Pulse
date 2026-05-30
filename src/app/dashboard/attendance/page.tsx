'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'

const SERVICES = [
  { name: 'Sunday First Service', time: '8:00 AM', start_hour: 8, start_min: 0 },
  { name: 'Sunday Second Service', time: '10:30 AM', start_hour: 10, start_min: 30 },
  { name: 'Midweek Koinonia', time: 'Wednesday · 6:00 PM', start_hour: 18, start_min: 0 },
]

export default function AttendancePage() {
  const router = useRouter()
  const [selected, setSelected] = useState<number | null>(null)
  const [caseId, setCaseId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [locationOk, setLocationOk] = useState<boolean | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: pc } = await supabase.from('probation_cases').select('id').eq('user_id', user.id).single()
      if (pc) setCaseId(pc.id)
      setLoading(false)
      // Request geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => setLocationOk(true),
          () => setLocationOk(false)
        )
      } else {
        setLocationOk(false)
      }
    }
    load()
  }, [router])

  async function handleSubmit() {
    if (selected === null || !caseId) return
    setSubmitting(true)
    const supabase = createClient()
    const svc = SERVICES[selected]
    const now = new Date()
    const serviceStart = new Date()
    serviceStart.setHours(svc.start_hour, svc.start_min, 0, 0)
    const diffMins = Math.round((now.getTime() - serviceStart.getTime()) / 60000)
    const punctuality = diffMins < -5 ? 'early' : diffMins <= 15 ? 'on_time' : 'late'

    // Get or create service record
    const today = format(now, 'yyyy-MM-dd')
    let { data: service } = await supabase.from('services').select('id').eq('name', svc.name).eq('service_date', today).single()
    if (!service) {
      const { data: org } = await supabase.from('organisations').select('id').single()
      const { data: newSvc } = await supabase.from('services').insert({ org_id: org?.id, name: svc.name, service_date: today, start_time: `${svc.start_hour.toString().padStart(2,'0')}:${svc.start_min.toString().padStart(2,'0')}` }).select('id').single()
      service = newSvc
    }

    if (service) {
      await supabase.from('attendance_logs').insert({ case_id: caseId, service_id: service.id, arrived_at: now.toISOString(), punctuality, minutes_diff: diffMins })
    }
    setSuccess(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Loading…</div>

  const S = {
    page: { minHeight: '100vh', display: 'flex', flexDirection: 'column' as const },
    topbar: { background: '#1A1A1A', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 },
    body: { flex: 1, padding: 14, background: 'var(--color-background-secondary, #FAFAFA)' },
    svc: (sel: boolean) => ({ background: sel ? '#B71C1C' : 'var(--color-background-primary, white)', border: `1.5px solid ${sel ? '#B71C1C' : 'var(--color-border-tertiary, #e5e5e5)'}`, borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, cursor: 'pointer' }),
    radio: (sel: boolean) => ({ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${sel ? 'white' : 'var(--color-border-secondary, #ccc)'}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: sel ? 'white' : 'transparent' }),
    radioDot: { width: 7, height: 7, borderRadius: '50%', background: '#B71C1C' },
  }

  if (success) return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>Attendance logged</div>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'center' }}>Your attendance has been recorded. Redirecting…</div>
    </div>
  )

  return (
    <div style={S.page}>
      <div style={S.topbar}>
        <Link href="/dashboard" style={{ color: '#999', fontSize: 18, textDecoration: 'none' }}>←</Link>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'white' }}>Log attendance</span>
      </div>
      <div style={S.body}>
        <div style={{ background: locationOk === false ? 'var(--color-background-danger)' : 'var(--color-background-success)', border: `0.5px solid ${locationOk === false ? '#B71C1C' : '#16A34A'}`, borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 15 }}>{locationOk === false ? '⚠️' : '📍'}</span>
          <p style={{ fontSize: 12, color: locationOk === false ? 'var(--color-text-danger)' : 'var(--color-text-success)', lineHeight: 1.4 }}>
            {locationOk === null ? 'Verifying location…' : locationOk ? 'Location verified · You are at Logic Church' : 'Location could not be verified · Proceed with care'}
          </p>
        </div>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>Select the one service you attended, then submit.</p>
        {SERVICES.map((svc, i) => (
          <div key={i} style={S.svc(selected === i)} onClick={() => setSelected(i)}>
            <div style={S.radio(selected === i)}>{selected === i && <div style={S.radioDot} />}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: selected === i ? 'white' : 'var(--color-text-primary)' }}>{svc.name}</div>
              <div style={{ fontSize: 11, color: selected === i ? 'rgba(255,255,255,0.75)' : 'var(--color-text-secondary)', marginTop: 2 }}>{svc.time}</div>
            </div>
          </div>
        ))}
        <div style={{ border: '1.5px solid #B71C1C', borderRadius: 10, padding: '10px 12px', margin: '14px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>🔒</span>
          <p style={{ fontSize: 11, color: 'var(--color-text-primary)', lineHeight: 1.4 }}>Once submitted, attendance is locked and cannot be changed.</p>
        </div>
        <button onClick={handleSubmit} disabled={selected === null || submitting} style={{ width: '100%', padding: 12, background: selected !== null ? '#B71C1C' : 'var(--color-background-secondary)', color: selected !== null ? 'white' : 'var(--color-text-secondary)', border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 500, cursor: selected !== null ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
          {submitting ? 'Submitting…' : 'Submit attendance'}
        </button>
      </div>
    </div>
  )
}
