# CodeForce Tech Stack

Complete overview of all technologies, frameworks, and services used in the CodeForce application.

## Core Framework

### Frontend Framework
- **Next.js 14.0.4** - React framework with App Router
  - Server-side rendering (SSR)
  - Static site generation (SSG)
  - API Routes (serverless functions)
  - File-based routing

### Language
- **TypeScript 5.3.3** - Type-safe JavaScript
  - Full type coverage across the application
  - Better IDE support and error catching

### React Ecosystem
- **React 18.2.0** - UI library
- **React DOM 18.2.0** - DOM rendering

---

## UI & Styling

### CSS Framework
- **Tailwind CSS 3.4.0** - Utility-first CSS framework
- **tailwindcss-animate 1.0.7** - Animation utilities
- **tailwind-merge 2.2.0** - Merge Tailwind classes
- **PostCSS 8.4.32** - CSS processing
- **Autoprefixer 10.4.16** - CSS vendor prefixes

### Component Library
- **shadcn/ui** - Accessible component library built on Radix UI
  - `@radix-ui/react-avatar` 1.0.4
  - `@radix-ui/react-dialog` 1.0.5
  - `@radix-ui/react-dropdown-menu` 2.0.6
  - `@radix-ui/react-label` 2.0.2
  - `@radix-ui/react-select` 2.0.0
  - `@radix-ui/react-slot` 1.0.2
  - `@radix-ui/react-tabs` 1.0.4
  - `@radix-ui/react-toast` 1.1.5

### Icons & UI Utilities
- **lucide-react 0.552.0** - Icon library
- **class-variance-authority 0.7.0** - Component variant utilities
- **clsx 2.1.0** - Conditional class names

---

## Data Layer

### Database
- **PostgreSQL** - Relational database (hosted on Supabase)

### ORM
- **Prisma 5.7.1** - Next-generation ORM
  - Type-safe database client
  - Migration system
  - Prisma Studio for database management
  - Prisma Client for queries

### Data Fetching
- **SWR 2.2.4** - Data fetching library (React Hooks)
  - Revalidation
  - Caching
  - Real-time updates
- **@tanstack/react-query 5.17.0** - Server state management

---

## Authentication & Security

### Authentication
- **NextAuth.js 4.24.5** - Authentication for Next.js
  - Email/password authentication
  - OAuth support (Google, GitHub, etc.)
  - Session management
  - JWT tokens

### Security
- **bcryptjs 2.4.3** - Password hashing
  - Secure password storage
  - Salt rounds for encryption

---

## Payments

### Payment Processing
- **Stripe 14.9.0** - Payment processing SDK
- **@stripe/stripe-js 2.4.0** - Stripe.js library
- **@stripe/react-stripe-js 2.9.0** - React components for Stripe
  - Payment Element (modern payment form)
  - Stripe Connect (marketplace payments)
  - Payment Intents (escrow system)
  - Webhooks for payment events

### Payment Features
- Escrow payments (hold funds until task completion)
- Stripe Connect Express accounts for workers
- Automatic transfers to workers
- Platform fee handling (15%)
- Stripe fee calculation (2.9% + $0.30)

---

## Real-time Features

### WebSocket/Real-time
- **Pusher 5.2.0** - Real-time messaging (server SDK)
- **pusher-js 8.2.0** - Real-time messaging (client SDK)
  - Chat functionality
  - Live updates
  - Event broadcasting

---

## Communication

### SMS Notifications
- **Twilio 5.10.4** - SMS and messaging API
  - Task booking notifications
  - SMS alerts for developers
  - Phone number verification

---

## File Storage

### Cloud Storage
- **AWS SDK 2.1505.0** - Amazon Web Services SDK
  - S3 for file uploads
  - Task attachments
  - User avatars
  - Document storage (ID verification)

---

## Form Handling & Validation

### Forms
- **react-hook-form 7.49.2** - Form state management
  - Performance optimized
  - Minimal re-renders
  - Easy validation

### Validation
- **Zod 3.22.4** - TypeScript-first schema validation
  - Runtime type checking
  - Form validation
  - API validation

---

## State Management

### Client State
- **Zustand 4.4.7** - Lightweight state management
  - Global state
  - Simple API
  - No boilerplate

---

## Utilities & Helpers

### Date Handling
- **date-fns 3.6.0** - Date utility library
  - Formatting dates
  - Date calculations
  - Timezone handling

### QR Codes
- **qrcode 1.5.4** - QR code generation
- **@types/qrcode 1.5.6** - TypeScript types

### Calendar
- **react-calendar 6.0.0** - Calendar component
  - Date selection
  - Task scheduling

### Notifications
- **react-hot-toast 2.4.1** - Toast notifications
  - Success/error messages
  - User feedback

---

## Development Tools

### Build Tools
- **TypeScript** - Type checking
- **ESLint 8.56.0** - Code linting
- **eslint-config-next 14.0.4** - Next.js ESLint config

### Development Scripts
- **tsx 4.7.0** - TypeScript execution
  - Prisma seed scripts
  - Development utilities

### Type Definitions
- **@types/node 20.10.6** - Node.js types
- **@types/react 18.2.46** - React types
- **@types/react-dom 18.2.18** - React DOM types
- **@types/bcryptjs 2.4.6** - bcryptjs types

---

## Deployment & Infrastructure

### Hosting
- **Vercel** (recommended) - Next.js deployment platform
  - Automatic deployments
  - Serverless functions
  - Edge network

### Database Hosting
- **Supabase** - PostgreSQL database
  - Managed PostgreSQL
  - Connection pooling
  - Database backups

### Environment
- **Node.js 18+** - Runtime environment
- **npm** - Package manager

---

## Architecture Patterns

### Frontend Architecture
- **App Router** - Next.js 14 routing system
- **Server Components** - React Server Components
- **Client Components** - Interactive React components
- **API Routes** - Serverless backend endpoints

### Backend Architecture
- **RESTful API** - REST API design
- **Serverless Functions** - Next.js API routes
- **Webhook Handlers** - Stripe webhook processing

### Database Architecture
- **Relational Database** - PostgreSQL with Prisma
- **Migrations** - Version-controlled schema changes
- **Indexes** - Optimized queries

---

## External Services Integration

### Payment Services
- **Stripe** - Payment processing
  - Stripe Connect (marketplace)
  - Payment Intents (escrow)
  - Webhooks (event handling)

### Communication Services
- **Twilio** - SMS notifications
- **Pusher** - Real-time messaging

### Storage Services
- **AWS S3** - File storage

---

## Code Quality & Standards

### Type Safety
- Full TypeScript coverage
- Type-safe database queries (Prisma)
- Runtime validation (Zod)

### Code Organization
- Modular component structure
- Separation of concerns
- Utility functions centralized

### Best Practices
- Environment variables for secrets
- Secure password hashing
- Webhook signature verification
- Error handling and logging

---

## Key Features Enabled by Tech Stack

1. **Marketplace Payments** - Stripe Connect + Payment Intents
2. **Real-time Chat** - Pusher WebSocket
3. **File Uploads** - AWS S3 integration
4. **SMS Notifications** - Twilio integration
5. **User Authentication** - NextAuth.js
6. **Type Safety** - TypeScript + Prisma + Zod
7. **Modern UI** - Tailwind + shadcn/ui
8. **Server-Side Rendering** - Next.js SSR
9. **API Routes** - Serverless backend
10. **Database Management** - Prisma ORM

---

## Version Summary

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.0.4 | Core framework |
| React | 18.2.0 | UI library |
| TypeScript | 5.3.3 | Type safety |
| Prisma | 5.7.1 | Database ORM |
| Stripe | 14.9.0 | Payments |
| NextAuth | 4.24.5 | Authentication |
| Tailwind CSS | 3.4.0 | Styling |
| Pusher | 5.2.0 | Real-time |
| Twilio | 5.10.4 | SMS |
| AWS SDK | 2.1505.0 | File storage |

---

## Recent Updates

### Stripe Integration Improvements
- ✅ Upgraded to Payment Element (modern payment form)
- ✅ Centralized fee calculations
- ✅ Webhook idempotency for reliability

### Code Quality
- ✅ TypeScript throughout
- ✅ Centralized utilities
- ✅ Error handling improvements

---

**Last Updated**: Current
**Framework**: Next.js 14 (App Router)
**Database**: PostgreSQL (Supabase)
**Payment**: Stripe Connect




