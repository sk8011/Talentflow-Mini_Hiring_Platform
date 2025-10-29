import React, { useEffect, useState } from 'react'
import JobList from './JobList'
import JobDetail from './JobDetail'
import JobModal from './JobModal'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Label } from '../ui/Label'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'

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

  // Reset to first page whenever filter inputs change
  useEffect(() => {
    setPage(1)
  }, [typeProp, searchProp])

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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">Jobs</h2>
        <p className="text-muted-foreground">Manage your job postings and openings</p>
      </div>
      
      <div className="flex items-center justify-between gap-4 p-4 bg-card border rounded-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">View:</Label>
            <select 
              value={viewFilter} 
              onChange={(e) => { setViewFilter(e.target.value); setPage(1) }} 
              className="h-9 w-32 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option>All</option>
              <option>Archived</option>
              <option>Filled</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Per page:</Label>
            <select 
              value={pageSize} 
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }} 
              className="h-9 w-24 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
          <Badge variant="secondary">{total} total</Badge>
        </div>
        <Button onClick={() => { setModalOpen(true); setEditing(null) }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Job
        </Button>
      </div>
      
      <div className="space-y-4">
        <JobList jobs={visibleJobs} onDelete={handleDelete} onUpdate={handleUpdate} onArchive={async (id, archived) => { await handleUpdate(id, { archived }) }} onReorder={handleReorder} onNavigate={onNavigate} loading={loading} pendingIds={pendingIds} />
        <div className="flex items-center justify-center gap-4 py-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {Math.ceil((total || 0) / pageSize) || 1}
          </span>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil((total || 0) / pageSize)} onClick={() => setPage((p) => p + 1)}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
      <JobModal open={modalOpen} initial={editing} onClose={() => setModalOpen(false)} onSave={createOrUpdate} />
    </div>
  )
}
