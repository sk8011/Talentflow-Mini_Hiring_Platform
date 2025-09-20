import React, { useState } from 'react'
import { CANDIDATE_STAGES } from '../../lib/storage'

export default function CandidateList({ candidates = [], loading, onDelete, onUpdate, pendingIds = new Set(), onSelect, selectedId, onSelectionChange, selectedIds = [], onOpenProfile }) {
  const [editingId, setEditingId] = useState(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [selectedMap, setSelectedMap] = useState(new Set())

  // keep internal selectedMap in sync with parent-selectedIds prop
  React.useEffect(() => {
    try {
      const ns = new Set((selectedIds || []).map((x) => String(x)))
      setSelectedMap(ns)
    } catch (err) {
      // ignore
    }
  }, [selectedIds])

  function startEdit(c) {
    setEditingId(c.id)
    setName(c.name || '')
    setEmail(c.email || '')
  }

  function cancel() {
    setEditingId(null)
    setName('')
    setEmail('')
  }

  function save() {
    if (!editingId) return
    onUpdate(editingId, { name: name.trim(), email: email.trim() })
    cancel()
  }

  function changeStage(c, newStage) {
    onUpdate(c.id, { stage: newStage })
  }

  if (loading) return <div>Loading candidates...</div>

  function toggleSelectAll(checked) {
    if (checked) {
      const all = new Set(candidates.map((c) => String(c.id)))
      setSelectedMap(all)
      onSelectionChange && onSelectionChange(Array.from(all))
    } else {
      setSelectedMap(new Set())
      onSelectionChange && onSelectionChange([])
    }
  }

  function toggleSelect(id) {
    const ns = new Set(selectedMap)
    if (ns.has(String(id))) ns.delete(String(id))
    else ns.add(String(id))
    setSelectedMap(ns)
    onSelectionChange && onSelectionChange(Array.from(ns))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {candidates.length === 0 && <div style={{ color: '#6b7280' }}>No candidates yet</div>}
      <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
        <label style={{ fontSize: 13 }}><input type="checkbox" onChange={(e) => toggleSelectAll(e.target.checked)} /> Select all</label>
      </div>
      {candidates.map((c) => (
        <div key={c.id} onClick={() => onSelect && onSelect(c)} style={{ padding: 8, border: selectedId === String(c.id) ? '2px solid #3b82f6' : '1px solid #e5e7eb', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: onSelect ? 'pointer' : 'default' }}>
          <input type="checkbox" checked={selectedMap.has(String(c.id))} onChange={(e) => { e.stopPropagation(); toggleSelect(c.id) }} />
          {editingId === c.id ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={name} onChange={(e) => setName(e.target.value)} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} />
              <button onClick={save}>Save</button>
              <button onClick={cancel}>Cancel</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600 }}>
                  {onOpenProfile ? (
                    <a href={`#/hr/candidates/${c.id}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenProfile && onOpenProfile(c) }}>
                      {c.name}
                    </a>
                  ) : (
                    c.name
                  )}
                </div>
                <div style={{ color: '#6b7280', fontSize: 13 }}>{c.email}</div>
                <div style={{ marginTop: 6, fontSize: 12 }}>
                  <strong>Stage:</strong> {c.stage || 'Applied'}
                </div>
              </div>
            </div>
          )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={c.stage || CANDIDATE_STAGES[0]} onChange={(e) => changeStage(c, e.target.value)} disabled={pendingIds.has(String(c.id))}>
              {CANDIDATE_STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 6 }}>
              <button disabled={pendingIds.has(String(c.id))} onClick={() => {
                const idx = CANDIDATE_STAGES.indexOf(c.stage || CANDIDATE_STAGES[0])
                if (idx > 0) changeStage(c, CANDIDATE_STAGES[idx - 1])
              }}>{pendingIds.has(String(c.id)) ? 'Updating…' : 'Prev'}</button>
              <button disabled={pendingIds.has(String(c.id))} onClick={() => {
                const idx = CANDIDATE_STAGES.indexOf(c.stage || CANDIDATE_STAGES[0])
                if (idx < CANDIDATE_STAGES.length - 1) changeStage(c, CANDIDATE_STAGES[idx + 1])
              }}>{pendingIds.has(String(c.id)) ? 'Updating…' : 'Next'}</button>
              <button onClick={() => startEdit(c)}>Edit</button>
              {onOpenProfile && <button onClick={(e) => { e.stopPropagation(); onOpenProfile(c) }}>Profile</button>}
              <button onClick={() => onDelete(c.id)}>Delete</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
