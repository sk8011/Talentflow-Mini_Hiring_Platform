import React, { useEffect, useMemo, useState } from 'react'

// Simple evaluator for conditional visibility
// condition example: { if: { questionId: 'q1', equals: 'Yes' } }
function useVisibleQuestions(assessment, responses) {
  const visibleMap = useMemo(() => {
    const map = new Map()
    for (const section of assessment?.sections || []) {
      for (const q of section.questions || []) {
        const cond = q.condition
        if (!cond || !cond.if || !cond.if.questionId) {
          map.set(q.id, true)
          continue
        }
        const targetValue = responses[cond.if.questionId]
        const expected = cond.if.equals
        map.set(q.id, targetValue === expected)
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

  if (loading) return <div>Loading assessment…</div>
  if (!assessment || !assessment.sections || assessment.sections.length === 0) {
    return (
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 4 }}>No assessment configured</div>
        <div className="muted">Use the Builder to add sections and questions.</div>
      </div>
    )
  }

  if (submitResult) {
    return (
      <div className="card" style={{ maxWidth: 720 }}>
        <h3 style={{ marginTop: 0 }}>Submission received</h3>
        <div className="muted" style={{ marginBottom: 12 }}>Your answers have been recorded locally.</div>
        <button className="btn btn-primary" onClick={onDone}>Back</button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
      <div className="card" style={{ maxWidth: 900 }}>
        <h3 style={{ marginTop: 0 }}>{assessment.title || 'Assessment'}</h3>
        {assessment.description && <p className="muted">{assessment.description}</p>}

        {(assessment.sections || []).map((section) => (
          <div key={section.id} style={{ marginTop: 16 }}>
            <h4 style={{ margin: '8px 0' }}>{section.title}</h4>
            {section.description && <div className="muted" style={{ marginBottom: 8 }}>{section.description}</div>}
            <div style={{ display: 'grid', gap: 12 }}>
              {(section.questions || []).map((q) => (
                visibleMap.get(q.id) ? (
                  <div key={q.id} className="card" style={{ padding: 12 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                      {q.label} {q.required && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>

                    {q.type === 'short-text' && (
                      <input className="input" type="text" value={responses[q.id] || ''} onChange={(e) => setAnswer(q.id, e.target.value)} maxLength={q.validation?.maxLength} />
                    )}

                    {q.type === 'long-text' && (
                      <textarea className="input" value={responses[q.id] || ''} onChange={(e) => setAnswer(q.id, e.target.value)} maxLength={q.validation?.maxLength} style={{ minHeight: 100 }} />
                    )}

                    {q.type === 'numeric' && (
                      <input className="input" type="number" value={responses[q.id] || ''} onChange={(e) => setAnswer(q.id, e.target.value)} min={q.validation?.min} max={q.validation?.max} />
                    )}

                    {q.type === 'single-choice' && (
                      <div>
                        {(q.options || []).map((opt) => (
                          <label key={opt.id} style={{ display: 'block', marginBottom: 6 }}>
                            <input type="radio" name={q.id} value={opt.value} checked={responses[q.id] === opt.value} onChange={(e) => setAnswer(q.id, e.target.value)} style={{ marginRight: 8 }} />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === 'multi-choice' && (
                      <div>
                        {(q.options || []).map((opt) => {
                          const arr = Array.isArray(responses[q.id]) ? responses[q.id] : []
                          const checked = arr.includes(opt.value)
                          return (
                            <label key={opt.id} style={{ display: 'block', marginBottom: 6 }}>
                              <input type="checkbox" value={opt.value} checked={checked} onChange={(e) => {
                                const curr = Array.isArray(responses[q.id]) ? responses[q.id] : []
                                const next = e.target.checked ? [...curr, opt.value] : curr.filter((v) => v !== opt.value)
                                setAnswer(q.id, next)
                              }} style={{ marginRight: 8 }} />
                              {opt.label}
                            </label>
                          )
                        })}
                      </div>
                    )}

                    {q.type === 'file-upload' && (
                      <input className="input" type="file" onChange={(e) => setAnswer(q.id, e.target.files?.[0]?.name || '')} />
                    )}

                    {errors[q.id] && (<div className="badge badge-red" style={{ marginTop: 8 }}>{errors[q.id]}</div>)}
                  </div>
                ) : null
              ))}
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Submitting…' : 'Submit'}</button>
          <button type="button" className="btn" onClick={onDone} disabled={saving}>Cancel</button>
        </div>
      </div>
    </form>
  )
}
