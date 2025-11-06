# CodeForce App Analysis

## Overview

**CodeForce** is a TaskRabbit-style marketplace platform that connects clients with vetted developers for virtual or in-person development tasks. The platform facilitates secure payments, real-time communication, and task management.

## Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, React, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes (Serverless Functions)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Payments**: Stripe Connect (Marketplace/Express accounts)
- **Real-time**: Pusher (configured, needs setup)
- **Storage**: AWS S3 for file uploads
- **SMS**: Twilio for notifications

### Project Structure
```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── v1/
│   │   │   ├── auth/     # Authentication endpoints
│   │   │   ├── tasks/    # Task management
│   │   │   ├── stripe/   # Stripe integration
│   │   │   └── users/    # User management
│   ├── auth/              # Auth pages (signin/signup)
│   ├── dashboard/         # User dashboard
│   ├── tasks/             # Task pages
│   └── developers/        # Developer profiles
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── PaymentForm.tsx   # Stripe payment form
│   ├── TaskCreateForm.tsx
│   └── Chat.tsx
├── lib/                   # Utilities
│   ├── prisma.ts        # Database client
│   ├── auth.ts          # NextAuth config
│   └── stripe.ts        # Stripe helpers (if exists)
└── prisma/              # Database schema
```

## Core Features

### 1. User Management
- **Roles**: CLIENT, WORKER, ADMIN
- **User Profiles**: Bio, avatar, skills, ratings, location
- **Verification**: KYC workflow (PENDING, VERIFIED, REJECTED)
- **Developer Profiles**: Public slug-based profiles with ratings

### 2. Task Management
- **Task Types**: VIRTUAL or IN_PERSON
- **Task Status Flow**:
  ```
  OPEN → OFFERED → ASSIGNED → IN_PROGRESS → COMPLETED
  ```
- **Task Features**:
  - Category/subcategory classification
  - Location support (lat/lng for in-person)
  - Scheduled appointments
  - File attachments
  - Budget/price setting

### 3. Offer System
- Developers submit offers with:
  - Price (fixed or hourly)
  - Estimated duration
  - Custom message
- Status: PENDING → ACCEPTED/DECLINED/WITHDRAWN
- Multiple offers per task
- Client accepts one offer

### 4. Payment Flow (Current Implementation)

#### Stripe Connect Integration
1. **Worker Onboarding** (`/api/v1/stripe/create-account`)
   - Creates Stripe Connect Express account
   - Generates onboarding link
   - Stores `stripeAccountId` in User model

2. **Accept Offer Flow** (`/api/v1/tasks/[id]/accept-offer`)
   - Client accepts developer's offer
   - Creates PaymentIntent with:
     - Amount: base + platform fee (15%) + Stripe fees (2.9% + $0.30)
     - Capture method: `manual` (escrow)
   - Returns `clientSecret` for frontend payment

3. **Payment Authorization** (Frontend)
   - Uses PaymentForm component with Stripe Elements
   - Confirms payment with `clientSecret`
   - Funds held in escrow until completion

4. **Task Completion** (`/api/v1/tasks/[id]/complete`)
   - Worker marks task complete
   - Captures PaymentIntent (releases funds)
   - Calculates payout:
     - Worker gets: baseAmount - platformFee - Stripe fees
   - Transfers funds to worker's Stripe Connect account
   - Records payout in database

5. **Webhook Handler** (`/api/v1/stripe/webhook`)
   - Handles payment events:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `transfer.created`
     - `account.updated`

### 5. Messaging & Communication
- Real-time chat via Pusher (needs setup)
- Messages linked to tasks
- File attachments support
- SMS notifications via Twilio

### 6. Reviews & Ratings
- Review model with ratings (1-5 stars)
- Reviews linked to completed tasks
- User ratings calculated from reviews

## Database Schema Highlights

### User Model
- `stripeAccountId`: Stripe Connect account ID (for workers)
- `verificationStatus`: PENDING/VERIFIED/REJECTED
- `locationLat/locationLng`: For in-person tasks
- `serviceRadiusMiles`: Worker service area
- `availability`: JSON weekly schedule

### Task Model
- `paymentIntentId`: Stripe PaymentIntent ID (escrow)
- `stripeChargeId`: Stripe Charge ID (after capture)
- `type`: VIRTUAL or IN_PERSON
- `status`: Task lifecycle state

### Payout Model
- Tracks worker payouts
- Links to Stripe transfer ID
- Records platform fees

## Current Stripe Integration Status

### ✅ Implemented
1. Stripe Connect Express account creation
2. PaymentIntent creation for escrow
3. Manual capture on task completion
4. Stripe Connect transfers to workers
5. Webhook handling for payment events
6. Payment form component (CardElement)

### ⚠️ Areas for Improvement
1. **Payment Form**: Uses deprecated `CardElement` (should use Payment Element)
2. **Error Handling**: Could be more robust
3. **Fee Calculation**: Hardcoded in multiple places
4. **Webhook Idempotency**: Not implemented
5. **Dispute Handling**: Basic structure exists but not implemented
6. **Refund Flow**: Not implemented
7. **Client Portal**: No self-service payment management
8. **Testing**: No test coverage for Stripe flows

## API Endpoints

### Authentication
- `POST /api/v1/auth/signup` - User registration
- `POST /api/auth/[...nextauth]` - NextAuth session

### Tasks
- `GET /api/v1/tasks` - List tasks
- `POST /api/v1/tasks` - Create task
- `GET /api/v1/tasks/[id]` - Get task details
- `POST /api/v1/tasks/[id]/offers` - Submit offer
- `POST /api/v1/tasks/[id]/accept-offer` - Accept offer (creates PaymentIntent)
- `POST /api/v1/tasks/[id]/complete` - Complete task (captures payment)
- `POST /api/v1/tasks/[id]/cancel` - Cancel task

### Stripe
- `POST /api/v1/stripe/create-account` - Create Connect account
- `POST /api/v1/stripe/webhook` - Webhook handler

### Users
- `GET /api/v1/users/me` - Get current user
- `GET /api/v1/users/verify` - Verify user

## Environment Variables Required

```env
# Database
DATABASE_URL=postgresql://...

# Authentication
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AWS (for file uploads)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...

# Pusher (for real-time chat)
PUSHER_APP_ID=...
PUSHER_KEY=...
PUSHER_SECRET=...

# Twilio (for SMS)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
```

## Current Payment Flow Diagram

```
┌─────────┐
│ Client  │
└────┬────┘
     │ 1. Posts task
     ▼
┌─────────────┐
│ Task (OPEN) │
└────┬────────┘
     │ 2. Developers submit offers
     ▼
┌──────────────┐
│ Offers (PENDING)│
└────┬──────────┘
     │ 3. Client accepts offer
     ▼
┌─────────────────────────┐
│ Create PaymentIntent    │
│ (manual capture)        │
└────┬────────────────────┘
     │ 4. Client authorizes payment
     ▼
┌─────────────────────────┐
│ PaymentIntent (authorized)│
│ Funds held in escrow    │
└────┬────────────────────┘
     │ 5. Task assigned to worker
     ▼
┌─────────────────────────┐
│ Task (ASSIGNED)         │
└────┬────────────────────┘
     │ 6. Worker completes task
     ▼
┌─────────────────────────┐
│ Capture PaymentIntent   │
│ Transfer to worker      │
└────┬────────────────────┘
     │ 7. Task completed
     ▼
┌─────────────────────────┐
│ Task (COMPLETED)        │
│ Payout recorded         │
└─────────────────────────┘
```

## Strengths

1. ✅ Well-structured codebase with TypeScript
2. ✅ Proper separation of concerns
3. ✅ Stripe Connect properly integrated for marketplace
4. ✅ Escrow system protects both parties
5. ✅ Comprehensive database schema
6. ✅ Role-based access control

## Areas for Enhancement

1. **Payment Experience**
   - Upgrade to Payment Element (modern, better UX)
   - Add saved payment methods
   - Support for multiple payment methods

2. **Error Handling**
   - Better error messages for users
   - Retry logic for failed transfers
   - Graceful degradation

3. **Testing**
   - Unit tests for payment flows
   - Integration tests with Stripe test mode
   - Webhook testing with Stripe CLI

4. **Admin Tools**
   - Payment reconciliation dashboard
   - Dispute management interface
   - Payout tracking

5. **User Features**
   - Payment history
   - Receipt generation
   - Refund requests
   - Dispute resolution

6. **Analytics**
   - Revenue tracking
   - Platform fee calculations
   - Worker earnings reports

## Next Steps

See `STRIPE_INTEGRATION_PLAN.md` for detailed implementation plan.





