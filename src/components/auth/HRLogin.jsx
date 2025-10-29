import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { Briefcase, Lock, AlertCircle } from 'lucide-react'

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Briefcase className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">TalentFlow HR</h1>
          <p className="text-muted-foreground">Sign in to manage your hiring pipeline</p>
        </div>

        {/* Login Card */}
        <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>Enter your master password to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="password">
                  Master Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter HR master password"
                    className="pl-10"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
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
        <div className="mt-6 p-4 bg-muted/50 rounded-lg text-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <p className="text-xs text-muted-foreground">
            Demo password: <span className="font-mono font-semibold text-foreground">password</span>
          </p>
        </div>
      </div>
    </div>
  )
}
