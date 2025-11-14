# Integration Tests

Integration tests verify that API endpoints work correctly end-to-end, including:
- Request/response handling
- Authentication and authorization
- Database interactions
- Rate limiting
- Error handling

## Running Integration Tests

```bash
# Run all integration tests
npm test -- tests/integration

# Run specific test file
npm test -- tests/integration/api/reviews.test.ts
```

## Test Structure

```
tests/integration/
├── helpers.ts           # Test utilities and helpers
├── api/                 # API endpoint tests
│   ├── auth.test.ts
│   ├── reviews.test.ts
│   ├── tasks.test.ts
│   └── upload.test.ts
└── README.md
```

## Setup Requirements

Integration tests require:
1. Test database (configured via DATABASE_URL)
2. Mocked authentication (using vi.mock)
3. Clean test data (beforeEach/afterEach cleanup)

## Best Practices

1. **Isolate tests**: Each test should be independent
2. **Clean up**: Always clean up test data after tests
3. **Mock external services**: Mock Stripe, email, SMS services
4. **Test error cases**: Test validation, authorization, rate limiting
5. **Use realistic data**: Create test data that mirrors production

## Mocking

### Authentication

```typescript
vi.mock('@/lib/auth-helpers', async () => {
  const actual = await vi.importActual('@/lib/auth-helpers')
  return {
    ...actual,
    requireAuth: vi.fn(),
    getCurrentUser: vi.fn(),
  }
})

// In test
const { requireAuth } = await import('@/lib/auth-helpers')
vi.mocked(requireAuth).mockResolvedValue(testUser)
```

### External Services

```typescript
vi.mock('@/lib/email-service', () => ({
  sendEmail: vi.fn(),
}))

vi.mock('@/lib/twilio', () => ({
  sendSMS: vi.fn(),
}))
```

## Database Setup

For integration tests, use a separate test database:

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/test_db"
```

Run migrations before tests:
```bash
npm run db:migrate
```

## Notes

- Integration tests are slower than unit tests
- They require a database connection
- Consider using a test database that can be reset quickly
- Mock external services to avoid API calls during tests





