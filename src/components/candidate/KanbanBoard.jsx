import React, { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import { useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CANDIDATE_STAGES } from '../../lib/storage'

export default function KanbanBoard({ candidates = [], onUpdateCandidate, loading = false }) {
  const [activeId, setActiveId] = useState(null)
  const [draggedCandidate, setDraggedCandidate] = useState(null)
  const [expandedColumns, setExpandedColumns] = useState(new Set())
  const scrollContainerRef = React.useRef(null)
  const [showLeftBlur, setShowLeftBlur] = useState(false)
  const [showRightBlur, setShowRightBlur] = useState(true)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Group candidates by stage (memoized for performance during drag)
  const candidatesByStage = useMemo(() => {
    const acc = {}
    const safe = Array.isArray(candidates) ? candidates.filter(Boolean) : []
    for (const stage of CANDIDATE_STAGES) {
      acc[stage] = safe.filter(candidate => candidate && ((candidate.stage || 'Applied') === stage))
    }
    return acc
  }, [candidates])

  const handleDragStart = (event) => {
    const { active } = event
    setActiveId(active.id)
    
    // Find the candidate being dragged
    const candidate = (candidates || []).filter(Boolean).find(c => c && String(c.id) === String(active.id))
    setDraggedCandidate(candidate)
  }

  const handleDragOver = () => {
    // No-op for smoother UX: we only persist changes on drag end
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    setActiveId(null)
    setDraggedCandidate(null)

    if (!over) return

    const activeId = active.id
    const overId = over.id

    const activeCandidate = (candidates || []).filter(Boolean).find(c => c && String(c.id) === String(activeId))
    if (!activeCandidate) return

    let targetStage = null
    if (CANDIDATE_STAGES.includes(overId)) {
      targetStage = overId
    } else {
      const targetCandidate = (candidates || []).filter(Boolean).find(c => c && String(c.id) === String(overId))
      if (targetCandidate) targetStage = targetCandidate.stage || 'Applied'
    }

    if (targetStage && targetStage !== (activeCandidate.stage || 'Applied')) {
      onUpdateCandidate(activeCandidate.id, { stage: targetStage })
    }
  }

  // Handle scroll to show/hide blur effects
  const handleScroll = (e) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.target
    setShowLeftBlur(scrollLeft > 10)
    setShowRightBlur(scrollLeft < scrollWidth - clientWidth - 10)
  }

  React.useEffect(() => {
    const container = scrollContainerRef.current
    if (container) {
      const { scrollWidth, clientWidth } = container
      setShowRightBlur(scrollWidth > clientWidth)
    }
  }, [candidates])

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Loading candidates...</div>
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToWindowEdges]}
    >
      <div className="relative">
        {/* Left blur gradient */}
        {showLeftBlur && (
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        )}
        
        {/* Right blur gradient */}
        {showRightBlur && (
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        )}
        
        {/* Scrollable container */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto p-4 min-h-[70vh] scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/40"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'hsl(var(--primary) / 0.2) transparent'
          }}
        >
          {CANDIDATE_STAGES.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              candidates={candidatesByStage[stage]}
              activeId={activeId}
              isExpanded={expandedColumns.has(stage)}
              onToggleExpand={() => {
                const newSet = new Set(expandedColumns)
                if (newSet.has(stage)) {
                  newSet.delete(stage)
                } else {
                  newSet.add(stage)
                }
                setExpandedColumns(newSet)
              }}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeId && draggedCandidate ? (
          <CandidateCard candidate={draggedCandidate} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

const KanbanColumn = React.memo(function KanbanColumn({ stage, candidates, activeId, isExpanded = false, onToggleExpand }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  const COLLAPSED_HEIGHT = 600
  const candidateCount = (candidates || []).filter(Boolean).length
  const needsExpansion = candidateCount > 6

  // Track dark mode reactively
  const [isDark, setIsDark] = React.useState(
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  )

  React.useEffect(() => {
    // Update isDark when theme changes
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    
    if (typeof document !== 'undefined') {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      })
    }
    
    return () => observer.disconnect()
  }, [])

  const getStageHue = (s) => ({
    'Applied': '#9ca3af',      // gray-400
    'Phone Screen': '#f59e0b', // amber-500
    'Onsite': '#3b82f6',       // blue-500
    'Offer': '#10b981',        // emerald-500
    'Hired': '#059669',        // green-600
    'Rejected': '#ef4444',     // red-500
  })[s] || '#9ca3af'

  const getStageTint = (s, dark) => {
    if (!dark) {
      // light pastels
      return ({
        'Applied': '#f3f4f6',
        'Phone Screen': '#fef3c7',
        'Onsite': '#dbeafe',
        'Offer': '#d1fae5',
        'Hired': '#dcfce7',
        'Rejected': '#fee2e2',
      })[s] || '#f3f4f6'
    }
    // dark subtle tints
    return ({
      'Applied': 'rgba(148,163,184,0.10)',
      'Phone Screen': 'rgba(245,158,11,0.12)',
      'Onsite': 'rgba(59,130,246,0.12)',
      'Offer': 'rgba(16,185,129,0.12)',
      'Hired': 'rgba(5,150,105,0.12)',
      'Rejected': 'rgba(239,68,68,0.12)',
    })[s] || 'rgba(148,163,184,0.10)'
  }

  const getStageColor = (s) => getStageTint(s, isDark)

  const getStageTextColor = (stage) => {
    // use the hue for the title in both themes for clear differentiation
    return getStageHue(stage)
  }

  return (
    <div
      ref={setNodeRef}
      className="min-w-[280px] max-w-[280px] rounded-lg p-4 border-2 border-dashed transition-all"
      style={{
        backgroundColor: getStageColor(stage),
        borderColor: isOver ? '#3b82f6' : 'transparent',
        ...(isOver && { backgroundColor: isDark ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.08)' })
      }}
    >
      <div className="mb-4 p-3 bg-card rounded-lg shadow-sm border border-border" style={{
        borderTop: `4px solid ${getStageHue(stage)}`
      }}>
        <h3 className="m-0 text-sm font-semibold" style={{ 
          color: getStageTextColor(stage)
        }}>
          {stage}
        </h3>
        <div className="text-xs text-muted-foreground mt-1">
          { (candidates || []).filter(Boolean).length } candidate{ ((candidates || []).filter(Boolean).length) !== 1 ? 's' : ''}
        </div>
      </div>

      <SortableContext items={(candidates || []).filter(Boolean).map(c => c.id).filter(Boolean)} strategy={verticalListSortingStrategy}>
        <div
          className="flex flex-col gap-2 overflow-y-auto transition-all duration-300"
          style={{
            maxHeight: isExpanded ? 'none' : `${COLLAPSED_HEIGHT}px`,
            scrollbarWidth: 'thin',
            scrollbarColor: 'hsl(var(--primary) / 0.2) transparent'
          }}
        >
          {(candidates || []).filter(c => c && c.id).map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              isActive={activeId === candidate.id}
            />
          ))}
        </div>
      </SortableContext>
      
      {/* Expand/Collapse button */}
      {needsExpansion && (
        <button
          onClick={onToggleExpand}
          className="mt-2 w-full py-2 text-xs font-medium text-primary hover:bg-primary/10 rounded-md transition-colors border border-dashed border-primary/30"
        >
          {isExpanded ? '↑ Show Less' : `↓ Show All (${candidateCount})`}
        </button>
      )}

      {candidateCount === 0 && (
        <div className="p-5 text-center text-sm italic text-muted-foreground border-2 border-dashed border-border rounded-lg bg-card">
          Drop candidates here
        </div>
      )}
    </div>
  )
})

const CandidateCard = React.memo(function CandidateCard({ candidate, isActive = false, isDragging = false }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: candidate?.id,
    data: {
      type: 'candidate',
      candidate,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      className={`p-3 bg-card rounded-lg cursor-grab transition-all ${
        isActive ? 'ring-2 ring-primary shadow-lg' : 'shadow-sm'
      } ${
        isDragging ? 'opacity-80 rotate-[5deg] shadow-xl' : ''
      }`}
      style={{
        ...style,
        border: isActive ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
      }}
      {...attributes}
      {...listeners}
    >
      <div className="mb-2">
        <div className="font-semibold text-sm text-foreground">
          {candidate.name}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {candidate.email}
        </div>
      </div>

      {candidate.jobId && (
        <div className="inline-block text-[11px] text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded mb-2">
          Job: {candidate.jobId}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: getStatusColor(candidate.stage || 'Applied')
            }}
          />
          {candidate.stage || 'Applied'}
        </div>
        
        <div className="text-[10px] text-muted-foreground">
          ID: {String(candidate.id).slice(-4)}
        </div>
      </div>
    </div>
  )
})

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
