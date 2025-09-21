import localforage from 'localforage'

const store = localforage.createInstance({ name: 'talentflow' })

export const CANDIDATE_STAGES = [
  'Applied',
  'Phone Screen',
  'Onsite',
  'Offer',
  'Hired',
  'Rejected',
]

const api = {
  // getJobs optionally accepts a query object { search, status, page, pageSize, sort, tags }
  async getJobs(query = {}) {
    const all = (await store.getItem('jobs')) || []
    if (!query || Object.keys(query).length === 0) return all
    let list = all.slice()
  const { search, status, page = 1, pageSize = 25, sort, tags, type } = query
    if (search) {
      const q = String(search).toLowerCase()
      list = list.filter((j) => (j.title || '').toLowerCase().includes(q) || (j.slug || '').toLowerCase().includes(q))
    }
    if (status && status !== 'all') {
      const s = String(status).toLowerCase()
      if (s === 'active') {
        list = list.filter((j) => !(j.archived === true) && (String(j.status || 'active').toLowerCase() !== 'archived') && (String(j.status || '').toLowerCase() !== 'filled'))
      } else if (s === 'archived') {
        list = list.filter((j) => (j.archived === true) || (String(j.status || '').toLowerCase() === 'archived'))
      } else if (s === 'filled') {
        list = list.filter((j) => String(j.status || '').toLowerCase() === 'filled' && !(j.archived === true))
      } else {
        list = list.filter((j) => String(j.status || 'active').toLowerCase() === s)
      }
    }
    if (type && type !== 'All' && type !== 'all') {
      const t = String(type).toLowerCase()
      list = list.filter((j) => String(j.type || 'Full-time').toLowerCase() === t)
    }
    if (tags && Array.isArray(tags) && tags.length) {
      list = list.filter((j) => Array.isArray(j.tags) && tags.every((t) => j.tags.includes(t)))
    }
    if (sort === 'title') list.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
    else if (sort === 'order') list.sort((a, b) => (a.order || 0) - (b.order || 0))
    // pagination
    const total = list.length
    const p = Math.max(1, Number(page) || 1)
    const ps = Math.max(1, Number(pageSize) || 25)
    const start = (p - 1) * ps
    const pageItems = list.slice(start, start + ps)
    return { jobs: pageItems, total }
  },
  async saveJobs(jobs) {
    return store.setItem('jobs', jobs)
  },
  async updateJob(id, updates) {
    const jobs = (await store.getItem('jobs')) || []
    const updated = jobs.map((j) => (String(j.id) === String(id) ? { ...j, ...updates } : j))
    await store.setItem('jobs', updated)
    return updated.find((j) => String(j.id) === String(id))
  },
  async archiveJob(id, archived = true) {
    const jobs = (await store.getItem('jobs')) || []
    const updated = jobs.map((j) => (String(j.id) === String(id) ? { ...j, archived } : j))
    await store.setItem('jobs', updated)
    return updated.find((j) => String(j.id) === String(id))
  },
  async reorderJobs(newOrder) {
    // newOrder is an array of job ids in the desired order
    const jobs = (await store.getItem('jobs')) || []
    const map = new Map(jobs.map((j) => [String(j.id), j]))
    const reordered = newOrder.map((id) => map.get(String(id))).filter(Boolean)
    // include any jobs not present in newOrder at the end
    for (const j of jobs) {
      if (!newOrder.includes(String(j.id))) reordered.push(j)
    }
    await store.setItem('jobs', reordered)
    return reordered
  },
  async bulkUnarchive(ids = []) {
    const jobs = (await store.getItem('jobs')) || []
    const updated = jobs.map((j) => (ids.includes(String(j.id)) ? { ...j, archived: false } : j))
    await store.setItem('jobs', updated)
    return updated.filter((j) => ids.includes(String(j.id)))
  },
  // Timeline support for candidates
  async addTimelineEvent(candidateId, event) {
    const key = `timeline:${candidateId}`
    const list = (await store.getItem(key)) || []
    list.push(event)
    await store.setItem(key, list)
    return list
  },
  async getTimeline(candidateId) {
    const key = `timeline:${candidateId}`
    return (await store.getItem(key)) || []
  },
  // Candidate queries: supports { search, stage, page, pageSize }
  async getCandidates(query = {}) {
    const all = (await store.getItem('candidates')) || []
    if (!query || Object.keys(query).length === 0) return { candidates: all, total: all.length }
    let list = all.slice()
    const { search, stage, page = 1, pageSize = 1000 } = query  // Increased default pageSize to 1000 to show more candidates initially
    if (search) {
      const q = String(search).toLowerCase()
      list = list.filter((c) => (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q))
    }
    if (stage && stage !== 'all') list = list.filter((c) => (c.stage || 'Applied') === stage)
    const total = list.length
    const p = Math.max(1, Number(page) || 1)
    const ps = Math.max(1, Number(pageSize) || 1000)
    const start = (p - 1) * ps
    const pageItems = list.slice(start, start + ps)
    return { candidates: pageItems, total }
  },
  // Candidates storage helpers (non-query helpers below)
  async saveCandidates(candidates) {
    return store.setItem('candidates', candidates)
  },
  async addCandidate(attrs) {
    const candidates = (await store.getItem('candidates')) || []
    const cand = { id: Date.now().toString(), stage: attrs.stage || 'Applied', ...attrs }
    candidates.push(cand)
    await store.setItem('candidates', candidates)
    // add initial timeline event
    await api.addTimelineEvent(cand.id, { at: Date.now(), type: 'created', stage: cand.stage })
    return cand
  },
  async updateCandidate(id, updates) {
    const candidates = (await store.getItem('candidates')) || []
    const prev = candidates.find((c) => String(c.id) === String(id))
    const updated = candidates.map((c) => (String(c.id) === String(id) ? { ...c, ...updates } : c))
    await store.setItem('candidates', updated)
    const newObj = updated.find((c) => String(c.id) === String(id))
    if (prev && updates && updates.stage && updates.stage !== prev.stage) {
      await api.addTimelineEvent(id, { at: Date.now(), type: 'stage', from: prev.stage, to: updates.stage })
    }
    return newObj
  },
  async deleteCandidate(id) {
    let candidates = (await store.getItem('candidates')) || []
    candidates = candidates.filter((c) => String(c.id) !== String(id))
    await store.setItem('candidates', candidates)
    return { success: true }
  },
  // Assessments persistence
  async getAssessment(jobId) {
    const a = (await store.getItem('assessments')) || {}
    return a[jobId] || null
  },
  async saveAssessment(jobId, payload) {
    const a = (await store.getItem('assessments')) || {}
    a[jobId] = payload
    await store.setItem('assessments', a)
    return a[jobId]
  },
  async submitAssessment(jobId, submission) {
    const key = `submissions:${jobId}`
    const list = (await store.getItem(key)) || []
    list.push({ id: Date.now().toString(), at: Date.now(), ...submission })
    await store.setItem(key, list)
    // add timeline event for this candidate
    try {
      if (submission && submission.candidateId) {
        await api.addTimelineEvent(submission.candidateId, { at: Date.now(), type: 'submission', jobId })
      }
    } catch {}
    return list[list.length - 1]
  },
  async getSubmissions(jobId) {
    const key = `submissions:${jobId}`
    return (await store.getItem(key)) || []
  },
  // Simple candidate auth + assignments
  async createCandidateAuth(candidateId, email, password) {
    const key = 'candidate_auth'
    const auth = (await store.getItem(key)) || {}
    const emailKey = String(email || '').trim().toLowerCase()
    auth[emailKey] = { candidateId, email: emailKey, password }
    await store.setItem(key, auth)
    return auth[emailKey]
  },
  async getCandidateAuthByEmail(email) {
    const auth = (await store.getItem('candidate_auth')) || {}
    const emailKey = String(email || '').trim().toLowerCase()
    return auth[emailKey] || null
  },
  async assignAssessment(candidateId, jobId) {
    const key = `assignments:${candidateId}`
    // single active assignment: overwrite with the latest jobId
    const arr = [jobId]
    await store.setItem(key, arr)
    // timeline event
    await api.addTimelineEvent(candidateId, { at: Date.now(), type: 'assignment', jobId })
    return arr
  },
  async getAssignments(candidateId) {
    return (await store.getItem(`assignments:${candidateId}`)) || []
  },
  async addOutboxMessage(message) {
    const key = 'outbox'
    const list = (await store.getItem(key)) || []
    list.push({ id: Date.now().toString(), at: Date.now(), ...message })
    await store.setItem(key, list)
    return list[list.length - 1]
  },
  async getOutbox() {
    return (await store.getItem('outbox')) || []
  },
  // Seeder helper: only seed when empty
  async seedIfEmpty({ jobs = [], candidates = [], assessments = [] } = {}) {
    const existingJobs = (await store.getItem('jobs')) || []
    if (!existingJobs.length && jobs.length) {
      await store.setItem('jobs', jobs)
    }
    const existingCandidates = (await store.getItem('candidates')) || []
    if (!existingCandidates.length && candidates.length) {
      await store.setItem('candidates', candidates)
      // seed timelines
      for (const c of candidates) {
        await store.setItem(`timeline:${c.id}`, [{ at: Date.now(), type: 'seed', stage: c.stage }])
      }
    }
    const existingAssessments = (await store.getItem('assessments')) || {}
    if (Object.keys(existingAssessments).length === 0 && assessments.length) {
      const map = {}
      for (const a of assessments) map[a.jobId] = a
      await store.setItem('assessments', map)
    }
  },
}

export default api
