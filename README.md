# CodeForce - On-Demand Developer Marketplace

TaskRabbit-style marketplace for connecting clients with vetted developers for virtual or in-person development tasks.

## Features

- **Task Posting**: Clients can post development tasks with AI assistance
- **Developer Offers**: Vetted developers submit offers with pricing
- **Escrow Payments**: Secure Stripe Connect integration for payments
- **Real-time Chat**: Messaging between clients and developers
- **Reviews & Ratings**: Build trust through verified reviews
- **Geolocation**: Support for in-person and virtual tasks
- **Developer Verification**: KYC and skill verification workflow

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Payments**: Stripe Connect (marketplace/escrow)
- **Auth**: NextAuth.js (email/password + OAuth)
- **Real-time**: Pusher/WebSocket (configured but needs setup)
- **Storage**: AWS S3 for file uploads

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Stripe account (for payments)
- AWS account (for S3 storage, optional for MVP)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd CodeForce
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and fill in:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL`: Your app URL (e.g., `http://localhost:3000`)
- Stripe keys (from Stripe dashboard)
- AWS credentials (if using S3)
- Pusher credentials (if using real-time chat)

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── tasks/             # Task pages
│   └── dashboard/         # Dashboard pages
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── TaskCreateForm.tsx
│   ├── TaskDetail.tsx
│   ├── Chat.tsx
│   └── OfferList.tsx
├── lib/                   # Utility functions
│   ├── prisma.ts         # Prisma client
│   ├── auth.ts           # NextAuth config
│   └── utils.ts          # Helper functions
├── prisma/               # Database schema
│   └── schema.prisma
└── types/                # TypeScript type definitions
```

## API Routes

All API routes are prefixed with `/api/v1/`:

- **Auth**: `/api/v1/auth/signup`, `/api/v1/auth/[...nextauth]`
- **Tasks**: `/api/v1/tasks`, `/api/v1/tasks/[id]`
- **Offers**: `/api/v1/tasks/[id]/offers`, `/api/v1/tasks/[id]/accept-offer`
- **Messages**: `/api/v1/tasks/[id]/messages`
- **Payments**: `/api/v1/stripe/create-account`, `/api/v1/stripe/webhook`
- **Users**: `/api/v1/users/me`
- **Search**: `/api/v1/search/developers`

## Database Schema

The Prisma schema includes:
- Users (clients, workers, admins)
- Tasks (with virtual/in-person support)
- Offers (developer quotes)
- Messages (task communication)
- Reviews (ratings and feedback)
- Payouts (payment tracking)
- Attachments (file uploads)

## Stripe Integration

The app uses Stripe Connect for marketplace payments:

1. **Worker Onboarding**: Workers create Stripe Connect accounts via `/api/v1/stripe/create-account`
2. **Payment Hold**: When client accepts an offer, funds are held in escrow via PaymentIntent
3. **Payout**: On task completion, funds are transferred to worker (minus platform fee)
4. **Webhooks**: Handle payment events via `/api/v1/stripe/webhook`

## Development Roadmap

### MVP (8 weeks)
- ✅ Authentication & user management
- ✅ Task CRUD operations
- ✅ Offers system
- ✅ Stripe Connect integration
- ✅ Basic messaging
- ⏳ Developer verification flow
- ⏳ Reviews & ratings
- ⏳ Admin dashboard
- ⏳ Geolocation features

### Future Enhancements
- Real-time notifications (push + SMS)
- AI-powered task description assistance
- Advanced matching algorithm
- Mobile app (React Native)
- Dispute resolution system
- Analytics dashboard

## Testing

```bash
# Run tests (when configured)
npm test

# E2E tests with Cypress
npm run test:e2e
```

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production

Ensure all variables from `.env.example` are set in your deployment platform.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

[Your License Here]

## Support

For issues and questions, please open an issue on GitHub.

