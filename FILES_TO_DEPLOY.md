# Files to Deploy - Complete List

## Deployment Order (Critical - Follow Exactly)

### ✅ Phase 1: Database Schema (MUST BE FIRST)
**Order**: 1  
**File**: `prisma/schema.prisma`  
**Type**: Updated  
**Action**: Upload → Generate Prisma Client → Push to Database  
**Critical**: Yes - All other files depend on this

---

### ✅ Phase 2: Library Files
**Order**: 2  
**File**: `lib/payment-handlers.ts`  
**Type**: Updated  
**Action**: Upload only  
**Dependencies**: Phase 1 (database schema)

---

### ✅ Phase 3: API Routes
**Order**: 3.1  
**File**: `app/api/v1/book/worker/route.ts`  
**Type**: Updated  
**Action**: Upload only  
**Dependencies**: Phase 1

**Order**: 3.2  
**File**: `app/api/v1/files/[fileId]/route.ts`  
**Type**: Updated  
**Action**: Upload only  
**Dependencies**: None

**Order**: 3.3  
**File**: `app/api/v1/tasks/[id]/assignment-files/route.ts`  
**Type**: NEW  
**Action**: Create directory → Upload file  
**Dependencies**: Phase 1, Step 3.2

---

### ✅ Phase 4: Component Files
**Order**: 4.1  
**File**: `components/TaskAssignmentFileUpload.tsx`  
**Type**: NEW  
**Action**: Upload only  
**Dependencies**: Step 3.3

**Order**: 4.2  
**File**: `components/TaskDetail.tsx`  
**Type**: Updated  
**Action**: Upload only  
**Dependencies**: Step 4.1, Step 3.3

**Order**: 4.3  
**File**: `app/book/[slug]/page.tsx`  
**Type**: Updated  
**Action**: Upload only  
**Dependencies**: Step 3.1

**Order**: 4.4  
**File**: `components/Wallet.tsx`  
**Type**: Updated  
**Action**: Upload only  
**Dependencies**: None

---

### ✅ Phase 5: Build & Restart
**Order**: 5.1  
**Action**: Clean build (`rm -rf .next && npm run build`)  
**Dependencies**: All previous phases

**Order**: 5.2  
**Action**: Restart PM2 (`pm2 restart codeforce --update-env`)  
**Dependencies**: Step 5.1

---

## Quick File List (Copy-Paste Ready)

```
prisma/schema.prisma
lib/payment-handlers.ts
lib/notifications.ts (UPDATED)
app/api/v1/book/worker/route.ts
app/api/v1/files/[fileId]/route.ts
app/api/v1/tasks/[id]/assignment-files/route.ts (NEW)
app/api/v1/tasks/[id]/time-reports/route.ts (NEW)
app/api/v1/time-reports/[id]/approve/route.ts (NEW)
app/api/v1/time-reports/[id]/reject/route.ts (NEW)
app/api/v1/time-reports/[id]/dispute/route.ts (NEW)
app/api/v1/tasks/[id]/offers/route.ts (UPDATED)
components/TaskAssignmentFileUpload.tsx (NEW)
components/TaskDetail.tsx
app/book/[slug]/page.tsx
components/Wallet.tsx
```

---

## Verification Commands

After deployment, verify with:

```bash
# Check PM2 status
pm2 status

# Check recent logs
pm2 logs codeforce --lines 20 --nostream

# Verify build exists
test -f .next/BUILD_ID && echo "Build OK" || echo "Build missing"

# Check database schema
npx prisma db pull --print
```

---

## Rollback Files

If you need to rollback, these are the files that were changed:
- All files listed above
- Keep backups of original versions before deploying

