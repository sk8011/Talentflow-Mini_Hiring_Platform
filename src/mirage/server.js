import { createServer, Response } from 'miragejs'
import storage from '../lib/storage'

function randInt(max) { return Math.floor(Math.random() * max) }
function maybeFail(rate = 0.08) { return Math.random() < rate }
function latency(min = 200, max = 1200) { return new Promise((res) => setTimeout(res, min + randInt(max - min))) }

export default function makeServer({ environment = 'development' } = {}) {
  let server = createServer({
    environment,

    routes() {
      this.namespace = 'api'

      this.get('/jobs', async (schema, request) => {
        await latency()
        // parse query params
        const q = {
          search: request.queryParams.search,
          status: request.queryParams.status || 'all',
          page: request.queryParams.page || 1,
          pageSize: request.queryParams.pageSize || 25,
          sort: request.queryParams.sort,
          tags: request.queryParams.tags ? request.queryParams.tags.split(',') : undefined,
          type: request.queryParams.type,
        }
        const data = await storage.getJobs(q)
        return data
      })

      // Candidates endpoints
      this.get('/candidates', async (schema, request) => {
        await latency()
        const q = { search: request.queryParams.search, stage: request.queryParams.stage || 'all', page: request.queryParams.page || 1 }
        const data = await storage.getCandidates(q)
        return data
      })

      // Fetch a single candidate by id
      this.get('/candidates/:id', async (schema, request) => {
        await latency()
        const id = request.params.id
        // Fetch a large page to ensure we can find the candidate without separate storage API
        const data = await storage.getCandidates({ page: 1, pageSize: 10000 })
        const cand = (data.candidates || []).find((c) => String(c.id) === String(id))
        if (!cand) return new Response(404, {}, { error: 'Candidate not found' })
        return { candidate: cand }
      })

      this.post('/candidates', async (schema, request) => {
        await latency()
        const attrs = JSON.parse(request.requestBody)
        // uniqueness check on email (case-insensitive)
        const email = String(attrs.email || '').trim().toLowerCase()
        if (email) {
          const all = await storage.getCandidates({})
          const exists = (all.candidates || []).some((c) => String(c.email || '').trim().toLowerCase() === email)
          if (exists) return new Response(409, {}, { error: 'A candidate with this email already exists' })
        }
        const cand = await storage.addCandidate(attrs)
        return { candidate: cand }
      })

      this.put('/candidates/:id', async (schema, request) => {
        await latency()
        const id = request.params.id
        const attrs = JSON.parse(request.requestBody)
        // uniqueness check if email provided
        if (attrs.email !== undefined) {
          const email = String(attrs.email || '').trim().toLowerCase()
          if (email) {
            const all = await storage.getCandidates({})
            const exists = (all.candidates || []).some((c) => String(c.email || '').trim().toLowerCase() === email && String(c.id) !== String(id))
            if (exists) return new Response(409, {}, { error: 'A candidate with this email already exists' })
          }
        }
        const candidate = await storage.updateCandidate(id, attrs)
        return { candidate }
      })

      this.del('/candidates/:id', async (schema, request) => {
        await latency()
        if (maybeFail()) return new Response(500, {}, { error: 'Random write error' })
        const id = request.params.id
        await storage.deleteCandidate(id)
        return { success: true }
      })

      this.post('/jobs', async (schema, request) => {
        await latency()
        if (maybeFail()) return new Response(500, {}, { error: 'Random write error' })
        const attrs = JSON.parse(request.requestBody)
        const jobs = (await storage.getJobs()) || []
        const job = { id: Date.now().toString(), ...attrs }
        jobs.push(job)
        await storage.saveJobs(jobs)
        return { job }
      })

      this.put('/jobs/:id', async (schema, request) => {
        await latency()
        if (maybeFail()) return new Response(500, {}, { error: 'Random write error' })
        const id = request.params.id
        const attrs = JSON.parse(request.requestBody)
        const job = await storage.updateJob(id, attrs)
        return { job }
      })

      this.patch('/jobs/:id/archive', async (schema, request) => {
        await latency()
        if (maybeFail()) return new Response(500, {}, { error: 'Random write error' })
        const id = request.params.id
        const attrs = JSON.parse(request.requestBody)
        const archived = attrs.archived === true
        const job = await storage.archiveJob(id, archived)
        return { job }
      })

      this.post('/jobs/reorder', async (schema, request) => {
        await latency()
        // occasionally return 500 to test rollback
        if (maybeFail(0.08)) return new Response(500, {}, { error: 'Intermittent reorder failure' })
        const body = JSON.parse(request.requestBody)
        const { order } = body // expect { order: [id1, id2, ...] }
        const jobs = await storage.reorderJobs(order || [])
        return { jobs }
      })

      this.post('/jobs/bulk-unarchive', async (schema, request) => {
        await latency()
        const body = JSON.parse(request.requestBody)
        const { ids } = body
        const jobs = await storage.bulkUnarchive(ids || [])
        return { jobs }
      })

      this.del('/jobs/:id', async (schema, request) => {
        await latency()
        if (maybeFail()) return new Response(500, {}, { error: 'Random write error' })
        const id = request.params.id
        let jobs = await storage.getJobs()
        jobs = jobs.filter((j) => String(j.id) !== String(id))
        await storage.saveJobs(jobs)
        return { success: true }
      })

      // Candidate timeline
      this.get('/candidates/:id/timeline', async (schema, request) => {
        await latency()
        const id = request.params.id
        const t = await storage.getTimeline(id)
        return { timeline: t }
      })

      // Assessments endpoints
      this.get('/assessments/:jobId', async (schema, request) => {
        await latency()
        const jobId = request.params.jobId
        const a = await storage.getAssessment(jobId)
        return { assessment: a }
      })

      this.put('/assessments/:jobId', async (schema, request) => {
        await latency()
        if (maybeFail()) return new Response(500, {}, { error: 'Random write error' })
        const jobId = request.params.jobId
        const body = JSON.parse(request.requestBody)
        const saved = await storage.saveAssessment(jobId, body)
        return { assessment: saved }
      })

      this.post('/assessments/:jobId/submit', async (schema, request) => {
        await latency()
        const jobId = request.params.jobId
        const body = JSON.parse(request.requestBody)
        const s = await storage.submitAssessment(jobId, body)
        return { submission: s }
      })

      // Assessments submissions list (for HR)
      this.get('/assessments/:jobId/submissions', async (schema, request) => {
        await latency()
        const jobId = request.params.jobId
        const list = await storage.getSubmissions(jobId)
        return { submissions: list }
      })

      // Candidate assignments
      this.get('/candidates/:id/assignments', async (schema, request) => {
        await latency()
        const id = request.params.id
        const list = await storage.getAssignments(id)
        return { assignments: list }
      })
      this.post('/candidates/:id/assign', async (schema, request) => {
        await latency()
        if (maybeFail()) return new Response(500, {}, { error: 'Random write error' })
        const id = request.params.id
        const { jobId } = JSON.parse(request.requestBody)
        const list = await storage.assignAssessment(id, jobId)
        return { assignments: list }
      })

      // Candidate auth: invite and login
      this.post('/auth/invite', async (schema, request) => {
        await latency()
        if (maybeFail()) return new Response(500, {}, { error: 'Random write error' })
        const { candidateId, email } = JSON.parse(request.requestBody)
        // generate simple random password
        const password = Math.random().toString(36).slice(2, 8)
        const auth = await storage.createCandidateAuth(candidateId, email, password)
        // simulate email outbox
        await storage.addOutboxMessage({ to: email, subject: 'Your TalentFlow access', body: `Hello, your temporary password is: ${password}` })
        return { auth: { email: auth.email }, password }
      })
      this.post('/auth/login', async (schema, request) => {
        await latency()
        const { email, password } = JSON.parse(request.requestBody)
        const emailKey = String(email || '').trim().toLowerCase()
        const pass = String(password || '').trim()
        if (!emailKey || !pass) return new Response(400, {}, { error: 'Email and password are required' })
        const auth = await storage.getCandidateAuthByEmail(emailKey)
        if (!auth || auth.password !== pass) return new Response(401, {}, { error: 'Invalid credentials' })
        // Ensure the candidate still exists
        const all = await storage.getCandidates({})
        const exists = (all.candidates || []).some((c) => String(c.id) === String(auth.candidateId))
        if (!exists) return new Response(401, {}, { error: 'Invalid credentials' })
        return { session: { candidateId: auth.candidateId, email: auth.email } }
      })

      // Debug outbox viewer (optional)
      this.get('/outbox', async () => {
        await latency()
        const list = await storage.getOutbox()
        return { outbox: list }
      })

      // allow other requests to pass through to the network
      this.passthrough()
      this.passthrough('https://api.emailjs.com/**')
    },
  })

  // seed data if empty (20 jobs, 100 candidates, 3 assessments)
  ;(async () => {
    const makeJobs = () => {
      const companies = ['TechCorp', 'InnovateLabs', 'DataSystems', 'CloudNine', 'DevStudio', 'AgileWorks', 'CodeCraft', 'ByteForge']
      const locations = ['San Francisco, CA', 'New York, NY', 'Austin, TX', 'Seattle, WA', 'Boston, MA', 'Remote', 'Denver, CO', 'Chicago, IL']
      const types = ['Full-time', 'Part-time', 'Contract']
      
      const jobs = [
        { title: 'Senior Frontend Engineer', company: 'TechCorp', location: 'San Francisco, CA', type: 'Full-time', tags: ['engineering', 'frontend', 'react'] },
        { title: 'Backend Developer', company: 'InnovateLabs', location: 'Remote', type: 'Full-time', tags: ['engineering', 'backend', 'node'] },
        { title: 'Full Stack Engineer', company: 'DataSystems', location: 'New York, NY', type: 'Full-time', tags: ['engineering', 'fullstack'] },
        { title: 'DevOps Engineer', company: 'CloudNine', location: 'Seattle, WA', type: 'Full-time', tags: ['engineering', 'devops', 'aws'] },
        { title: 'Product Manager', company: 'TechCorp', location: 'San Francisco, CA', type: 'Full-time', tags: ['product', 'management'] },
        { title: 'UX/UI Designer', company: 'DevStudio', location: 'Austin, TX', type: 'Full-time', tags: ['design', 'ux'] },
        { title: 'Data Scientist', company: 'DataSystems', location: 'Boston, MA', type: 'Full-time', tags: ['data', 'ml', 'python'] },
        { title: 'Mobile Developer (iOS)', company: 'AgileWorks', location: 'Remote', type: 'Full-time', tags: ['engineering', 'mobile', 'ios'] },
        { title: 'QA Engineer', company: 'CodeCraft', location: 'Denver, CO', type: 'Full-time', tags: ['engineering', 'qa', 'testing'] },
        { title: 'Security Engineer', company: 'CloudNine', location: 'Seattle, WA', type: 'Full-time', tags: ['engineering', 'security'] },
        { title: 'Frontend Developer (React)', company: 'ByteForge', location: 'Remote', type: 'Contract', tags: ['engineering', 'frontend', 'react'] },
        { title: 'Machine Learning Engineer', company: 'InnovateLabs', location: 'San Francisco, CA', type: 'Full-time', tags: ['engineering', 'ml', 'ai'] },
        { title: 'Technical Writer', company: 'TechCorp', location: 'Remote', type: 'Part-time', tags: ['documentation', 'writing'] },
        { title: 'Solutions Architect', company: 'CloudNine', location: 'Chicago, IL', type: 'Full-time', tags: ['engineering', 'architecture'] },
        { title: 'Customer Success Manager', company: 'AgileWorks', location: 'New York, NY', type: 'Full-time', tags: ['customer', 'support'] },
        { title: 'Marketing Manager', company: 'DevStudio', location: 'Austin, TX', type: 'Full-time', tags: ['marketing', 'growth'] },
        { title: 'Sales Engineer', company: 'DataSystems', location: 'Boston, MA', type: 'Full-time', tags: ['sales', 'engineering'] },
        { title: 'Site Reliability Engineer', company: 'ByteForge', location: 'Remote', type: 'Full-time', tags: ['engineering', 'sre', 'devops'] },
        { title: 'Engineering Manager', company: 'TechCorp', location: 'San Francisco, CA', type: 'Full-time', tags: ['engineering', 'management', 'leadership'] },
        { title: 'Junior Backend Developer', company: 'CodeCraft', location: 'Denver, CO', type: 'Full-time', tags: ['engineering', 'backend', 'junior'] }
      ]
      
      return jobs.map((job, i) => ({
        id: `job-${i + 1}`,
        title: job.title,
        company: job.company,
        location: job.location,
        type: job.type,
        slug: job.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        status: i >= 18 ? 'filled' : 'open',
        tags: job.tags,
        order: i + 1,
        archived: i === 19
      }))
    }
    
    const stages = ['Applied','Phone Screen','Onsite','Offer','Hired','Rejected']
    const makeCandidates = (jobs) => {
      const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Sage', 'Rowan', 
                          'Cameron', 'Dakota', 'Emerson', 'Finley', 'Harper', 'Hayden', 'Jamie', 'Jesse', 'Kai', 'Logan',
                          'Marley', 'Parker', 'Peyton', 'Reese', 'River', 'Sawyer', 'Skyler', 'Spencer', 'Sydney', 'Tatum']
      const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
                        'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
                        'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson']
      
      const arr = []
      for (let i = 1; i <= 100; i++) {
        const firstName = firstNames[i % firstNames.length]
        const lastName = lastNames[Math.floor(i / 3) % lastNames.length]
        const name = `${firstName} ${lastName}`
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`
        
        // Distribute candidates across jobs and stages more realistically
        const jobIndex = Math.floor((i - 1) / 5) % jobs.length
        const job = jobs[jobIndex]
        
        // More candidates in early stages
        let stage
        const rand = Math.random()
        if (rand < 0.35) stage = 'Applied'
        else if (rand < 0.55) stage = 'Phone Screen'
        else if (rand < 0.70) stage = 'Onsite'
        else if (rand < 0.80) stage = 'Offer'
        else if (rand < 0.90) stage = 'Hired'
        else stage = 'Rejected'
        
        arr.push({ 
          id: `cand-${i}`, 
          name, 
          email, 
          stage, 
          jobId: job.id 
        })
      }
      return arr
    }
    const makeAssessments = (jobs) => {
      const arr = []
      for (let i = 0; i < 3; i++) {
        const job = jobs[i]
        // Build rich assessment with all types and some conditional questions
        const sections = [
          {
            id: `sec-1-${job.id}`,
            title: 'General',
            description: 'Basic information',
            questions: [
              { id: `q1-${job.id}`, type: 'short-text', label: 'Full name', required: true, validation: { maxLength: 120 } },
              { id: `q2-${job.id}`, type: 'long-text', label: 'Tell us about yourself', required: false, validation: { maxLength: 1000 } },
              { id: `q3-${job.id}`, type: 'numeric', label: 'Years of experience', required: true, validation: { min: 0, max: 50 } },
              {
                id: `q4-${job.id}`,
                type: 'single-choice',
                label: 'Open to relocation?',
                required: true,
                options: [
                  { id: `q4o1-${job.id}`, label: 'Yes', value: 'Yes' },
                  { id: `q4o2-${job.id}`, label: 'No', value: 'No' },
                ],
              },
              {
                id: `q5-${job.id}`,
                type: 'short-text',
                label: 'Preferred cities (if yes)',
                required: false,
                showIf: { questionId: `q4-${job.id}`, equals: 'Yes' },
              },
              {
                id: `q6-${job.id}`,
                type: 'file-upload',
                label: 'Upload resume (PDF name will be stored only)',
                required: false,
              },
            ],
          },
          {
            id: `sec-2-${job.id}`,
            title: 'Technical',
            description: 'Role-specific questions',
            questions: [
              {
                id: `q7-${job.id}`,
                type: 'multi-choice',
                label: 'Tech stack familiarity',
                required: true,
                options: [
                  { id: `q7o1-${job.id}`, label: 'React', value: 'React' },
                  { id: `q7o2-${job.id}`, label: 'Node', value: 'Node' },
                  { id: `q7o3-${job.id}`, label: 'Python', value: 'Python' },
                  { id: `q7o4-${job.id}`, label: 'Go', value: 'Go' },
                ],
              },
              {
                id: `q8-${job.id}`,
                type: 'single-choice',
                label: 'Have you led a team before?',
                required: false,
                options: [
                  { id: `q8o1-${job.id}`, label: 'Yes', value: 'Yes' },
                  { id: `q8o2-${job.id}`, label: 'No', value: 'No' },
                ],
              },
              {
                id: `q9-${job.id}`,
                type: 'long-text',
                label: 'Describe your leadership experience',
                required: false,
                validation: { maxLength: 800 },
                showIf: { questionId: `q8-${job.id}`, equals: 'Yes' },
              },
              {
                id: `q10-${job.id}`,
                type: 'single-choice',
                label: 'Preferred work setup',
                required: true,
                options: [
                  { id: `q10o1-${job.id}`, label: 'Remote', value: 'Remote' },
                  { id: `q10o2-${job.id}`, label: 'Hybrid', value: 'Hybrid' },
                  { id: `q10o3-${job.id}`, label: 'Onsite', value: 'Onsite' },
                ],
              },
              {
                id: `q11-${job.id}`,
                type: 'short-text',
                label: 'Which days can you work onsite? (if Onsite/Hybrid)',
                required: false,
                showIf: { questionId: `q10-${job.id}`, equals: 'Hybrid,Onsite' },
              },
            ],
          },
        ]
        arr.push({ jobId: job.id, title: `Assessment for ${job.title}`, description: 'Seeded assessment', sections })
      }
      return arr
    }
    const jobs = makeJobs()
    const candidates = makeCandidates(jobs)
    const assessments = makeAssessments(jobs)
    await storage.seedIfEmpty({ jobs, candidates, assessments })
  })()

  return server
}
