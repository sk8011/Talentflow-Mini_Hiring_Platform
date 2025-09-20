import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '70vh' }}>
      <div className="card" style={{ maxWidth: 640, width: '100%' }}>
        <h2 style={{ marginTop: 0 }}>Welcome to TalentFlow</h2>
        <p className="muted" style={{ marginTop: 4 }}>Choose how you want to use the app.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>I am HR</h3>
            <p className="muted">Manage jobs, candidates, and assessments.</p>
            <button className="btn btn-primary" onClick={() => navigate('/hr')}>Go to HR Console</button>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>I am a Candidate</h3>
            <p className="muted">Take assessments and review application status.</p>
            <button className="btn" onClick={() => navigate('/candidate')}>Go to Candidate Portal</button>
          </div>
        </div>
      </div>
    </div>
  )
}
