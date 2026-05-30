'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function UploadPage() {
  const router = useRouter()
  const [pc, setPc] = useState<any>(null)
  const [userId, setUserId] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data } = await supabase.from('probation_cases').select('*').eq('user_id', user.id).single()
      setPc(data)
    }
    load()
  }, [router])

  async function handleUpload() {
    if (!file || !pc) return
    setUploading(true); setError('')
    const supabase = createClient()
    const path = `${userId}/${Date.now()}_${file.name}`
    const { error: uploadErr } = await supabase.storage.from('lfc-certificates').upload(path, file)
    if (uploadErr) { setError(uploadErr.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('lfc-certificates').getPublicUrl(path)
    await supabase.from('probation_cases').update({ lfc_uploaded: true, lfc_certificate_url: publicUrl }).eq('id', pc.id)
    setSuccess(true)
    setUploading(false)
  }

  const S = { page: { minHeight: '100vh', display: 'flex', flexDirection: 'column' as const }, topbar: { background: '#1A1A1A', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }, body: { flex: 1, padding: 14, background: 'var(--color-background-secondary)' } }

  return (
    <div style={S.page}>
      <div style={S.topbar}><Link href="/dashboard" style={{ color: '#999', fontSize: 18, textDecoration: 'none' }}>←</Link><span style={{ fontSize: 13, fontWeight: 500, color: 'white' }}>LFC certificate</span></div>
      <div style={S.body}>
        <div style={{ border: '1.5px solid #B71C1C', borderRadius: 10, padding: '11px 12px', display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>🎓</span>
          <p style={{ fontSize: 12, color: 'var(--color-text-primary)', lineHeight: 1.5 }}><strong style={{ color: '#B71C1C' }}>LFC certificate required.</strong> Your membership cannot be approved until uploaded and confirmed by your admin.</p>
        </div>
        {pc?.lfc_confirmed ? (
          <div style={{ background: 'var(--color-background-success)', border: '0.5px solid #16A34A', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-success)' }}>Certificate confirmed</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>Your LFC certificate has been verified by your admin.</div>
          </div>
        ) : pc?.lfc_uploaded ? (
          <div style={{ background: 'var(--color-background-warning)', border: '0.5px solid #F59E0B', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-warning)' }}>Uploaded — awaiting review</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>Your admin will confirm your certificate shortly.</div>
          </div>
        ) : success ? (
          <div style={{ background: 'var(--color-background-success)', border: '0.5px solid #16A34A', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-success)' }}>Uploaded successfully</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>Awaiting confirmation from your admin.</div>
          </div>
        ) : (
          <>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
            <div onClick={() => fileRef.current?.click()} style={{ border: '1.5px dashed var(--color-border-secondary)', borderRadius: 12, padding: '24px 16px', textAlign: 'center', cursor: 'pointer', background: 'var(--color-background-primary)', marginBottom: 12 }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>☁️</div>
              {file ? <div style={{ fontSize: 13, fontWeight: 500, color: '#B71C1C' }}>{file.name}</div> : <>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Tap to select your certificate</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2, opacity: 0.7 }}>PDF, JPG or PNG · Max 5MB</div>
              </>}
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#7B1818', display: 'block', marginBottom: 4 }}>Description (optional)</label>
              <input value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--color-border-tertiary)', borderRadius: 10, fontSize: 13, color: 'var(--color-text-primary)', background: 'var(--color-background-primary)', fontFamily: 'inherit', outline: 'none' }} placeholder="e.g. LFC Stream II · January 2025" />
            </div>
            {error && <div style={{ background: 'var(--color-background-danger)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--color-text-danger)', marginBottom: 8 }}>{error}</div>}
            <button onClick={handleUpload} disabled={!file || uploading} style={{ width: '100%', padding: 12, background: file ? '#B71C1C' : 'var(--color-background-secondary)', color: file ? 'white' : 'var(--color-text-secondary)', border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 500, cursor: file ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>{uploading ? 'Uploading…' : 'Upload certificate'}</button>
          </>
        )}
      </div>
    </div>
  )
}
