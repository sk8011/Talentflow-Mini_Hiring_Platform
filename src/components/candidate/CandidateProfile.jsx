import React, { useState, useEffect, useRef } from 'react'
import { sendInviteEmail } from '../../lib/email'
import { useParams, useNavigate } from 'react-router-dom'
import { CANDIDATE_STAGES } from '../../lib/storage'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { ArrowLeft, Mail, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

export default function CandidateProfile({ addToast }) {
  const { candidateId } = useParams()
  const navigate = useNavigate()
  const [candidate, setCandidate] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [assignableJobs, setAssignableJobs] = useState([])
  const [jobMap, setJobMap] = useState({}) // { [jobId]: title }
  const [selectedJobId, setSelectedJobId] = useState('')
  const [assignments, setAssignments] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [questionLabelsByJob, setQuestionLabelsByJob] = useState({}) // { [jobId]: { [qId]: label } }
  const [assignLoading, setAssignLoading] = useState(false)
  // Mentions state
  const teamMembers = ['john','sarah','mike','olivia','liam','emma','noah','ava']
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionIndex, setMentionIndex] = useState(0)

  useEffect(() => {
    if (candidateId) {
      loadCandidateData()
    }
  }, [candidateId])

  // Mentions helpers
  function computeMentionState(value) {
    // Find the last '@word' being typed
    const caret = value.length
    const slice = value.slice(0, caret)
    const match = /(^|\s)@(\w*)$/.exec(slice)
    if (match) {
      const q = match[2].toLowerCase()
      const list = teamMembers.filter((u) => u.toLowerCase().startsWith(q)).slice(0, 5)
      setMentionQuery(q)
      setMentionOpen(list.length > 0)
      setMentionIndex(0)
      return
    }
    setMentionOpen(false)
    setMentionQuery('')
    setMentionIndex(0)
  }

  function insertMention(username) {
    // Replace the last @query with @username
    const caret = newNote.length
    const before = newNote.slice(0, caret)
    const after = newNote.slice(caret)
    const replaced = before.replace(/(^|\s)@(\w*)$/, (m, p1) => `${p1}@${username} `)
    const next = replaced + after
    setNewNote(next)
    setMentionOpen(false)
    setMentionQuery('')
    setMentionIndex(0)
  }

  const initRef = useRef({})
  useEffect(() => {
    if (!candidateId) return
    // Guard against double-invocation in React 18 StrictMode during development
    if (initRef.current[candidateId]) return
    initRef.current[candidateId] = true
    ;(async () => {
      // Load jobs with existing assessments for assignment
      try {
        // Fetch a large page once to avoid pagination round-trips
        const params = new URLSearchParams({ page: '1', pageSize: '1000' })
        const jobsRes = await fetch(`/api/jobs?${params.toString()}`)
        const jobsData = await jobsRes.json()
        const jobs = jobsData.jobs || jobsData || []
        const titles = {}
        for (const j of jobs) titles[j.id] = j.title
        setJobMap(titles)
        // Check assessments in parallel to minimize latency
        const checks = await Promise.allSettled(
          jobs.map(async (j) => {
            const res = await fetch(`/api/assessments/${j.id}`)
            if (!res.ok) return null
            const data = await res.json()
            return data.assessment ? { id: j.id, title: j.title } : null
          })
        )
        const available = checks
          .map((p) => (p.status === 'fulfilled' ? p.value : null))
          .filter(Boolean)
        setAssignableJobs(available)
      } catch {}
      // Load current assignment
      try {
        const res = await fetch(`/api/candidates/${candidateId}/assignments`)
        const data = await res.json()
        const a = data.assignments || []
        setAssignments(a)
        // Load submissions for the current assignment (first assignment)
        if (a.length > 0) {
          await loadSubmissionsForJob(a[0])
        } else {
          setSubmissions([])
        }
      } catch {}
    })()
  }, [candidateId])

  const loadCandidateData = async () => {
    setLoading(true)
    try {
      // Prefer direct lookup by id with a brief retry (in case of immediate navigation after creation)
      let foundCandidate = null
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch(`/api/candidates/${candidateId}`)
          if (res.ok) {
            const data = await res.json()
            foundCandidate = data.candidate || null
            if (foundCandidate) break
          }
        } catch {}
        // small backoff before next attempt
        await new Promise((r) => setTimeout(r, 200))
      }
      // Fallback: fetch the full list (large page) and search locally
      if (!foundCandidate) {
        try {
          const params = new URLSearchParams({ page: '1', pageSize: '1000' })
          const listRes = await fetch(`/api/candidates?${params.toString()}`)
          const listData = await listRes.json()
          foundCandidate = (listData.candidates || []).find((c) => String(c.id) === String(candidateId)) || null
        } catch {}
      }
      if (foundCandidate) setCandidate(foundCandidate)

      // Load timeline (independent)
      try {
        const timelineRes = await fetch(`/api/candidates/${candidateId}/timeline`)
        const timelineData = await timelineRes.json()
        setTimeline(timelineData.timeline || [])
      } catch {}
    } catch (err) {
      console.error('Failed to load candidate data:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateStage = async (newStage) => {
    if (!candidate) return

    try {
      const res = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage })
      })

      if (res.ok) {
        const data = await res.json()
        setCandidate(data.candidate)
        // Reload timeline to see the new stage change
        loadCandidateData()
      }
    } catch (err) {
      console.error('Failed to update stage:', err)
    }
  }

  const addNote = async () => {
    if (!newNote.trim() || !candidate) return

    setAddingNote(true)
    try {
      // For now, we'll simulate adding a note by updating the candidate
      // In a real app, you'd have a separate notes API
      const noteText = `Note: ${newNote.trim()}`
      const res = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          notes: (candidate.notes || '') + '\n' + noteText 
        })
      })

      if (res.ok) {
        setNewNote('')
        loadCandidateData()
      }
    } catch (err) {
      console.error('Failed to add note:', err)
    } finally {
      setAddingNote(false)
    }
  }

  // Invite candidate: generate temp password and show in toast
  const inviteCandidate = async () => {
    if (!candidate?.email) {
      addToast && addToast('Candidate email is missing')
      return
    }
    try {
      const res = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, email: candidate.email }),
      })
      const data = await res.json()
      if (!res.ok) {
        addToast && addToast(data?.error || 'Failed to invite candidate')
        return
      }
      // Attempt to email credentials via EmailJS if configured
      try {
        const emailRes = await sendInviteEmail({ toEmail: candidate.email, candidateName: candidate.name, tempPassword: data.password })
        if (emailRes?.ok) {
          addToast && addToast(`Invite email sent to ${candidate.email}`)
        } else if (emailRes?.skipped) {
          const reason = emailRes?.reason ? ` (${emailRes.reason})` : ''
          addToast && addToast(`Email service not configured${reason}. Check VITE_EMAILJS_* env and restart dev server.`)
        } else {
          const reason = emailRes?.error ? `: ${emailRes.error}` : ''
          addToast && addToast(`Failed to send invite email${reason}`)
        }
      } catch {}
      // Final toast that invite API succeeded
      addToast && addToast(`Invite created for ${candidate.email}`)
    } catch (err) {
      addToast && addToast('Failed to invite candidate')
    }
  }

  // Assign assessment: single active assignment
  const assignAssessment = async () => {
    if (!selectedJobId) {
      addToast && addToast('Select a job with an assessment')
      return
    }
    try {
      setAssignLoading(true)
      const res = await fetch(`/api/candidates/${candidateId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: selectedJobId }),
      })
      const data = await res.json()
      if (!res.ok) {
        addToast && addToast(data?.error || 'Failed to assign assessment')
        return
      }
      const a = data.assignments || []
      let subs = []
      let labels = {}
      if (a.length > 0) {
        try {
          // fetch submissions
          const sres = await fetch(`/api/assessments/${a[0]}/submissions`)
          const sdata = await sres.json()
          subs = (sdata.submissions || []).filter((s) => String(s.candidateId) === String(candidateId))
          // fetch assessment for labels
          const ares = await fetch(`/api/assessments/${a[0]}`)
          const adata = await ares.json()
          const aobj = adata.assessment || null
          if (aobj) {
            if (Array.isArray(aobj.sections)) {
              for (const section of aobj.sections) {
                for (const q of section.questions || []) {
                  if (q && q.id) labels[q.id] = q.label || q.id
                }
              }
            }
            if (Array.isArray(aobj.questions)) {
              for (const q of aobj.questions) {
                if (q && q.id) labels[q.id] = q.label || q.id
              }
            }
          }
        } catch {}
      }
      // Batch updates
      setAssignments(a)
      setSubmissions(subs)
      if (a.length > 0 && Object.keys(labels).length) setQuestionLabelsByJob((m) => ({ ...m, [a[0]]: labels }))
      addToast && addToast('Assignment updated')
    } catch (err) {
      addToast && addToast('Failed to assign assessment')
    } finally {
      setAssignLoading(false)
    }
  }

  // Load submissions for this candidate and job, and build question label map
  async function loadSubmissionsForJob(jobId) {
    try {
      const res = await fetch(`/api/assessments/${jobId}/submissions`)
      const data = await res.json()
      const list = (data.submissions || []).filter((s) => String(s.candidateId) === String(candidateId))
      setSubmissions(list)
      // also fetch assessment to map question ids -> labels
      try {
        const ares = await fetch(`/api/assessments/${jobId}`)
        const adata = await ares.json()
        const a = adata.assessment || null
        if (a) {
          const labels = {}
          // support both builder format with sections[].questions and flat questions[]
          if (Array.isArray(a.sections)) {
            for (const section of a.sections) {
              for (const q of section.questions || []) {
                if (q && q.id) labels[q.id] = q.label || q.id
              }
            }
          }
          if (Array.isArray(a.questions)) {
            for (const q of a.questions) {
              if (q && q.id) labels[q.id] = q.label || q.id
            }
          }
          setQuestionLabelsByJob((m) => ({ ...m, [jobId]: labels }))
        }
      } catch {}
    } catch {}
  }

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Loading candidate profile...</div>
  }

  if (!candidate) {
    return (
      <Card className="p-6 m-6">
        <h2 className="text-2xl font-bold mb-4">Candidate Not Found</h2>
        <Button onClick={() => navigate('/candidates')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Candidates
        </Button>
      </Card>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button 
          variant="ghost"
          onClick={() => navigate('/hr/candidates')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Candidates
        </Button>
        
        <Card className="p-6">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{candidate.name}</h1>
              <div className="text-muted-foreground mb-3">{candidate.email}</div>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: getStatusColor(candidate.stage || 'Applied')
                  }}
                />
                <span className="font-medium text-sm">
                  Current Stage: {candidate.stage || 'Applied'}
                </span>
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <select
                value={candidate.stage || CANDIDATE_STAGES[0]}
                onChange={(e) => updateStage(e.target.value)}
                className="h-10 w-40 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {CANDIDATE_STAGES.map((stage) => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
              <Button onClick={inviteCandidate}>
                <Mail className="h-4 w-4 mr-2" />
                Invite
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Candidate Details */}
          <Card>
            <CardHeader>
              <CardTitle>Candidate Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-muted-foreground">
                    Full Name
                  </label>
                  <div className="p-3 bg-muted rounded-md text-sm">
                    {candidate.name}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-muted-foreground">
                    Email
                  </label>
                  <div className="p-3 bg-muted rounded-md text-sm">
                    {candidate.email}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-muted-foreground">
                    Job ID
                  </label>
                  <div className="p-3 bg-muted rounded-md text-sm">
                    {candidate.jobId || 'Not specified'}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-muted-foreground">
                    Candidate ID
                  </label>
                  <div className="p-3 bg-muted rounded-md text-sm">
                    {candidate.id}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assignment */}
          <Card>
            <CardHeader>
              <CardTitle>Assessment Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 items-center flex-wrap">
                <label className="text-sm font-medium">Select job with built assessment:</label>
                <select 
                  value={selectedJobId} 
                  onChange={(e) => setSelectedJobId(e.target.value)} 
                  className="h-10 w-64 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">-- Choose --</option>
                  {assignableJobs.map((j) => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
                <Button onClick={assignAssessment} disabled={assignLoading}>
                  {assignLoading ? 'Assigning…' : 'Assign'}
                </Button>
                <Badge variant="secondary">Current: {assignments && assignments.length ? (assignableJobs.find((j) => String(j.id) === String(assignments[0]))?.title || assignments[0]) : 'None'}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Submissions */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Assessment Submissions</CardTitle>
                <div className="flex gap-2 items-center">
                  <Badge variant="secondary">Current: {assignments && assignments.length ? (assignableJobs.find((j) => String(j.id) === String(assignments[0]))?.title || assignments[0]) : 'None'}</Badge>
                  <Button variant="outline" size="sm" onClick={() => { if (assignments && assignments[0]) loadSubmissionsForJob(assignments[0]) }}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(!submissions || submissions.length === 0) ? (
                <div className="text-muted-foreground text-sm">No submissions yet.</div>
              ) : (
                <div className="space-y-3">
                  {submissions.sort((a,b)=> (b.at||0)-(a.at||0)).map((s) => (
                    <Card key={s.id} className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium">Submission {s.id}</div>
                        <div className="text-xs text-muted-foreground">{new Date(s.at).toLocaleString()}</div>
                      </div>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-medium text-primary hover:underline">View answers</summary>
                        <div className="mt-3 space-y-2">
                          {Object.entries(s.responses || {}).map(([qid, val]) => {
                            const label = (questionLabelsByJob[assignments?.[0]] || {})[qid] || qid
                            let display = ''
                            if (Array.isArray(val)) display = val.join(', ')
                            else if (typeof val === 'object' && val !== null) display = JSON.stringify(val)
                            else display = String(val)
                            return (
                              <div key={qid} className="p-3 bg-muted rounded-md">
                                <div className="font-medium text-sm">{label}</div>
                                <div className="text-xs text-muted-foreground mt-1">{display || '—'}</div>
                              </div>
                            )
                          })}
                        </div>
                      </details>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Add Note */}
              <div className="mb-4">
                <textarea
                  value={newNote}
                  onChange={(e) => { setNewNote(e.target.value); computeMentionState(e.target.value) }}
                  onKeyDown={(e) => {
                    if (!mentionOpen) return
                    const matches = teamMembers.filter((u) => u.toLowerCase().startsWith((mentionQuery||'').toLowerCase())).slice(0, 5)
                    if (!matches.length) return
                    if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex((i) => (i + 1) % matches.length); }
                    else if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex((i) => (i - 1 + matches.length) % matches.length); }
                    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(matches[mentionIndex] || matches[0]); }
                    else if (e.key === 'Escape') { setMentionOpen(false) }
                  }}
                  placeholder="Add a note about this candidate... Use @mentions to reference team members"
                  className="w-full p-3 border border-input rounded-md min-h-[80px] resize-y bg-background text-foreground"
                />
                {mentionOpen && (
                  <div className="mt-2 border rounded-md bg-card max-w-sm shadow-lg">
                    {teamMembers.filter((u) => u.toLowerCase().startsWith((mentionQuery||'').toLowerCase())).slice(0, 5).map((name, idx) => (
                      <div
                        key={name}
                        className={`px-3 py-2 cursor-pointer transition-colors ${
                          idx === mentionIndex ? 'bg-primary/10' : 'hover:bg-accent'
                        }`}
                        onMouseDown={(e) => { e.preventDefault(); insertMention(name) }}
                        onMouseEnter={() => setMentionIndex(idx)}
                      >
                        @{name}
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex justify-between items-center">
                  <div className="text-xs text-muted-foreground">
                    Tip: Use @john, @sarah, @mike to mention team members
                  </div>
                  <Button
                    onClick={addNote}
                    disabled={!newNote.trim() || addingNote}
                    size="sm"
                  >
                    {addingNote ? 'Adding...' : 'Add Note'}
                  </Button>
                </div>
              </div>

              {/* Existing Notes */}
              {candidate.notes ? (
                <div className="p-4 bg-muted rounded-md whitespace-pre-wrap">
                  {renderNotesWithMentions(candidate.notes)}
                </div>
              ) : (
                <div className="p-4 bg-muted rounded-md italic text-sm text-muted-foreground">
                  No notes yet. Add the first note above.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Timeline Sidebar */}
        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <div className="text-sm italic text-muted-foreground">
                  No timeline events yet
                </div>
              ) : (
                <div className="space-y-3">
                  {timeline
                    .sort((a, b) => (b.at || 0) - (a.at || 0))
                    .map((event, index) => (
                      <TimelineEvent key={index} event={event} jobMap={jobMap} />
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function TimelineEvent({ event, jobMap = {} }) {
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown time'
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const getEventIcon = (type) => {
    switch (type) {
      case 'created':
        return '👤'
      case 'stage':
        return '🔄'
      case 'note':
        return '📝'
      case 'seed':
        return '🌱'
      default:
        return '📅'
    }
  }

  const getEventDescription = (event) => {
    switch (event.type) {
      case 'created':
        return `Candidate created with stage: ${event.stage}`
      case 'stage':
        return `Stage changed from "${event.from}" to "${event.to}"`
      case 'note':
        return `Note added: ${event.note}`
      case 'seed':
        return `Initial data seeded with stage: ${event.stage}`
      case 'submission':
        if (event.jobId) {
          const title = jobMap[event.jobId] || event.jobId
          return `Submitted assessment for ${title}`
        }
        return 'Submitted assessment'
      default:
        return 'Unknown event'
    }
  }

  return (
    <div className="flex gap-3 p-3 bg-card rounded-lg border">
      <div className="text-base flex-shrink-0">
        {getEventIcon(event.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm mb-1">
          {getEventDescription(event)}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatDate(event.at)}
        </div>
      </div>
    </div>
  )
}

function renderNotesWithMentions(notes) {
  if (!notes) return notes

  // Render each note line with spacing, and highlight @mentions inside each line
  const mentionRegex = /@(\w+)/g
  const lines = String(notes).split(/\r?\n/).filter((l) => l.trim().length > 0)
  return lines.map((line, idx) => {
    const parts = line.split(mentionRegex)
    return (
      <div key={idx} style={{ marginBottom: 8, lineHeight: 1.5 }}>
        {parts.map((part, index) => {
          if (index % 2 === 1) {
            return (
              <span
                key={index}
                className="bg-primary/10 text-primary px-1 py-0.5 rounded font-medium"
              >
                @{part}
              </span>
            )
          }
          return <span key={index}>{part}</span>
        })}
      </div>
    )
  })
}

function getStatusColor(stage) {
  const colors = {
    'Applied': '#6b7280',
    'Phone Screen': '#f59e0b',
    'Onsite': '#3b82f6',
    'Offer': '#10b981',
    'Hired': '#059669',
    'Rejected': '#ef4444'
  }
  return colors[stage] || '#6b7280'
}
