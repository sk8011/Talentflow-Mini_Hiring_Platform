import React, { useState } from 'react'

export default function JobList({ jobs, onDelete, onUpdate, onArchive, onReorder, onNavigate, loading, pendingIds = new Set() }) {
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ title: '', company: '', location: '', type: 'Full-time' })
  const [dragOverId, setDragOverId] = useState(null)

  const items = Array.isArray(jobs) ? jobs.filter(Boolean) : []

  if (loading) return <div className="card">Loading jobs...</div>
  if (!items || items.length === 0) return <div className="card muted">No jobs yet — add the first one!</div>

  const startEdit = (job) => {
    setEditingId(job.id)
    setForm({ title: job.title || '', company: job.company || '', location: job.location || '', type: job.type || 'Full-time' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm({ title: '', company: '', location: '', type: 'Full-time' })
  }

  const saveEdit = async (id) => {
    if (!form.title.trim() || !form.company.trim()) return
    await onUpdate(id, { title: form.title.trim(), company: form.company.trim(), location: form.location.trim(), type: form.type })
    cancelEdit()
  }

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData('text/plain', String(id))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, id) => {
    e.preventDefault()
    setDragOverId(id)
  }

  const handleDragLeave = (e) => {
    setDragOverId(null)
  }

  const handleDrop = (e, targetId) => {
    e.preventDefault()
    const srcId = e.dataTransfer.getData('text/plain')
    setDragOverId(null)
    if (!srcId || String(srcId) === String(targetId)) return
    // compute new order
    const srcIndex = items.findIndex((j) => String(j.id) === String(srcId))
    const targetIndex = items.findIndex((j) => String(j.id) === String(targetId))
    if (srcIndex === -1 || targetIndex === -1) return
    const newJobs = [...items]
    const [moved] = newJobs.splice(srcIndex, 1)
    newJobs.splice(targetIndex, 0, moved)
    const order = newJobs.map((j) => String(j.id))
    if (typeof onReorder === 'function') onReorder(order)
  }

  return (
    <ul className="job-list">
      {items.map((job) => (
        <li key={job.id} draggable onDragStart={(e) => handleDragStart(e, job.id)} onDragOver={(e) => handleDragOver(e, job.id)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, job.id)} className={`job-item card ${job.status === 'filled' ? 'filled' : ''} ${dragOverId === job.id ? 'drag-over' : ''} ${job.archived ? 'archived' : ''}`}>
          <div className="job-main">
            {editingId === job.id ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input className="input" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} placeholder="Job title" />
                <input className="input" value={form.company} onChange={(e) => setForm((s) => ({ ...s, company: e.target.value }))} placeholder="Company" />
                <input className="input" value={form.location} onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))} placeholder="Location" />
                <select className="select" value={form.type} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}>
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                </select>
              </div>
            ) : (
              <div>
                <strong
                  style={{ cursor: typeof onNavigate === 'function' ? 'pointer' : 'default' }}
                  onClick={() => { if (typeof onNavigate === 'function') onNavigate(job.id) }}
                >
                  {job.title}
                </strong>
                <div className="meta" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="badge badge-gray">{job.company}</span>
                  <span className="badge">{job.location || 'Remote'}</span>
                  <span className="badge badge-green">{job.type || 'Full-time'}</span>
                  {job.archived && <span className="badge badge-red">Archived</span>}
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div title="Drag to reorder" aria-hidden style={{ cursor: 'grab', padding: '6px 8px', border: '1px dashed #c7d2fe', borderRadius: 8, background: '#eef2ff', color: '#3730a3' }}>⋮⋮</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <button className="btn btn-muted" aria-label="Move up" onClick={() => {
                const idx = items.findIndex((j) => String(j.id) === String(job.id))
                if (idx > 0) {
                  const next = [...items]
                  const [moved] = next.splice(idx, 1)
                  next.splice(idx - 1, 0, moved)
                  onReorder && onReorder(next.map((x) => String(x.id)))
                }
              }} disabled={pendingIds.has(String(job.id))}>▲</button>
              <button className="btn btn-muted" aria-label="Move down" onClick={() => {
                const idx = items.findIndex((j) => String(j.id) === String(job.id))
                if (idx < items.length - 1) {
                  const next = [...items]
                  const [moved] = next.splice(idx, 1)
                  next.splice(idx + 1, 0, moved)
                  onReorder && onReorder(next.map((x) => String(x.id)))
                }
              }} disabled={pendingIds.has(String(job.id))}>▼</button>
            </div>
            <div className="job-actions">
              <div style={{ marginRight: 8 }}>
                <button className="btn" onClick={() => typeof onArchive === 'function' && onArchive(job.id, !(job.archived === true))} disabled={pendingIds.has(String(job.id))}>{job.archived ? 'Unarchive' : 'Archive'}</button>
              </div>
              <div style={{ marginRight: 8 }}>
                {job.status === 'filled' ? (
                  <button className="btn" onClick={() => onUpdate(job.id, { status: 'open' })} disabled={pendingIds.has(String(job.id))}>Reopen</button>
                ) : (
                  <button className="btn" onClick={() => onUpdate(job.id, { status: 'filled' })} disabled={pendingIds.has(String(job.id))}>Mark filled</button>
                )}
              </div>
              {editingId === job.id ? (
                <>
                  <button className="btn btn-primary" onClick={() => saveEdit(job.id)} disabled={pendingIds.has(String(job.id))}>Save</button>
                  <button className="btn" onClick={cancelEdit} disabled={pendingIds.has(String(job.id))}>Cancel</button>
                  {pendingIds.has(String(job.id)) && <span style={{ marginLeft: 8, color: '#6b7280' }}>(saving...)</span>}
                </>
              ) : (
                <>
                  <button className="btn" onClick={() => startEdit(job)} disabled={pendingIds.has(String(job.id))}>Edit</button>
                  <button className="btn btn-danger" onClick={() => onDelete(job.id)} disabled={pendingIds.has(String(job.id))}>Delete</button>
                </>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
