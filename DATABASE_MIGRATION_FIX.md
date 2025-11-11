# Database Migration Fix

## Problem
The developers search API is returning a 500 error because the database schema is missing new fields that were added to the Prisma schema:
- `suspendedUntil` (DateTime?)
- `suspensionReason` (String?)
- `bannerUrl` (String?)
- `badgeTier` (BadgeTier enum)

## Solution

### Step 1: Stop the Development Server
Press `Ctrl+C` in the terminal where `npm run dev` is running.

### Step 2: Sync Database Schema
Run this command to push the schema changes to your database:

```bash
npx prisma db push
```

This will:
- Add the missing columns to your database
- Regenerate the Prisma client
- Update the database schema to match `prisma/schema.prisma`

### Step 3: Restart Development Server
```bash
npm run dev
```

## Alternative: Using Migrations (Production)

For production environments, use migrations instead:

```bash
npx prisma migrate dev --name add_user_suspension_and_badge_fields
```

Then deploy with:
```bash
npx prisma migrate deploy
```

## Verification

After running `prisma db push`, verify the changes:
1. The developers page should load without errors
2. Check the terminal - no more Prisma validation errors
3. The API endpoint `/api/v1/search/developers` should return 200 OK

