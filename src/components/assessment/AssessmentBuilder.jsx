import React, { useState, useEffect } from 'react'

const QUESTION_TYPES = [
  { value: 'single-choice', label: 'Single Choice' },
  { value: 'multi-choice', label: 'Multiple Choice' },
  { value: 'short-text', label: 'Short Text' },
  { value: 'long-text', label: 'Long Text' },
  { value: 'numeric', label: 'Numeric' },
  { value: 'file-upload', label: 'File Upload' }
]

export default function AssessmentBuilder({ jobId, onSave, onCancel }) {
  const [assessment, setAssessment] = useState({
    title: '',
    description: '',
    sections: []
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (jobId) {
      loadAssessment()
    }
  }, [jobId])

  const loadAssessment = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/assessments/${jobId}`)
      const data = await res.json()
      if (data.assessment) {
        // Normalize shape: ensure sections[] exists. If legacy 'questions' exists, wrap in a single section.
        const incoming = data.assessment || {}
        let normalized = incoming
        if (!Array.isArray(incoming.sections)) {
          if (Array.isArray(incoming.questions)) {
            normalized = {
              title: incoming.title || '',
              description: incoming.description || '',
              sections: [
                {
                  id: `section-${Date.now()}`,
                  title: incoming.title || 'Section',
                  description: incoming.description || '',
                  questions: incoming.questions || [],
                },
              ],
            }
          } else {
            normalized = { title: incoming.title || '', description: incoming.description || '', sections: [] }
          }
        }
        setAssessment(normalized)
      }
    } catch (err) {
      console.error('Failed to load assessment:', err)
    } finally {
      setLoading(false)
    }
  }

  const addSection = () => {
    const newSection = {
      id: `section-${Date.now()}`,
      title: 'New Section',
      description: '',
      questions: []
    }
    setAssessment(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }))
  }

  const updateSection = (sectionId, updates) => {
    setAssessment(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    }))
  }

  const deleteSection = (sectionId) => {
    setAssessment(prev => ({
      ...prev,
      sections: prev.sections.filter(section => section.id !== sectionId)
    }))
  }

  const addQuestion = (sectionId) => {
    const newQuestion = {
      id: `question-${Date.now()}`,
      type: 'short-text',
      label: 'New Question',
      required: false,
      options: [],
      validation: {},
      // simple conditional visibility support
      // showIf: { questionId: 'q1', equals: 'Yes' }
      showIf: undefined,
    }
    
    setAssessment(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, questions: [...section.questions, newQuestion] }
          : section
      )
    }))
  }

  const updateQuestion = (sectionId, questionId, updates) => {
    setAssessment(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              questions: section.questions.map(question =>
                question.id === questionId ? { ...question, ...updates } : question
              )
            }
          : section
      )
    }))
  }

  const deleteQuestion = (sectionId, questionId) => {
    setAssessment(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              questions: section.questions.filter(question => question.id !== questionId)
            }
          : section
      )
    }))
  }

  const addOption = (sectionId, questionId) => {
    const newOption = {
      id: `option-${Date.now()}`,
      label: 'New Option',
      value: ''
    }
    
    updateQuestion(sectionId, questionId, {
      options: [...(getQuestion(sectionId, questionId)?.options || []), newOption]
    })
  }

  const updateOption = (sectionId, questionId, optionId, updates) => {
    const question = getQuestion(sectionId, questionId)
    if (!question) return
    
    const updatedOptions = question.options.map(option =>
      option.id === optionId ? { ...option, ...updates } : option
    )
    
    updateQuestion(sectionId, questionId, { options: updatedOptions })
  }

  const deleteOption = (sectionId, questionId, optionId) => {
    const question = getQuestion(sectionId, questionId)
    if (!question) return
    
    const updatedOptions = question.options.filter(option => option.id !== optionId)
    updateQuestion(sectionId, questionId, { options: updatedOptions })
  }

  const getQuestion = (sectionId, questionId) => {
    const section = assessment.sections.find(s => s.id === sectionId)
    return section?.questions.find(q => q.id === questionId)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/assessments/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assessment)
      })
      
      if (res.ok) {
        onSave && onSave(assessment)
      } else {
        throw new Error('Failed to save assessment')
      }
    } catch (err) {
      console.error('Save failed:', err)
      alert('Failed to save assessment')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div>Loading assessment...</div>
  }

  return (
    <div style={{ display: 'flex', gap: 20, height: '80vh' }}>
      {/* Builder Panel */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card-bg)' }}>
        <h2>Assessment Builder</h2>
        
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
            Assessment Title
          </label>
          <input
            type="text"
            value={assessment.title}
            onChange={(e) => setAssessment(prev => ({ ...prev, title: e.target.value }))}
            style={{ width: '100%', padding: 8, border: '1px solid var(--border)', borderRadius: 4, background: 'var(--card-bg)', color: 'var(--text)' }}
            placeholder="Enter assessment title"
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
            Description
          </label>
          <textarea
            value={assessment.description}
            onChange={(e) => setAssessment(prev => ({ ...prev, description: e.target.value }))}
            style={{ width: '100%', padding: 8, border: '1px solid var(--border)', borderRadius: 4, minHeight: 80, background: 'var(--card-bg)', color: 'var(--text)' }}
            placeholder="Enter assessment description"
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3>Sections</h3>
            <button onClick={addSection} style={{ padding: '6px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 4 }}>
              Add Section
            </button>
          </div>

          {(assessment.sections || []).map((section, sectionIndex) => (
            <div key={section.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 16, background: 'var(--card-bg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => updateSection(section.id, { title: e.target.value })}
                  style={{ fontWeight: 600, fontSize: 16, border: 'none', background: 'transparent', color: 'var(--text)', flex: 1 }}
                  placeholder="Section title"
                />
                <button
                  onClick={() => deleteSection(section.id)}
                  style={{ padding: '4px 8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4 }}
                >
                  Delete
                </button>
              </div>

              <textarea
                value={section.description}
                onChange={(e) => updateSection(section.id, { description: e.target.value })}
                style={{ width: '100%', padding: 8, border: '1px solid var(--border)', borderRadius: 4, marginBottom: 12, background: 'var(--card-bg)', color: 'var(--text)' }}
                placeholder="Section description"
                rows={2}
              />

              <div style={{ marginBottom: 12 }}>
                <button
                  onClick={() => addQuestion(section.id)}
                  style={{ padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 4 }}
                >
                  Add Question
                </button>
              </div>

              {(section.questions || []).map((question, questionIndex) => (
                <QuestionEditor
                  key={question.id}
                  question={question}
                  sectionId={section.id}
                  onUpdate={updateQuestion}
                  onDelete={deleteQuestion}
                  onAddOption={addOption}
                  onUpdateOption={updateOption}
                  onDeleteOption={deleteOption}
                  allQuestions={(assessment.sections || []).flatMap((sec) => sec.questions || [])}
                />
              ))}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, paddingTop: 20, borderTop: '1px solid #e5e7eb' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 4 }}
          >
            {saving ? 'Saving...' : 'Save Assessment'}
          </button>
          <button
            onClick={onCancel}
            style={{ padding: '10px 20px', background: '#6b7280', color: 'white', border: 'none', borderRadius: 4 }}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Live Preview Panel */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card-bg)' }}>
        <h2>Live Preview</h2>
        <AssessmentPreview assessment={assessment} />
      </div>
    </div>
  )
}

function QuestionEditor({ question, sectionId, onUpdate, onDelete, onAddOption, onUpdateOption, onDeleteOption, allQuestions = [] }) {
  const needsOptions = ['single-choice', 'multi-choice'].includes(question.type)

  return (
    <div style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: 12, marginBottom: 12, background: '#f9fafb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <select
          value={question.type}
          onChange={(e) => onUpdate(sectionId, question.id, { type: e.target.value, options: needsOptions ? question.options : [] })}
          style={{ padding: 4, border: '1px solid #e5e7eb', borderRadius: 4 }}
        >
          {QUESTION_TYPES.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
        <button
          onClick={() => onDelete(sectionId, question.id)}
          style={{ padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 4 }}
        >
          Delete
        </button>
      </div>

      <input
        type="text"
        value={question.label}
        onChange={(e) => onUpdate(sectionId, question.id, { label: e.target.value })}
        style={{ width: '100%', padding: 8, border: '1px solid #e5e7eb', borderRadius: 4, marginBottom: 8 }}
        placeholder="Question text"
      />

      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={question.required}
            onChange={(e) => onUpdate(sectionId, question.id, { required: e.target.checked })}
          />
          Required
        </label>
      </div>

      {/* Conditional visibility (simple) */}
      <div style={{ marginBottom: 8, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: 8 }}>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Condition (optional): Show this question only if another question matches a value.</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={question.showIf?.questionId || ''}
            onChange={(e) => onUpdate(sectionId, question.id, { showIf: { ...(question.showIf || {}), questionId: e.target.value || undefined } })}
            style={{ flex: 1, minWidth: 220, padding: 6, border: '1px solid #e5e7eb', borderRadius: 4, background: 'white' }}
          >
            <option value="">Depends on…</option>
            {allQuestions.filter((q) => q && q.id && q.id !== question.id).map((q) => (
              <option key={q.id} value={q.id}>{q.label || q.id} — {q.id}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Equals value (comma for multiple)"
            value={question.showIf?.equals || ''}
            onChange={(e) => onUpdate(sectionId, question.id, { showIf: { ...(question.showIf || {}), equals: e.target.value } })}
            style={{ flex: 1, minWidth: 220, padding: 6, border: '1px solid #e5e7eb', borderRadius: 4 }}
          />
          {question.showIf && (
            <button
              onClick={() => onUpdate(sectionId, question.id, { showIf: undefined })}
              style={{ padding: '4px 8px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 4 }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {needsOptions && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong>Options:</strong>
            <button
              onClick={() => onAddOption(sectionId, question.id)}
              style={{ padding: '4px 8px', background: '#10b981', color: 'white', border: 'none', borderRadius: 4 }}
            >
              Add Option
            </button>
          </div>
          {question.options?.map((option, index) => (
            <div key={option.id} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <input
                type="text"
                value={option.label}
                onChange={(e) => onUpdateOption(sectionId, question.id, option.id, { label: e.target.value, value: e.target.value })}
                style={{ flex: 1, padding: 4, border: '1px solid #e5e7eb', borderRadius: 4 }}
                placeholder={`Option ${index + 1}`}
              />
              <button
                onClick={() => onDeleteOption(sectionId, question.id, option.id)}
                style={{ padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 4 }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {question.type === 'numeric' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            type="number"
            placeholder="Min"
            value={question.validation?.min || ''}
            onChange={(e) => onUpdate(sectionId, question.id, { 
              validation: { ...question.validation, min: e.target.value ? Number(e.target.value) : undefined }
            })}
            style={{ flex: 1, padding: 4, border: '1px solid #e5e7eb', borderRadius: 4 }}
          />
          <input
            type="number"
            placeholder="Max"
            value={question.validation?.max || ''}
            onChange={(e) => onUpdate(sectionId, question.id, { 
              validation: { ...question.validation, max: e.target.value ? Number(e.target.value) : undefined }
            })}
            style={{ flex: 1, padding: 4, border: '1px solid #e5e7eb', borderRadius: 4 }}
          />
        </div>
      )}

      {['short-text', 'long-text'].includes(question.type) && (
        <div style={{ marginTop: 8 }}>
          <input
            type="number"
            placeholder="Max length"
            value={question.validation?.maxLength || ''}
            onChange={(e) => onUpdate(sectionId, question.id, { 
              validation: { ...question.validation, maxLength: e.target.value ? Number(e.target.value) : undefined }
            })}
            style={{ width: '100px', padding: 4, border: '1px solid #e5e7eb', borderRadius: 4 }}
          />
        </div>
      )}
    </div>
  )
}

function AssessmentPreview({ assessment }) {
  const [responses, setResponses] = useState({})

  const handleResponse = (questionId, value) => {
    setResponses(prev => ({ ...prev, [questionId]: value }))
  }

  if (!assessment.title) {
    return <div style={{ color: '#6b7280', fontStyle: 'italic' }}>Start building your assessment to see the preview</div>
  }

  return (
    <div>
      <h3>{assessment.title}</h3>
      {assessment.description && (
        <p style={{ color: '#6b7280', marginBottom: 20 }}>{assessment.description}</p>
      )}

      {(assessment.sections || []).map((section) => (
        <div key={section.id} style={{ marginBottom: 30 }}>
          <h4>{section.title}</h4>
          {section.description && (
            <p style={{ color: '#6b7280', marginBottom: 16 }}>{section.description}</p>
          )}

          {(section.questions || []).map((question) => {
            const visible = (() => {
              const cond = question.showIf
              if (!cond || !cond.questionId) return true
              const target = responses[cond.questionId]
              // Build list of acceptable values from equals (comma-separated)
              const list = String(cond.equals ?? '')
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
              if (Array.isArray(target)) {
                if (list.length === 0) return target.length > 0 // if no equals specified, just requires any value
                return list.some((v) => target.includes(v))
              }
              if (cond.equals === undefined || cond.equals === null || cond.equals === '') {
                // No explicit equals: treat as truthy check
                return Boolean(target)
              }
              // Scalar target: if equals has multiple values, match any
              const t = String(target ?? '')
              if (list.length > 1) {
                return list.includes(t)
              }
              // Single value compare
              return t === String(cond.equals)
            })()
            if (!visible) return null
            return (
              <div key={question.id} style={{ marginBottom: 20, padding: 16, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--card-bg)' }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  {question.label}
                  {question.required && <span style={{ color: 'var(--danger)' }}> *</span>}
                </label>

              {question.type === 'short-text' && (
                <input
                  type="text"
                  value={responses[question.id] || ''}
                  onChange={(e) => handleResponse(question.id, e.target.value)}
                  style={{ width: '100%', padding: 8, border: '1px solid var(--border)', borderRadius: 4, background: 'var(--card-bg)', color: 'var(--text)' }}
                  maxLength={question.validation?.maxLength}
                />
              )}

              {question.type === 'long-text' && (
                <textarea
                  value={responses[question.id] || ''}
                  onChange={(e) => handleResponse(question.id, e.target.value)}
                  style={{ width: '100%', padding: 8, border: '1px solid var(--border)', borderRadius: 4, minHeight: 80, background: 'var(--card-bg)', color: 'var(--text)' }}
                  maxLength={question.validation?.maxLength}
                />
              )}

              {question.type === 'numeric' && (
                <input
                  type="number"
                  value={responses[question.id] || ''}
                  onChange={(e) => handleResponse(question.id, e.target.value)}
                  style={{ width: '200px', padding: 8, border: '1px solid var(--border)', borderRadius: 4, background: 'var(--card-bg)', color: 'var(--text)' }}
                  min={question.validation?.min}
                  max={question.validation?.max}
                />
              )}

              {question.type === 'single-choice' && (
                <div>
                  {question.options?.map((option) => (
                    <label key={option.id} style={{ display: 'block', marginBottom: 8 }}>
                      <input
                        type="radio"
                        name={question.id}
                        value={option.value}
                        checked={responses[question.id] === option.value}
                        onChange={(e) => handleResponse(question.id, e.target.value)}
                        style={{ marginRight: 8 }}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              )}

              {question.type === 'multi-choice' && (
                <div>
                  {question.options?.map((option) => (
                    <label key={option.id} style={{ display: 'block', marginBottom: 8 }}>
                      <input
                        type="checkbox"
                        value={option.value}
                        checked={(responses[question.id] || []).includes(option.value)}
                        onChange={(e) => {
                          const current = responses[question.id] || []
                          const updated = e.target.checked
                            ? [...current, option.value]
                            : current.filter(v => v !== option.value)
                          handleResponse(question.id, updated)
                        }}
                        style={{ marginRight: 8 }}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              )}

              {question.type === 'file-upload' && (
                <input
                  type="file"
                  onChange={(e) => handleResponse(question.id, e.target.files[0]?.name || '')}
                  style={{ width: '100%', padding: 8, border: '1px solid #e5e7eb', borderRadius: 4 }}
                />
              )}
            </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
