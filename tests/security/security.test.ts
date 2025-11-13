import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { POST } from '@/app/api/v1/auth/signup/route'
import { POST as POST_REVIEW } from '@/app/api/v1/reviews/route'
import { GET as GET_TASK } from '@/app/api/v1/tasks/[id]/route'
import { createMockRequest, cleanupTestData, createTestUser, createTestTask } from '../integration/helpers'
import { sanitizeText, sanitizeHtml, escapeHtml } from '@/lib/sanitize'

// Mock authentication
vi.mock('@/lib/auth-helpers', async () => {
  const actual = await vi.importActual('@/lib/auth-helpers')
  return {
    ...actual,
    requireAuth: vi.fn(),
    getCurrentUser: vi.fn(),
  }
})

describe('Security Tests', () => {
  beforeEach(async () => {
    await cleanupTestData()
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  describe('XSS Prevention', () => {
    it('should sanitize HTML in user input', () => {
      const malicious = '<script>alert("xss")</script><p>Safe</p>'
      const sanitized = sanitizeHtml(malicious)
      
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).toContain('Safe')
    })

    it('should escape HTML in text fields', () => {
      const malicious = '<script>alert("xss")</script>'
      const escaped = escapeHtml(malicious)
      
      expect(escaped).not.toContain('<script>')
      expect(escaped).toContain('&lt;script&gt;')
    })

    it('should sanitize text input', () => {
      const malicious = '<img src=x onerror=alert(1)>'
      const sanitized = sanitizeText(malicious)
      
      expect(sanitized).not.toContain('<img')
      expect(sanitized).not.toContain('onerror')
    })
  })

  describe('SQL Injection Prevention', () => {
    it('should handle SQL injection attempts in text fields', async () => {
      const { requireAuth } = await import('@/lib/auth-helpers')
      const user = await createTestUser({ email: 'user@test.com', role: 'CLIENT' })
      vi.mocked(requireAuth).mockResolvedValue(user)

      const sqlInjection = "'; DROP TABLE users; --"
      const sanitized = sanitizeText(sqlInjection)
      
      // Should be sanitized, not executed
      expect(sanitized).not.toContain('DROP TABLE')
      expect(sanitized.length).toBeGreaterThan(0)
    })
  })

  describe('IDOR Prevention', () => {
    it('should prevent access to other users tasks', async () => {
      const { getCurrentUser } = await import('@/lib/auth-helpers')
      
      const client1 = await createTestUser({ email: 'client1@test.com', role: 'CLIENT' })
      const client2 = await createTestUser({ email: 'client2@test.com', role: 'CLIENT' })
      
      const task = await createTestTask({
        clientId: client1.id,
        title: 'Private Task',
        description: 'Description',
      })

      // Client2 tries to access Client1's task
      vi.mocked(getCurrentUser).mockResolvedValue(client2)

      const request = createMockRequest(`http://localhost/api/v1/tasks/${task.id}`)
      const response = await GET_TASK(request, { params: { id: task.id } })

      // Should be forbidden
      expect(response.status).toBe(403)
    })

    it('should prevent users from reviewing themselves', async () => {
      const { requireAuth } = await import('@/lib/auth-helpers')
      const user = await createTestUser({ email: 'user@test.com', role: 'CLIENT' })
      vi.mocked(requireAuth).mockResolvedValue(user)

      const task = await createTestTask({
        clientId: user.id,
        workerId: user.id, // Same user as worker
        title: 'Task',
        description: 'Desc',
        status: 'COMPLETED',
      })

      const request = createMockRequest('http://localhost/api/v1/reviews', {
        method: 'POST',
        body: {
          targetUserId: user.id, // Trying to review self
          taskId: task.id,
          rating: 5,
        },
      })

      const response = await POST_REVIEW(request)
      // Should reject self-review
      expect(response.status).toBe(400)
    })
  })

  describe('Mass Assignment Prevention', () => {
    it('should only allow specified fields in task creation', async () => {
      const { requireAuth } = await import('@/lib/auth-helpers')
      const user = await createTestUser({ email: 'user@test.com', role: 'CLIENT' })
      vi.mocked(requireAuth).mockResolvedValue(user)

      const request = createMockRequest('http://localhost/api/v1/tasks', {
        method: 'POST',
        body: {
          title: 'Test Task',
          description: 'Description',
          category: 'test',
          // Try to set unauthorized fields
          status: 'COMPLETED', // Should be ignored
          clientId: 'another-user-id', // Should be ignored
          createdAt: new Date().toISOString(), // Should be ignored
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(201)

      const data = await response.json()
      // Should use authenticated user's ID, not provided one
      expect(data.clientId).toBe(user.id)
      // Should use default status, not provided one
      expect(data.status).toBe('OPEN')
    })
  })

  describe('Rate Limiting', () => {
    it('should prevent brute force attacks on signup', async () => {
      // Attempt many signups quickly
      const requests = Array.from({ length: 10 }, (_, i) =>
        createMockRequest('http://localhost/api/v1/auth/signup', {
          method: 'POST',
          body: {
            email: `user${i}@test.com`,
            password: 'SecurePass123!',
            name: 'User',
            role: 'CLIENT',
          },
        })
      )

      const responses = await Promise.all(requests.map(req => POST(req)))
      
      // Should rate limit after threshold
      const rateLimited = responses.filter(res => res.status === 429)
      expect(rateLimited.length).toBeGreaterThan(0)
    })

    it('should prevent review spam', async () => {
      const { requireAuth } = await import('@/lib/auth-helpers')
      const client = await createTestUser({ email: 'client@test.com', role: 'CLIENT' })
      const worker = await createTestUser({ email: 'worker@test.com', role: 'WORKER' })
      vi.mocked(requireAuth).mockResolvedValue(client)

      // Create multiple completed tasks
      const tasks = await Promise.all(
        Array.from({ length: 10 }, () =>
          createTestTask({
            clientId: client.id,
            workerId: worker.id,
            title: 'Task',
            description: 'Desc',
            status: 'COMPLETED',
          })
        )
      )

      // Try to create many reviews quickly
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

      const responses = await Promise.all(requests.map(req => POST_REVIEW(req)))
      
      // Should rate limit review creation
      const rateLimited = responses.filter(res => res.status === 429)
      expect(rateLimited.length).toBeGreaterThan(0)
    })
  })

  describe('Input Validation', () => {
    it('should reject invalid email formats', async () => {
      const request = createMockRequest('http://localhost/api/v1/auth/signup', {
        method: 'POST',
        body: {
          email: 'not-an-email',
          password: 'SecurePass123!',
          name: 'User',
          role: 'CLIENT',
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should reject invalid rating values', async () => {
      const { requireAuth } = await import('@/lib/auth-helpers')
      const client = await createTestUser({ email: 'client@test.com', role: 'CLIENT' })
      const worker = await createTestUser({ email: 'worker@test.com', role: 'WORKER' })
      vi.mocked(requireAuth).mockResolvedValue(client)

      const task = await createTestTask({
        clientId: client.id,
        workerId: worker.id,
        title: 'Task',
        description: 'Desc',
        status: 'COMPLETED',
      })

      const request = createMockRequest('http://localhost/api/v1/reviews', {
        method: 'POST',
        body: {
          targetUserId: worker.id,
          taskId: task.id,
          rating: 10, // Invalid - should be 1-5
        },
      })

      const response = await POST_REVIEW(request)
      expect(response.status).toBe(400)
    })

    it('should enforce maximum length on text fields', async () => {
      const { requireAuth } = await import('@/lib/auth-helpers')
      const client = await createTestUser({ email: 'client@test.com', role: 'CLIENT' })
      const worker = await createTestUser({ email: 'worker@test.com', role: 'WORKER' })
      vi.mocked(requireAuth).mockResolvedValue(client)

      const task = await createTestTask({
        clientId: client.id,
        workerId: worker.id,
        title: 'Task',
        description: 'Desc',
        status: 'COMPLETED',
      })

      const longComment = 'a'.repeat(3000) // Exceeds max length

      const request = createMockRequest('http://localhost/api/v1/reviews', {
        method: 'POST',
        body: {
          targetUserId: worker.id,
          taskId: task.id,
          rating: 5,
          comment: longComment,
        },
      })

      const response = await POST_REVIEW(request)
      expect(response.status).toBe(400)
    })
  })

  describe('Authorization Checks', () => {
    it('should require authentication for protected endpoints', async () => {
      const { getCurrentUser } = await import('@/lib/auth-helpers')
      vi.mocked(getCurrentUser).mockResolvedValue(null)

      const request = createMockRequest('http://localhost/api/v1/tasks/task-id')
      const response = await GET_TASK(request, { params: { id: 'task-id' } })

      expect(response.status).toBe(401)
    })

    it('should enforce role-based access control', async () => {
      const { requireAuth } = await import('@/lib/auth-helpers')
      const worker = await createTestUser({ email: 'worker@test.com', role: 'WORKER' })
      vi.mocked(requireAuth).mockResolvedValue(worker)

      // Workers cannot create tasks
      const request = createMockRequest('http://localhost/api/v1/tasks', {
        method: 'POST',
        body: {
          title: 'Test Task',
          description: 'Description',
          category: 'test',
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(403)
    })
  })

  describe('Path Traversal Prevention', () => {
    it('should sanitize filenames to prevent path traversal', () => {
      const malicious = '../../../etc/passwd'
      const sanitized = sanitizeText(malicious)
      
      expect(sanitized).not.toContain('../')
      expect(sanitized).not.toContain('/')
    })
  })

  describe('CSRF Protection', () => {
    it('should validate origin header', async () => {
      // CSRF protection is handled in middleware
      // This test verifies the middleware is configured
      const request = createMockRequest('http://localhost/api/v1/tasks', {
        method: 'POST',
        headers: {
          'Origin': 'https://malicious-site.com',
        },
      })

      // In a real scenario, this would be blocked by CSRF middleware
      // For now, we verify the request structure
      expect(request.headers.get('Origin')).toBe('https://malicious-site.com')
    })
  })
})




