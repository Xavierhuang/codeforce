/**
 * Test setup file
 * Runs before all tests
 */

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NEXTAUTH_URL = 'http://localhost:3000'

// Suppress console errors in tests (optional)
// global.console = {
//   ...console,
//   error: vi.fn(),
//   warn: vi.fn(),
// }


