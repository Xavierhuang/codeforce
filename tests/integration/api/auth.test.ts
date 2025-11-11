import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { POST } from '@/app/api/v1/auth/signup/route'
import { createMockRequest, cleanupTestData, createTestUser } from '../helpers'

describe('Auth API Integration Tests', () => {
  beforeEach(async () => {
    await cleanupTestData()
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  describe('POST /api/v1/auth/signup', () => {
    it('should create a new client user', async () => {
      const request = createMockRequest('http://localhost/api/v1/auth/signup', {
        method: 'POST',
        body: {
          email: 'client@test.com',
          password: 'SecurePass123!',
          name: 'Test Client',
          role: 'CLIENT',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.email).toBe('client@test.com')
      expect(data.name).toBe('Test Client')
      expect(data.role).toBe('CLIENT')
      expect(data.hashedPassword).toBeUndefined() // Should not expose password
    })

    it('should create a new worker user', async () => {
      const request = createMockRequest('http://localhost/api/v1/auth/signup', {
        method: 'POST',
        body: {
          email: 'worker@test.com',
          password: 'SecurePass123!',
          name: 'Test Worker',
          phone: '+1234567890',
          role: 'WORKER',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.email).toBe('worker@test.com')
      expect(data.role).toBe('WORKER')
    })

    it('should reject weak passwords', async () => {
      const request = createMockRequest('http://localhost/api/v1/auth/signup', {
        method: 'POST',
        body: {
          email: 'user@test.com',
          password: 'weak',
          name: 'Test User',
          role: 'CLIENT',
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toBeDefined()
      expect(data.details).toBeDefined()
    })

    it('should reject duplicate emails', async () => {
      await createTestUser({ email: 'existing@test.com' })

      const request = createMockRequest('http://localhost/api/v1/auth/signup', {
        method: 'POST',
        body: {
          email: 'existing@test.com',
          password: 'SecurePass123!',
          name: 'Test User',
          role: 'CLIENT',
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toContain('already exists')
    })

    it('should enforce rate limiting', async () => {
      // Make multiple requests quickly
      const requests = Array.from({ length: 6 }, () =>
        createMockRequest('http://localhost/api/v1/auth/signup', {
          method: 'POST',
          body: {
            email: `user${Math.random()}@test.com`,
            password: 'SecurePass123!',
            name: 'Test User',
            role: 'CLIENT',
          },
        })
      )

      const responses = await Promise.all(requests.map(req => POST(req)))
      
      // At least one should be rate limited (429)
      const rateLimited = responses.some(res => res.status === 429)
      expect(rateLimited).toBe(true)
    })
  })
})


