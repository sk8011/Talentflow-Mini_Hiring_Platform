import React, { useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Alert, AlertDescription } from '../ui/Alert'
import { X, Loader2, AlertCircle } from 'lucide-react'

function slugify(s) {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function JobModal({ open, initial = null, onClose, onSave }) {
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [location, setLocation] = useState('')
  const [type, setType] = useState('Full-time')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (initial) {
      setTitle(initial.title || '')
      setCompany(initial.company || '')
      setLocation(initial.location || '')
      setType(initial.type || 'Full-time')
      setSlug(initial.slug || slugify(initial.title || ''))
    } else {
      setTitle('')
      setCompany('')
      setLocation('')
      setType('Full-time')
      setSlug('')
    }
    setError('')
  }, [initial, open])

  useEffect(() => {
    setSlug(slugify(title))
  }, [title])

  async function checkSlugUnique(s) {
    setChecking(true)
    try {
      // get all jobs to check slug uniqueness (ok for small seed)
      const res = await fetch('/api/jobs?pageSize=1000')
      const data = await res.json()
      const list = data.jobs || []
      const exists = list.some((j) => j.slug === s && (!initial || String(j.id) !== String(initial.id)))
      setChecking(false)
      return !exists
    } catch (err) {
      setChecking(false)
      return true
    }
  }

  async function submit(e) {
    e && e.preventDefault()
    setError('')
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    const s = slugify(slug || title)
    const unique = await checkSlugUnique(s)
    if (!unique) {
      setError('Slug already in use; please change title')
      return
    }
    const payload = { title: title.trim(), company: company.trim(), location: location.trim(), type, slug: s }
    await onSave(initial ? initial.id : null, payload)
    onClose && onClose()
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-2xl border-border/50 bg-card/95 shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{initial ? 'Edit Job' : 'Create New Job'}</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { onClose && onClose() }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                placeholder="e.g. Senior Frontend Engineer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  placeholder="Company name"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Remote / City"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Job Type</Label>
                <select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="flex-1"
                  />
                  {checking && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
              </div>
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => { onClose && onClose() }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {initial ? 'Save Changes' : 'Create Job'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
