import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// Very simple master password login for HR
// In a real app, do NOT hardcode. Here we rely on localStorage for demo.
export default function HRLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const MASTER = import.meta.env.VITE_HR_MASTER || 'password'

  const submit = async (e) => {
    e && e.preventDefault()
    setError('')
    if (!password.trim()) { setError('Password is required'); return }
    setLoading(true)
    try {
      if (password.trim() !== MASTER) {
        setError('Invalid master password')
        return
      }
      localStorage.setItem('hr_session', JSON.stringify({ ok: true, at: Date.now() }))
      navigate('/hr', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '70vh' }}>
      <form onSubmit={submit} className="card" style={{ width: '100%', maxWidth: 420 }}>
        <h3 style={{ marginTop: 0 }}>HR Login</h3>
        <div style={{ display: 'grid', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 6 }}>Master Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter HR master password" />
          </div>
          {error && <div className="badge badge-red">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        </div>
      </form>
    </div>
  )
}
