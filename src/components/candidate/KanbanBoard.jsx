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

  if (loading) {
    return <div>Loading candidates...</div>
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
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', padding: 16, minHeight: '70vh' }}>
        {CANDIDATE_STAGES.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            candidates={candidatesByStage[stage]}
            activeId={activeId}
          />
        ))}
      </div>

      <DragOverlay>
        {activeId && draggedCandidate ? (
          <CandidateCard candidate={draggedCandidate} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

const KanbanColumn = React.memo(function KanbanColumn({ stage, candidates, activeId }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  const isDark = typeof document !== 'undefined' && document.body.classList.contains('theme-dark')

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
      style={{
        minWidth: 280,
        maxWidth: 280,
        backgroundColor: getStageColor(stage),
        borderRadius: 8,
        padding: 16,
        border: '2px dashed transparent',
        ...(isOver && { borderColor: '#3b82f6', backgroundColor: isDark ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.08)' })
      }}
    >
      <div style={{ 
        marginBottom: 16, 
        padding: '8px 12px', 
        backgroundColor: 'var(--card-bg)', 
        borderRadius: 6,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid var(--border)',
        borderTop: `4px solid ${getStageHue(stage)}`
      }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: 14, 
          fontWeight: 600,
          color: getStageTextColor(stage)
        }}>
          {stage}
        </h3>
        <div style={{ 
          fontSize: 12, 
          color: 'var(--muted)', 
          marginTop: 4 
        }}>
          { (candidates || []).filter(Boolean).length } candidate{ ((candidates || []).filter(Boolean).length) !== 1 ? 's' : ''}
        </div>
      </div>

      <SortableContext items={(candidates || []).filter(Boolean).map(c => c.id).filter(Boolean)} strategy={verticalListSortingStrategy}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(candidates || []).filter(c => c && c.id).map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              isActive={activeId === candidate.id}
            />
          ))}
        </div>
      </SortableContext>

      {candidates.length === 0 && (
        <div style={{
          padding: 20,
          textAlign: 'center',
          color: 'var(--muted)',
          fontSize: 14,
          fontStyle: 'italic',
          border: '2px dashed var(--border)',
          borderRadius: 6,
          backgroundColor: 'var(--card-bg)'
        }}>
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
      style={{
        ...style,
        padding: 12,
        backgroundColor: 'var(--card-bg)',
        borderRadius: 6,
        boxShadow: isDragging 
          ? '0 10px 25px rgba(0,0,0,0.15)' 
          : isActive 
            ? '0 5px 15px rgba(0,0,0,0.1)' 
            : '0 1px 3px rgba(0,0,0,0.1)',
        border: isActive ? '2px solid #3b82f6' : '1px solid var(--border)',
        cursor: 'grab',
        opacity: isDragging ? 0.8 : 1,
        transform: isDragging ? 'rotate(5deg)' : style.transform,
      }}
      {...attributes}
      {...listeners}
    >
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
          {candidate.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
          {candidate.email}
        </div>
      </div>

      {candidate.jobId && (
        <div style={{ 
          fontSize: 11, 
          color: 'var(--muted)',
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border)',
          padding: '2px 6px',
          borderRadius: 4,
          display: 'inline-block',
          marginBottom: 8
        }}>
          Job: {candidate.jobId}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ 
          fontSize: 11, 
          color: 'var(--muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 4
        }}>
          <div style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: getStatusColor(candidate.stage || 'Applied')
          }} />
          {candidate.stage || 'Applied'}
        </div>
        
        <div style={{ fontSize: 10, color: 'var(--muted)' }}>
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
