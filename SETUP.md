# CodeForce Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

1. Create a PostgreSQL database (local or cloud provider like Supabase, Neon, etc.)
2. Update `.env` with your `DATABASE_URL`:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/codeforce"
   ```

3. Generate Prisma Client and push schema:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. Seed the database with default admin user:
   ```bash
   npm run db:seed
   ```
   
   This creates a default admin user:
   - **Email**: `admin@codeforce.com`
   - **Password**: `admin123456`
   
   ⚠️ **Important**: Change the default password after first login!
   
   You can customize these credentials by setting environment variables:
   ```bash
   ADMIN_EMAIL=your-email@example.com
   ADMIN_PASSWORD=your-secure-password
   ADMIN_NAME=Your Name
   ```
   
   See `SETUP_ADMIN.md` for more details.

### 3. Authentication Setup

1. Generate NextAuth secret:
   ```bash
   openssl rand -base64 32
   ```

2. Add to `.env`:
   ```
   NEXTAUTH_SECRET="your-generated-secret"
   NEXTAUTH_URL="http://localhost:3000"
   ```

3. (Optional) Set up OAuth providers:
   - Google: Create OAuth credentials at [Google Cloud Console](https://console.cloud.google.com/)
   - GitHub: Create OAuth app at [GitHub Settings](https://github.com/settings/developers)

### 5. Stripe Setup

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from the Stripe Dashboard
3. Add to `.env`:
   ```
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
   STRIPE_SECRET_KEY="sk_test_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."  # For webhook verification
   ```

4. Set up webhook endpoint:
   - In Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://yourdomain.com/api/v1/stripe/webhook`
   - Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `transfer.created`, `account.updated`
   - Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 6. AWS S3 Setup (Optional for MVP)

1. Create S3 bucket
2. Configure IAM user with S3 access
3. Add to `.env`:
   ```
   AWS_ACCESS_KEY_ID="your-access-key"
   AWS_SECRET_ACCESS_KEY="your-secret-key"
   AWS_REGION="us-east-1"
   AWS_S3_BUCKET="codeforce-uploads"
   ```

### 7. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Testing the Application

### Create a Test User

1. Go to `/auth/signup`
2. Create a client account
3. Create a worker account (use different email)

### Test Workflow

1. **As Client:**
   - Sign in
   - Go to `/tasks/new`
   - Post a task
   - View offers
   - Accept an offer (requires Stripe test card)

2. **As Worker:**
   - Sign in
   - Go to `/tasks`
   - View available tasks
   - Submit an offer
   - Complete assigned tasks

### Stripe Test Cards

Use Stripe test cards for payments:
- Success: `4242 4242 4242 4242`
- Any future expiry date
- Any 3-digit CVC
- Any ZIP code

## Production Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add all environment variables
4. Configure custom domain (optional)
5. Deploy

### Environment Variables Checklist

Ensure these are set in production:
- ✅ `DATABASE_URL`
- ✅ `NEXTAUTH_SECRET`
- ✅ `NEXTAUTH_URL` (production URL)
- ✅ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- ✅ `STRIPE_SECRET_KEY`
- ✅ `STRIPE_WEBHOOK_SECRET`
- ✅ `AWS_ACCESS_KEY_ID` (if using S3)
- ✅ `AWS_SECRET_ACCESS_KEY` (if using S3)
- ✅ `AWS_S3_BUCKET` (if using S3)
- ✅ `NEXT_PUBLIC_APP_URL` (production URL)

## Next Steps

1. **Set up real-time messaging**: Configure Pusher or Supabase Realtime
2. **Implement file uploads**: Complete S3 integration for attachments
3. **Add developer verification**: Build KYC flow
4. **Set up admin dashboard**: Create moderation tools
5. **Add email notifications**: Configure SendGrid or similar
6. **Implement geolocation**: Add Mapbox for in-person tasks

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Check database is running
- Ensure database exists

### Authentication Issues

- Verify `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your domain
- Clear browser cookies/localStorage

### Stripe Issues

- Verify API keys are correct (test vs live)
- Check webhook endpoint is accessible
- Verify webhook secret matches

### Build Errors

- Run `npx prisma generate` after schema changes
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`

