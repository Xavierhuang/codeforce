# Quick Deployment Reference

## One-Line Commands for Manual Deployment

Copy and paste these commands one at a time in PowerShell:

### Phase 1: Database (MUST BE FIRST)
```powershell
# 1. Upload schema
pscp -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" prisma/schema.prisma root@143.198.24.72:/var/www/codeforce/prisma/

# 2. Generate Prisma client & push schema
plink -ssh root@143.198.24.72 -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" "cd /var/www/codeforce && npx prisma generate && npx prisma db push"
```

### Phase 2: Libraries
```powershell
# Payment handlers
pscp -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" lib/payment-handlers.ts root@143.198.24.72:/var/www/codeforce/lib/

# Notifications (updated)
pscp -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" lib/notifications.ts root@143.198.24.72:/var/www/codeforce/lib/

# Weekly payment processor (NEW)
pscp -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" lib/weekly-payment-processor.ts root@143.198.24.72:/var/www/codeforce/lib/

# Payment protection (NEW)
pscp -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" lib/payment-protection.ts root@143.198.24.72:/var/www/codeforce/lib/
```

### Phase 3: API Routes
```powershell
# Booking API
pscp -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/api/v1/book/worker/route.ts root@143.198.24.72:/var/www/codeforce/app/api/v1/book/worker/

# File serving route
pscp -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/api/v1/files/[fileId]/route.ts root@143.198.24.72:/var/www/codeforce/app/api/v1/files/[fileId]/

# Offers API (updated)
pscp -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/api/v1/tasks/[id]/offers/route.ts root@143.198.24.72:/var/www/codeforce/app/api/v1/tasks/[id]/offers/

# Reviews API (updated)
pscp -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/api/v1/reviews/route.ts root@143.198.24.72:/var/www/codeforce/app/api/v1/reviews/

# Webhook handler (updated)
pscp -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/api/webhooks/stripe/route.ts root@143.198.24.72:/var/www/codeforce/app/api/webhooks/stripe/

# Create directories and upload assignment files API (NEW)
plink -ssh root@143.198.24.72 -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" "mkdir -p /var/www/codeforce/app/api/v1/tasks/[id]/assignment-files"
pscp -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/api/v1/tasks/[id]/assignment-files/route.ts root@143.198.24.72:/var/www/codeforce/app/api/v1/tasks/[id]/assignment-files/

# Create directories and upload time reports API (NEW)
plink -ssh root@143.198.24.72 -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" "mkdir -p /var/www/codeforce/app/api/v1/tasks/[id]/time-reports"
pscp -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/api/v1/tasks/[id]/time-reports/route.ts root@143.198.24.72:/var/www/codeforce/app/api/v1/tasks/[id]/time-reports/

# Create directories and upload time report approval/rejection/dispute APIs (NEW)
plink -ssh root@143.198.24.72 -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" "mkdir -p /var/www/codeforce/app/api/v1/time-reports/[id]/approve /var/www/codeforce/app/api/v1/time-reports/[id]/reject /var/www/codeforce/app/api/v1/time-reports/[id]/dispute"
pscp -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/api/v1/time-reports/[id]/approve/route.ts root@143.198.24.72:/var/www/codeforce/app/api/v1/time-reports/[id]/approve/
pscp -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/api/v1/time-reports/[id]/reject/route.ts root@143.198.24.72:/var/www/codeforce/app/api/v1/time-reports/[id]/reject/
pscp -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/api/v1/time-reports/[id]/dispute/route.ts root@143.198.24.72:/var/www/codeforce/app/api/v1/time-reports/[id]/dispute/

# Create directories and upload weekly payments API (NEW)
plink -ssh root@143.198.24.72 -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" "mkdir -p /var/www/codeforce/app/api/v1/tasks/[id]/weekly-payments"
pscp -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/api/v1/tasks/[id]/weekly-payments/route.ts root@143.198.24.72:/var/www/codeforce/app/api/v1/tasks/[id]/weekly-payments/

# Create directories and upload mid-project review eligibility API (NEW)
plink -ssh root@143.198.24.72 -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" "mkdir -p /var/www/codeforce/app/api/v1/tasks/[id]/mid-project-review-eligibility"
pscp -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/api/v1/tasks/[id]/mid-project-review-eligibility/route.ts root@143.198.24.72:/var/www/codeforce/app/api/v1/tasks/[id]/mid-project-review-eligibility/

# Create directories and upload dispute resolution APIs (NEW)
plink -ssh root@143.198.24.72 -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" "mkdir -p /var/www/codeforce/app/api/v1/disputes/time-reports/[id]/resolve"
pscp -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/api/v1/disputes/time-reports/route.ts root@143.198.24.72:/var/www/codeforce/app/api/v1/disputes/time-reports/
pscp -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/api/v1/disputes/time-reports/[id]/resolve/route.ts root@143.198.24.72:/var/www/codeforce/app/api/v1/disputes/time-reports/[id]/resolve/

# Create directories and upload cron endpoint (NEW)
plink -ssh root@143.198.24.72 -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" "mkdir -p /var/www/codeforce/app/api/cron/weekly-payments"
pscp -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/api/cron/weekly-payments/route.ts root@143.198.24.72:/var/www/codeforce/app/api/cron/weekly-payments/
```

### Phase 4: Components
```powershell
# File upload component (NEW)
pscp -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" components/TaskAssignmentFileUpload.tsx root@143.198.24.72:/var/www/codeforce/components/

# Weekly time report component (NEW)
pscp -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" components/WeeklyTimeReport.tsx root@143.198.24.72:/var/www/codeforce/components/

# Time report review component (NEW)
pscp -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" components/TimeReportReview.tsx root@143.198.24.72:/var/www/codeforce/components/

# Weekly payment history component (NEW)
pscp -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" components/WeeklyPaymentHistory.tsx root@143.198.24.72:/var/www/codeforce/components/

# Mid-project review component (NEW)
pscp -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" components/MidProjectReview.tsx root@143.198.24.72:/var/www/codeforce/components/

# Task detail component
pscp -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" components/TaskDetail.tsx root@143.198.24.72:/var/www/codeforce/components/

# Booking form page
pscp -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" app/book/[slug]/page.tsx root@143.198.24.72:/var/www/codeforce/app/book/[slug]/

# Wallet component
pscp -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" components/Wallet.tsx root@143.198.24.72:/var/www/codeforce/components/
```

### Phase 5: Build & Restart
```powershell
# Clean build
plink -ssh root@143.198.24.72 -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" "cd /var/www/codeforce && rm -rf .next && npm run build"

# Restart application
plink -ssh root@143.198.24.72 -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" "cd /var/www/codeforce && pm2 restart codeforce --update-env"

# Verify status
plink -ssh root@143.198.24.72 -pw Hhwj65377068Hhwj -hostkey "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4" "pm2 status && pm2 logs codeforce --lines 10 --nostream"
```

---

## Using the Automated Script

For automated deployment, run:

```powershell
.\deploy-incremental.ps1
```

Or with options:
```powershell
# Skip database migration (if already done)
.\deploy-incremental.ps1 -SkipDatabase

# Skip build (deploy files only)
.\deploy-incremental.ps1 -SkipBuild

# Skip both (just upload files)
.\deploy-incremental.ps1 -SkipDatabase -SkipBuild
```

---

## File Count Summary

**Total Files to Deploy: 10**
- **New Files**: 2 (assignment-files route, TaskAssignmentFileUpload component)
- **Updated Files**: 8 (schema, APIs, components)

**Deployment Order**: Database → Libraries → APIs → Components → Build

