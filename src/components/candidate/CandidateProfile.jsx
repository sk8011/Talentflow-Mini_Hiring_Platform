import React, { useState, useEffect, useRef } from 'react'
import { sendInviteEmail } from '../../lib/email'
import { useParams, useNavigate } from 'react-router-dom'
import { CANDIDATE_STAGES } from '../../lib/storage'

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
    return <div style={{ padding: 20 }}>Loading candidate profile...</div>
  }

  if (!candidate) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Candidate Not Found</h2>
        <button onClick={() => navigate('/candidates')}>Back to Candidates</button>
      </div>
    )
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button 
          className="btn"
          onClick={() => navigate('/hr/candidates')}
          style={{ marginBottom: 16 }}
        >
          ← Back to Candidates
        </button>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h1 style={{ margin: 0, marginBottom: 8 }}>{candidate.name}</h1>
            <div style={{ color: '#6b7280', marginBottom: 8 }}>{candidate.email}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: getStatusColor(candidate.stage || 'Applied')
              }} />
              <span style={{ fontWeight: 500 }}>
                Current Stage: {candidate.stage || 'Applied'}
              </span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={candidate.stage || CANDIDATE_STAGES[0]}
              onChange={(e) => updateStage(e.target.value)}
              className="select"
            >
              {CANDIDATE_STAGES.map((stage) => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
            <button className="btn" onClick={inviteCandidate}>Invite (send password)</button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Main Content */}
        <div>
          {/* Candidate Details */}
          <div className="card" style={{ padding: 20, marginBottom: 24 }}>
            <h2 style={{ marginTop: 0 }}>Candidate Information</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>
                  Full Name
                </label>
                <div className="card" style={{ padding: 8 }}>
                  {candidate.name}
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>
                  Email
                </label>
                <div className="card" style={{ padding: 8 }}>
                  {candidate.email}
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>
                  Job ID
                </label>
                <div className="card" style={{ padding: 8 }}>
                  {candidate.jobId || 'Not specified'}
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>
                  Candidate ID
                </label>
                <div className="card" style={{ padding: 8 }}>
                  {candidate.id}
                </div>
              </div>
            </div>
          </div>

          {/* Assignment */}
          <div className="card" style={{ padding: 20, marginBottom: 24 }}>
            <h3 style={{ marginTop: 0 }}>Assessment Assignment</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <label>Select job with built assessment:</label>
              <select value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)} className="select">
                <option value="">-- Choose --</option>
                {assignableJobs.map((j) => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={assignAssessment} disabled={assignLoading}>
                {assignLoading ? 'Assigning…' : 'Assign'}
              </button>
              <span className="badge badge-gray">Current: {assignments && assignments.length ? (assignableJobs.find((j) => String(j.id) === String(assignments[0]))?.title || assignments[0]) : 'None'}</span>
            </div>
          </div>

          {/* Submissions */}
          <div className="card" style={{ padding: 20, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ marginTop: 0, marginBottom: 0 }}>Assessment Submissions</h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="badge badge-gray">Current: {assignments && assignments.length ? (assignableJobs.find((j) => String(j.id) === String(assignments[0]))?.title || assignments[0]) : 'None'}</span>
                <button className="btn" onClick={() => { if (assignments && assignments[0]) loadSubmissionsForJob(assignments[0]) }}>Refresh</button>
              </div>
            </div>
            {(!submissions || submissions.length === 0) ? (
              <div className="muted">No submissions yet.</div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {submissions.sort((a,b)=> (b.at||0)-(a.at||0)).map((s) => (
                  <div key={s.id} className="card" style={{ padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>Submission {s.id}</div>
                      <div className="muted">{new Date(s.at).toLocaleString()}</div>
                    </div>
                    <details style={{ marginTop: 8 }}>
                      <summary>View answers</summary>
                      <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                        {Object.entries(s.responses || {}).map(([qid, val]) => {
                          const label = (questionLabelsByJob[assignments?.[0]] || {})[qid] || qid
                          let display = ''
                          if (Array.isArray(val)) display = val.join(', ')
                          else if (typeof val === 'object' && val !== null) display = JSON.stringify(val)
                          else display = String(val)
                          return (
                            <div key={qid} className="card" style={{ padding: 8 }}>
                              <div style={{ fontWeight: 500 }}>{label}</div>
                              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{display || '—'}</div>
                            </div>
                          )
                        })}
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div className="card" style={{ padding: 20, marginBottom: 24 }}>
            <h3 style={{ marginTop: 0 }}>Notes</h3>
            
            {/* Add Note */}
            <div style={{ marginBottom: 16 }}>
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
                style={{ 
                  width: '100%', 
                  padding: 12, 
                  border: '1px solid var(--border)', 
                  borderRadius: 6,
                  minHeight: 80,
                  resize: 'vertical',
                  background: 'var(--card-bg)',
                  color: 'var(--text)'
                }}
              />
              {mentionOpen && (
                <div style={{ marginTop: 6, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--card-bg)', maxWidth: 360, boxShadow: '0 8px 20px rgba(0,0,0,0.06)' }}>
                  {teamMembers.filter((u) => u.toLowerCase().startsWith((mentionQuery||'').toLowerCase())).slice(0, 5).map((name, idx) => (
                    <div key={name} style={{ padding: '6px 10px', cursor: 'pointer', background: idx === mentionIndex ? 'rgba(59,130,246,0.12)' : 'transparent' }} onMouseDown={(e) => { e.preventDefault(); insertMention(name) }} onMouseEnter={() => setMentionIndex(idx)}>
                      @{name}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="muted" style={{ fontSize: 12 }}>
                  Tip: Use @john, @sarah, @mike to mention team members
                </div>
                <button
                  onClick={addNote}
                  disabled={!newNote.trim() || addingNote}
                  style={{ 
                    padding: '8px 16px', 
                    backgroundColor: 'var(--accent)', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: 6,
                    opacity: (!newNote.trim() || addingNote) ? 0.5 : 1
                  }}
                >
                  {addingNote ? 'Adding...' : 'Add Note'}
                </button>
              </div>
            </div>

            {/* Existing Notes */}
            {candidate.notes ? (
              <div className="card" style={{ padding: 12, whiteSpace: 'pre-wrap' }}>
                {renderNotesWithMentions(candidate.notes)}
              </div>
            ) : (
              <div className="card" style={{ padding: 12, fontStyle: 'italic' }}>
                No notes yet. Add the first note above.
              </div>
            )}
          </div>
        </div>

        {/* Timeline Sidebar */}
        <div>
          <div className="card" style={{ padding: 20, position: 'sticky', top: 20 }}>
            <h3 style={{ marginTop: 0 }}>Timeline</h3>
            
            {timeline.length === 0 ? (
              <div className="muted" style={{ fontStyle: 'italic' }}>
                No timeline events yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {timeline
                  .sort((a, b) => (b.at || 0) - (a.at || 0))
                  .map((event, index) => (
                    <TimelineEvent key={index} event={event} jobMap={jobMap} />
                  ))}
              </div>
            )}
          </div>
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
    <div style={{ 
      display: 'flex', 
      gap: 12, 
      padding: 12, 
      backgroundColor: 'var(--card-bg)', 
      borderRadius: 6,
      border: '1px solid var(--border)'
    }}>
      <div style={{ fontSize: 16, flexShrink: 0 }}>
        {getEventIcon(event.type)}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, marginBottom: 4 }}>
          {getEventDescription(event)}
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
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
                style={{
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  padding: '2px 4px',
                  borderRadius: 4,
                  fontWeight: 500,
                }}
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
