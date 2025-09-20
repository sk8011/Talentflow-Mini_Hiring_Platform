import React from 'react'
import { CANDIDATE_STAGES } from '../lib/storage'

export default function CandidateDetail({ candidate, onClose, onChangeStage }) {
  if (!candidate) return <div style={{ padding: 12 }}>Select a candidate</div>
  const current = candidate.stage || CANDIDATE_STAGES[0]
  const idx = CANDIDATE_STAGES.indexOf(current)
  return (
    <div style={{ padding: 12, borderLeft: '1px solid #e5e7eb', minWidth: 260 }}>
      <button onClick={onClose} style={{ marginBottom: 8 }}>Close</button>
      <h3>{candidate.name}</h3>
      <div style={{ color: '#6b7280' }}>{candidate.email}</div>
      <div style={{ marginTop: 12 }}>ID: {candidate.id}</div>
      <div style={{ marginTop: 12 }}>
        <div><strong>Stage:</strong></div>
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button disabled={idx <= 0} onClick={() => onChangeStage && onChangeStage(candidate.id, CANDIDATE_STAGES[idx - 1])}>Prev</button>
          <select value={current} onChange={(e) => onChangeStage && onChangeStage(candidate.id, e.target.value)}>
            {CANDIDATE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button disabled={idx >= CANDIDATE_STAGES.length - 1} onClick={() => onChangeStage && onChangeStage(candidate.id, CANDIDATE_STAGES[idx + 1])}>Next</button>
        </div>
      </div>
    </div>
  )
}
