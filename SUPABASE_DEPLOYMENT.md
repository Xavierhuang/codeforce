# Supabase Deployment Guide

## Quick Answer: Yes, Supabase Works Automatically! ✅

Supabase is a **cloud database** that works from anywhere - your local machine, Vercel, Railway, or any server. You just need to configure the `DATABASE_URL` environment variable in your production deployment.

## Setup Steps

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up / Log in
3. Click "New Project"
4. Fill in:
   - **Project name**: `codeforce` (or any name)
   - **Database password**: Choose a strong password (save it!)
   - **Region**: Choose closest to you
5. Wait ~2 minutes for setup

### 2. Get Connection String

1. Go to: **Settings** → **Database**
2. Scroll to "Connection string"
3. Select "URI" tab
4. Copy the connection string (looks like):
   ```
   postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

### 3. Local Development

Add to your `.env` file:
```env
DATABASE_URL="postgresql://postgres.xxxxx:your_password@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
```

Then run:
```bash
npx prisma db push
```

### 4. Deploy to Vercel

1. **Push code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo>
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Configure project settings

3. **Add Environment Variables**
   - In Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
   - Add these variables:
   
   ```
   DATABASE_URL = postgresql://postgres.xxxxx:your_password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   NEXTAUTH_SECRET = [generate with: openssl rand -base64 32]
   NEXTAUTH_URL = https://yourdomain.vercel.app
   NEXT_PUBLIC_APP_URL = https://yourdomain.vercel.app
   STRIPE_SECRET_KEY = [your Stripe live key]
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = [your Stripe live key]
   STRIPE_WEBHOOK_SECRET = [from Stripe dashboard]
   ```

4. **Deploy!**
   - Click "Deploy"
   - Vercel will automatically build and deploy
   - Your app will connect to Supabase automatically!

## Production Database Setup

### Option 1: Same Database (Development)
- Use the same Supabase database for dev and prod
- ✅ Simple setup
- ⚠️ Dev and production share data

### Option 2: Separate Databases (Recommended)
- Create a **second Supabase project** for production
- Use different `DATABASE_URL` for production
- ✅ Separate data, safer
- ✅ Can test without affecting production

## Running Migrations in Production

After deployment, you can run migrations in two ways:

### Method 1: Via Vercel Build Command
Add to `package.json`:
```json
{
  "scripts": {
    "postbuild": "prisma migrate deploy"
  }
}
```

### Method 2: Manual Migration
```bash
# Connect to your production environment
# Set DATABASE_URL environment variable
npx prisma migrate deploy
```

## Supabase Features You Get

- ✅ **Free tier**: 500MB database, 2GB bandwidth
- ✅ **Automatic backups**: Daily backups
- ✅ **Connection pooling**: Built-in (use port 6543)
- ✅ **SSL**: Enabled by default
- ✅ **Real-time**: Can enable real-time subscriptions
- ✅ **Dashboard**: Web UI to view/manage data

## Troubleshooting

### Connection Issues
- Make sure you're using the **pooler connection** (port 6543) for better performance
- Check that your IP is allowed (Supabase allows all by default, but check if you have IP restrictions)

### Migration Issues
- Run `npx prisma generate` before deploying
- Make sure `DATABASE_URL` is set correctly in production

### Performance
- Supabase free tier is generous for MVP
- Upgrade to Pro ($25/month) if you need more resources

## Security Notes

- ✅ Supabase uses SSL by default
- ✅ Keep your database password secure
- ✅ Use environment variables (never commit `.env` to git)
- ✅ Consider using Supabase's connection pooling (port 6543) for better performance

## Summary

**Yes, Supabase works automatically when deployed!** Just:
1. Create Supabase project
2. Copy connection string
3. Add `DATABASE_URL` to Vercel environment variables
4. Deploy

That's it! Your production app will connect to Supabase just like your local development environment.

