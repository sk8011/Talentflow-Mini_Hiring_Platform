import React, { useState } from 'react'
import { CANDIDATE_STAGES } from '../../lib/storage'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { UserPlus } from 'lucide-react'

export default function CandidateForm({ onAdd }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [stage, setStage] = useState(CANDIDATE_STAGES[0])
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Name is required'); return }
    if (!email.trim()) { setError('Email is required'); return }
    const created = await onAdd({ name: name.trim(), email: email.trim(), stage })
    if (!created) {
      setError('A candidate with this email already exists or the request failed')
      return
    }
    setName('')
    setEmail('')
    setStage(CANDIDATE_STAGES[0])
  }

  return (
    <form onSubmit={submit} className="flex gap-2 items-start flex-wrap">
      <Input
        placeholder="Candidate name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-48"
      />
      <Input
        type="email"
        placeholder="Email (required)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-56"
      />
      <select 
        value={stage} 
        onChange={(e) => setStage(e.target.value)} 
        className="h-10 w-40 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {CANDIDATE_STAGES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <Button type="submit" size="default">
        <UserPlus className="h-4 w-4 mr-2" />
        Add Candidate
      </Button>
      {error && <span className="text-sm text-destructive w-full">{error}</span>}
    </form>
  )
}
