import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { Users, Mail, Lock, AlertCircle, Info } from 'lucide-react'

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary/5 via-background to-primary/5 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/10 mb-4">
            <Users className="h-8 w-8 text-secondary-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Candidate Portal</h1>
          <p className="text-muted-foreground">Access your assessments and application status</p>
        </div>

        {/* Login Card */}
        <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="email">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="pl-10"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              To get login credentials: Go to HR portal → Add candidate → Open profile → Send invite → Use credentials from email
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
