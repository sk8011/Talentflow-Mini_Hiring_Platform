import React, { useState, useMemo, useCallback } from 'react'
import { FixedSizeList as List } from 'react-window'
import { CANDIDATE_STAGES } from '../../lib/storage'

const ITEM_HEIGHT = 76
const CONTAINER_HEIGHT = 600

export default function VirtualizedCandidateList({ 
  candidates = [], 
  loading, 
  onDelete, 
  onUpdate, 
  pendingIds = new Set(), 
  onSelect, 
  selectedId, 
  onSelectionChange, 
  selectedIds = [],
  searchQuery = '',
  stageFilter = 'All',
  onOpenProfile
}) {
  const [selectedMap, setSelectedMap] = useState(new Set())

  // Keep internal selectedMap in sync with parent-selectedIds prop
  React.useEffect(() => {
    try {
      const ns = new Set((selectedIds || []).map((x) => String(x)))
      setSelectedMap(ns)
    } catch (err) {
      // ignore
    }
  }, [selectedIds])

  // Filter and search candidates
  const filteredCandidates = useMemo(() => {
    let filtered = candidates

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(candidate => 
        (candidate.name || '').toLowerCase().includes(query) ||
        (candidate.email || '').toLowerCase().includes(query)
      )
    }

    // Apply stage filter
    if (stageFilter && stageFilter !== 'All') {
      filtered = filtered.filter(candidate => 
        (candidate.stage || 'Applied') === stageFilter
      )
    }

    return filtered
  }, [candidates, searchQuery, stageFilter])

  const toggleSelectAll = useCallback((checked) => {
    if (checked) {
      const all = new Set(filteredCandidates.map((c) => String(c.id)))
      setSelectedMap(all)
      onSelectionChange && onSelectionChange(Array.from(all))
    } else {
      setSelectedMap(new Set())
      onSelectionChange && onSelectionChange([])
    }
  }, [filteredCandidates, onSelectionChange])

  const toggleSelect = useCallback((id) => {
    const ns = new Set(selectedMap)
    if (ns.has(String(id))) {
      ns.delete(String(id))
    } else {
      ns.add(String(id))
    }
    setSelectedMap(ns)
    onSelectionChange && onSelectionChange(Array.from(ns))
  }, [selectedMap, onSelectionChange])

  const changeStage = useCallback((candidate, newStage) => {
    onUpdate(candidate.id, { stage: newStage })
  }, [onUpdate])

  // Row renderer for react-window
  const Row = useCallback(({ index, style }) => {
    const candidate = filteredCandidates[index]
    if (!candidate) return null

    return (
      <div style={style}>
        <CandidateRow
          candidate={candidate}
          isSelected={selectedId === String(candidate.id)}
          isChecked={selectedMap.has(String(candidate.id))}
          isPending={pendingIds.has(String(candidate.id))}
          onSelect={() => onSelect && onSelect(candidate)}
          onToggleSelect={() => toggleSelect(candidate.id)}
          onChangeStage={(newStage) => changeStage(candidate, newStage)}
          onDelete={() => onDelete(candidate.id)}
          onOpenProfile={onOpenProfile}
        />
      </div>
    )
  }, [filteredCandidates, selectedId, selectedMap, pendingIds, onSelect, toggleSelect, changeStage, onDelete, onOpenProfile])

  if (loading) {
    return <div>Loading candidates...</div>
  }

  const allSelected = filteredCandidates.length > 0 && 
    filteredCandidates.every(c => selectedMap.has(String(c.id)))

  return (
    <div>
      {/* Header with controls */}
      <div style={{ 
        display: 'flex', 
        gap: 8, 
        marginBottom: 12, 
        alignItems: 'center',
        padding: '8px 12px',
        backgroundColor: 'var(--card-bg)',
        borderRadius: 6,
        border: '1px solid var(--border)'
      }}>
        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <input 
            type="checkbox" 
            checked={allSelected}
            onChange={(e) => toggleSelectAll(e.target.checked)} 
          />
          Select all ({filteredCandidates.length})
        </label>
        
        <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)' }}>
          Showing {filteredCandidates.length} of {candidates.length} candidates
        </div>
      </div>

      {/* Virtualized list */}
      {filteredCandidates.length === 0 ? (
        <div style={{ 
          padding: 40, 
          textAlign: 'center', 
          color: 'var(--muted)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          backgroundColor: 'var(--card-bg)'
        }}>
          {searchQuery || stageFilter !== 'All' 
            ? 'No candidates match your filters' 
            : 'No candidates yet'
          }
        </div>
      ) : (
        <div style={{ 
          border: '1px solid var(--border)', 
          borderRadius: 6,
          overflow: 'hidden'
        }}>
          <List
            height={Math.min(CONTAINER_HEIGHT, filteredCandidates.length * ITEM_HEIGHT)}
            itemCount={filteredCandidates.length}
            itemSize={ITEM_HEIGHT}
            width="100%"
          >
            {Row}
          </List>
        </div>
      )}
    </div>
  )
}

function CandidateRow({ 
  candidate, 
  isSelected, 
  isChecked, 
  isPending, 
  onSelect, 
  onToggleSelect, 
  onChangeStage, 
  onDelete,
  onOpenProfile
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(candidate.name || '')
  const [email, setEmail] = useState(candidate.email || '')

  const handleSave = () => {
    // This would need to be connected to the parent's update function
    // For now, just close editing mode
    setIsEditing(false)
  }

  const handleCancel = () => {
    setName(candidate.name || '')
    setEmail(candidate.email || '')
    setIsEditing(false)
  }

  return (
    <div 
      style={{ 
        padding: 12,
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--card-bg)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
        minHeight: ITEM_HEIGHT - 1
      }}
      className={isSelected ? 'selected-item' : ''}
      onClick={onSelect}
    >
      {/* Checkbox */}
      <input 
        type="checkbox" 
        checked={isChecked}
        onChange={(e) => {
          e.stopPropagation()
          onToggleSelect()
        }}
        style={{ flexShrink: 0 }}
      />

      {/* Candidate Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {isEditing ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ flex: 1, padding: 4, border: '1px solid var(--border)', borderRadius: 4, background: 'var(--card-bg)', color: 'var(--text)' }}
              onClick={(e) => e.stopPropagation()}
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ flex: 1, padding: 4, border: '1px solid var(--border)', borderRadius: 4, background: 'var(--card-bg)', color: 'var(--text)' }}
              onClick={(e) => e.stopPropagation()}
            />
            <button 
              onClick={(e) => { e.stopPropagation(); handleSave() }}
              style={{ padding: '4px 8px', fontSize: 12 }}
            >
              Save
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleCancel() }}
              style={{ padding: '4px 8px', fontSize: 12 }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)', marginBottom: 2 }}>
              {candidate.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {candidate.email}
            </div>
          </div>
        )}
      </div>

      {/* Stage selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <select
          value={candidate.stage || CANDIDATE_STAGES[0]}
          onChange={(e) => {
            e.stopPropagation()
            onChangeStage(e.target.value)
          }}
          disabled={isPending}
          className="select"
          style={{ fontSize: 12 }}
        >
          {CANDIDATE_STAGES.map((stage) => (
            <option key={stage} value={stage}>{stage}</option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div style={{ 
        display: 'flex', 
        gap: 4, 
        alignItems: 'center',
        flexShrink: 0
      }}>
        <button className="btn"
          onClick={(e) => {
            e.stopPropagation()
            setIsEditing(!isEditing)
          }}
        >
          Edit
        </button>

        {onOpenProfile && (
          <button className="btn"
            onClick={(e) => { e.stopPropagation(); onOpenProfile(candidate) }}
          >
            Profile
          </button>
        )}

        <button className="btn btn-danger"
          onClick={(e) => {
            e.stopPropagation()
            if (confirm('Delete this candidate?')) {
              onDelete()
            }
          }}
        >
          ×
        </button>
      </div>

      {isPending && (
        <div style={{ 
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 10,
          color: 'var(--muted)'
        }}>
          Updating...
        </div>
      )}
    </div>
  )
}

function getStatusColor(stage) {
  const colors = {
    'Applied': '#6b7280',
    'Phone Screen': '#f59e0b',
    'Onsite': '#3b82f6',
    'Offer': '#10b981',
    'Hired': '#059669',
    'Rejected': '#ef4444'
  }
  return colors[stage] || '#6b7280'
}
