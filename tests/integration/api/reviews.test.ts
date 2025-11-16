import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { POST, GET } from '@/app/api/v1/reviews/route'
import { createMockRequest, cleanupTestData, createTestUser, createTestTask } from '../helpers'
import { prisma } from '@/lib/prisma'

// Mock authentication
vi.mock('@/lib/auth-helpers', async () => {
  const actual = await vi.importActual('@/lib/auth-helpers')
  return {
    ...actual,
    requireAuth: vi.fn(),
    getCurrentUser: vi.fn(),
  }
})

describe('Reviews API Integration Tests', () => {
  let client: any
  let worker: any
  let task: any

  beforeEach(async () => {
    await cleanupTestData()
    
    client = await createTestUser({ email: 'client@test.com', role: 'CLIENT' })
    worker = await createTestUser({ email: 'worker@test.com', role: 'WORKER', verified: true })
    
    task = await createTestTask({
      clientId: client.id,
      workerId: worker.id,
      title: 'Test Task',
      description: 'Test Description',
      status: 'COMPLETED',
    })
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  describe('POST /api/v1/reviews', () => {
    it('should create a review', async () => {
      const { requireAuth } = await import('@/lib/auth-helpers')
      vi.mocked(requireAuth).mockResolvedValue(client)

      const request = createMockRequest('http://localhost/api/v1/reviews', {
        method: 'POST',
        body: {
          targetUserId: worker.id,
          taskId: task.id,
          rating: 5,
          comment: 'Great work!',
          serviceName: 'General Mounting',
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(201)

      const data = await response.json()
      expect(data.rating).toBe(5)
      expect(data.comment).toBe('Great work!')
      expect(data.reviewer).toBeDefined()
    })

    it('should reject review for non-completed task', async () => {
      const { requireAuth } = await import('@/lib/auth-helpers')
      vi.mocked(requireAuth).mockResolvedValue(client)

      const openTask = await createTestTask({
        clientId: client.id,
        title: 'Open Task',
        description: 'Description',
        status: 'OPEN',
      })

      const request = createMockRequest('http://localhost/api/v1/reviews', {
        method: 'POST',
        body: {
          targetUserId: worker.id,
          taskId: openTask.id,
          rating: 5,
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should enforce rate limiting', async () => {
      const { requireAuth } = await import('@/lib/auth-helpers')
      vi.mocked(requireAuth).mockResolvedValue(client)

      // Create multiple completed tasks
      const tasks = await Promise.all(
        Array.from({ length: 6 }, () =>
          createTestTask({
            clientId: client.id,
            workerId: worker.id,
            title: 'Task',
            description: 'Desc',
            status: 'COMPLETED',
          })
        )
      )

      // Try to create 6 reviews quickly
      const requests = tasks.map(t =>
        createMockRequest('http://localhost/api/v1/reviews', {
          method: 'POST',
          body: {
            targetUserId: worker.id,
            taskId: t.id,
            rating: 5,
          },
        })
      )

      const responses = await Promise.all(requests.map(req => POST(req)))
      
      // At least one should be rate limited
      const rateLimited = responses.some(res => res.status === 429)
      expect(rateLimited).toBe(true)
    })
  })

  describe('GET /api/v1/reviews', () => {
    it('should return reviews for a user', async () => {
      const { getCurrentUser } = await import('@/lib/auth-helpers')
      vi.mocked(getCurrentUser).mockResolvedValue(client)

      // Create some reviews
      await prisma.review.createMany({
        data: [
          {
            reviewerId: client.id,
            targetUserId: worker.id,
            rating: 5,
            comment: 'Great!',
            status: 'APPROVED',
          },
          {
            reviewerId: client.id,
            targetUserId: worker.id,
            rating: 4,
            comment: 'Good',
            status: 'APPROVED',
          },
        ],
      })

      const request = createMockRequest(
        `http://localhost/api/v1/reviews?targetUserId=${worker.id}&page=1&limit=10`
      )

      const response = await GET(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.reviews).toHaveLength(2)
      expect(data.pagination.total).toBe(2)
    })

    it('should only return approved reviews to regular users', async () => {
      const { getCurrentUser } = await import('@/lib/auth-helpers')
      vi.mocked(getCurrentUser).mockResolvedValue(client)

      // Create reviews with different statuses
      await prisma.review.createMany({
        data: [
          {
            reviewerId: client.id,
            targetUserId: worker.id,
            rating: 5,
            status: 'APPROVED',
          },
          {
            reviewerId: client.id,
            targetUserId: worker.id,
            rating: 4,
            status: 'PENDING',
          },
          {
            reviewerId: client.id,
            targetUserId: worker.id,
            rating: 3,
            status: 'REJECTED',
          },
        ],
      })

      const request = createMockRequest(
        `http://localhost/api/v1/reviews?targetUserId=${worker.id}`
      )

      const response = await GET(request)
      const data = await response.json()

      // Should only return approved reviews
      expect(data.reviews).toHaveLength(1)
      expect(data.reviews[0].status).toBe('APPROVED')
    })

    it('should require targetUserId', async () => {
      const { getCurrentUser } = await import('@/lib/auth-helpers')
      vi.mocked(getCurrentUser).mockResolvedValue(client)

      const request = createMockRequest('http://localhost/api/v1/reviews')

      const response = await GET(request)
      expect(response.status).toBe(400)
    })
  })
})







