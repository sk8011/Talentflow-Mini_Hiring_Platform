import React from 'react'

export default function ConfirmDialog({ open, title = 'Confirm', message, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: 'white', padding: 16, borderRadius: 8, width: 400, boxShadow: '0 8px 24px rgba(2,6,23,0.2)' }}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <div style={{ marginBottom: 12 }}>{message}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel}>Cancel</button>
          <button onClick={onConfirm} style={{ background: '#2b6cb0', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 6 }}>Confirm</button>
        </div>
      </div>
    </div>
  )
}
