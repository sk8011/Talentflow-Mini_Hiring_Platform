import React, { useEffect, useState } from 'react'

function slugify(s) {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function JobModal({ open, initial = null, onClose, onSave }) {
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [location, setLocation] = useState('')
  const [type, setType] = useState('Full-time')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (initial) {
      setTitle(initial.title || '')
      setCompany(initial.company || '')
      setLocation(initial.location || '')
      setType(initial.type || 'Full-time')
      setSlug(initial.slug || slugify(initial.title || ''))
    } else {
      setTitle('')
      setCompany('')
      setLocation('')
      setType('Full-time')
      setSlug('')
    }
    setError('')
  }, [initial, open])

  useEffect(() => {
    setSlug(slugify(title))
  }, [title])

  async function checkSlugUnique(s) {
    setChecking(true)
    try {
      // get all jobs to check slug uniqueness (ok for small seed)
      const res = await fetch('/api/jobs?pageSize=1000')
      const data = await res.json()
      const list = data.jobs || []
      const exists = list.some((j) => j.slug === s && (!initial || String(j.id) !== String(initial.id)))
      setChecking(false)
      return !exists
    } catch (err) {
      setChecking(false)
      return true
    }
  }

  async function submit(e) {
    e && e.preventDefault()
    setError('')
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    const s = slugify(slug || title)
    const unique = await checkSlugUnique(s)
    if (!unique) {
      setError('Slug already in use; please change title')
      return
    }
    const payload = { title: title.trim(), company: company.trim(), location: location.trim(), type, slug: s }
    await onSave(initial ? initial.id : null, payload)
    onClose && onClose()
  }

  if (!open) return null
  return (
    <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 16 }}>
      <form onSubmit={submit} className="card" style={{ width: '100%', maxWidth: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ marginTop: 0, marginBottom: 0 }}>{initial ? 'Edit job' : 'Create job'}</h3>
          <button type="button" className="btn" onClick={() => { onClose && onClose() }}>✕</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 6 }}>Title</label>
            <input className="input" placeholder="e.g. Senior Frontend Engineer" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 6 }}>Company</label>
            <input className="input" placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 6 }}>Location</label>
            <input className="input" placeholder="Remote / City" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 6 }}>Type</label>
            <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Contract</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 6 }}>Slug</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input className="input" value={slug} onChange={(e) => setSlug(e.target.value)} />
              {checking && <div className="spinner" />}
            </div>
          </div>
        </div>
        {error && <div className="badge badge-red" style={{ display: 'inline-block', marginTop: 12 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button type="button" className="btn" onClick={() => { onClose && onClose() }}>Cancel</button>
          <button type="submit" className="btn btn-primary">{initial ? 'Save' : 'Create'}</button>
        </div>
      </form>
    </div>
  )
}
