'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { differenceInWeeks } from 'date-fns'

export default function ServiceReportPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [caseId, setCaseId] = useState<string | null>(null)
  const [weekNumber, setWeekNumber] = useState(1)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const [{ data: pc }, { data: qs }] = await Promise.all([
        supabase.from('probation_cases').select('*').eq('user_id', user.id).single(),
        supabase.from('checkin_questions').select('*').eq('is_active', true).order('display_order')
      ])
      if (!pc) { router.push('/dashboard'); return }
      const week = Math.min(differenceInWeeks(new Date(), new Date(pc.start_date)) + 1, 8)
      setCaseId(pc.id); setWeekNumber(week); setQuestions(qs || [])
      const { data: existing } = await supabase.from('checkin_submissions').select('id').eq('case_id', pc.id).eq('week_number', week).single()
      if (existing) setAlreadySubmitted(true)
      setLoading(false)
    }
    load()
  }, [router])

  function setAns(id: string, val: any) { setAnswers(p => ({ ...p, [id]: val })) }

  async function handleSubmit() {
    if (!caseId) return
    setSubmitting(true)
    const supabase = createClient()
    await supabase.from('checkin_submissions').insert({ case_id: caseId, week_number: weekNumber, answers })
    router.push('/dashboard')
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Loading…</div>

  const S = { page: { minHeight: '100vh', display: 'flex', flexDirection: 'column' as const }, topbar: { background: '#1A1A1A', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }, body: { flex: 1, padding: 14, background: 'var(--color-background-secondary)', overflowY: 'auto' as const } }

  if (alreadySubmitted) return (
    <div style={S.page}>
      <div style={S.topbar}><Link href="/dashboard" style={{ color: '#999', fontSize: 18, textDecoration: 'none' }}>←</Link><span style={{ fontSize: 13, fontWeight: 500, color: 'white' }}>Service report</span></div>
      <div style={{ ...S.body, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>Already submitted</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'center', marginBottom: 20 }}>You have already submitted your Week {weekNumber} report.</div>
        <Link href="/dashboard" style={{ padding: '11px 24px', background: '#B71C1C', color: 'white', borderRadius: 11, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>Back to dashboard</Link>
      </div>
    </div>
  )

  return (
    <div style={S.page}>
      <div style={S.topbar}><Link href="/dashboard" style={{ color: '#999', fontSize: 18, textDecoration: 'none' }}>←</Link><span style={{ fontSize: 13, fontWeight: 500, color: 'white' }}>Service report · Week {weekNumber}</span></div>
      <div style={S.body}>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>Complete this right after service. Takes less than 2 minutes.</p>
        {questions.map((q, i) => (
          <div key={q.id} style={{ background: 'var(--color-background-primary, white)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 10, padding: '12px 13px', marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: '#B71C1C', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Question {i + 1}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 10, lineHeight: 1.4 }}>{q.question_text}</div>
            {q.answer_type === 'rating' && (
              <div style={{ display: 'flex', gap: 5 }}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setAns(q.id, n)} style={{ flex: 1, height: 36, border: `1px solid ${answers[q.id] === n ? '#B71C1C' : 'var(--color-border-tertiary)'}`, borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: answers[q.id] === n ? '#B71C1C' : 'var(--color-background-primary)', color: answers[q.id] === n ? 'white' : 'var(--color-text-primary)', fontFamily: 'inherit' }}>{n}</button>
                ))}
              </div>
            )}
            {q.answer_type === 'yes_no' && (
              <div style={{ display: 'flex', gap: 6 }}>
                {['Yes','No','Partially'].map(opt => (
                  <button key={opt} onClick={() => setAns(q.id, opt)} style={{ flex: 1, padding: 8, border: `1px solid ${answers[q.id] === opt ? '#B71C1C' : 'var(--color-border-tertiary)'}`, borderRadius: 9, fontSize: 13, cursor: 'pointer', background: answers[q.id] === opt ? '#B71C1C' : 'var(--color-background-primary)', color: answers[q.id] === opt ? 'white' : 'var(--color-text-primary)', fontFamily: 'inherit', fontWeight: 500 }}>{opt}</button>
                ))}
              </div>
            )}
            {q.answer_type === 'text' && (
              <textarea value={answers[q.id] || ''} onChange={e => setAns(q.id, e.target.value)} style={{ width: '100%', border: '1px solid var(--color-border-tertiary)', borderRadius: 8, padding: '9px 11px', fontSize: 13, resize: 'none', minHeight: 64, color: 'var(--color-text-primary)', fontFamily: 'inherit', background: 'var(--color-background-primary)', outline: 'none' }} placeholder="Write here…" />
            )}
          </div>
        ))}
        <button onClick={handleSubmit} disabled={submitting} style={{ width: '100%', padding: 12, background: '#B71C1C', color: 'white', border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>{submitting ? 'Submitting…' : 'Submit report'}</button>
        <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', textAlign: 'center', marginTop: 8 }}>Submitted reports cannot be edited.</p>
      </div>
    </div>
  )
}
