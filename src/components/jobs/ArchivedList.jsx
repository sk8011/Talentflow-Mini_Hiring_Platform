import Toast from '../common/Toast'
import React, { useState } from 'react'
import ConfirmDialog from '../common/ConfirmDialog'

export default function ArchivedList({ jobs = [], onBulkUnarchive, loading }) {
  const archived = jobs.filter((j) => j.archived === true)
  const [selected, setSelected] = useState(new Set())

  const toggle = (id) => {
    setSelected((s) => {
      const ns = new Set(s)
      if (ns.has(id)) ns.delete(id)
      else ns.add(id)
      return ns
    })
  }

  const selectAll = () => setSelected(new Set(archived.map((j) => String(j.id))))
  const clearAll = () => setSelected(new Set())

  const doBulk = async () => {
    if (selected.size === 0) return
    setConfirmOpen(true)
  }

  const [confirmOpen, setConfirmOpen] = useState(false)

  const confirmBulk = async () => {
    const ids = Array.from(selected)
    await onBulkUnarchive(ids)
    clearAll()
    setConfirmOpen(false)
  }

  if (loading) return <p>Loading archived jobs...</p>
  if (archived.length === 0) return <p>No archived jobs</p>

  return (
    <div>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
        <button onClick={selectAll}>Select all</button>
        <button onClick={clearAll}>Clear</button>
        <button onClick={doBulk} disabled={selected.size === 0}>Unarchive selected ({selected.size})</button>
      </div>
      <ul className="job-list">
        {archived.map((job) => (
          <li key={job.id} className="job-item archived" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={selected.has(String(job.id))} onChange={() => toggle(String(job.id))} />
              <div>
                <strong>{job.title}</strong>
                <div className="meta">{job.company} • {job.location || 'Remote'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => onBulkUnarchive([String(job.id)])}>Unarchive</button>
              <div style={{ color: '#6b7280' }}>{job.id}</div>
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog open={confirmOpen} title="Unarchive selected" message={`Unarchive ${selected.size} job(s)?`} onConfirm={confirmBulk} onCancel={() => setConfirmOpen(false)} />
    </div>
  )
}
