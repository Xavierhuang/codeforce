# Testing Guide

## Overview

This project uses [Vitest](https://vitest.dev/) for unit and integration testing.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Structure

```
tests/
├── setup.ts              # Test setup and global configuration
├── unit/                 # Unit tests for individual functions/components
│   └── lib/             # Tests for utility libraries
└── integration/         # Integration tests for API endpoints
```

## Writing Tests

### Unit Tests

Unit tests should test individual functions in isolation:

```typescript
import { describe, it, expect } from 'vitest'
import { functionToTest } from '@/lib/module'

describe('functionToTest', () => {
  it('should handle normal case', () => {
    expect(functionToTest('input')).toBe('expected')
  })
  
  it('should handle edge cases', () => {
    expect(functionToTest(null)).toBe('default')
  })
})
```

### Integration Tests

Integration tests should test API endpoints end-to-end:

```typescript
import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/v1/endpoint/route'

describe('GET /api/v1/endpoint', () => {
  it('should return data', async () => {
    const request = new Request('http://localhost/api/v1/endpoint')
    const response = await GET(request)
    expect(response.status).toBe(200)
  })
})
```

## Test Coverage

Aim for:
- **Critical functions**: 90%+ coverage
- **Utility functions**: 80%+ coverage
- **API endpoints**: 70%+ coverage

## Best Practices

1. **Test behavior, not implementation**: Focus on what the function does, not how
2. **Use descriptive test names**: `it('should reject invalid passwords')` not `it('works')`
3. **Test edge cases**: null, undefined, empty strings, boundary values
4. **Keep tests isolated**: Each test should be independent
5. **Mock external dependencies**: Database, APIs, file system
6. **Test error cases**: Ensure errors are handled correctly

## Mocking

### Mock Prisma

```typescript
import { vi } from 'vitest'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))
```

### Mock Next.js Request

```typescript
const createMockRequest = (options = {}) => {
  return new Request('http://localhost/api/v1/endpoint', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}
```

## Continuous Integration

Tests should run automatically on:
- Pull requests
- Before deployment
- On every commit (optional)

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)




