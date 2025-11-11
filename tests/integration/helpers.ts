/**
 * Integration test helpers
 * Provides utilities for testing API endpoints
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Create a mock NextRequest for testing
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string
    headers?: Record<string, string>
    body?: any
    cookies?: Record<string, string>
  } = {}
): NextRequest {
  const { method = 'GET', headers = {}, body, cookies = {} } = options

  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (body) {
    requestInit.body = typeof body === 'string' ? body : JSON.stringify(body)
  }

  const request = new NextRequest(url, requestInit)

  // Add cookies if provided
  if (Object.keys(cookies).length > 0) {
    const cookieHeader = Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ')
    request.headers.set('Cookie', cookieHeader)
  }

  return request
}

/**
 * Create a mock authenticated request
 */
export function createAuthenticatedRequest(
  url: string,
  userId: string,
  options: {
    method?: string
    body?: any
    role?: 'CLIENT' | 'WORKER' | 'ADMIN'
  } = {}
): NextRequest {
  // In a real test, you'd set up a proper session cookie
  // For now, we'll use a mock session approach
  return createMockRequest(url, {
    ...options,
    headers: {
      'x-test-user-id': userId,
      'x-test-user-role': options.role || 'CLIENT',
    },
  })
}

/**
 * Clean up test data
 */
export async function cleanupTestData() {
  try {
    // Clean up in reverse order of dependencies
    await prisma.reviewHelpfulVote.deleteMany({}).catch(() => {})
    await prisma.reviewReport.deleteMany({}).catch(() => {})
    await prisma.review.deleteMany({}).catch(() => {})
    await prisma.supportMessage.deleteMany({}).catch(() => {})
    await prisma.supportTicket.deleteMany({}).catch(() => {})
    await prisma.notification.deleteMany({}).catch(() => {})
    await prisma.message.deleteMany({}).catch(() => {})
    await prisma.offer.deleteMany({}).catch(() => {})
    await prisma.task.deleteMany({}).catch(() => {})
    await prisma.workerService.deleteMany({}).catch(() => {})
    await prisma.userSkill.deleteMany({}).catch(() => {})
    await prisma.user.deleteMany({}).catch(() => {})
  } catch (error) {
    // Ignore errors during cleanup - models might not exist in test DB
    console.warn('Cleanup warning:', error)
  }
}

/**
 * Create test user
 */
export async function createTestUser(data: {
  email: string
  name?: string
  role?: 'CLIENT' | 'WORKER' | 'ADMIN'
  verified?: boolean
}) {
  return await prisma.user.create({
    data: {
      email: data.email,
      name: data.name || 'Test User',
      role: data.role || 'CLIENT',
      hashedPassword: 'hashed_password_for_testing',
      verificationStatus: data.verified ? 'VERIFIED' : 'PENDING',
    },
  })
}

/**
 * Create test task
 */
export async function createTestTask(data: {
  clientId: string
  title: string
  description: string
  status?: string
  workerId?: string
}) {
  return await prisma.task.create({
    data: {
      clientId: data.clientId,
      title: data.title,
      description: data.description,
      category: 'test',
      status: (data.status as any) || 'OPEN',
      workerId: data.workerId || null,
    },
  })
}

/**
 * Wait for async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

