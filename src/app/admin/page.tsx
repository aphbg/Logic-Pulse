'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { differenceInWeeks } from 'date-fns'

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  active: { bg: 'var(--color-background-success)', color: 'var(--color-text-success)', label: 'Active' },
  at_risk: { bg: 'var(--color-background-warning)', color: 'var(--color-text-warning)', label: 'At risk' },
  critical: { bg: 'var(--color-background-danger)', color: 'var(--color-text-danger)', label: 'Critical' },
  extended: { bg: '#EDE9FE', color: '#5B21B6', label: 'Extended' },
  complete: { bg: 'var(--color-background-success)', color: 'var(--color-text-success)', label: 'Complete' },
}

export default function AdminPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [cases, setCases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!p || p.role === 'volunteer') { router.push('/dashboard'); return }
      if (p.role === 'super_admin') { router.push('/super'); return }
      setProfile(p)
      const { data } = await supabase.from('probation_cases').select('*, volunteer:profiles!probation_cases_user_id_fkey(*)').not('status', 'in', '(released)').order('created_at', { ascending: false })
      setCases(data || [])
      setLoading(false)
    }
    load()
  }, [router])

  async function logout() { const supabase = createClient(); await supabase.auth.signOut(); router.push('/') }

  if (loading) return <div style={{ minHeight: '100vh', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Loading…</div>

  const stats = { total: cases.length, active: cases.filter(c => c.status === 'active').length, at_risk: cases.filter(c => c.status === 'at_risk').length, critical: cases.filter(c => c.status === 'critical').length }

  return (
    <div style={{ minHeight: '100vh', background: '#1A1A1A', display: 'flex', justifyContent: 'center' }}>
    <div style={{ width: '100%', maxWidth: 480, background: 'var(--color-background-secondary)', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ background: '#1A1A1A', padding: '14px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: '#888' }}>Head of Department{profile?.branch ? ` · ${profile.branch}` : ''}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'white' }}>{profile?.full_name || 'Admin'}</div>
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            <Link href="/admin/invite" style={{ width: 32, height: 32, background: '#B71C1C', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: 18 }}>+</Link>
            <button onClick={logout} style={{ background: '#2D2D2D', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, fontSize: 11, color: '#999', fontFamily: 'inherit' }}>⬚ Sign out</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
          {[['Total', stats.total, 'white'], ['Active', stats.active, '#81C784'], ['At risk', stats.at_risk, '#FFB74D'], ['Critical', stats.critical, '#EF9A9A']].map(([label, val, color]) => (
            <div key={label as string} style={{ background: '#2D2D2D', borderRadius: 8, padding: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: color as string }}>{val as number}</div>
              <div style={{ fontSize: 10, color: '#777', marginTop: 1 }}>{label as string}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, padding: 14, background: 'var(--color-background-secondary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#7B1818', textTransform: 'uppercase', letterSpacing: '0.08em' }}>All members</div>
          <Link href="/admin/invite" style={{ fontSize: 12, color: '#B71C1C', textDecoration: 'none', fontWeight: 600 }}>+ Invite</Link>
        </div>
        {cases.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 6 }}>No members yet</div>
            <Link href="/admin/invite" style={{ fontSize: 13, color: '#B71C1C', textDecoration: 'none' }}>Send your first invite →</Link>
          </div>
        ) : cases.map((c: any) => {
          const week = Math.min(differenceInWeeks(new Date(), new Date(c.start_date)) + 1, 8)
          const st = STATUS_STYLE[c.status] || STATUS_STYLE.active
          const initials = c.volunteer?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??'
          return (
            <Link key={c.id} href={`/admin/members/${c.user_id}`} style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 10, padding: '11px 12px', display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7, textDecoration: 'none' }}>
              <div style={{ width: 36, height: 36, background: '#B71C1C', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'white', flexShrink: 0 }}>{initials}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{c.volunteer?.full_name || 'Unknown'}</span>
                  <span style={{ fontSize: 10, background: st.bg, color: st.color, padding: '1px 7px', borderRadius: 99, fontWeight: 500 }}>{st.label}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{c.volunteer?.sub_team?.replace(/_/g, ' ') || 'No sub-team'} · Week {week}</div>
                <div style={{ height: 3, background: 'var(--color-border-tertiary)', borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
                  <div style={{ width: `${Math.round(week / 8 * 100)}%`, height: '100%', background: '#B71C1C', borderRadius: 2 }} />
                </div>
              </div>
              <span style={{ fontSize: 16, color: 'var(--color-text-secondary)' }}>›</span>
            </Link>
          )
        })}
      </div>
    </div>
    </div>
  )
}
