import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function CandidatePortal() {
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const [assignments, setAssignments] = useState([])
  const [jobMap, setJobMap] = useState({})
  const [candidate, setCandidate] = useState(null)
  const [submissionsByJob, setSubmissionsByJob] = useState({}) // { [jobId]: submissions[] }

  useEffect(() => {
    // enforce candidate login session
    try {
      const raw = localStorage.getItem('candidate_session')
      if (!raw) {
        navigate('/candidate/login')
        return
      }
    } catch {}
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        // load my assignments using session candidate id and the candidate's stage
        const raw = localStorage.getItem('candidate_session')
        if (raw) {
          const s = JSON.parse(raw)
          if (s?.candidateId) {
            // candidate details (for stage)
            const cRes = await fetch('/api/candidates')
            const cData = await cRes.json()
            const me = (cData.candidates || []).find((x) => String(x.id) === String(s.candidateId))
            if (!me) {
              try { localStorage.removeItem('candidate_session') } catch {}
              navigate('/candidate/login')
              return
            }
            setCandidate(me)
            // assignments
            const ares = await fetch(`/api/candidates/${s.candidateId}/assignments`)
            const adata = await ares.json()
            const assignedIds = adata.assignments || []
            setAssignments(assignedIds)
            // load job titles for those ids
            if (assignedIds.length) {
              const q = new URLSearchParams({ page: '1', pageSize: '1000' })
              const res = await fetch(`/api/jobs?${q.toString()}`)
              const data = await res.json()
              const map = {}
              for (const j of data.jobs || []) map[j.id] = j
              setJobMap(map)
              // load submissions for each assigned job and filter to me
              const checks = await Promise.allSettled(
                assignedIds.map(async (jobId) => {
                  const r = await fetch(`/api/assessments/${jobId}/submissions`)
                  const d = await r.json()
                  const mine = (d.submissions || []).filter((sub) => String(sub.candidateId) === String(s.candidateId))
                  return { jobId, submissions: mine }
                })
              )
              const subMap = {}
              for (const p of checks) {
                if (p.status === 'fulfilled' && p.value) {
                  subMap[p.value.jobId] = p.value.submissions
                }
              }
              setSubmissionsByJob(subMap)
            }
          }
        }
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  function goRun(id) { navigate(`/candidate/assessments/${id}/run`) }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Candidate Portal</h2>
        <button className="btn" onClick={() => { localStorage.removeItem('candidate_session'); navigate('/candidate/login') }}>Logout</button>
      </div>
      {candidate && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{candidate.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>{candidate.email}</div>
            </div>
            <div className="badge">Stage: {candidate.stage || 'Applied'}</div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>My Assignments</h3>
        {assignments.length === 0 ? (
          <div className="muted">No assignments yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {assignments.map((id) => {
              const subs = submissionsByJob[id] || []
              const hasSubmitted = subs.length > 0
              const last = hasSubmitted ? subs.sort((a,b)=> (b.at||0)-(a.at||0))[0] : null
              return (
                <div key={id} className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{jobMap[id]?.title || `Job ${id}`}</div>
                    <div className="muted" style={{ fontSize: 12 }}>Job ID: {id}</div>
                    {hasSubmitted && (
                      <div className="badge" style={{ marginTop: 6 }}>Submitted {new Date(last.at).toLocaleString()}</div>
                    )}
                  </div>
                  {!hasSubmitted ? (
                    <button className="btn btn-primary" onClick={() => goRun(id)}>Take Assessment</button>
                  ) : (
                    <span className="muted" style={{ fontSize: 12 }}>Completed</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Submission History */}
      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Submission History</h3>
        {Object.keys(submissionsByJob).length === 0 ? (
          <div className="muted">No submissions yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {Object.entries(submissionsByJob).map(([jobId, list]) => (
              (list && list.length > 0) ? (
                <div key={jobId} className="card" style={{ padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 600 }}>{jobMap[jobId]?.title || `Job ${jobId}`}</div>
                    <div className="muted">{list.length} submission{list.length>1 ? 's' : ''}</div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    {list.sort((a,b)=> (b.at||0)-(a.at||0)).map((s) => (
                      <div key={s.id} className="card" style={{ padding: 8, marginBottom: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div>Submission {s.id}</div>
                          <div className="muted">{new Date(s.at).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
