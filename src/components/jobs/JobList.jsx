import React, { useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { GripVertical, Edit2, Trash2, Archive, ArchiveRestore, CheckCircle2, XCircle } from 'lucide-react'

export default function JobList({ jobs, onDelete, onUpdate, onArchive, onReorder, onNavigate, loading, pendingIds = new Set() }) {
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ title: '', company: '', location: '', type: 'Full-time' })
  const [dragOverId, setDragOverId] = useState(null)

  const items = Array.isArray(jobs) ? jobs.filter(Boolean) : []

  if (loading) return <Card className="p-6 text-center text-muted-foreground">Loading jobs...</Card>
  if (!items || items.length === 0) return <Card className="p-6 text-center text-muted-foreground">No jobs yet — add the first one!</Card>

  const startEdit = (job) => {
    setEditingId(job.id)
    setForm({ title: job.title || '', company: job.company || '', location: job.location || '', type: job.type || 'Full-time' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm({ title: '', company: '', location: '', type: 'Full-time' })
  }

  const saveEdit = async (id) => {
    if (!form.title.trim() || !form.company.trim()) return
    await onUpdate(id, { title: form.title.trim(), company: form.company.trim(), location: form.location.trim(), type: form.type })
    cancelEdit()
  }

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData('text/plain', String(id))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, id) => {
    e.preventDefault()
    setDragOverId(id)
  }

  const handleDragLeave = (e) => {
    setDragOverId(null)
  }

  const handleDrop = (e, targetId) => {
    e.preventDefault()
    const srcId = e.dataTransfer.getData('text/plain')
    setDragOverId(null)
    if (!srcId || String(srcId) === String(targetId)) return
    // compute new order
    const srcIndex = items.findIndex((j) => String(j.id) === String(srcId))
    const targetIndex = items.findIndex((j) => String(j.id) === String(targetId))
    if (srcIndex === -1 || targetIndex === -1) return
    const newJobs = [...items]
    const [moved] = newJobs.splice(srcIndex, 1)
    newJobs.splice(targetIndex, 0, moved)
    const order = newJobs.map((j) => String(j.id))
    if (typeof onReorder === 'function') onReorder(order)
  }

  return (
    <div className="space-y-3">
      {items.map((job) => (
        <Card
          key={job.id}
          draggable
          onDragStart={(e) => handleDragStart(e, job.id)}
          onDragOver={(e) => handleDragOver(e, job.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, job.id)}
          className={`p-4 transition-all hover:shadow-md ${
            job.status === 'filled' ? 'opacity-60 bg-muted' : ''
          } ${
            dragOverId === job.id ? 'ring-2 ring-primary bg-accent' : ''
          } ${
            job.archived ? 'opacity-50' : ''
          }`}
        >
          <div className="flex items-start gap-4">
            {/* Drag Handle */}
            <div className="flex-shrink-0 pt-1">
              <div
                title="Drag to reorder"
                className="cursor-grab p-2 rounded-md border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
              >
                <GripVertical className="h-4 w-4 text-primary" />
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {editingId === job.id ? (
                <div className="flex flex-wrap gap-2">
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                    placeholder="Job title"
                    className="flex-1 min-w-[200px]"
                  />
                  <Input
                    value={form.company}
                    onChange={(e) => setForm((s) => ({ ...s, company: e.target.value }))}
                    placeholder="Company"
                    className="flex-1 min-w-[150px]"
                  />
                  <Input
                    value={form.location}
                    onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))}
                    placeholder="Location"
                    className="flex-1 min-w-[120px]"
                  />
                  <select
                    value={form.type}
                    onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}
                    className="h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option>Full-time</option>
                    <option>Part-time</option>
                    <option>Contract</option>
                  </select>
                </div>
              ) : (
                <div>
                  <h3
                    className={`text-lg font-semibold mb-2 ${
                      typeof onNavigate === 'function' ? 'cursor-pointer hover:text-primary transition-colors' : ''
                    } ${
                      job.status === 'filled' ? 'line-through' : ''
                    }`}
                    onClick={() => {
                      if (typeof onNavigate === 'function') onNavigate(job.id)
                    }}
                  >
                    {job.title}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{job.company}</Badge>
                    <Badge variant="outline">{job.location || 'Remote'}</Badge>
                    <Badge variant="success">{job.type || 'Full-time'}</Badge>
                    {job.archived && <Badge variant="destructive">Archived</Badge>}
                    {job.status === 'filled' && <Badge variant="secondary">Filled</Badge>}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex-shrink-0 flex flex-wrap gap-2 items-start">
              {editingId === job.id ? (
                <>
                  <Button
                    size="sm"
                    onClick={() => saveEdit(job.id)}
                    disabled={pendingIds.has(String(job.id))}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelEdit}
                    disabled={pendingIds.has(String(job.id))}
                  >
                    Cancel
                  </Button>
                  {pendingIds.has(String(job.id)) && (
                    <span className="text-sm text-muted-foreground">(saving...)</span>
                  )}
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => typeof onArchive === 'function' && onArchive(job.id, !(job.archived === true))}
                    disabled={pendingIds.has(String(job.id))}
                    title={job.archived ? 'Unarchive' : 'Archive'}
                  >
                    {job.archived ? (
                      <ArchiveRestore className="h-4 w-4" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      onUpdate(job.id, { status: job.status === 'filled' ? 'open' : 'filled' })
                    }
                    disabled={pendingIds.has(String(job.id))}
                    title={job.status === 'filled' ? 'Reopen' : 'Mark as filled'}
                  >
                    {job.status === 'filled' ? (
                      <XCircle className="h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit(job)}
                    disabled={pendingIds.has(String(job.id))}
                    title="Edit"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(job.id)}
                    disabled={pendingIds.has(String(job.id))}
                    title="Delete"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
