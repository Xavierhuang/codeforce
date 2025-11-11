import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { POST, GET } from '@/app/api/v1/tasks/route'
import { GET as GET_TASK } from '@/app/api/v1/tasks/[id]/route'
import { createMockRequest, cleanupTestData, createTestUser, createTestTask } from '../helpers'

// Mock authentication
vi.mock('@/lib/auth-helpers', async () => {
  const actual = await vi.importActual('@/lib/auth-helpers')
  return {
    ...actual,
    requireAuth: vi.fn(),
    getCurrentUser: vi.fn(),
  }
})

describe('Tasks API Integration Tests', () => {
  let client: any
  let worker: any

  beforeEach(async () => {
    await cleanupTestData()
    client = await createTestUser({ email: 'client@test.com', role: 'CLIENT' })
    worker = await createTestUser({ email: 'worker@test.com', role: 'WORKER' })
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  describe('POST /api/v1/tasks', () => {
    it('should create a task', async () => {
      const { requireAuth } = await import('@/lib/auth-helpers')
      vi.mocked(requireAuth).mockResolvedValue(client)

      const request = createMockRequest('http://localhost/api/v1/tasks', {
        method: 'POST',
        body: {
          title: 'Test Task',
          description: 'Task description',
          category: 'test',
          type: 'VIRTUAL',
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(201)

      const data = await response.json()
      expect(data.title).toBe('Test Task')
      expect(data.clientId).toBe(client.id)
      expect(data.status).toBe('OPEN')
    })

    it('should reject task creation from non-clients', async () => {
      const { requireAuth } = await import('@/lib/auth-helpers')
      vi.mocked(requireAuth).mockResolvedValue(worker)

      const request = createMockRequest('http://localhost/api/v1/tasks', {
        method: 'POST',
        body: {
          title: 'Test Task',
          description: 'Task description',
          category: 'test',
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(403)
    })

    it('should validate required fields', async () => {
      const { requireAuth } = await import('@/lib/auth-helpers')
      vi.mocked(requireAuth).mockResolvedValue(client)

      const request = createMockRequest('http://localhost/api/v1/tasks', {
        method: 'POST',
        body: {
          // Missing required fields
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should enforce rate limiting', async () => {
      const { requireAuth } = await import('@/lib/auth-helpers')
      vi.mocked(requireAuth).mockResolvedValue(client)

      // Make multiple requests quickly
      const requests = Array.from({ length: 11 }, () =>
        createMockRequest('http://localhost/api/v1/tasks', {
          method: 'POST',
          body: {
            title: 'Test Task',
            description: 'Description',
            category: 'test',
          },
        })
      )

      const responses = await Promise.all(requests.map(req => POST(req)))
      
      // At least one should be rate limited
      const rateLimited = responses.some(res => res.status === 429)
      expect(rateLimited).toBe(true)
    })
  })

  describe('GET /api/v1/tasks', () => {
    it('should return tasks', async () => {
      const { getCurrentUser } = await import('@/lib/auth-helpers')
      vi.mocked(getCurrentUser).mockResolvedValue(client)

      // Create some tasks
      await createTestTask({
        clientId: client.id,
        title: 'Task 1',
        description: 'Desc 1',
        status: 'OPEN',
      })
      await createTestTask({
        clientId: client.id,
        title: 'Task 2',
        description: 'Desc 2',
        status: 'OPEN',
      })

      const request = createMockRequest('http://localhost/api/v1/tasks?status=OPEN')

      const response = await GET(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)
    })

    it('should filter by status', async () => {
      const { getCurrentUser } = await import('@/lib/auth-helpers')
      vi.mocked(getCurrentUser).mockResolvedValue(client)

      await createTestTask({
        clientId: client.id,
        title: 'Open Task',
        description: 'Desc',
        status: 'OPEN',
      })
      await createTestTask({
        clientId: client.id,
        title: 'Completed Task',
        description: 'Desc',
        status: 'COMPLETED',
      })

      const request = createMockRequest('http://localhost/api/v1/tasks?status=OPEN')

      const response = await GET(request)
      const data = await response.json()

      expect(data.every((t: any) => t.status === 'OPEN')).toBe(true)
    })
  })

  describe('GET /api/v1/tasks/[id]', () => {
    it('should return task for authorized user', async () => {
      const { getCurrentUser } = await import('@/lib/auth-helpers')
      vi.mocked(getCurrentUser).mockResolvedValue(client)

      const task = await createTestTask({
        clientId: client.id,
        title: 'Test Task',
        description: 'Description',
      })

      const request = createMockRequest(`http://localhost/api/v1/tasks/${task.id}`)

      const response = await GET_TASK(request, { params: { id: task.id } })
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.id).toBe(task.id)
      expect(data.title).toBe('Test Task')
    })

    it('should reject unauthorized access', async () => {
      const { getCurrentUser } = await import('@/lib/auth-helpers')
      vi.mocked(getCurrentUser).mockResolvedValue(null)

      const task = await createTestTask({
        clientId: client.id,
        title: 'Test Task',
        description: 'Description',
      })

      const request = createMockRequest(`http://localhost/api/v1/tasks/${task.id}`)

      const response = await GET_TASK(request, { params: { id: task.id } })
      expect(response.status).toBe(401)
    })

    it('should enforce rate limiting', async () => {
      const { getCurrentUser } = await import('@/lib/auth-helpers')
      vi.mocked(getCurrentUser).mockResolvedValue(client)

      const task = await createTestTask({
        clientId: client.id,
        title: 'Test Task',
        description: 'Description',
      })

      // Make many requests quickly
      const requests = Array.from({ length: 101 }, () =>
        createMockRequest(`http://localhost/api/v1/tasks/${task.id}`)
      )

      const responses = await Promise.all(
        requests.map(req => GET_TASK(req, { params: { id: task.id } }))
      )

      // At least one should be rate limited
      const rateLimited = responses.some(res => res.status === 429)
      expect(rateLimited).toBe(true)
    })
  })
})


