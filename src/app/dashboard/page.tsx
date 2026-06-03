'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { differenceInWeeks, format } from 'date-fns'

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const [{ data: profile }, { data: pc }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('probation_cases').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single()
      ])
      if (!profile?.onboarding_complete) { router.push('/onboarding'); return }
      const [{ data: badges }, { data: assessments }, { count: reportCount }] = await Promise.all([
        supabase.from('volunteer_badges').select('*, badge:badges(*)').eq('user_id', user.id),
        supabase.from('supervisor_assessments').select('*').eq('case_id', pc?.id).order('assessed_at', { ascending: false }).limit(1),
        supabase.from('checkin_submissions').select('*', { count: 'exact', head: true }).eq('case_id', pc?.id)
      ])
      setData({ profile, pc, badges: badges || [], latestAssessment: assessments?.[0], reportCount: reportCount || 0 })
      setLoading(false)
    }
    load()
  }, [router])

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Loading…</div>
  if (!data) return null

  const { profile, pc, badges, latestAssessment, reportCount } = data
  const week = pc ? Math.min(differenceInWeeks(new Date(), new Date(pc.start_date)) + 1, 8) : 0
  const progress = Math.round((week / 8) * 100)
  const subTeamLabel = profile.sub_team?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || ''

  const S = { page: { minHeight: '100vh', display: 'flex', flexDirection: 'column' as const, background: '#1A1A1A' }, hdr: { background: '#1A1A1A', padding: '14px 16px 12px', maxWidth: 480, margin: '0 auto', width: '100%' }, body: { flex: 1, padding: 14, background: 'var(--color-background-secondary, #FAFAFA)', overflowY: 'auto' as const }, wrap: { maxWidth: 480, margin: '0 auto', width: '100%', background: 'var(--color-background-secondary, #FAFAFA)', minHeight: '100vh', display: 'flex', flexDirection: 'column' as const } }

  return (
    <div style={{ minHeight: '100vh', background: '#1A1A1A', display: 'flex', justifyContent: 'center' }}>
    <div style={{ width: '100%', maxWidth: 480, background: 'var(--color-background-secondary)', display: 'flex', flexDirection: 'column' as const, minHeight: '100vh' }}>
      <div style={{ background: '#1A1A1A', padding: '14px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: '#888' }}>Member{subTeamLabel ? ` · ${subTeamLabel}` : ''}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'white', letterSpacing: '-0.2px' }}>{profile.full_name}</div>
          </div>
          <button onClick={logout} style={{ width: 32, height: 32, background: '#2D2D2D', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⬚</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#bbb', whiteSpace: 'nowrap' }}>Probation · Week {week} of 8</span>
          <div style={{ flex: 1, height: 3, background: '#333', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: '#B71C1C', borderRadius: 2 }} />
          </div>
          <span style={{ fontSize: 11, color: '#bbb' }}>{progress}%</span>
        </div>
      </div>
      <div style={{ flex: 1, padding: 14, background: 'var(--color-background-secondary, #FAFAFA)', overflowY: 'auto' as const }}>
        <Link href="/dashboard/attendance" style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#B71C1C', border: 'none', borderRadius: 12, padding: '14px 16px', marginBottom: 14, cursor: 'pointer', textDecoration: 'none' }}>
          <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📍</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>Log attendance</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>Tap to log your arrival at service</div>
          </div>
          <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }}>›</span>
        </Link>

        <div style={{ fontSize: 11, fontWeight: 600, color: '#7B1818', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Actions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 14 }}>
          <Link href="/dashboard/report" style={{ background: 'var(--color-background-warning, #FFFDE7)', border: '0.5px solid #F59E0B', borderRadius: 10, padding: '11px 10px', textDecoration: 'none', display: 'block' }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>📋</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>Service report</div>
            <div style={{ fontSize: 11, marginTop: 2, color: 'var(--color-text-warning)' }}>Submit after service</div>
          </Link>
          <Link href="/dashboard/upload" style={{ background: pc?.lfc_confirmed ? 'var(--color-background-success, #F1F8E9)' : 'var(--color-background-danger, #FFEBEE)', border: `0.5px solid ${pc?.lfc_confirmed ? '#16A34A' : '#B71C1C'}`, borderRadius: 10, padding: '11px 10px', textDecoration: 'none', display: 'block' }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>🎓</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>LFC certificate</div>
            <div style={{ fontSize: 11, marginTop: 2, color: pc?.lfc_confirmed ? 'var(--color-text-success)' : 'var(--color-text-danger)' }}>{pc?.lfc_confirmed ? '✓ Confirmed' : pc?.lfc_uploaded ? 'Awaiting review' : 'Upload required'}</div>
          </Link>
          <Link href="/dashboard/assessments" style={{ background: 'var(--color-background-primary, white)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 10, padding: '11px 10px', textDecoration: 'none', display: 'block' }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>⭐</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>Assessments</div>
            <div style={{ fontSize: 11, marginTop: 2, color: 'var(--color-text-secondary)' }}>{latestAssessment ? `Latest: ${latestAssessment.overall_rating}` : 'None yet'}</div>
          </Link>
          <div style={{ background: badges.length > 0 ? 'var(--color-background-success, #F1F8E9)' : 'var(--color-background-primary, white)', border: `0.5px solid ${badges.length > 0 ? '#16A34A' : 'var(--color-border-tertiary)'}`, borderRadius: 10, padding: '11px 10px' }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>🏆</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>My badges</div>
            <div style={{ fontSize: 11, marginTop: 2, color: badges.length > 0 ? 'var(--color-text-success)' : 'var(--color-text-secondary)' }}>{badges.length > 0 ? `${badges.length} earned` : 'None yet'}</div>
          </div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 600, color: '#7B1818', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>My journey</div>
        {pc && (
          <div style={{ background: 'var(--color-background-primary, white)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 10, padding: '12px 13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>Probation progress</span>
              <span style={{ fontSize: 11, background: 'var(--color-background-danger)', color: 'var(--color-text-danger)', padding: '2px 8px', borderRadius: 99, fontWeight: 500 }}>Week {week} of 8</span>
            </div>
            <div style={{ height: 5, background: 'var(--color-border-tertiary)', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ width: `${progress}%`, height: '100%', background: '#B71C1C', borderRadius: 3 }} />
            </div>
            {[
              { label: 'Probation started', done: true, date: format(new Date(pc.start_date), 'dd MMM yyyy') },
              { label: `Week 1 service report`, done: reportCount >= 1, date: reportCount >= 1 ? 'Submitted' : 'Pending' },
              { label: 'LFC certificate', done: pc.lfc_confirmed, date: pc.lfc_confirmed ? 'Confirmed' : 'Not uploaded' },
              { label: 'Midpoint review', done: week >= 4, date: 'Week 4' },
              { label: 'Final assessment', done: week >= 8, date: 'Week 8' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 9, marginBottom: 7, alignItems: 'flex-start' }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: item.done ? '#B71C1C' : 'var(--color-border-tertiary)', flexShrink: 0, marginTop: 3 }} />
                <div style={{ fontSize: 12, color: item.done ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                  <strong style={{ fontWeight: 500, display: 'block', fontSize: 13 }}>{item.label}</strong>{item.date}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  )
}
