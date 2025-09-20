import React, { useState } from 'react'

export default function JobForm({ onAdd }) {
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [location, setLocation] = useState('')
  const [type, setType] = useState('Full-time')

  const submit = (e) => {
    e.preventDefault()
    if (!title.trim() || !company.trim()) return
    onAdd({ title: title.trim(), company: company.trim(), location: location.trim(), type })
    setTitle('')
    setCompany('')
    setLocation('')
    setType('Full-time')
  }

  return (
    <form className="job-form" onSubmit={submit}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Job title" required />
      <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" required />
      <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional)" />
      <select value={type} onChange={(e) => setType(e.target.value)}>
        <option>Full-time</option>
        <option>Part-time</option>
        <option>Contract</option>
      </select>
      <button type="submit">Add Job</button>
    </form>
  )
}
