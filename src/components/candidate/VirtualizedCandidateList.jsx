import React, { useState, useMemo, useCallback } from 'react'
import { FixedSizeList as List } from 'react-window'
import { CANDIDATE_STAGES } from '../../lib/storage'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { Edit2, Trash2, User } from 'lucide-react'

const ITEM_HEIGHT = 88
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
          onUpdateCandidate={async (updates) => onUpdate && onUpdate(candidate.id, updates)}
        />
      </div>
    )
  }, [filteredCandidates, selectedId, selectedMap, pendingIds, onSelect, toggleSelect, changeStage, onDelete, onOpenProfile])

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Loading candidates...</div>
  }

  const allSelected = filteredCandidates.length > 0 && 
    filteredCandidates.every(c => selectedMap.has(String(c.id)))

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex gap-4 items-center p-4 bg-gradient-to-r from-card to-card/50 rounded-xl border border-border/50 shadow-sm">
        <label className="text-sm font-medium flex items-center gap-2.5 cursor-pointer hover:text-primary transition-colors group">
          <input 
            type="checkbox" 
            checked={allSelected}
            onChange={(e) => toggleSelectAll(e.target.checked)}
            className="w-4 h-4 cursor-pointer rounded border-input text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
          <span className="group-hover:underline">Select all</span>
          <Badge variant="secondary" className="ml-1">
            {filteredCandidates.length}
          </Badge>
        </label>
        
        <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium">Showing</span>
          <Badge variant="outline">{filteredCandidates.length}</Badge>
          <span>of</span>
          <Badge variant="outline">{candidates.length}</Badge>
          <span>candidates</span>
        </div>
      </div>

      {/* Virtualized list */}
      {filteredCandidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-border/50 rounded-xl bg-muted/20">
          <User className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {searchQuery || stageFilter !== 'All' 
              ? 'No candidates match your filters' 
              : 'No candidates yet'
            }
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            {searchQuery || stageFilter !== 'All'
              ? 'Try adjusting your search or filter criteria'
              : 'Add your first candidate to get started'
            }
          </p>
        </div>
      ) : (
        <div 
          className="border rounded-lg overflow-hidden bg-card scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/40"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'hsl(var(--primary) / 0.2) transparent'
          }}
        >
          <List
            height={Math.min(CONTAINER_HEIGHT, filteredCandidates.length * ITEM_HEIGHT)}
            itemCount={filteredCandidates.length}
            itemSize={ITEM_HEIGHT}
            width="100%"
            className="scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/40"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'hsl(var(--primary) / 0.2) transparent'
            }}
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
  onOpenProfile,
  onUpdateCandidate
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(candidate.name || '')
  const [email, setEmail] = useState(candidate.email || '')
  const [editError, setEditError] = useState('')

  const handleSave = async () => {
    const nextName = String(name || '').trim()
    const nextEmail = String(email || '').trim()
    if (!nextName) { setEditError('Name is required'); return }
    if (!nextEmail) { setEditError('Email is required'); return }
    // basic email format check
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
    if (!emailRe.test(nextEmail)) { setEditError('Enter a valid email'); return }
    setEditError('')
    try {
      if (typeof onUpdateCandidate === 'function') {
        const updated = await onUpdateCandidate({ name: nextName, email: nextEmail })
        if (updated) {
          setIsEditing(false)
        } else {
          // parent reported failure (e.g., duplicate email)
          setEditError('Failed to save changes')
        }
      } else {
        setIsEditing(false)
      }
    } catch (e) {
      setEditError('Failed to save changes')
    }
  }

  const handleCancel = () => {
    setName(candidate.name || '')
    setEmail(candidate.email || '')
    setIsEditing(false)
  }

  return (
    <div 
      className={`p-4 border-b flex items-center gap-4 cursor-pointer transition-colors hover:bg-accent/50 ${
        isSelected ? 'bg-primary/10 border-primary' : 'bg-card'
      }`}
      style={{ minHeight: ITEM_HEIGHT - 1 }}
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
        className="w-4 h-4 flex-shrink-0 cursor-pointer rounded border-input text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
      />

      {/* Candidate Info */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex gap-2 items-center flex-wrap">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 min-w-[180px]"
              placeholder="Name"
              onClick={(e) => e.stopPropagation()}
            />
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 min-w-[200px]"
              placeholder="Email"
              onClick={(e) => e.stopPropagation()}
            />
            <Button 
              size="default"
              onClick={(e) => { e.stopPropagation(); handleSave() }}
            >
              Save
            </Button>
            <Button 
              variant="outline"
              size="default"
              onClick={(e) => { e.stopPropagation(); handleCancel() }}
            >
              Cancel
            </Button>
            {editError && (
              <span className="text-sm text-destructive w-full">{editError}</span>
            )}
          </div>
        ) : (
          <div>
            <div className="font-semibold text-base text-foreground mb-1">
              {candidate.name}
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {candidate.email}
            </div>
          </div>
        )}
      </div>

      {/* Stage selector */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <select
          value={candidate.stage || CANDIDATE_STAGES[0]}
          onChange={(e) => {
            e.stopPropagation()
            onChangeStage(e.target.value)
          }}
          disabled={isPending}
          className="h-10 w-40 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {CANDIDATE_STAGES.map((stage) => (
            <option key={stage} value={stage}>{stage}</option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex gap-2 items-center flex-shrink-0">
        <Button
          variant="ghost"
          size="default"
          onClick={(e) => {
            e.stopPropagation()
            setIsEditing(!isEditing)
          }}
          title="Edit"
        >
          <Edit2 className="h-4 w-4" />
        </Button>

        {onOpenProfile && (
          <Button
            variant="ghost"
            size="default"
            onClick={(e) => { e.stopPropagation(); onOpenProfile(candidate) }}
            title="View Profile"
          >
            <User className="h-4 w-4" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="default"
          onClick={(e) => {
            e.stopPropagation()
            if (confirm('Delete this candidate?')) {
              onDelete()
            }
          }}
          title="Delete"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {isPending && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <Badge variant="secondary" className="text-xs">
            Updating...
          </Badge>
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
