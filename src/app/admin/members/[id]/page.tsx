'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function MemberDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [volunteer, setVolunteer] = useState<any>(null)
  const [probation, setProbation] = useState<any>(null)
  const [attendance, setAttendance] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [assessments, setAssessments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [newRating, setNewRating] = useState('')
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [statusUpdate, setStatusUpdate] = useState('')

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    const supabase = createClient()
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).single()
    setVolunteer(profile)
    const { data: prob } = await supabase.from('probation_cases').select('*').eq('volunteer_id', id).order('created_at', { ascending: false }).limit(1).single()
    setProbation(prob)
    if (prob) {
      const { data: att } = await supabase.from('attendance_logs').select('*').eq('case_id', prob.id).order('created_at', { ascending: false })
      setAttendance(att || [])
      const { data: rep } = await supabase.from('checkin_submissions').select('*').eq('case_id', prob.id).order('created_at', { ascending: false })
      setReports(rep || [])
      const { data: ass } = await supabase.from('supervisor_assessments').select('*').eq('case_id', prob.id).order('created_at', { ascending: false })
      setAssessments(ass || [])
    }
    setLoading(false)
  }

  async function saveAssessment() {
    if (!newRating || !probation) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('supervisor_assessments').insert({ case_id: probation.id, volunteer_id: id, rating: newRating, notes: newNote, week_number: probation.current_week || 1 })
    setNewRating('')
    setNewNote('')
    await loadData()
    setSaving(false)
  }

  async function updateStatus() {
    if (!statusUpdate || !probation) return
    const supabase = createClient()
    await supabase.from('probation_cases').update({ status: statusUpdate }).eq('id', probation.id)
    await loadData()
  }

  const attPct = attendance.length > 0 ? Math.round((attendance.filter((a: any) => a.status === 'present').length / attendance.length) * 100) : 0
  const puncPct = attendance.length > 0 ? Math.round((attendance.filter((a: any) => a.punctuality !== 'late').length / attendance.length) * 100) : 0

  const s: any = {
    wrap: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F5F5F5' },
    topbar: { background: '#1A1A1A', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 },
    stats: { background: '#1A1A1A', padding: '10px 16px 12px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 },
    statBox: { background: '#2D2D2D', borderRadius: 8, padding: '8px', textAlign: 'center' as const },
    tabs: { background: '#1A1A1A', padding: '0 16px 10px', display: 'flex', gap: 4 },
    tab: (active: boolean) => ({ flex: 1, padding: '6px', fontSize: 11, fontWeight: 600, borderRadius: 7, border: 'none', cursor: 'pointer', background: active ? '#B71C1C' : '#2D2D2D', color: active ? 'white' : '#888', fontFamily: 'inherit' }),
    body: { flex: 1, padding: 14 },
    card: { background: 'white', border: '0.5px solid #E5E5E5', borderRadius: 10, padding: '12px 13px', marginBottom: 8 },
    row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '0.5px solid #E5E5E5', fontSize: 13 },
    label: { fontSize: 11, fontWeight: 600, color: '#7B1818', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 8 },
    btn: { flex: 1, padding: 9, background: '#B71C1C', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
    select: { flex: 1, padding: 9, border: '1px solid #E5E5E5', borderRadius: 8, fontSize: 13, color: '#1A1A1A', background: 'white', fontFamily: 'inherit' },
    pill: (color: string, bg: string) => ({ background: bg, color: color, fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 500 }),
    attRow: { background: 'white', border: '0.5px solid #E5E5E5', borderRadius: 10, padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 },
    yn: (sel: boolean) => ({ flex: 1, padding: 8, border: `1px solid ${sel ? '#B71C1C' : '#E5E5E5'}`, borderRadius: 9, fontSize: 12, cursor: 'pointer', background: sel ? '#B71C1C' : 'white', color: sel ? 'white' : '#1A1A1A', textAlign: 'center' as const, fontFamily: 'inherit', fontWeight: 500 }),
    textarea: { width: '100%', padding: '9px 11px', border: '1px solid #E5E5E5', borderRadius: 8, fontSize: 13, resize: 'none' as const, minHeight: 64, color: '#1A1A1A', fontFamily: 'inherit', background: 'white' },
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14 }}>Loading...</div>
  if (!volunteer) return <div style={{ minHeight: '100vh', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14 }}>Member not found</div>

  return (
    <div style={s.wrap}>
      <div style={s.topbar}>
        <Link href="/admin" style={{ color: '#999', fontSize: 18, textDecoration: 'none' }}>←</Link>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'white' }}>{volunteer.full_name}</span>
      </div>

      <div style={s.stats}>
        <div style={s.statBox}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#81C784' }}>{attPct}%</div>
          <div style={{ fontSize: 10, color: '#777', marginTop: 1 }}>Attendance</div>
        </div>
        <div style={s.statBox}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#81C784' }}>{puncPct}%</div>
          <div style={{ fontSize: 10, color: '#777', marginTop: 1 }}>Punctuality</div>
        </div>
        <div style={s.statBox}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#FFB74D' }}>{reports.length}/8</div>
          <div style={{ fontSize: 10, color: '#777', marginTop: 1 }}>Reports</div>
        </div>
      </div>

      <div style={s.tabs}>
        {['overview', 'attendance', 'reports', 'assess'].map(tab => (
          <button key={tab} style={s.tab(activeTab === tab)} onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div style={s.body}>
        {activeTab === 'overview' && (
          <div>
            <div style={s.card}>
              <div style={s.label}>Member info</div>
              <div style={s.row}><span style={{ color: '#888' }}>Phone</span><span style={{ fontWeight: 500 }}>{volunteer.phone || '—'}</span></div>
              <div style={s.row}><span style={{ color: '#888' }}>Branch</span><span style={{ fontWeight: 500 }}>{volunteer.branch || '—'}</span></div>
              <div style={s.row}><span style={{ color: '#888' }}>Sub-team</span><span style={{ fontWeight: 500 }}>{volunteer.sub_team || '—'}</span></div>
              <div style={s.row}><span style={{ color: '#888' }}>Start date</span><span style={{ fontWeight: 500 }}>{probation ? new Date(probation.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span></div>
              <div style={{ ...s.row, borderBottom: 'none' }}><span style={{ color: '#888' }}>LFC certificate</span><span style={{ fontWeight: 500, color: volunteer.lfc_uploaded ? '#2E7D32' : '#B71C1C' }}>{volunteer.lfc_uploaded ? 'Uploaded' : 'Not uploaded'}</span></div>
            </div>
            {probation && (
              <div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <select style={s.select} value={statusUpdate} onChange={e => setStatusUpdate(e.target.value)}>
                    <option value="">Update status</option>
                    <option value="active">Active</option>
                    <option value="at_risk">At Risk</option>
                    <option value="critical">Critical</option>
                    <option value="extended">Extended</option>
                    <option value="approved">Approved</option>
                    <option value="released">Released</option>
                  </select>
                  <button style={s.btn} onClick={updateStatus}>Update</button>
                </div>
                <div style={{ background: '#E8F5E9', border: '0.5px solid #A5D6A7', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#2E7D32', marginBottom: 2 }}>Week {probation.current_week || 1} of 8</div>
                  <div style={{ fontSize: 11, color: '#2E7D32' }}>Attendance {attPct}% · Punctuality {puncPct}% · Reports {reports.length}/8</div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'attendance' && (
          <div>
            {attendance.length === 0 && <p style={{ fontSize: 13, color: '#888', textAlign: 'center', marginTop: 20 }}>No attendance records yet.</p>}
            {attendance.map((a: any) => (
              <div key={a.id} style={s.attRow}>
                <span style={{ fontSize: 16 }}>{a.status === 'present' ? '✓' : '✗'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A' }}>{a.service_name || 'Service'}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {a.punctuality || 'On time'}</div>
                </div>
                <span style={s.pill(a.punctuality === 'early' ? '#2E7D32' : a.punctuality === 'late' ? '#B71C1C' : '#E65100', a.punctuality === 'early' ? '#E8F5E9' : a.punctuality === 'late' ? '#FFEBEE' : '#FFF8E1')}>
                  {a.punctuality === 'early' ? 'Early' : a.punctuality === 'late' ? 'Late' : 'On time'}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'reports' && (
          <div>
            {reports.length === 0 && <p style={{ fontSize: 13, color: '#888', textAlign: 'center', marginTop: 20 }}>No reports submitted yet.</p>}
            {reports.map((r: any) => (
              <div key={r.id} style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#B71C1C', fontWeight: 600 }}>Week {r.week_number || '—'}</span>
                  <span style={s.pill('#2E7D32', '#E8F5E9')}>Submitted</span>
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'assess' && (
          <div>
            <div style={s.card}>
              <div style={s.label}>New assessment</div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#7B1818', marginBottom: 6 }}>Overall rating</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                  {['needs_improvement', 'fair', 'good', 'excellent'].map(r => (
                    <button key={r} style={s.yn(newRating === r)} onClick={() => setNewRating(r)}>
                      {r.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#7B1818', marginBottom: 4 }}>Notes</div>
                <textarea style={s.textarea} placeholder="Any observations this week…" value={newNote} onChange={e => setNewNote(e.target.value)} />
              </div>
              <button style={{ ...s.btn, width: '100%', padding: 11, marginTop: 0 }} onClick={saveAssessment} disabled={saving}>
                {saving ? 'Saving…' : 'Save assessment'}
              </button>
            </div>

            {assessments.length > 0 && (
              <div>
                <div style={s.label}>Previous assessments</div>
                {assessments.map((a: any) => (
                  <div key={a.id} style={s.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A' }}>Week {a.week_number}</span>
                      <span style={s.pill(a.rating === 'good' || a.rating === 'excellent' ? '#2E7D32' : '#E65100', a.rating === 'good' || a.rating === 'excellent' ? '#E8F5E9' : '#FFF8E1')}>
                        {a.rating?.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                      </span>
                    </div>
                    {a.notes && <div style={{ fontSize: 12, color: '#888' }}>{a.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
