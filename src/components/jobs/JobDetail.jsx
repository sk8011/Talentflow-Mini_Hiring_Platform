import React from 'react'

export default function JobDetail({ job, onClose }) {
  if (!job) return null
  return (
    <aside style={{ borderLeft: '1px solid #e6edf5', paddingLeft: 16, marginLeft: 16, minWidth: 240 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h3 style={{ margin: 0 }}>{job.title}</h3>
        <button onClick={() => onClose && onClose()} style={{ background: 'transparent', border: 'none', color: '#6b7280' }}>Close</button>
      </div>
      <div style={{ color: '#374151', marginTop: 8 }}>
        <div><strong>Company: </strong>{job.company}</div>
        <div><strong>Location: </strong>{job.location || 'Remote'}</div>
        <div><strong>Type: </strong>{job.type || 'Full-time'}</div>
        <div><strong>Status: </strong>{job.status || 'open'}</div>
        <div><strong>Archived: </strong>{job.archived ? 'Yes' : 'No'}</div>
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ color: '#6b7280', fontSize: 13 }}>ID: {job.id}</div>
      </div>
    </aside>
  )
}
