'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'

const RATING_DISPLAY: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: 'Pending', bg: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)' },
  needs_improvement: { label: 'Needs Improvement', bg: 'var(--color-background-danger)', color: 'var(--color-text-danger)' },
  fair: { label: 'Fair', bg: 'var(--color-background-warning)', color: 'var(--color-text-warning)' },
  good: { label: 'Good', bg: 'var(--color-background-success)', color: 'var(--color-text-success)' },
  excellent: { label: 'Excellent', bg: '#EDE9FE', color: '#5B21B6' },
}

export default function AssessmentsPage() {
  const router = useRouter()
  const [assessments, setAssessments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: pc } = await supabase.from('probation_cases').select('id').eq('user_id', user.id).single()
      if (pc) {
        const { data } = await supabase.from('supervisor_assessments').select('*').eq('case_id', pc.id).order('assessed_at', { ascending: false })
        setAssessments(data || [])
      }
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return <div style={{ minHeight: '100vh', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Loading…</div>

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#1A1A1A', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/dashboard" style={{ color: '#999', fontSize: 18, textDecoration: 'none' }}>←</Link>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'white' }}>My assessments</span>
      </div>
      <div style={{ flex: 1, padding: 14, background: 'var(--color-background-secondary)' }}>
        {assessments.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 6 }}>No assessments yet</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Your sub-team lead will add assessments as your probation progresses.</div>
          </div>
        ) : assessments.map((a: any) => {
          const r = RATING_DISPLAY[a.overall_rating] || RATING_DISPLAY.pending
          return (
            <div key={a.id} style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 10, padding: '12px 13px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {a.week_number ? `Week ${a.week_number}` : format(new Date(a.assessed_at), 'dd MMM yyyy')}
                </span>
                <span style={{ fontSize: 10, background: r.bg, color: r.color, padding: '2px 8px', borderRadius: 99, fontWeight: 500 }}>{r.label}</span>
              </div>
              {a.notes && <p style={{ fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.5 }}>{a.notes}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
