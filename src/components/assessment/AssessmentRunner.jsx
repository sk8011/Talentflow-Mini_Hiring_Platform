import React, { useEffect, useMemo, useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card'
import { Label } from '../ui/Label'
import { Alert, AlertDescription } from '../ui/Alert'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

// Simple evaluator for conditional visibility
// condition example: { if: { questionId: 'q1', equals: 'Yes' } }
function useVisibleQuestions(assessment, responses) {
  const visibleMap = useMemo(() => {
    const map = new Map()
    for (const section of assessment?.sections || []) {
      for (const q of section.questions || []) {
        // Support both builder schema (showIf) and legacy schema (condition.if)
        const showIf = q?.showIf && q.showIf.questionId
          ? { questionId: q.showIf.questionId, equals: q.showIf.equals }
          : (q?.condition?.if && q.condition.if.questionId
              ? { questionId: q.condition.if.questionId, equals: q.condition.if.equals }
              : null)

        // No condition => visible
        if (!showIf || !showIf.questionId) {
          map.set(q.id, true)
          continue
        }

        const target = responses[showIf.questionId]
        const eqRaw = showIf.equals

        // If target is an array (multi-choice)
        if (Array.isArray(target)) {
          // If no equals specified, require at least one selection
          if (eqRaw === undefined || eqRaw === null || eqRaw === '') {
            map.set(q.id, target.length > 0)
            continue
          }
          const list = String(eqRaw).split(',').map((s) => s.trim()).filter(Boolean)
          map.set(q.id, list.some((v) => target.includes(v)))
          continue
        }

        // Scalar targets
        if (eqRaw === undefined || eqRaw === null || eqRaw === '') {
          // No explicit equals: treat as truthy check
          map.set(q.id, Boolean(target))
          continue
        }

        const list = String(eqRaw).split(',').map((s) => s.trim()).filter(Boolean)
        const t = String(target ?? '')
        if (list.length > 1) {
          map.set(q.id, list.includes(t))
        } else {
          map.set(q.id, t === String(eqRaw))
        }
      }
    }
    return map
  }, [assessment, responses])
  return visibleMap
}

export default function AssessmentRunner({ jobId, onDone, candidateId: candidateIdProp }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assessment, setAssessment] = useState(null)
  const [responses, setResponses] = useState({})
  const [errors, setErrors] = useState({})
  const [submitResult, setSubmitResult] = useState(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/assessments/${jobId}`)
        const data = await res.json()
        if (!mounted) return
        setAssessment(data.assessment || { title: 'Assessment', sections: [] })
      } catch (err) {
        if (!mounted) return
        setAssessment({ title: 'Assessment', sections: [] })
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [jobId])

  const visibleMap = useVisibleQuestions(assessment, responses)

  function setAnswer(id, value) {
    setResponses((s) => ({ ...s, [id]: value }))
    // clear error for this question
    setErrors((e) => ({ ...e, [id]: undefined }))
  }

  function validate() {
    const errs = {}
    for (const section of assessment?.sections || []) {
      for (const q of section.questions || []) {
        if (!visibleMap.get(q.id)) continue
        const val = responses[q.id]
        // required
        if (q.required) {
          if (q.type === 'multi-choice') {
            if (!Array.isArray(val) || val.length === 0) errs[q.id] = 'This question is required'
          } else if (val === undefined || val === null || String(val).trim() === '') {
            errs[q.id] = 'This question is required'
          }
        }
        // numeric
        if (q.type === 'numeric' && (val !== undefined && val !== '')) {
          const num = Number(val)
          if (Number.isNaN(num)) errs[q.id] = 'Must be a number'
          if (q.validation?.min !== undefined && num < q.validation.min) errs[q.id] = `Min ${q.validation.min}`
          if (q.validation?.max !== undefined && num > q.validation.max) errs[q.id] = `Max ${q.validation.max}`
        }
        // text length
        if ((q.type === 'short-text' || q.type === 'long-text') && q.validation?.maxLength && val) {
          if (String(val).length > q.validation.maxLength) errs[q.id] = `Max length ${q.validation.maxLength}`
        }
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e) {
    e && e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      // derive candidate id if not passed (candidate portal session)
      let candidateId = candidateIdProp
      if (!candidateId && typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('candidate_session')
          if (raw) {
            const s = JSON.parse(raw)
            candidateId = s?.candidateId
          }
        } catch {}
      }
      const res = await fetch(`/api/assessments/${jobId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses, candidateId }),
      })
      const data = await res.json()
      setSubmitResult(data?.submission || { ok: true })
    } catch (err) {
      setSubmitResult({ ok: false, error: 'Failed to submit' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="max-w-2xl mx-auto border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading assessment…
          </CardTitle>
          <CardDescription>Please wait while we fetch the questions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-24 animate-pulse rounded-md bg-muted" />
        </CardContent>
      </Card>
    )
  }

  if (!assessment || !assessment.sections || assessment.sections.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle>No assessment configured</CardTitle>
          <CardDescription>Use the Builder to add sections and questions.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (submitResult) {
    return (
      <Card className="max-w-2xl mx-auto border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            Submission received
          </CardTitle>
          <CardDescription>Your answers have been recorded successfully.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onDone}>Back to Dashboard</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle>{assessment.title || 'Assessment'}</CardTitle>
          {assessment.description && <CardDescription>{assessment.description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-6">

          {(assessment.sections || []).map((section) => (
            <div key={section.id} className="space-y-4">
              <div>
                <h4 className="font-semibold text-base mb-1">{section.title}</h4>
                {section.description && <p className="text-sm text-muted-foreground">{section.description}</p>}
              </div>
              <div className="space-y-4">
                {(section.questions || []).map((q) => (
                  visibleMap.get(q.id) ? (
                    <Card key={q.id} className="border-border/50 bg-background">
                      <CardContent className="pt-6 space-y-3">
                        <Label className="text-base font-medium">
                          {q.label} {q.required && <span className="text-destructive ml-1">*</span>}
                        </Label>

                        {q.type === 'short-text' && (
                          <Input
                            type="text"
                            value={responses[q.id] || ''}
                            onChange={(e) => setAnswer(q.id, e.target.value)}
                            maxLength={q.validation?.maxLength}
                            placeholder="Your answer"
                          />
                        )}

                        {q.type === 'long-text' && (
                          <Textarea
                            value={responses[q.id] || ''}
                            onChange={(e) => setAnswer(q.id, e.target.value)}
                            maxLength={q.validation?.maxLength}
                            placeholder="Your answer"
                            className="min-h-[100px]"
                          />
                        )}

                        {q.type === 'numeric' && (
                          <Input
                            type="number"
                            value={responses[q.id] || ''}
                            onChange={(e) => setAnswer(q.id, e.target.value)}
                            min={q.validation?.min}
                            max={q.validation?.max}
                            placeholder="Enter a number"
                            className="w-48"
                          />
                        )}

                        {q.type === 'single-choice' && (
                          <div className="space-y-2">
                            {(q.options || []).map((opt) => (
                              <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name={q.id}
                                  value={opt.value}
                                  checked={responses[q.id] === opt.value}
                                  onChange={(e) => setAnswer(q.id, e.target.value)}
                                  className="h-4 w-4"
                                />
                                <span className="text-sm">{opt.label}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {q.type === 'multi-choice' && (
                          <div className="space-y-2">
                            {(q.options || []).map((opt) => {
                              const arr = Array.isArray(responses[q.id]) ? responses[q.id] : []
                              const checked = arr.includes(opt.value)
                              return (
                                <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    value={opt.value}
                                    checked={checked}
                                    onChange={(e) => {
                                      const curr = Array.isArray(responses[q.id]) ? responses[q.id] : []
                                      const next = e.target.checked ? [...curr, opt.value] : curr.filter((v) => v !== opt.value)
                                      setAnswer(q.id, next)
                                    }}
                                    className="h-4 w-4 rounded"
                                  />
                                  <span className="text-sm">{opt.label}</span>
                                </label>
                              )
                            })}
                          </div>
                        )}

                        {q.type === 'file-upload' && (
                          <Input
                            type="file"
                            onChange={(e) => setAnswer(q.id, e.target.files?.[0]?.name || '')}
                          />
                        )}

                        {errors[q.id] && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{errors[q.id]}</AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  ) : null
                ))}
              </div>
            </div>
          ))}

          <div className="flex gap-3 border-t border-border/50 pt-6">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                'Submit Assessment'
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onDone} disabled={saving}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
