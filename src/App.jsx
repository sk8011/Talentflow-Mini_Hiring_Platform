import React, { useEffect, useState } from 'react'
import JobsPage from './components/jobs/JobsPage'
import VirtualizedCandidateList from './components/candidate/VirtualizedCandidateList'
import KanbanBoard from './components/candidate/KanbanBoard'
import CandidateForm from './components/candidate/CandidateForm'
import CandidateProfile from './components/candidate/CandidateProfile'
import AssessmentBuilder from './components/assessment/AssessmentBuilder'
import AssessmentRunner from './components/assessment/AssessmentRunner'
import Landing from './components/common/Landing'
import CandidatePortal from './components/candidate/CandidatePortal'
import CandidateLogin from './components/auth/CandidateLogin'
import HRLogin from './components/auth/HRLogin'
import ConfirmDialog from './components/common/ConfirmDialog'
import Toast from './components/common/Toast'
import { Routes, Route, useParams, useNavigate, useLocation, Navigate } from 'react-router-dom'
import ArchivedList from './components/jobs/ArchivedList'
import { Button } from './components/ui/Button'
import { Input } from './components/ui/Input'
import { Label } from './components/ui/Label'
import { Badge } from './components/ui/Badge'
import { Briefcase, Users, LayoutGrid, FileText, Moon, Sun, LogOut, Home, Edit2, Play, ArrowLeft } from 'lucide-react'

// Hoisted HRGate to module scope so its identity is stable across App re-renders
const HRGate = ({ children }) => {
  let ok = false
  try {
    const raw = localStorage.getItem('hr_session')
    if (raw) {
      const s = JSON.parse(raw)
      ok = !!s?.ok
    }
  } catch {}
  if (!ok) return <Navigate to="/hr/login" replace />
  return children
}

// Hoisted CandidatesRoute to module scope to prevent remounts on App state changes
function CandidatesRoute({ addToast, pendingIds, addPending, removePending }) {
  const navigate = useNavigate()
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [stageFilter, setStageFilter] = useState('All')
  const [sortBy, setSortBy] = useState('name')
  const [searchQ, setSearchQ] = useState('')

  // NOTE: theme handling belongs to App; remove any references here

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      const params = new URLSearchParams({ page: '1', pageSize: '1000' })
      const res = await fetch(`/api/candidates?${params.toString()}`)
      const data = await res.json()
      if (!mounted) return
      // sanitize to avoid undefined entries from any source
      const safe = (data.candidates || []).filter(Boolean)
      setCandidates(safe)
      setLoading(false)
    })()
    return () => { mounted = false }
  }, [])

  async function handleAdd(cand) {
    try {
      const res = await fetch('/api/candidates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cand) })
      const data = await res.json()
      if (!res.ok) {
        const errMsg = data?.error || 'Failed to add candidate'
        addToast(errMsg)
        return { ok: false, error: errMsg }
      }
      if (data && data.candidate) setCandidates((s) => [...s, data.candidate])
      return { ok: true, candidate: data.candidate }
    } catch (e) {
      addToast('Failed to add candidate')
      return { ok: false, error: 'Failed to add candidate' }
    }
  }

  async function handleDelete(id) {
    const prev = candidates
    setCandidates((s) => s.filter((c) => String(c.id) !== String(id)))
    addPending(id)
    try {
      await fetch(`/api/candidates/${id}`, { method: 'DELETE' })
      addToast('Candidate deleted')
    } catch (err) {
      setCandidates(prev)
      addToast('Failed to delete candidate')
    } finally {
      removePending(id)
    }
  }

  async function handleUpdate(id, updates, options = {}) {
    const prev = candidates
    setCandidates((s) => s
      .filter(Boolean)
      .map((c) => (c && String(c.id) === String(id) ? { ...c, ...updates } : c))
    )
    addPending(id)
    try {
      const res = await fetch(`/api/candidates/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
      const data = await res.json()
      if (!res.ok) {
        // rollback and show error (e.g., duplicate email 409)
        setCandidates(prev)
        addToast(data?.error || 'Failed to update candidate')
        return null
      }
      setCandidates((s) => s
        .filter(Boolean)
        .map((c) => (c && String(c.id) === String(id) ? data.candidate : c))
      )
      if (!options.silent) addToast('Candidate updated')
      return data.candidate
    } catch (err) {
      setCandidates(prev)
      addToast('Failed to update candidate')
      return null
    } finally {
      removePending(id)
    }
  }

  const filtered = candidates
    .filter((c) => (stageFilter === 'All' ? true : (c.stage || 'Applied') === stageFilter))
    .filter((c) => {
      const q = searchQ.trim().toLowerCase()
      if (!q) return true
      return (
        (c.name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
      )
    })
  const sorted = filtered.slice().sort((a, b) => {
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '')
    if (sortBy === 'stage') return (a.stage || '').localeCompare(b.stage || '')
    return 0
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">Candidates</h2>
        <p className="text-muted-foreground">Manage and track all your candidates</p>
      </div>
      
      <div className="flex gap-3 items-start flex-wrap p-4 bg-card border rounded-lg">
        <CandidateForm onAdd={async (c) => { const result = await handleAdd(c); if (result?.ok && result.candidate) setSelectedId(String(result.candidate.id)); return result }} />
      </div>
      
      <div className="flex gap-3 items-center flex-wrap">
        <Input
          placeholder="Search name or email"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          className="w-64"
        />
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Filter stage:</Label>
          <select 
            value={stageFilter} 
            onChange={(e) => setStageFilter(e.target.value)} 
            className="h-9 w-40 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option>All</option>
            <option>Applied</option>
            <option>Phone Screen</option>
            <option>Onsite</option>
            <option>Offer</option>
            <option>Hired</option>
            <option>Rejected</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Sort by:</Label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)} 
            className="h-9 w-32 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="name">Name</option>
            <option value="stage">Stage</option>
          </select>
        </div>
      </div>
      
      {selectedIds.length > 0 && (
        <div className="flex gap-3 items-center p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <Badge variant="secondary" className="text-sm">
            {selectedIds.length} selected
          </Badge>
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Move to:</Label>
            <select 
              id="bulk-stage" 
              className="h-9 w-40 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option>Phone Screen</option>
              <option>Onsite</option>
              <option>Offer</option>
              <option>Hired</option>
              <option>Rejected</option>
            </select>
          </div>
          <Button 
            disabled={bulkRunning} 
            size="sm"
            onClick={() => {
              const el = document.getElementById('bulk-stage')
              const stage = el && el.value
              if (!stage || selectedIds.length === 0) return
              setConfirmOpen(true)
            }}
          >
            {bulkRunning ? `Applying (${bulkProgress.done}/${bulkProgress.total})` : 'Apply Changes'}
          </Button>
        </div>
      )}
      <VirtualizedCandidateList 
        candidates={sorted} 
        loading={loading} 
        onDelete={handleDelete} 
        onUpdate={handleUpdate} 
        pendingIds={pendingIds} 
        onSelect={(c) => setSelectedId(String(c.id))} 
        selectedId={selectedId} 
        onSelectionChange={(ids) => setSelectedIds(ids)} 
        selectedIds={selectedIds}
        onOpenProfile={(c) => navigate('/hr/candidates/' + c.id)}
      />
      <ConfirmDialog open={confirmOpen} title="Confirm bulk move" message={`Move ${selectedIds.length} candidates to the selected stage?`} onCancel={() => setConfirmOpen(false)} onConfirm={async () => {
        setConfirmOpen(false)
        const el = document.getElementById('bulk-stage')
        const stage = el && el.value
        if (!stage) return
        setBulkRunning(true)
        setBulkProgress({ done: 0, total: selectedIds.length })
        const promises = selectedIds.map(async (id) => {
          try {
            await handleUpdate(id, { stage }, { silent: true })
            setBulkProgress((p) => ({ ...p, done: p.done + 1 }))
            return { id, ok: true }
          } catch (err) {
            setBulkProgress((p) => ({ ...p, done: p.done + 1 }))
            return { id, ok: false }
          }
        })
        const results = await Promise.all(promises)
        const successCount = results.filter((r) => r.ok).length
        addToast(`Moved ${successCount}/${selectedIds.length} candidates to ${stage}`)
        setBulkRunning(false)
        setSelectedIds([])
        setBulkProgress({ done: 0, total: 0 })
      }} />
    </div>
  )
}

// Hoisted KanbanRoute to module scope to prevent remounts on App state changes
function KanbanRoute({ addToast, pendingIds, addPending, removePending }) {
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      const res = await fetch('/api/candidates?pageSize=1000')
      const data = await res.json()
      if (!mounted) return
      setCandidates(data.candidates || [])
      setLoading(false)
    })()
    return () => { mounted = false }
  }, [])

  async function handleUpdate(id, updates, options = {}) {
    // optimistic update
    const prev = candidates
    setCandidates((s) => s.map((c) => (String(c.id) === String(id) ? { ...c, ...updates } : c)))
    addPending(id)
    try {
      const res = await fetch(`/api/candidates/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
      const data = await res.json()
      setCandidates((s) => s.map((c) => (String(c.id) === String(id) ? data.candidate : c)))
      if (!options.silent) addToast('Candidate updated')
      return data.candidate
    } catch (err) {
      setCandidates(prev)
      addToast('Failed to update candidate')
      return null
    } finally {
      removePending(id)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">Kanban Board</h2>
        <p className="text-muted-foreground">Drag and drop candidates across hiring stages</p>
      </div>
      <KanbanBoard candidates={candidates} onUpdateCandidate={(id, updates) => handleUpdate(id, updates)} loading={loading} />
    </div>
  )
}

export default function App() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filterType, setFilterType] = useState('All')
  const [pendingIds, setPendingIds] = useState(new Set())
  const [toasts, setToasts] = useState([])
  // Theme (light/dark) persisted
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  const [showArchived, setShowArchived] = useState(false)

  // Apply theme class to body and persist
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const addToast = (message, durationMs = 5000) => {
    const now = Date.now()
    const id = `toast-${now}-${Math.random().toString(36).slice(2,7)}`
    setToasts((t) => [...t, { id, message, expiresAt: now + durationMs }])
  }

  // Centralized sweeper to remove expired toasts reliably even under browser timer throttling
  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now()
      // Drop any toast whose expiresAt has passed. Also drop legacy toasts without expiresAt.
      setToasts((list) => {
        const filtered = list.filter((x) => x.expiresAt && x.expiresAt > now)
        return filtered.length === list.length ? list : filtered
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [])

  function HRLoginRoute() {
    return <HRLogin />
  }

  function CandidateProfileRoute({ addToast }) {
    return (
      <CandidateProfile addToast={addToast} />
    )
  }

  const addPending = (id) => {
    setPendingIds((s) => {
      const ns = new Set(s)
      ns.add(String(id))
      return ns
    })
  }

  const removePending = (id) => {
    setPendingIds((s) => {
      const ns = new Set(s)
      ns.delete(String(id))
      return ns
    })
  }

  const fetchJobs = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/jobs')
      const data = await res.json()
      setJobs(data.jobs || [])
    } catch (err) {
      console.error('Failed to fetch jobs', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCandidates = async () => {
    try {
      const res = await fetch('/api/candidates')
      const data = await res.json()
      return data.candidates || []
    } catch (err) {
      console.error('Failed to fetch candidates', err)
      return []
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [])

  // candidates state is local to the candidates route; we will fetch on mount when needed

  const navigate = useNavigate()
  const location = useLocation()

  

  

  function AssessmentsRoute({ jobs }) {
    const navigate = useNavigate()
    const location = useLocation()
    const inHR = location.pathname.startsWith('/hr')
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">Assessments</h2>
            <p className="text-muted-foreground">Build and manage assessments for your job openings</p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {jobs.length} {jobs.length === 1 ? 'Job' : 'Jobs'}
          </Badge>
        </div>
        
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-border/50 rounded-lg bg-muted/20">
            <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No jobs available</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Create a job posting first to build assessments
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((j) => (
              <div 
                key={j.id} 
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-card to-card/50 p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
              >
                {/* Decorative gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative space-y-4">
                  {/* Header */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-primary/10 p-2.5 group-hover:bg-primary/20 transition-colors">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                          {j.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="truncate">{j.company || 'Company'}</span>
                          <span>•</span>
                          <span className="truncate">{j.location || 'Location'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                  
                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 group-hover:border-primary/50 transition-colors"
                      onClick={() => navigate(`${inHR ? '/hr' : ''}/assessments/${j.id}`)}
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                      Builder
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`${inHR ? '/hr' : '/candidate'}/assessments/${j.id}/run`)}
                    >
                      <Play className="h-3.5 w-3.5 mr-1.5" />
                      Run
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  function AssessmentBuilderRoute() {
    const { jobId } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const inHR = location.pathname.startsWith('/hr')
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Assessment Builder</h2>
              <p className="text-sm text-muted-foreground">Create and customize your assessment</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(inHR ? '/hr/assessments' : '/assessments')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assessments
          </Button>
        </div>
        <AssessmentBuilder 
          jobId={jobId} 
          onSave={() => navigate(inHR ? '/hr/assessments' : '/assessments')} 
          onCancel={() => navigate(inHR ? '/hr/assessments' : '/assessments')} 
        />
      </div>
    )
  }

  function AssessmentRunnerRoute() {
    const { jobId } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const inHR = location.pathname.startsWith('/hr')
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Take Assessment</h2>
              <p className="text-sm text-muted-foreground">Complete all required questions</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(inHR ? '/hr/assessments' : '/candidate')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <AssessmentRunner jobId={jobId} onDone={() => navigate(inHR ? '/hr/assessments' : '/candidate')} />
      </div>
    )
  }

  const filteredJobs = jobs.filter((j) => {
    const q = query.trim().toLowerCase()
    const matchesQuery = !q || (j.title && j.title.toLowerCase().includes(q)) || (j.company && j.company.toLowerCase().includes(q))
    const matchesType = filterType === 'All' || (j.type || 'Full-time') === filterType
    const matchesArchived = showArchived ? true : !(j.archived === true)
    return matchesQuery && matchesType && matchesArchived
  })

  const addJob = async (job) => {
    // optimistic: create a temporary job locally
    const tempId = `temp-${Date.now()}`
    const temp = { id: tempId, ...job }
    setJobs((prev) => [...prev, temp])
    setPendingIds((s) => new Set(s).add(tempId))
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job),
      })
      const data = await res.json()
      const created = data.job || data
      // replace temp with real created
      setJobs((prev) => prev.map((j) => (String(j.id) === tempId ? created : j)))
    } catch (err) {
      // rollback
      setJobs((prev) => prev.filter((j) => String(j.id) !== tempId))
      addToast('Failed to add job')
    } finally {
      setPendingIds((s) => {
        const ns = new Set(s)
        ns.delete(tempId)
        return ns
      })
    }
  }

  const deleteJob = async (id) => {
    // optimistic remove
    const prevJobs = jobs
    setJobs((prev) => prev.filter((j) => String(j.id) !== String(id)))
    setPendingIds((s) => new Set(s).add(id))
    try {
      await fetch(`/api/jobs/${id}`, { method: 'DELETE' })
    } catch (err) {
      // rollback
      setJobs(prevJobs)
      addToast('Failed to delete job')
    } finally {
      setPendingIds((s) => {
        const ns = new Set(s)
        ns.delete(id)
        return ns
      })
    }
  }

  const updateJob = async (id, updates) => {
    // optimistic update: apply locally then call API
    const prevJobs = jobs
    setJobs((prev) => prev.map((j) => (String(j.id) === String(id) ? { ...j, ...updates } : j)))
    setPendingIds((s) => new Set(s).add(id))
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      const updated = data.job || data
      setJobs((prev) => prev.map((j) => (String(j.id) === String(id) ? updated : j)))
    } catch (err) {
      setJobs(prevJobs)
      addToast('Failed to update job')
    } finally {
      setPendingIds((s) => {
        const ns = new Set(s)
        ns.delete(id)
        return ns
      })
    }
  }

  const archiveJob = async (id, archived = true) => {
    const prevJobs = jobs
    setJobs((prev) => prev.map((j) => (String(j.id) === String(id) ? { ...j, archived } : j)))
    setPendingIds((s) => new Set(s).add(id))
    try {
      const res = await fetch(`/api/jobs/${id}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived }),
      })
      const data = await res.json()
      const updated = data.job || data
      setJobs((prev) => prev.map((j) => (String(j.id) === String(id) ? updated : j)))
    } catch (err) {
      setJobs(prevJobs)
      addToast('Failed to change archive state')
    } finally {
      setPendingIds((s) => {
        const ns = new Set(s)
        ns.delete(id)
        return ns
      })
    }
  }

  const reorderJobs = async (newOrder) => {
    // optimistic reorder locally using the provided newOrder (array of ids)
    const prevJobs = jobs
    const map = new Map(jobs.map((j) => [String(j.id), j]))
    const reordered = newOrder.map((id) => map.get(String(id))).filter(Boolean)
    // append any missing
    for (const j of jobs) if (!newOrder.includes(String(j.id))) reordered.push(j)
    setJobs(reordered)
    // mark a global pending token for reorder
    const reorderToken = `reorder-${Date.now()}`
    setPendingIds((s) => new Set(s).add(reorderToken))
    try {
      const res = await fetch('/api/jobs/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: newOrder }),
      })
      const data = await res.json()
      setJobs(data.jobs || reordered)
    } catch (err) {
      setJobs(prevJobs)
      addToast('Failed to reorder jobs')
    } finally {
      setPendingIds((s) => {
        const ns = new Set(s)
        ns.delete(reorderToken)
        return ns
      })
    }
  }

  const bulkUnarchive = async (ids = []) => {
    const prevJobs = jobs
    // optimistic: mark items as unarchived locally
    setJobs((prev) => prev.map((j) => (ids.includes(String(j.id)) ? { ...j, archived: false } : j)))
    try {
      const res = await fetch('/api/jobs/bulk-unarchive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const data = await res.json()
      // mirror response
      // replace local jobs with returned ones when possible
      if (data.jobs) {
        const returnedIds = new Set(data.jobs.map((j) => String(j.id)))
        setJobs((prev) => prev.map((j) => (returnedIds.has(String(j.id)) ? { ...j, archived: false } : j)))
      }
    } catch (err) {
      setJobs(prevJobs)
      addToast('Failed to unarchive selected jobs')
    }
  }

  

  // (removed unused candidate helpers)

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-only blocker overlay (hidden on >=768px via CSS) */}
      <div className="mobile-blocker">
        <div className="inner">
          <h2>Best viewed on desktop</h2>
          <p>
            This app is optimized for larger screens. Please open it on a desktop or widen your browser window
            for the best experience.
          </p>
          <div className="muted" style={{ fontSize: 12 }}>
            Tip: Rotate your device to landscape or use a tablet/desktop.
          </div>
        </div>
      </div>
      
      {/* Modern Navigation Bar */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center px-4">
          <div className="flex items-center gap-2 mr-6">
            <Briefcase className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              TalentFlow
            </span>
          </div>
          
          <div className="flex items-center gap-2 flex-1">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
            {location.pathname.startsWith('/hr') && (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/hr')}>
                  <Briefcase className="h-4 w-4 mr-2" />
                  Jobs
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/hr/candidates')}>
                  <Users className="h-4 w-4 mr-2" />
                  Candidates
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/hr/kanban')}>
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Kanban
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/hr/assessments')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Assessments
                </Button>
              </>
            )}
            {location.pathname.startsWith('/candidate') && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/candidate')}>
                <Users className="h-4 w-4 mr-2" />
                Candidate Portal
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            {location.pathname.startsWith('/hr') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { localStorage.removeItem('hr_session'); navigate('/hr/login') }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            )}
          </div>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {location.pathname === '/hr' && (
          <div className="flex gap-3 items-center mb-6">
            <input
              placeholder="Search title or company"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option>All</option>
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Contract</option>
            </select>
          </div>
        )}
        <Routes>
          <Route path="/" element={<Landing />} />
          {/* HR auth */}
          <Route path="/hr/login" element={<HRLoginRoute />} />
          {/* HR console (gated) */}
          <Route path="/hr" element={<HRGate><JobsPage search={query} type={filterType} showArchived={showArchived} setShowArchived={setShowArchived} /></HRGate>} />
          <Route path="/hr/archived" element={<HRGate><ArchivedList jobs={jobs} onBulkUnarchive={bulkUnarchive} loading={loading} /></HRGate>} />
          <Route path="/hr/candidates" element={<HRGate><CandidatesRoute addToast={addToast} pendingIds={pendingIds} addPending={addPending} removePending={removePending} /></HRGate>} />
          <Route path="/hr/candidates/:candidateId" element={<HRGate><CandidateProfileRoute addToast={addToast} /></HRGate>} />
          <Route path="/hr/kanban" element={<HRGate><KanbanRoute addToast={addToast} pendingIds={pendingIds} addPending={addPending} removePending={removePending} /></HRGate>} />
          <Route path="/hr/assessments" element={<HRGate><AssessmentsRoute jobs={jobs} /></HRGate>} />
          <Route path="/hr/assessments/:jobId" element={<HRGate><AssessmentBuilderRoute /></HRGate>} />
          <Route path="/hr/assessments/:jobId/run" element={<HRGate><AssessmentRunnerRoute /></HRGate>} />
          {/* Candidate portal */}
          <Route path="/candidate" element={<CandidatePortal />} />
          <Route path="/candidate/login" element={<CandidateLogin />} />
          <Route path="/candidate/assessments/:jobId/run" element={<AssessmentRunnerRoute />} />
        </Routes>
      </main>
      
      <Toast toasts={toasts} onRemove={(id) => setToasts((t) => t.filter((x) => x.id !== id))} autoDismiss={true} expirationInterval={3000} />
    </div>
  )
}
