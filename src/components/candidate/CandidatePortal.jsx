import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { LogOut, FileText, CheckCircle2, Clock, User, Mail, Briefcase } from 'lucide-react'

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
    <div className="min-h-screen bg-gradient-to-br from-secondary/5 via-background to-primary/5">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Candidate Portal</h1>
              <p className="text-xs text-muted-foreground">Manage your applications</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { localStorage.removeItem('candidate_session'); navigate('/candidate/login') }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Profile Card */}
        {candidate && (
          <Card className="mb-6 animate-fade-in">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{candidate.name}</h2>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Mail className="h-4 w-4" />
                      {candidate.email}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Current Stage: {candidate.stage || 'Applied'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assignments Section */}
        <Card className="mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>My Assignments</CardTitle>
            </div>
            <CardDescription>Complete your assessments to move forward</CardDescription>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No assignments yet.</p>
                <p className="text-sm mt-1">Check back later for new assessments.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((id) => {
                  const subs = submissionsByJob[id] || []
                  const hasSubmitted = subs.length > 0
                  const last = hasSubmitted ? subs.sort((a,b)=> (b.at||0)-(a.at||0))[0] : null
                  return (
                    <Card key={id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <h3 className="font-semibold text-lg">{jobMap[id]?.title || `Job ${id}`}</h3>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">Job ID: {id}</p>
                          {hasSubmitted && (
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              <span className="text-xs text-muted-foreground">
                                Submitted {new Date(last.at).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {!hasSubmitted ? (
                            <Button onClick={() => goRun(id)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Take Assessment
                            </Button>
                          ) : (
                            <Badge variant="success" className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Completed
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submission History */}
        <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle>Submission History</CardTitle>
            </div>
            <CardDescription>View all your past submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(submissionsByJob).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No submissions yet.</p>
                <p className="text-sm mt-1">Complete an assessment to see your history.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(submissionsByJob).map(([jobId, list]) => (
                  (list && list.length > 0) ? (
                    <Card key={jobId} className="p-4">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <h4 className="font-semibold">{jobMap[jobId]?.title || `Job ${jobId}`}</h4>
                        </div>
                        <Badge variant="secondary">
                          {list.length} submission{list.length>1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {list.sort((a,b)=> (b.at||0)-(a.at||0)).map((s) => (
                          <div key={s.id} className="flex justify-between items-center p-3 bg-muted rounded-md">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium">Submission {s.id}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(s.at).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ) : null
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
