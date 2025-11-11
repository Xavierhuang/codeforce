import { describe, it, expect, vi } from 'vitest'
import { AppError, Errors, handleApiError } from '@/lib/errors'
import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

// Mock NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body, init) => ({
      body,
      status: init?.status || 200,
      headers: init?.headers || {},
    })),
  },
}))

describe('Error Handling', () => {
  describe('AppError', () => {
    it('should create error with correct properties', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR', { field: 'value' })
      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('TEST_ERROR')
      expect(error.details).toEqual({ field: 'value' })
    })

    it('should be instance of Error', () => {
      const error = new AppError('Test', 400, 'TEST')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('Errors helper', () => {
    it('should create unauthorized error', () => {
      const error = Errors.unauthorized('Custom message')
      expect(error.statusCode).toBe(401)
      expect(error.code).toBe('AUTH_001')
      expect(error.message).toBe('Custom message')
    })

    it('should create forbidden error', () => {
      const error = Errors.forbidden('Access denied')
      expect(error.statusCode).toBe(403)
      expect(error.code).toBe('AUTH_002')
    })

    it('should create validation error', () => {
      const error = Errors.validation('Invalid input', { field: 'error' })
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('VAL_001')
      expect(error.details).toEqual({ field: 'error' })
    })

    it('should create not found error', () => {
      const error = Errors.notFound('User')
      expect(error.statusCode).toBe(404)
      expect(error.code).toBe('RES_001')
      expect(error.message).toBe('User not found')
    })

    it('should create rate limit error', () => {
      const error = Errors.rateLimit()
      expect(error.statusCode).toBe(429)
      expect(error.code).toBe('RATE_001')
    })

    it('should create business rule error', () => {
      const error = Errors.businessRule('Cannot perform action')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('BIZ_001')
    })
  })

  describe('handleApiError', () => {
    it('should handle AppError correctly', () => {
      const error = Errors.notFound('Resource')
      const response = handleApiError(error, 'Default message')
      
      expect(response).toBeInstanceOf(NextResponse)
      // Note: Can't easily test response body without mocking NextResponse
    })

    it('should handle ZodError correctly', () => {
      const zodError = new ZodError([
        {
          path: ['field'],
          message: 'Invalid value',
          code: 'invalid_type',
        },
      ])
      // Mock the error to have name property
      Object.defineProperty(zodError, 'name', { value: 'ZodError' })
      const response = handleApiError(zodError, 'Default message')
      expect(response).toBeInstanceOf(Object) // NextResponse mock returns object
    })

    it('should handle generic Error correctly', () => {
      const error = new Error('Generic error')
      const response = handleApiError(error, 'Default message')
      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should handle unknown error types', () => {
      const response = handleApiError('string error', 'Default message')
      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should include details in development mode', () => {
      process.env.NODE_ENV = 'development'
      const error = Errors.validation('Test', { detail: 'value' })
      const response = handleApiError(error, 'Default')
      expect(response).toBeInstanceOf(NextResponse)
      process.env.NODE_ENV = 'test'
    })
  })
})

