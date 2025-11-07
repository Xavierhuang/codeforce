# Production Configuration Checklist

## ✅ Fixed Issues

1. **Database** - PostgreSQL installed and schema deployed
2. **NEXTAUTH_URL** - Updated from `http://localhost:3000` to `https://skillyy.com`
3. **NEXT_PUBLIC_APP_URL** - Updated from `http://localhost:3000` to `https://skillyy.com`
4. **next.config.js** - Updated default URL and added skillyy.com to image domains
5. **lib/twilio.ts** - Fixed typo: `skilly.com` → `skillyy.com`

## ⚠️ Issues Found & Status

### Critical Issues

1. **STRIPE_WEBHOOK_SECRET is empty**
   - **Impact**: Stripe webhooks won't work
   - **Fix**: Set webhook secret from Stripe Dashboard
   - **Status**: ⚠️ NEEDS ATTENTION

2. **ADMIN_EMAIL and ADMIN_PASSWORD formatting**
   - **Current**: `ADMIN_EMAIL= admin@gmail.com` (has space)
   - **Should be**: `ADMIN_EMAIL="admin@gmail.com"`
   - **Status**: ⚠️ NEEDS FIXING

### Non-Critical Issues

3. **REDIS_URL points to localhost**
   - **Impact**: Redis not used in codebase, so this is fine
   - **Status**: ✅ OK (not used)

4. **Admin page causing loading issues**
   - **Impact**: Admin page component executes on all pages
   - **Status**: 🔄 FIXING

## 📋 Complete Environment Variable Checklist

### Required for Production:
- ✅ `DATABASE_URL` - Set to localhost (correct for same server)
- ✅ `NEXTAUTH_URL` - Set to `https://skillyy.com`
- ✅ `NEXTAUTH_SECRET` - Set
- ✅ `NEXT_PUBLIC_APP_URL` - Set to `https://skillyy.com`
- ✅ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Live key set
- ✅ `STRIPE_SECRET_KEY` - Live key set
- ⚠️ `STRIPE_WEBHOOK_SECRET` - **EMPTY - NEEDS TO BE SET**

### Optional (but configured):
- ✅ `TWILIO_ACCOUNT_SID` - Set
- ✅ `TWILIO_AUTH_TOKEN` - Set
- ✅ `TWILIO_PHONE_NUMBER` - Set
- ⚠️ `ADMIN_EMAIL` - Has formatting issue
- ⚠️ `ADMIN_PASSWORD` - Has formatting issue

## 🔍 What to Check Next

1. **Stripe Webhook Setup**:
   - Go to Stripe Dashboard → Webhooks
   - Add endpoint: `https://skillyy.com/api/webhooks/stripe`
   - Copy webhook signing secret
   - Add to `.env` as `STRIPE_WEBHOOK_SECRET`

2. **Admin Credentials Format**:
   - Fix spacing in `.env` file
   - Ensure proper quoting

3. **Test Production URLs**:
   - Verify all API calls use relative paths (they do ✅)
   - Check OAuth redirect URLs if using Google/GitHub
   - Verify Stripe Connect redirect URLs

4. **Admin Page Loading Issue**:
   - Component still executing on non-admin pages
   - Need to prevent component from loading at all unless on /admin

