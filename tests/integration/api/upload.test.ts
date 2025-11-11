import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { POST } from '@/app/api/v1/upload/route'
import { createMockRequest, cleanupTestData, createTestUser } from '../helpers'

// Mock authentication
vi.mock('@/lib/auth-helpers', async () => {
  const actual = await vi.importActual('@/lib/auth-helpers')
  return {
    ...actual,
    requireAuth: vi.fn(),
  }
})

// Mock file system
vi.mock('fs/promises', () => ({
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}))

vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
}))

describe('Upload API Integration Tests', () => {
  let user: any

  beforeEach(async () => {
    await cleanupTestData()
    user = await createTestUser({ email: 'user@test.com', role: 'CLIENT' })
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  describe('POST /api/v1/upload', () => {
    it('should reject unauthorized requests', async () => {
      const { requireAuth } = await import('@/lib/auth-helpers')
      vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'))

      const formData = new FormData()
      formData.append('file', new Blob(['test'], { type: 'image/jpeg' }), 'test.jpg')
      formData.append('type', 'avatar')

      const request = createMockRequest('http://localhost/api/v1/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })

    it('should enforce rate limiting', async () => {
      const { requireAuth } = await import('@/lib/auth-helpers')
      vi.mocked(requireAuth).mockResolvedValue(user)

      // Make multiple upload requests quickly
      const requests = Array.from({ length: 11 }, () => {
        const formData = new FormData()
        formData.append('file', new Blob(['test'], { type: 'image/jpeg' }), 'test.jpg')
        formData.append('type', 'avatar')
        return createMockRequest('http://localhost/api/v1/upload', {
          method: 'POST',
          body: formData,
        })
      })

      const responses = await Promise.all(requests.map(req => POST(req)))
      
      // At least one should be rate limited
      const rateLimited = responses.some(res => res.status === 429)
      expect(rateLimited).toBe(true)
    })

    it('should validate file type', async () => {
      const { requireAuth } = await import('@/lib/auth-helpers')
      vi.mocked(requireAuth).mockResolvedValue(user)

      const formData = new FormData()
      formData.append('file', new Blob(['test'], { type: 'application/javascript' }), 'test.js')
      formData.append('type', 'avatar')

      const request = createMockRequest('http://localhost/api/v1/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should validate upload type', async () => {
      const { requireAuth } = await import('@/lib/auth-helpers')
      vi.mocked(requireAuth).mockResolvedValue(user)

      const formData = new FormData()
      formData.append('file', new Blob(['test'], { type: 'image/jpeg' }), 'test.jpg')
      formData.append('type', 'invalid_type')

      const request = createMockRequest('http://localhost/api/v1/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })
})


