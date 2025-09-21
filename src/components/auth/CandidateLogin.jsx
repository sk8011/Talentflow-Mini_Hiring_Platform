import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function CandidateLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // Show a one-time guidance alert when arriving at Candidate Login
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Clear any previous candidate session so a failed login can't piggyback on a stale session
      try { localStorage.removeItem('candidate_session') } catch {}
      const key = 'candidate_login_hint_shown'
      if (!sessionStorage.getItem(key)) {
        alert('For login credentials, go to HR portal → add candidate → open candidate profile → Send invite → login with the credentials received on mail.')
        sessionStorage.setItem(key, '1')
      }
    }
  }, [])

  async function submit(e) {
    e && e.preventDefault()
    setError('')
    const emailTrim = email.trim()
    const passTrim = password.trim()
    if (!emailTrim || !passTrim) { setError('Email and password are required'); return }
    // Basic email format check
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
    if (!emailRe.test(emailTrim)) { setError('Enter a valid email address'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTrim, password: passTrim }),
      })
      if (!res.ok) {
        const msg401 = 'Invalid email or password. Make sure HR has sent you an invite, then use the credentials received via email.'
        const fallback = res.status === 401 ? msg401 : 'Login failed'
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || fallback)
      }
      const data = await res.json()
      const session = data?.session
      if (!session || !session.candidateId || !session.email) {
        throw new Error('Login failed: invalid server response')
      }
      localStorage.setItem('candidate_session', JSON.stringify(session))
      navigate('/candidate')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '70vh' }}>
      <form onSubmit={submit} className="card" style={{ width: '100%', maxWidth: 420 }}>
        <h3 style={{ marginTop: 0 }}>Candidate Login</h3>
        <div style={{ display: 'grid', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 6 }}>Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 6 }}>Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />
          </div>
          {error && <div className="badge badge-red">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        </div>
      </form>
    </div>
  )
}
