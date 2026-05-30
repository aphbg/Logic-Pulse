'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const BRANCHES = ['Lagos Mainland','Lagos Island','Port Harcourt','Abuja','Ghana','UK — London','UK — Ireland','Houston — USA']

export default function SuperAdminPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [hods, setHods] = useState<any[]>([])
  const [stats, setStats] = useState({ branches: 0, hods: 0, members: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!p || p.role !== 'super_admin') { router.push('/admin'); return }
      setProfile(p)
      const [{ data: hodList }, { count: memberCount }] = await Promise.all([
        supabase.from('profiles').select('*').in('role', ['head','supervisor']),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'volunteer')
      ])
      setHods(hodList || [])
      setStats({ branches: BRANCHES.length, hods: hodList?.length || 0, members: memberCount || 0 })
      setLoading(false)
    }
    load()
  }, [router])

  async function logout() { const supabase = createClient(); await supabase.auth.signOut(); router.push('/') }

  if (loading) return <div style={{ minHeight: '100vh', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Loading…</div>

  const hodsByBranch = BRANCHES.map(b => ({ branch: b, hod: hods.find(h => h.branch === b) }))

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#1A1A1A', padding: '14px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: '#888' }}>Super admin · All branches</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'white' }}>{profile?.full_name || 'Super Admin'}</div>
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            <Link href="/super/create-hod" style={{ width: 32, height: 32, background: '#B71C1C', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: 18 }}>+</Link>
            <button onClick={logout} style={{ width: 32, height: 32, background: '#2D2D2D', borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: 14 }}>⬚</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
          {[['Branches', stats.branches, 'white'], ['HODs', stats.hods, '#81C784'], ['Members', stats.members, '#9F7AEA']].map(([l, v, c]) => (
            <div key={l as string} style={{ background: '#2D2D2D', borderRadius: 8, padding: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: c as string }}>{v as number}</div>
              <div style={{ fontSize: 10, color: '#777', marginTop: 1 }}>{l as string}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, padding: 14, background: 'var(--color-background-secondary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#7B1818', textTransform: 'uppercase', letterSpacing: '0.08em' }}>All branches</div>
          <Link href="/super/create-hod" style={{ fontSize: 12, color: '#B71C1C', textDecoration: 'none', fontWeight: 600 }}>+ Add HOD</Link>
        </div>
        {hodsByBranch.map(({ branch, hod }) => (
          <div key={branch} style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 10, padding: '11px 12px', display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
            <div style={{ width: 30, height: 30, background: '#B71C1C', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: 'white', flexShrink: 0 }}>{branch.slice(0, 2).toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{branch}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 1 }}>{hod ? `HOD: ${hod.full_name}` : 'HOD: Not assigned'}</div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: hod ? 'var(--color-background-success)' : 'var(--color-background-secondary)', color: hod ? 'var(--color-text-success)' : 'var(--color-text-secondary)' }}>{hod ? 'Active' : 'Pending'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
