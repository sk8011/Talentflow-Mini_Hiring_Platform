import React, { useState } from 'react'
import { CANDIDATE_STAGES } from '../../lib/storage'

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
    <form onSubmit={submit} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <input placeholder="Candidate name" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: 8, borderRadius: 6 }} />
      <input type="email" placeholder="Email (required)" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: 8, borderRadius: 6 }} />
      <select value={stage} onChange={(e) => setStage(e.target.value)} style={{ padding: 8, borderRadius: 6 }}>
        {CANDIDATE_STAGES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <button type="submit" style={{ padding: '8px 12px', borderRadius: 6 }}>Add Candidate</button>
      {error && <span style={{ color: 'red' }}>{error}</span>}
    </form>
  )
}
