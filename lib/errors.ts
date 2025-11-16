import { NextResponse } from 'next/server'

/**
 * Standardized Error Handling
 * Provides consistent error responses across the application
 */

/**
 * Application error codes
 */
export enum ErrorCode {
  // Authentication & Authorization (1000-1099)
  UNAUTHORIZED = 'AUTH_001',
  FORBIDDEN = 'AUTH_002',
  INVALID_CREDENTIALS = 'AUTH_003',
  SESSION_EXPIRED = 'AUTH_004',
  
  // Validation Errors (2000-2099)
  VALIDATION_ERROR = 'VAL_001',
  INVALID_INPUT = 'VAL_002',
  MISSING_REQUIRED_FIELD = 'VAL_003',
  INVALID_FORMAT = 'VAL_004',
  
  // Resource Errors (3000-3099)
  NOT_FOUND = 'RES_001',
  ALREADY_EXISTS = 'RES_002',
  RESOURCE_CONFLICT = 'RES_003',
  
  // Rate Limiting (4000-4099)
  RATE_LIMIT_EXCEEDED = 'RATE_001',
  
  // Server Errors (5000-5099)
  INTERNAL_ERROR = 'SRV_001',
  DATABASE_ERROR = 'SRV_002',
  EXTERNAL_SERVICE_ERROR = 'SRV_003',
  
  // Business Logic Errors (6000-6099)
  BUSINESS_RULE_VIOLATION = 'BIZ_001',
  INSUFFICIENT_PERMISSIONS = 'BIZ_002',
  INVALID_STATE = 'BIZ_003',
}

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: ErrorCode,
    public details?: any,
    public field?: string
  ) {
    super(message)
    this.name = 'AppError'
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: unknown,
  defaultMessage: string = 'An error occurred'
): NextResponse {
  // Handle AppError instances
  if (error instanceof AppError) {
    const response: any = {
      error: error.message,
      code: error.code,
    }
    
    // Add details if available (only in development or for specific error types)
    if (error.details && (process.env.NODE_ENV === 'development' || error.code.startsWith('VAL_'))) {
      response.details = error.details
    }
    
    // Add field information for validation errors
    if (error.field) {
      response.field = error.field
    }
    
    return NextResponse.json(response, { status: error.statusCode })
  }
  
  // Handle Zod validation errors
  if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
    const zodError = error as any
    return NextResponse.json(
      {
        error: 'Validation failed',
        code: ErrorCode.VALIDATION_ERROR,
        details: zodError.errors?.map((err: any) => ({
          field: err.path?.join('.'),
          message: err.message,
          code: err.code,
        })) || [],
      },
      { status: 400 }
    )
  }
  
  // Handle standard Error instances
  if (error instanceof Error) {
    // Log error server-side
    console.error('Unhandled error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    })
    
    // Don't expose internal error details in production
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json(
        {
          error: error.message || defaultMessage,
          code: ErrorCode.INTERNAL_ERROR,
          details: error.stack,
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      {
        error: defaultMessage,
        code: ErrorCode.INTERNAL_ERROR,
      },
      { status: 500 }
    )
  }
  
  // Handle unknown error types
  console.error('Unknown error type:', error)
  
  return NextResponse.json(
    {
      error: defaultMessage,
      code: ErrorCode.INTERNAL_ERROR,
    },
    { status: 500 }
  )
}

/**
 * Error handler wrapper for API routes
 */
export function handleApiError(error: unknown, defaultMessage?: string): NextResponse {
  return createErrorResponse(error, defaultMessage)
}

/**
 * Common error creators for consistency
 */
export const Errors = {
  unauthorized: (message: string = 'Authentication required') =>
    new AppError(message, 401, ErrorCode.UNAUTHORIZED),
  
  forbidden: (message: string = 'You do not have permission to perform this action') =>
    new AppError(message, 403, ErrorCode.FORBIDDEN),
  
  notFound: (resource: string = 'Resource') =>
    new AppError(`${resource} not found`, 404, ErrorCode.NOT_FOUND),
  
  validation: (message: string, details?: any, field?: string) =>
    new AppError(message, 400, ErrorCode.VALIDATION_ERROR, details, field),
  
  conflict: (message: string) =>
    new AppError(message, 409, ErrorCode.RESOURCE_CONFLICT),
  
  rateLimit: (retryAfter?: number) =>
    new AppError(
      'Rate limit exceeded. Please try again later.',
      429,
      ErrorCode.RATE_LIMIT_EXCEEDED,
      retryAfter ? { retryAfter } : undefined
    ),
  
  internal: (message: string = 'Internal server error') =>
    new AppError(message, 500, ErrorCode.INTERNAL_ERROR),
  
  businessRule: (message: string) =>
    new AppError(message, 400, ErrorCode.BUSINESS_RULE_VIOLATION),
  
  invalidState: (message: string) =>
    new AppError(message, 400, ErrorCode.INVALID_STATE),
}








