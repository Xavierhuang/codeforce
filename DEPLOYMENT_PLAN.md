# Deployment Plan - File-by-File Deployment Guide

This document outlines the step-by-step deployment process for all changes made in this session. Files should be deployed in the specified order to ensure dependencies are met and the application remains functional.

## Prerequisites

1. **Backup Database**: Create a backup before deploying schema changes
2. **Test Environment**: Test changes in a staging environment first (if available)
3. **Maintenance Window**: Consider deploying during low-traffic periods
4. **Rollback Plan**: Keep previous versions of files for quick rollback if needed

---

## Phase 1: Database Schema Changes (CRITICAL - Deploy First)

**⚠️ IMPORTANT**: These files must be deployed first and the database must be migrated before deploying any other changes.

### Step 1.1: Deploy Schema File
```bash
# File: prisma/schema.prisma
# Action: Upload file to server
pscp -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" prisma/schema.prisma root@143.198.24.72:/var/www/codeforce/prisma/
```

### Step 1.2: Generate Prisma Client & Push Schema
```bash
# SSH into server and run:
plink -ssh root@143.198.24.72 -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" "cd /var/www/codeforce && npx prisma generate && npx prisma db push"
```

**Verification**: Check that Prisma client generated successfully and database schema updated without errors.

---

## Phase 2: Core Library Files (Deploy Before API Routes)

### Step 2.1: Payment Handlers (if not already deployed)
```bash
# File: lib/payment-handlers.ts
# Action: Upload file
pscp -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" lib/payment-handlers.ts root@143.198.24.72:/var/www/codeforce/lib/
```

**Dependencies**: None (but used by webhook handler)

### Step 2.2: Notifications Library (Updated)
```bash
# File: lib/notifications.ts
# Action: Upload updated file (added time report notification types)
pscp -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" lib/notifications.ts root@143.198.24.72:/var/www/codeforce/lib/
```

**Dependencies**: None

### Step 2.3: Payment Protection Library (NEW)
```bash
# File: lib/payment-protection.ts
# Action: Upload NEW file
pscp -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" lib/payment-protection.ts root@143.198.24.72:/var/www/codeforce/lib/
```

**Dependencies**: Database schema (Phase 1), Stripe integration

---

## Phase 3: API Routes (Deploy Before Components)

### Step 3.1: Booking API Route (Update for weeklyHourLimit)
```bash
# File: app/api/v1/book/worker/route.ts
# Action: Upload file
pscp -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/api/v1/book/worker/route.ts root@143.198.24.72:/var/www/codeforce/app/api/v1/book/worker/
```

**Dependencies**: Database schema (Phase 1)

### Step 3.2: File Serving Route (Update for assignment files)
```bash
# File: app/api/v1/files/[fileId]/route.ts
# Action: Upload file
pscp -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/api/v1/files/[fileId]/route.ts root@143.198.24.72:/var/www/codeforce/app/api/v1/files/[fileId]/
```

**Dependencies**: None (but used by file upload component)

### Step 3.3: Assignment Files API Route (NEW)
```bash
# File: app/api/v1/tasks/[id]/assignment-files/route.ts
# Action: Upload NEW file
pscp -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/api/v1/tasks/[id]/assignment-files/route.ts root@143.198.24.72:/var/www/codeforce/app/api/v1/tasks/[id]/assignment-files/
```

**Dependencies**: Database schema (Phase 1), File serving route (Step 3.2)

**Note**: Create directory if it doesn't exist:
```bash
plink -ssh root@143.198.24.72 -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" "mkdir -p /var/www/codeforce/app/api/v1/tasks/[id]/assignment-files"
```

### Step 3.4: Time Reports API Route (NEW)
```bash
# File: app/api/v1/tasks/[id]/time-reports/route.ts
# Action: Upload NEW file
pscp -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/api/v1/tasks/[id]/time-reports/route.ts root@143.198.24.72:/var/www/codeforce/app/api/v1/tasks/[id]/time-reports/
```

**Dependencies**: Database schema (Phase 1)

**Note**: Create directory if it doesn't exist:
```bash
plink -ssh root@143.198.24.72 -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" "mkdir -p /var/www/codeforce/app/api/v1/tasks/[id]/time-reports"
```

### Step 3.5: Time Report Approval/Rejection/Dispute Routes (NEW)
```bash
# File: app/api/v1/time-reports/[id]/approve/route.ts
pscp -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/api/v1/time-reports/[id]/approve/route.ts root@143.198.24.72:/var/www/codeforce/app/api/v1/time-reports/[id]/approve/

# File: app/api/v1/time-reports/[id]/reject/route.ts
pscp -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/api/v1/time-reports/[id]/reject/route.ts root@143.198.24.72:/var/www/codeforce/app/api/v1/time-reports/[id]/reject/

# File: app/api/v1/time-reports/[id]/dispute/route.ts
pscp -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/api/v1/time-reports/[id]/dispute/route.ts root@143.198.24.72:/var/www/codeforce/app/api/v1/time-reports/[id]/dispute/
```

**Dependencies**: Database schema (Phase 1), Time Reports API (Step 3.4)

**Note**: Create directories if they don't exist:
```bash
plink -ssh root@143.198.24.72 -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" "mkdir -p /var/www/codeforce/app/api/v1/time-reports/[id]/approve /var/www/codeforce/app/api/v1/time-reports/[id]/reject /var/www/codeforce/app/api/v1/time-reports/[id]/dispute"
```

### Step 3.6: Offers API Route (Updated)
```bash
# File: app/api/v1/tasks/[id]/offers/route.ts
# Action: Upload updated file (added 8-hour minimum validation)
pscp -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/api/v1/tasks/[id]/offers/route.ts root@143.198.24.72:/var/www/codeforce/app/api/v1/tasks/[id]/offers/
```

**Dependencies**: Database schema (Phase 1)

### Step 3.7: Weekly Payments API Route (NEW)
```bash
# File: app/api/v1/tasks/[id]/weekly-payments/route.ts
# Action: Upload NEW file
pscp -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/api/v1/tasks/[id]/weekly-payments/route.ts root@143.198.24.72:/var/www/codeforce/app/api/v1/tasks/[id]/weekly-payments/
```

**Dependencies**: Database schema (Phase 1)

**Note**: Create directory if it doesn't exist:
```bash
plink -ssh root@143.198.24.72 -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" "mkdir -p /var/www/codeforce/app/api/v1/tasks/[id]/weekly-payments"
```

### Step 3.8: Weekly Payment Processor Library (NEW)
```bash
# File: lib/weekly-payment-processor.ts
# Action: Upload NEW file
pscp -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" lib/weekly-payment-processor.ts root@143.198.24.72:/var/www/codeforce/lib/
```

**Dependencies**: Database schema (Phase 1), Stripe integration

### Step 3.9: Cron Job Endpoint (NEW)
```bash
# File: app/api/cron/weekly-payments/route.ts
# Action: Upload NEW file
pscp -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/api/cron/weekly-payments/route.ts root@143.198.24.72:/var/www/codeforce/app/api/cron/weekly-payments/
```

**Dependencies**: Weekly payment processor (Step 3.8)

**Note**: Create directory if it doesn't exist:
```bash
plink -ssh root@143.198.24.72 -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" "mkdir -p /var/www/codeforce/app/api/cron/weekly-payments"
```

**Important**: Set up external cron job to call this endpoint every Monday at 00:00 UTC with authorization header:
```
Authorization: Bearer <CRON_SECRET>
```

### Step 3.10: Mid-Project Review Eligibility API (NEW)
```bash
# File: app/api/v1/tasks/[id]/mid-project-review-eligibility/route.ts
# Action: Upload NEW file
pscp -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/api/v1/tasks/[id]/mid-project-review-eligibility/route.ts root@143.198.24.72:/var/www/codeforce/app/api/v1/tasks/[id]/mid-project-review-eligibility/
```

**Dependencies**: Database schema (Phase 1)

**Note**: Create directory if it doesn't exist:
```bash
plink -ssh root@143.198.24.72 -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" "mkdir -p /var/www/codeforce/app/api/v1/tasks/[id]/mid-project-review-eligibility"
```

### Step 3.11: Dispute Resolution APIs (NEW)
```bash
# File: app/api/v1/disputes/time-reports/route.ts
pscp -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/api/v1/disputes/time-reports/route.ts root@143.198.24.72:/var/www/codeforce/app/api/v1/disputes/time-reports/

# File: app/api/v1/disputes/time-reports/[id]/resolve/route.ts
pscp -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/api/v1/disputes/time-reports/[id]/resolve/route.ts root@143.198.24.72:/var/www/codeforce/app/api/v1/disputes/time-reports/[id]/resolve/
```

**Dependencies**: Database schema (Phase 1)

**Note**: Create directories if they don't exist:
```bash
plink -ssh root@143.198.24.72 -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" "mkdir -p /var/www/codeforce/app/api/v1/disputes/time-reports/[id]/resolve"
```

---

## Phase 4: Component Files (Deploy After API Routes)

### Step 4.1: Task Assignment File Upload Component (NEW)
```bash
# File: components/TaskAssignmentFileUpload.tsx
# Action: Upload NEW file
pscp -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" components/TaskAssignmentFileUpload.tsx root@143.198.24.72:/var/www/codeforce/components/
```

**Dependencies**: Assignment Files API (Step 3.3)

### Step 4.2: Task Detail Component (Updated)
```bash
# File: components/TaskDetail.tsx
# Action: Upload updated file
pscp -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" components/TaskDetail.tsx root@143.198.24.72:/var/www/codeforce/components/
```

**Dependencies**: TaskAssignmentFileUpload component (Step 4.1), Assignment Files API (Step 3.3)

### Step 4.3: Booking Form Page (Updated)
```bash
# File: app/book/[slug]/page.tsx
# Action: Upload updated file
pscp -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/book/[slug]/page.tsx root@143.198.24.72:/var/www/codeforce/app/book/[slug]/
```

**Dependencies**: Booking API route (Step 3.1)

### Step 4.4: Wallet Component (Updated)
```bash
# File: components/Wallet.tsx
# Action: Upload updated file
pscp -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" components/Wallet.tsx root@143.198.24.72:/var/www/codeforce/components/
```

**Dependencies**: None (uses existing APIs)

### Step 4.5: WeeklyTimeReport Component (NEW)
```bash
# File: components/WeeklyTimeReport.tsx
# Action: Upload NEW file
pscp -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" components/WeeklyTimeReport.tsx root@143.198.24.72:/var/www/codeforce/components/
```

**Dependencies**: Time Reports API (Step 3.4), TaskAssignmentFileUpload component (Step 4.1)

### Step 4.6: TimeReportReview Component (NEW)
```bash
# File: components/TimeReportReview.tsx
# Action: Upload NEW file
pscp -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" components/TimeReportReview.tsx root@143.198.24.72:/var/www/codeforce/components/
```

**Dependencies**: Time Reports API (Step 3.4), Approval/Rejection/Dispute APIs (Step 3.5)

### Step 4.7: WeeklyPaymentHistory Component (NEW)
```bash
# File: components/WeeklyPaymentHistory.tsx
# Action: Upload NEW file
pscp -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" components/WeeklyPaymentHistory.tsx root@143.198.24.72:/var/www/codeforce/components/
```

**Dependencies**: Weekly Payments API (Step 3.7)

### Step 4.8: MidProjectReview Component (NEW)
```bash
# File: components/MidProjectReview.tsx
# Action: Upload NEW file
pscp -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" components/MidProjectReview.tsx root@143.198.24.72:/var/www/codeforce/components/
```

**Dependencies**: Mid-Project Review Eligibility API (Step 3.10), Reviews API (updated)

---

## Phase 5: Build & Restart (Final Steps)

### Step 5.1: Clean Build
```bash
plink -ssh root@143.198.24.72 -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" "cd /var/www/codeforce && rm -rf .next && npm run build"
```

**Wait for build to complete** (may take 2-5 minutes)

### Step 5.2: Restart Application
```bash
plink -ssh root@143.198.24.72 -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" "cd /var/www/codeforce && pm2 restart codeforce --update-env"
```

### Step 5.3: Verify Deployment
```bash
# Check PM2 status
plink -ssh root@143.198.24.72 -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" "pm2 status"

# Check logs for errors
plink -ssh root@143.198.24.72 -pw <password> -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" "pm2 logs codeforce --lines 20 --nostream"
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] Backup database
- [ ] Backup current codebase
- [ ] Review all changes
- [ ] Test in local environment

### Phase 1: Database
- [ ] Deploy `prisma/schema.prisma`
- [ ] Run `npx prisma generate`
- [ ] Run `npx prisma db push`
- [ ] Verify schema changes applied

### Phase 2: Libraries
- [ ] Deploy `lib/payment-handlers.ts` (if updated)
- [ ] Deploy `lib/weekly-payment-processor.ts` (NEW)

### Phase 3: API Routes
- [ ] Deploy `app/api/v1/book/worker/route.ts`
- [ ] Deploy `app/api/v1/files/[fileId]/route.ts`
- [ ] Create directory for assignment-files route
- [ ] Deploy `app/api/v1/tasks/[id]/assignment-files/route.ts`
- [ ] Create directory for time-reports route
- [ ] Deploy `app/api/v1/tasks/[id]/time-reports/route.ts`
- [ ] Create directories for time report approval/rejection/dispute routes
- [ ] Deploy `app/api/v1/time-reports/[id]/approve/route.ts`
- [ ] Deploy `app/api/v1/time-reports/[id]/reject/route.ts`
- [ ] Deploy `app/api/v1/time-reports/[id]/dispute/route.ts`
- [ ] Deploy `app/api/v1/tasks/[id]/offers/route.ts` (updated)
- [ ] Deploy `lib/notifications.ts` (updated)
- [ ] Create directory for weekly-payments route
- [ ] Deploy `app/api/v1/tasks/[id]/weekly-payments/route.ts` (NEW)
- [ ] Deploy `lib/weekly-payment-processor.ts` (NEW)
- [ ] Deploy `lib/payment-protection.ts` (NEW)
- [ ] Create directory for cron endpoint
- [ ] Deploy `app/api/cron/weekly-payments/route.ts` (NEW)
- [ ] Create directory for mid-project-review-eligibility route
- [ ] Deploy `app/api/v1/tasks/[id]/mid-project-review-eligibility/route.ts` (NEW)
- [ ] Create directories for dispute resolution routes
- [ ] Deploy `app/api/v1/disputes/time-reports/route.ts` (NEW)
- [ ] Deploy `app/api/v1/disputes/time-reports/[id]/resolve/route.ts` (NEW)
- [ ] Deploy `app/api/v1/reviews/route.ts` (updated - mid-project review support)
- [ ] Deploy `app/api/webhooks/stripe/route.ts` (updated - payment protection)

### Phase 4: Components
- [ ] Deploy `components/TaskAssignmentFileUpload.tsx` (NEW)
- [ ] Deploy `components/WeeklyTimeReport.tsx` (NEW)
- [ ] Deploy `components/TimeReportReview.tsx` (NEW)
- [ ] Deploy `components/WeeklyPaymentHistory.tsx` (NEW)
- [ ] Deploy `components/MidProjectReview.tsx` (NEW)
- [ ] Deploy `components/TaskDetail.tsx`
- [ ] Deploy `app/book/[slug]/page.tsx`
- [ ] Deploy `components/Wallet.tsx`

### Phase 5: Build & Deploy
- [ ] Clean build (`rm -rf .next && npm run build`)
- [ ] Restart PM2 (`pm2 restart codeforce --update-env`)
- [ ] Verify application is running
- [ ] Check logs for errors
- [ ] Test key features:
  - [ ] Booking form with weekly hour limit
  - [ ] File upload in task assignment
  - [ ] Wallet page functionality
  - [ ] Task detail page improvements

---

## Rollback Plan

If issues occur, rollback in reverse order:

1. **Stop Application**: `pm2 stop codeforce`
2. **Restore Files**: Copy previous versions back
3. **Restore Database**: If schema changes caused issues, restore from backup
4. **Rebuild**: `rm -rf .next && npm run build`
5. **Restart**: `pm2 start codeforce --update-env`

---

## Quick Deployment Script

For faster deployment, you can use this PowerShell script (save as `deploy.ps1`):

```powershell
$password = "Hhwj65377068Hhwj"
$hostkey = "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4"
$server = "root@143.198.24.72"
$basePath = "/var/www/codeforce"

# Phase 1: Schema
Write-Host "Phase 1: Deploying schema..." -ForegroundColor Yellow
pscp -pw $password -hostkey $hostkey prisma/schema.prisma "${server}:${basePath}/prisma/"
plink -ssh $server -pw $password -hostkey $hostkey "cd ${basePath} && npx prisma generate && npx prisma db push"

# Phase 2: Libraries
Write-Host "Phase 2: Deploying libraries..." -ForegroundColor Yellow
pscp -pw $password -hostkey $hostkey lib/payment-handlers.ts "${server}:${basePath}/lib/"

# Phase 3: API Routes
Write-Host "Phase 3: Deploying API routes..." -ForegroundColor Yellow
pscp -pw $password -hostkey $hostkey app/api/v1/book/worker/route.ts "${server}:${basePath}/app/api/v1/book/worker/"
pscp -pw $password -hostkey $hostkey app/api/v1/files/[fileId]/route.ts "${server}:${basePath}/app/api/v1/files/[fileId]/"
plink -ssh $server -pw $password -hostkey $hostkey "mkdir -p ${basePath}/app/api/v1/tasks/[id]/assignment-files"
pscp -pw $password -hostkey $hostkey app/api/v1/tasks/[id]/assignment-files/route.ts "${server}:${basePath}/app/api/v1/tasks/[id]/assignment-files/"

# Phase 4: Components
Write-Host "Phase 4: Deploying components..." -ForegroundColor Yellow
pscp -pw $password -hostkey $hostkey components/TaskAssignmentFileUpload.tsx "${server}:${basePath}/components/"
pscp -pw $password -hostkey $hostkey components/TaskDetail.tsx "${server}:${basePath}/components/"
pscp -pw $password -hostkey $hostkey app/book/[slug]/page.tsx "${server}:${basePath}/app/book/[slug]/"
pscp -pw $password -hostkey $hostkey components/Wallet.tsx "${server}:${basePath}/components/"

# Phase 5: Build & Restart
Write-Host "Phase 5: Building and restarting..." -ForegroundColor Yellow
plink -ssh $server -pw $password -hostkey $hostkey "cd ${basePath} && rm -rf .next && npm run build"
plink -ssh $server -pw $password -hostkey $hostkey "cd ${basePath} && pm2 restart codeforce --update-env"

Write-Host "Deployment complete!" -ForegroundColor Green
```

---

## File List Summary

### New Files (19)
1. `app/api/v1/tasks/[id]/assignment-files/route.ts` - NEW
2. `app/api/v1/tasks/[id]/time-reports/route.ts` - NEW
3. `app/api/v1/time-reports/[id]/approve/route.ts` - NEW
4. `app/api/v1/time-reports/[id]/reject/route.ts` - NEW
5. `app/api/v1/time-reports/[id]/dispute/route.ts` - NEW
6. `app/api/v1/tasks/[id]/weekly-payments/route.ts` - NEW
7. `app/api/v1/tasks/[id]/mid-project-review-eligibility/route.ts` - NEW
8. `app/api/v1/disputes/time-reports/route.ts` - NEW
9. `app/api/v1/disputes/time-reports/[id]/resolve/route.ts` - NEW
10. `app/api/cron/weekly-payments/route.ts` - NEW
11. `lib/weekly-payment-processor.ts` - NEW
12. `lib/payment-protection.ts` - NEW
13. `components/TaskAssignmentFileUpload.tsx` - NEW
14. `components/WeeklyTimeReport.tsx` - NEW
15. `components/TimeReportReview.tsx` - NEW
16. `components/WeeklyPaymentHistory.tsx` - NEW
17. `components/MidProjectReview.tsx` - NEW
18. `DEPLOYMENT_PLAN.md` - NEW (this file)

### Updated Files (12)
1. `prisma/schema.prisma` - Added TimeReport, WeeklyPayment models and hourly work fields
2. `app/api/v1/book/worker/route.ts` - Added weeklyHourLimit support
3. `app/api/v1/files/[fileId]/route.ts` - Added assignment file type support
4. `app/api/v1/tasks/[id]/offers/route.ts` - Added 8-hour minimum validation for hourly offers
5. `app/api/v1/reviews/route.ts` - Added mid-project review support (IN_PROGRESS tasks)
6. `app/api/v1/time-reports/[id]/dispute/route.ts` - Added admin notification
7. `app/api/webhooks/stripe/route.ts` - Added payment protection handling
8. `lib/payment-handlers.ts` - Added weeklyHourLimit to task creation
9. `lib/notifications.ts` - Added time report notification types
10. `lib/weekly-payment-processor.ts` - Updated to include weeklyPaymentId in metadata
11. `app/book/[slug]/page.tsx` - Complete UI/UX redesign
12. `components/TaskDetail.tsx` - UI improvements + file upload integration
13. `components/Wallet.tsx` - Complete redesign with dashboard

---

## Testing After Deployment

### Critical Tests
1. **Booking Flow**: Create a new booking with weekly hour limit
2. **File Upload**: Upload files when starting work on a task
3. **File Display**: Verify files appear correctly for both worker and client
4. **Wallet**: Test payout request flow and view all tabs
5. **Task Detail**: Verify all UI improvements render correctly

### Database Verification
```sql
-- Check new models exist
SELECT * FROM "TimeReport" LIMIT 1;
SELECT * FROM "WeeklyPayment" LIMIT 1;

-- Check new fields exist
SELECT "weeklyHourLimit", "estimatedTotalHours" FROM "Task" LIMIT 1;
SELECT "isMidProjectReview", "weeksWorked", "totalHoursWorked" FROM "Review" LIMIT 1;
```

---

## Notes

- **File Upload Directory**: Ensure `/var/www/codeforce/uploads/assignment` directory exists and has proper permissions
- **Environment Variables**: No new environment variables required
- **Breaking Changes**: None - all changes are backward compatible
- **Migration Time**: Database migration should take < 30 seconds
- **Build Time**: Full build typically takes 2-5 minutes
- **Downtime**: Minimal (only during PM2 restart, ~5-10 seconds)

---

## Support

If deployment fails:
1. Check PM2 logs: `pm2 logs codeforce --lines 50`
2. Check build errors: Review build output
3. Verify file permissions: `ls -la /var/www/codeforce`
4. Check database connection: Verify DATABASE_URL in .env
5. Rollback if necessary using rollback plan above

