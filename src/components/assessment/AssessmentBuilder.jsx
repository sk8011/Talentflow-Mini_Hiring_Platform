import React, { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Label } from '../ui/Label'
import { Switch } from '../ui/Switch'
import { ScrollArea } from '../ui/ScrollArea'
import { Plus, Trash2, ChevronDown, ChevronUp, Save, Loader2, Eye, EyeOff, X } from 'lucide-react'

const QUESTION_TYPES = [
  { value: 'single-choice', label: 'Single Choice', icon: '🔘' },
  { value: 'multi-choice', label: 'Multiple Choice', icon: '☑️' },
  { value: 'short-text', label: 'Short Text', icon: '✏️' },
  { value: 'long-text', label: 'Long Text', icon: '📝' },
  { value: 'numeric', label: 'Numeric', icon: '🔢' },
  { value: 'file-upload', label: 'File Upload', icon: '📎' }
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
    return (
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading assessment…
          </CardTitle>
          <CardDescription>Please wait while we fetch the configuration.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-24 animate-pulse rounded-md bg-muted" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid h-[80vh] gap-4 md:grid-cols-2">
      {/* Builder Panel */}
      <Card className="flex min-h-0 flex-col overflow-hidden border-border/50 bg-card/50">
        <CardHeader className="shrink-0">
          <CardTitle>Assessment Builder</CardTitle>
          <CardDescription>Define sections, questions, and validation rules</CardDescription>
        </CardHeader>
        <ScrollArea className="flex-1">
          <CardContent className="space-y-6">
            {/* Assessment Title */}
            <div className="space-y-2">
              <Label htmlFor="assessment-title">Assessment Title</Label>
              <Input
                id="assessment-title"
                value={assessment.title}
                onChange={(e) => setAssessment(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter assessment title"
              />
            </div>

            {/* Assessment Description */}
            <div className="space-y-2">
              <Label htmlFor="assessment-description">Description</Label>
              <Textarea
                id="assessment-description"
                value={assessment.description}
                onChange={(e) => setAssessment(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter assessment description"
                className="min-h-[80px]"
              />
            </div>

            {/* Sections */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Sections</h3>
                <Button onClick={addSection} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Section
                </Button>
              </div>

          {(assessment.sections || []).map((section, sectionIndex) => (
              <Card key={section.id} className="border-border/50 bg-muted/30">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <Input
                      value={section.title}
                      onChange={(e) => updateSection(section.id, { title: e.target.value })}
                      placeholder="Section title"
                      className="font-semibold text-base"
                    />
                    <Button
                      onClick={() => deleteSection(section.id)}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={section.description}
                    onChange={(e) => updateSection(section.id, { description: e.target.value })}
                    placeholder="Section description (optional)"
                    rows={2}
                  />

                  <Button
                    onClick={() => addQuestion(section.id)}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Question
                  </Button>

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
                </CardContent>
              </Card>
            ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 border-t border-border/50 pt-6">
              <Button
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Assessment
                  </>
                )}
              </Button>
              <Button
                onClick={onCancel}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </ScrollArea>
      </Card>

      {/* Live Preview Panel */}
      <Card className="flex min-h-0 flex-col overflow-hidden border-border/50 bg-card/50">
        <CardHeader className="shrink-0">
          <CardTitle>Live Preview</CardTitle>
          <CardDescription>See what candidates will experience</CardDescription>
        </CardHeader>
        <ScrollArea className="flex-1">
          <CardContent>
            <AssessmentPreview assessment={assessment} />
          </CardContent>
        </ScrollArea>
      </Card>
    </div>
  )
}

function QuestionEditor({ question, sectionId, onUpdate, onDelete, onAddOption, onUpdateOption, onDeleteOption, allQuestions = [] }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const needsOptions = ['single-choice', 'multi-choice'].includes(question.type)
  const typeInfo = QUESTION_TYPES.find(t => t.value === question.type)

  return (
    <Card className="border-border/50 bg-background">
      <div 
        className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="inline-flex items-center justify-center rounded p-1 hover:bg-muted"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          <span className="text-lg">{typeInfo?.icon}</span>
          <p className="text-sm font-medium truncate">{question.label || 'Untitled Question'}</p>
          {question.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
        </div>
        <Button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(sectionId, question.id)
          }}
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {isExpanded && (
        <CardContent className="space-y-4 border-t border-border/50 pt-4">
          <div className="space-y-2">
            <Label>Question Type</Label>
            <Select
              value={question.type}
              onValueChange={(value) => onUpdate(sectionId, question.id, { type: value, options: needsOptions ? question.options : [] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="flex items-center gap-2">
                      <span>{type.icon}</span>
                      <span>{type.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Question Text</Label>
            <Input
              value={question.label}
              onChange={(e) => onUpdate(sectionId, question.id, { label: e.target.value })}
              placeholder="Enter question text"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id={`required-${question.id}`}
              checked={question.required}
              onCheckedChange={(checked) => onUpdate(sectionId, question.id, { required: checked })}
            />
            <Label htmlFor={`required-${question.id}`} className="cursor-pointer">
              Required
            </Label>
          </div>

          {/* Conditional visibility */}
          <div className="space-y-2 rounded-md border border-border/50 bg-muted/30 p-3">
            <Label className="text-xs text-muted-foreground">
              Conditional Display (optional): Show this question only if another question matches a value
            </Label>
            <div className="flex flex-wrap gap-2">
              <Select
                value={question.showIf?.questionId || ''}
                onValueChange={(value) => onUpdate(sectionId, question.id, { showIf: { ...(question.showIf || {}), questionId: value || undefined } })}
              >
                <SelectTrigger className="flex-1 min-w-[200px]">
                  <SelectValue placeholder="Depends on…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No dependency</SelectItem>
                  {allQuestions.filter((q) => q && q.id && q.id !== question.id).map((q) => (
                    <SelectItem key={q.id} value={q.id}>{q.label || q.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Equals value (comma for multiple)"
                value={question.showIf?.equals || ''}
                onChange={(e) => onUpdate(sectionId, question.id, { showIf: { ...(question.showIf || {}), equals: e.target.value } })}
                className="flex-1 min-w-[200px]"
              />
              {question.showIf && (
                <Button
                  onClick={() => onUpdate(sectionId, question.id, { showIf: undefined })}
                  variant="ghost"
                  size="sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {needsOptions && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Options</Label>
                <Button
                  onClick={() => onAddOption(sectionId, question.id)}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="mr-2 h-3 w-3" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {question.options?.map((option, index) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <Input
                      value={option.label}
                      onChange={(e) => onUpdateOption(sectionId, question.id, option.id, { label: e.target.value, value: e.target.value })}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => onDeleteOption(sectionId, question.id, option.id)}
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {question.type === 'numeric' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Min Value</Label>
                <Input
                  type="number"
                  placeholder="No minimum"
                  value={question.validation?.min ?? ''}
                  onChange={(e) => onUpdate(sectionId, question.id, { 
                    validation: { ...question.validation, min: e.target.value ? Number(e.target.value) : undefined }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Value</Label>
                <Input
                  type="number"
                  placeholder="No maximum"
                  value={question.validation?.max ?? ''}
                  onChange={(e) => onUpdate(sectionId, question.id, { 
                    validation: { ...question.validation, max: e.target.value ? Number(e.target.value) : undefined }
                  })}
                />
              </div>
            </div>
          )}

          {['short-text', 'long-text'].includes(question.type) && (
            <div className="space-y-2">
              <Label>Max Length</Label>
              <Input
                type="number"
                placeholder="No limit"
                value={question.validation?.maxLength || ''}
                onChange={(e) => onUpdate(sectionId, question.id, { 
                  validation: { ...question.validation, maxLength: e.target.value ? Number(e.target.value) : undefined }
                })}
                className="w-32"
              />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

function AssessmentPreview({ assessment }) {
  const [responses, setResponses] = useState({})

  const handleResponse = (questionId, value) => {
    setResponses(prev => ({ ...prev, [questionId]: value }))
  }

  if (!assessment.title) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Eye className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-sm text-muted-foreground italic">Start building your assessment to see the preview</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">{assessment.title}</h3>
        {assessment.description && (
          <p className="text-sm text-muted-foreground">{assessment.description}</p>
        )}
      </div>

      {(assessment.sections || []).map((section) => (
        <div key={section.id} className="space-y-4">
          <div>
            <h4 className="font-semibold text-base mb-1">{section.title}</h4>
            {section.description && (
              <p className="text-sm text-muted-foreground">{section.description}</p>
            )}
          </div>

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
              <Card key={question.id} className="border-border/50 bg-background">
                <CardContent className="pt-6">
                  <Label className="mb-3 block text-base font-medium">
                    {question.label}
                    {question.required && <span className="text-destructive ml-1">*</span>}
                  </Label>

                  {question.type === 'short-text' && (
                    <Input
                      value={responses[question.id] || ''}
                      onChange={(e) => handleResponse(question.id, e.target.value)}
                      maxLength={question.validation?.maxLength}
                      placeholder="Your answer"
                    />
                  )}

                  {question.type === 'long-text' && (
                    <Textarea
                      value={responses[question.id] || ''}
                      onChange={(e) => handleResponse(question.id, e.target.value)}
                      maxLength={question.validation?.maxLength}
                      placeholder="Your answer"
                      className="min-h-[100px]"
                    />
                  )}

                  {question.type === 'numeric' && (
                    <Input
                      type="number"
                      value={responses[question.id] || ''}
                      onChange={(e) => handleResponse(question.id, e.target.value)}
                      min={question.validation?.min}
                      max={question.validation?.max}
                      placeholder="Enter a number"
                      className="w-48"
                    />
                  )}

                  {question.type === 'single-choice' && (
                    <div className="space-y-2">
                      {question.options?.map((option) => (
                        <label key={option.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={question.id}
                            value={option.value}
                            checked={responses[question.id] === option.value}
                            onChange={(e) => handleResponse(question.id, e.target.value)}
                            className="h-4 w-4"
                          />
                          <span className="text-sm">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.type === 'multi-choice' && (
                    <div className="space-y-2">
                      {question.options?.map((option) => (
                        <label key={option.id} className="flex items-center gap-2 cursor-pointer">
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
                            className="h-4 w-4 rounded"
                          />
                          <span className="text-sm">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.type === 'file-upload' && (
                    <Input
                      type="file"
                      onChange={(e) => handleResponse(question.id, e.target.files[0]?.name || '')}
                    />
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ))}
    </div>
  )
}
