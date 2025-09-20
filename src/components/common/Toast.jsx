import React, { useEffect } from 'react'

export default function Toast({ toasts = [], onRemove }) {
  // Local sweeper: periodically remove expired toasts so parent App doesn't need to re-render on a timer
  useEffect(() => {
    if (!toasts || toasts.length === 0) return
    const iv = setInterval(() => {
      const now = Date.now()
      toasts.forEach((t) => {
        if (t.expiresAt && t.expiresAt <= now) {
          onRemove && onRemove(t.id)
        }
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [toasts, onRemove])

  return (
    <div style={{ position: 'fixed', right: 16, top: 16, zIndex: 9999 }}>
      {toasts.map((t) => (
        <div key={t.id} style={{ background: 'white', border: '1px solid #e5e7eb', padding: '8px 12px', borderRadius: 8, boxShadow: '0 4px 12px rgba(2,6,23,0.08)', marginBottom: 8 }}>
          <div style={{ fontSize: 13, color: '#111827' }}>{t.message}</div>
          <div style={{ marginTop: 6, textAlign: 'right' }}>
            <button onClick={() => onRemove(t.id)} style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer' }}>Dismiss</button>
          </div>
        </div>
      ))}
    </div>
  )
}
