# CodeForce Deployment Checklist

## Pre-Deployment

### 1. Database Setup
- [ ] Create production PostgreSQL database
- [ ] Update `DATABASE_URL` in environment variables
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Verify schema is correct: `npx prisma db pull`

### 2. Environment Variables
Ensure all required variables are set:
- [ ] `DATABASE_URL`
- [ ] `NEXTAUTH_SECRET` (unique, secure)
- [ ] `NEXTAUTH_URL` (production URL)
- [ ] `NEXT_PUBLIC_APP_URL` (production URL)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (live key)
- [ ] `STRIPE_SECRET_KEY` (live key)
- [ ] `STRIPE_WEBHOOK_SECRET` (from Stripe dashboard)

### 3. Stripe Configuration
- [ ] Switch to live mode in Stripe dashboard
- [ ] Create webhook endpoint for production
- [ ] Configure webhook events:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `transfer.created`
  - `account.updated`
- [ ] Test webhook locally with Stripe CLI (optional)

### 4. Security
- [ ] Generate new `NEXTAUTH_SECRET` for production
- [ ] Review API route authentication
- [ ] Ensure HTTPS is enforced
- [ ] Set up CORS if needed
- [ ] Review rate limiting (consider adding)

### 5. Build & Test
- [ ] Run `npm run build` locally
- [ ] Check for build errors
- [ ] Test critical paths:
  - User signup/login
  - Task creation
  - Offer submission
  - Payment flow
  - Message sending

## Deployment Platforms

### Vercel (Recommended)

1. **Connect Repository**
   - [ ] Push code to GitHub
   - [ ] Import project in Vercel
   - [ ] Connect GitHub repository

2. **Configure Build**
   - [ ] Build command: `npm run build`
   - [ ] Output directory: `.next`
   - [ ] Install command: `npm install`

3. **Environment Variables**
   - [ ] Add all environment variables in Vercel dashboard
   - [ ] Verify all are set correctly

4. **Deploy**
   - [ ] Deploy to production
   - [ ] Verify deployment URL
   - [ ] Test all critical features

5. **Post-Deployment**
   - [ ] Update Stripe webhook URL
   - [ ] Test webhook with Stripe CLI or dashboard
   - [ ] Verify database connection
   - [ ] Check logs for errors

### Alternative: Railway / Render

1. **Database**
   - [ ] Provision PostgreSQL database
   - [ ] Copy connection string

2. **App**
   - [ ] Connect GitHub repository
   - [ ] Set build command: `npm run build`
   - [ ] Set start command: `npm start`
   - [ ] Add environment variables

3. **Deploy**
   - [ ] Deploy application
   - [ ] Verify URL and functionality

## Post-Deployment Verification

### Functional Tests
- [ ] Landing page loads
- [ ] Sign up creates user
- [ ] Sign in works
- [ ] Dashboard displays correctly
- [ ] Task creation works
- [ ] Task listing works
- [ ] Offer submission works
- [ ] Payment flow works (test mode)
- [ ] Messages send/receive
- [ ] Profile updates work

### Performance Checks
- [ ] Page load times acceptable
- [ ] API response times reasonable
- [ ] Database queries optimized
- [ ] Images optimized (if applicable)

### Security Checks
- [ ] HTTPS enforced
- [ ] Authentication required for protected routes
- [ ] API routes validate user permissions
- [ ] Sensitive data not exposed in client
- [ ] Environment variables not exposed

### Monitoring Setup
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure logging
- [ ] Set up uptime monitoring
- [ ] Configure alerts for critical errors

## Rollback Plan

If deployment fails:
1. Revert to previous deployment in Vercel
2. Check logs for errors
3. Fix issues locally
4. Test fixes
5. Redeploy

## Ongoing Maintenance

### Regular Tasks
- [ ] Monitor error logs
- [ ] Review Stripe webhook logs
- [ ] Check database performance
- [ ] Update dependencies monthly
- [ ] Review security advisories

### Backup Strategy
- [ ] Set up automated database backups
- [ ] Configure backup retention policy
- [ ] Test restore procedure

### Scaling Considerations
- [ ] Monitor database connection pool
- [ ] Set up database read replicas if needed
- [ ] Configure CDN for static assets
- [ ] Consider Redis for caching (if needed)

## Support Contacts

- **Stripe Support**: https://support.stripe.com
- **Vercel Support**: https://vercel.com/support
- **Database Provider**: [Your provider's support]

## Notes

- Keep `.env` files out of version control
- Use environment-specific variables
- Test webhooks thoroughly before going live
- Monitor first few transactions closely
- Have rollback plan ready

