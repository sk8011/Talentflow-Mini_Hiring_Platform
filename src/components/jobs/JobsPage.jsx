import React, { useEffect, useState } from 'react'
import JobList from './JobList'
import JobDetail from './JobDetail'
import JobModal from './JobModal'

export default function JobsPage({ onNavigate, search: searchProp = '', type: typeProp = 'All', jobs: jobsProp = null, showArchived = false, setShowArchived = null }) {
  const [jobs, setJobs] = useState(jobsProp || [])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  // showArchived is controlled by parent App when provided via props
  const [total, setTotal] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [pendingIds, setPendingIds] = useState(new Set())
  const [viewFilter, setViewFilter] = useState('All') // All | Archived | Filled

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ search: searchProp, type: typeProp })
      if (viewFilter === 'Archived') {
        // storage tracks archived via a boolean, so we fetch a large page and filter locally
        params.set('page', '1')
        params.set('pageSize', '1000')
        const res = await fetch(`/api/jobs?${params.toString()}`)
        const data = await res.json()
        let filtered = (data.jobs || []).filter(Boolean)
        // Local type filter (fallback if server didn't apply)
        if (typeProp && typeProp !== 'All') {
          const t = String(typeProp).toLowerCase()
          filtered = filtered.filter((j) => String(j.type || 'Full-time').toLowerCase() === t)
        }
        // Local search filter (title/slug/company)
        if (searchProp && String(searchProp).trim()) {
          const q = String(searchProp).toLowerCase()
          filtered = filtered.filter((j) => (
            (j.title || '').toLowerCase().includes(q) ||
            (j.slug || '').toLowerCase().includes(q) ||
            (j.company || '').toLowerCase().includes(q)
          ))
        }
        // Archived-state filter
        filtered = filtered.filter((j) => (j.archived === true) || (String(j.status || '').toLowerCase() === 'archived'))
        setTotal(filtered.length)
        const start = (page - 1) * pageSize
        setJobs(filtered.slice(start, start + pageSize))
      } else if (viewFilter === 'Filled') {
        // fetch a larger page and filter client-side for filled
        params.set('page', '1')
        params.set('pageSize', '1000')
        const res = await fetch(`/api/jobs?${params.toString()}`)
        const data = await res.json()
        let filtered = (data.jobs || []).filter(Boolean)
        // Local type filter
        if (typeProp && typeProp !== 'All') {
          const t = String(typeProp).toLowerCase()
          filtered = filtered.filter((j) => String(j.type || 'Full-time').toLowerCase() === t)
        }
        // Local search filter
        if (searchProp && String(searchProp).trim()) {
          const q = String(searchProp).toLowerCase()
          filtered = filtered.filter((j) => (
            (j.title || '').toLowerCase().includes(q) ||
            (j.slug || '').toLowerCase().includes(q) ||
            (j.company || '').toLowerCase().includes(q)
          ))
        }
        // Filled-state filter
        filtered = filtered.filter((j) => (String(j.status || '').toLowerCase() === 'filled') && !(j.archived === true))
        setTotal(filtered.length)
        const start = (page - 1) * pageSize
        setJobs(filtered.slice(start, start + pageSize))
      } else {
        // All: show only active (non-archived) jobs from server
        params.set('status', 'active')
        params.set('page', String(page))
        params.set('pageSize', String(pageSize))
        const res = await fetch(`/api/jobs?${params.toString()}`)
        const data = await res.json()
        let list = (data.jobs || []).filter(Boolean)
        // Safety net: ensure type/search applied even if server missed it
        if (typeProp && typeProp !== 'All') {
          const t = String(typeProp).toLowerCase()
          list = list.filter((j) => String(j.type || 'Full-time').toLowerCase() === t)
        }
        if (searchProp && String(searchProp).trim()) {
          const q = String(searchProp).toLowerCase()
          list = list.filter((j) => (
            (j.title || '').toLowerCase().includes(q) ||
            (j.slug || '').toLowerCase().includes(q) ||
            (j.company || '').toLowerCase().includes(q)
          ))
        }
        if (!jobsProp) setJobs(list)
        setTotal((data.total != null ? data.total : list.length))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Only fetch when caller didn't provide jobsProp
    if (!jobsProp) load()
    else {
      // keep local jobs in sync with prop
      setJobs(jobsProp)
      setLoading(false)
    }
  }, [jobsProp, searchProp, page, pageSize, typeProp, viewFilter])

  async function createOrUpdate(id, payload) {
    if (!id) {
      const res = await fetch('/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      setJobs((s) => [ ...(s || []), data.job ])
    } else {
      const res = await fetch(`/api/jobs/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      setJobs((s) => s.map((j) => (String(j.id) === String(id) ? data.job : j)))
    }
  }

  async function handleDelete(id) {
    const prev = jobs
    setJobs((s) => (Array.isArray(s) ? s.filter(Boolean).filter((j) => String(j.id) !== String(id)) : []))
    setPendingIds((p) => new Set(p).add(String(id)))
    try {
      await fetch(`/api/jobs/${id}`, { method: 'DELETE' })
    } catch (err) {
      setJobs(prev)
    } finally {
      setPendingIds((p) => { const ns = new Set(p); ns.delete(String(id)); return ns })
    }
  }

  async function handleUpdate(id, updates) {
    const prev = jobs
    setJobs((s) => (Array.isArray(s) ? s.filter(Boolean).map((j) => (String(j.id) === String(id) ? { ...j, ...updates } : j)) : []))
    setPendingIds((p) => new Set(p).add(String(id)))
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
      const data = await res.json()
      setJobs((s) => s.map((j) => (String(j.id) === String(id) ? data.job : j)))
    } catch (err) {
      setJobs(prev)
    } finally {
      setPendingIds((p) => { const ns = new Set(p); ns.delete(String(id)); return ns })
    }
  }

  async function handleReorder(order) {
    // optimistic reorder
    const safe = (jobs || []).filter(Boolean)
    const map = new Map(safe.map((j) => [String(j.id), j]))
    const reordered = order.map((id) => map.get(String(id))).filter(Boolean)
    setJobs(reordered)
    try {
      const res = await fetch('/api/jobs/reorder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order }) })
      if (!res.ok) throw new Error('reorder failed')
      const data = await res.json()
      setJobs(data.jobs || reordered)
    } catch (err) {
      // reload from server
      await load()
    }
  }

  // compute visible jobs
  const safeJobs = (jobs || []).filter(Boolean)
  let visibleJobs = safeJobs
  if (viewFilter === 'All') {
    // In 'All', backend already paginates active jobs; just ensure archived are hidden
    visibleJobs = safeJobs.filter((j) => !(j.archived === true))
  }

  return (
    <div>
      <div className="toolbar" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ fontSize: 14 }}>
            View:
            <select className="select" value={viewFilter} onChange={(e) => { setViewFilter(e.target.value); setPage(1) }} style={{ marginLeft: 6 }}>
              <option>All</option>
              <option>Archived</option>
              <option>Filled</option>
            </select>
          </label>
          <label style={{ fontSize: 14 }}>
            Per page:
            <select className="select" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }} style={{ marginLeft: 6 }}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
          <div className="badge badge-gray">{total} total</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={() => { setModalOpen(true); setEditing(null) }}>+ Create job</button>
        </div>
      </div>
      <div>
        <JobList jobs={visibleJobs} onDelete={handleDelete} onUpdate={handleUpdate} onArchive={async (id, archived) => { await handleUpdate(id, { archived }) }} onReorder={handleReorder} onNavigate={onNavigate} loading={loading} pendingIds={pendingIds} />
        <div className="pager">
          <button className="page btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
          <span className="muted">Page {page} / {Math.ceil((total || 0) / pageSize) || 1}</span>
          <button className="page btn" disabled={page >= Math.ceil((total || 0) / pageSize)} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      </div>
      <JobModal open={modalOpen} initial={editing} onClose={() => setModalOpen(false)} onSave={createOrUpdate} />
    </div>
  )
}
