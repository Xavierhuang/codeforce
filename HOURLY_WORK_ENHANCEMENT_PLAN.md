# Hourly Work Enhancement Plan
## Inspired by Fiverr's Hourly Work System

**Objective:** Enhance the existing hourly work system by filling gaps inspired by Fiverr's hourly work documentation, WITHOUT changing the current booking system.

**Current System Status:**
- ✅ Hourly rate on user profile (`hourlyRate` field)
- ✅ Clock in/out functionality (real-time tracking)
- ✅ Booking system with duration (`durationHours` in booking)
- ✅ Payment system with automatic capture
- ✅ Task completion workflow

**Gaps Identified (from Fiverr documentation):**
1. ❌ Weekly time reporting system (currently has real-time clock in/out)
2. ❌ Weekly hour limits
3. ❌ Weekly payment cycles
4. ❌ Time report submissions with descriptions/files
5. ❌ Mid-project feedback/reviews
6. ❌ Payment protection for hourly work
7. ❌ Weekly reporting deadline (Sunday 23:59 UTC)
8. ❌ Time estimation minimum (8 hours) in offers/bookings
9. ❌ Weekly report completion workflow
10. ❌ Automatic weekly payments based on reported hours

---

## Phase 1: Database Schema Enhancements

### 1.1 Add Weekly Hour Limit to Tasks
**Priority:** HIGH  
**Effort:** 1 day

**Schema Changes:**
```prisma
model Task {
  // ... existing fields ...
  weeklyHourLimit    Int?       // Optional weekly hour limit (in hours)
  estimatedTotalHours Int?      // Estimated total hours for project (minimum 8)
}
```

**Rationale:** Allows setting weekly limits and total project estimates, matching Fiverr's custom offer structure.

---

### 1.2 Create TimeReport Model
**Priority:** CRITICAL  
**Effort:** 2 days

**Schema Changes:**
```prisma
model TimeReport {
  id                String   @id @default(cuid())
  taskId            String
  task              Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  workerId          String
  worker            User     @relation(fields: [workerId], references: [id])
  weekStartDate     DateTime // Monday of the week (UTC)
  weekEndDate       DateTime // Sunday 23:59 UTC of the week
  hoursWorked       Float    // Hours worked (can include minutes as decimals, e.g., 2.5 = 2h 30m)
  briefDescription  String   // Brief description of work completed
  detailedDescription String? // Detailed description
  attachments       Attachment[] // Files attached to time report
  status            TimeReportStatus @default(PENDING) // PENDING, APPROVED, DISPUTED, REJECTED
  submittedAt       DateTime @default(now())
  approvedAt        DateTime?
  approvedBy        String?  // Buyer ID who approved
  paymentProcessed  Boolean  @default(false)
  paymentProcessedAt DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([taskId, weekStartDate]) // One report per task per week
  @@index([taskId])
  @@index([workerId])
  @@index([weekStartDate])
  @@index([status])
}

enum TimeReportStatus {
  PENDING    // Submitted, awaiting buyer approval
  APPROVED   // Buyer approved, ready for payment
  DISPUTED   // Buyer disputed the hours
  REJECTED   // Buyer rejected the hours
}
```

**Rationale:** Enables weekly time reporting with descriptions and file attachments, matching Fiverr's system.

---

### 1.3 Add Weekly Payment Cycle Tracking
**Priority:** HIGH  
**Effort:** 1 day

**Schema Changes:**
```prisma
model WeeklyPayment {
  id                String   @id @default(cuid())
  taskId            String
  task              Task     @relation(fields: [taskId], references: [id])
  timeReportId      String   @unique
  timeReport        TimeReport @relation(fields: [timeReportId], references: [id])
  weekStartDate     DateTime
  weekEndDate       DateTime
  hoursWorked       Float
  hourlyRate        Float
  baseAmount        Float    // hoursWorked * hourlyRate
  platformFee       Float
  stripeFee         Float
  totalAmount        Float    // Amount charged to buyer
  workerPayout      Float    // Amount paid to worker
  paymentIntentId   String?  // Stripe PaymentIntent ID
  transactionId     String?  // Link to Transaction record
  transaction       Transaction? @relation(fields: [transactionId], references: [id])
  status            WeeklyPaymentStatus @default(PENDING)
  processedAt       DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([taskId])
  @@index([weekStartDate])
  @@index([status])
}

enum WeeklyPaymentStatus {
  PENDING      // Time report approved, payment pending
  PROCESSING   // Payment being processed
  COMPLETED    // Payment completed
  FAILED       // Payment failed
}
```

**Rationale:** Tracks weekly payment cycles separately from task completion, enabling automatic weekly payments.

---

### 1.4 Add Mid-Project Review Support
**Priority:** MEDIUM  
**Effort:** 1 day

**Schema Changes:**
```prisma
model Review {
  // ... existing fields ...
  isMidProjectReview Boolean @default(false) // True if review during IN_PROGRESS task
  weeksWorked        Int?    // Number of weeks worked when review was submitted
  totalHoursWorked   Float?  // Total hours worked when review was submitted
}
```

**Rationale:** Enables reviews during in-progress hourly tasks (after 4 weeks + 10 hours), matching Fiverr's feedback system.

---

## Phase 2: Weekly Time Reporting System

### 2.1 Weekly Time Report Submission API
**Priority:** CRITICAL  
**Effort:** 3 days  
**Files:** `app/api/v1/tasks/[id]/time-reports/route.ts`

**Features:**
- POST endpoint to submit weekly time report
- Validates week deadline (Sunday 23:59 UTC)
- Validates weekly hour limit (if set)
- Requires brief description
- Optional detailed description
- File attachment support
- Prevents duplicate submissions for same week

**Request Body:**
```typescript
{
  weekStartDate: string, // ISO date string (Monday)
  hoursWorked: number,   // Can include decimals (2.5 = 2h 30m)
  briefDescription: string,
  detailedDescription?: string,
  attachmentIds?: string[] // Array of attachment IDs
}
```

**Validation Rules:**
- Must submit by Sunday 23:59 UTC
- Hours must be > 0
- Brief description required (min 10 chars)
- Cannot submit for future weeks
- Cannot submit for same week twice
- Must respect weekly hour limit if set

---

### 2.2 Time Report Approval/Rejection API
**Priority:** CRITICAL  
**Effort:** 2 days  
**Files:** `app/api/v1/time-reports/[id]/approve/route.ts`, `app/api/v1/time-reports/[id]/reject/route.ts`

**Features:**
- Buyer can approve/reject time reports
- Buyer can dispute hours (with reason)
- Automatic approval option (if buyer enabled)
- Notifications to worker on approval/rejection

**Approval Flow:**
1. Worker submits time report
2. Buyer receives notification
3. Buyer reviews and approves/rejects/disputes
4. If approved → triggers weekly payment
5. If rejected/disputed → worker can resubmit or escalate

---

### 2.3 Weekly Time Report UI Component
**Priority:** HIGH  
**Effort:** 3 days  
**Files:** `components/WeeklyTimeReport.tsx`, `components/TimeReportForm.tsx`

**Features:**
- Display current week's time tracking
- Show deadline countdown (Sunday 23:59 UTC)
- Form to submit hours with descriptions
- File upload for attachments
- Display previous week's reports
- Show approval status

**UI Elements:**
- Week selector (current week highlighted)
- Hours input (supports hours and minutes)
- Brief description textarea (required)
- Detailed description textarea (optional)
- File attachment upload
- Submit button (disabled after deadline)
- Previous reports list with status

---

### 2.4 Time Report Review UI (Buyer Side)
**Priority:** HIGH  
**Effort:** 2 days  
**Files:** `components/TimeReportReview.tsx`

**Features:**
- Display pending time reports
- Show hours worked, descriptions, attachments
- Approve/Reject/Dispute buttons
- Display weekly hour limit vs reported hours
- Show total hours worked on task

**UI Elements:**
- Time report card with details
- Hours breakdown
- Description preview/expand
- Attachment viewer
- Approve/Reject/Dispute actions
- Weekly limit indicator

---

## Phase 3: Weekly Payment System

### 3.1 Automatic Weekly Payment Processing
**Priority:** CRITICAL  
**Effort:** 4 days  
**Files:** `lib/weekly-payment-processor.ts`, `app/api/cron/weekly-payments/route.ts`

**Features:**
- Cron job runs weekly (Monday 00:00 UTC)
- Processes approved time reports from previous week
- Creates PaymentIntent for buyer
- Charges buyer for approved hours
- Updates worker wallet
- Creates Transaction record
- Sends payment notifications

**Processing Flow:**
1. Find all APPROVED time reports for previous week (Sunday 23:59 UTC deadline)
2. Group by task
3. Calculate payment amounts (hours × rate + fees)
4. Create PaymentIntent for each buyer
5. Charge buyer's card
6. Update worker wallet on success
7. Create Transaction and WeeklyPayment records
8. Send notifications

**Error Handling:**
- Payment failures → mark as FAILED, notify buyer
- Retry logic for transient failures
- Admin dashboard for failed payments

---

### 3.2 Weekly Payment History
**Priority:** MEDIUM  
**Effort:** 2 days  
**Files:** `app/api/v1/tasks/[id]/weekly-payments/route.ts`, `components/WeeklyPaymentHistory.tsx`

**Features:**
- View all weekly payments for a task
- Show payment status, amounts, dates
- Link to time reports
- Download receipts

---

## Phase 4: Enhanced Booking/Offer System

### 4.1 Add Weekly Hour Limit to Booking Flow
**Priority:** MEDIUM  
**Effort:** 2 days  
**Files:** `app/book/[slug]/page.tsx`, `app/api/v1/book/worker/route.ts`

**Features:**
- Optional weekly hour limit input in booking form
- Store in task metadata
- Display on task detail page
- Validate against reported hours

**UI Changes:**
- Add "Weekly Hour Limit" field (optional)
- Tooltip explaining purpose
- Show limit on task detail page

---

### 4.2 Add Time Estimation to Offers
**Priority:** MEDIUM  
**Effort:** 2 days  
**Files:** `app/api/v1/tasks/[id]/offers/route.ts`, `components/OfferForm.tsx`

**Features:**
- Require minimum 8 hours estimation for hourly offers
- Display estimation on offer card
- Validate estimation in API

**Validation:**
- If `hourly: true`, require `estimatedDurationMins >= 480` (8 hours)

---

## Phase 5: Mid-Project Reviews

### 5.1 Enable Reviews During In-Progress Tasks
**Priority:** MEDIUM  
**Effort:** 3 days  
**Files:** `app/api/v1/reviews/route.ts`, `components/ReviewForm.tsx`

**Features:**
- Allow reviews for IN_PROGRESS tasks
- Require minimum 4 weeks worked
- Require minimum 10 hours reported
- Mark as mid-project review
- Display differently from completion reviews

**Validation Rules:**
- Task status: IN_PROGRESS
- Weeks worked: >= 4
- Total hours reported: >= 10
- Only one mid-project review per task

---

### 5.2 Mid-Project Review UI
**Priority:** MEDIUM  
**Effort:** 2 days  
**Files:** `components/MidProjectReview.tsx`

**Features:**
- Show eligibility status
- Display weeks/hours worked
- Review form (same as completion review)
- Show mid-project badge

---

## Phase 6: Payment Protection

### 6.1 Hourly Payment Protection Policy
**Priority:** HIGH  
**Effort:** 3 days  
**Files:** `lib/payment-protection.ts`, `app/api/v1/disputes/hourly/route.ts`

**Features:**
- Protection if buyer payment fails
- Worker still gets paid for approved hours
- Dispute resolution process
- Admin review for disputed hours

**Protection Rules:**
- If buyer payment fails → platform covers worker payment
- Worker must have approved time report
- Admin can review and adjust
- Document in terms of service

---

### 6.2 Dispute Resolution System
**Priority:** HIGH  
**Effort:** 4 days  
**Files:** `app/api/v1/time-reports/[id]/dispute/route.ts`, `components/DisputeForm.tsx`

**Features:**
- Buyer can dispute hours with reason
- Worker can respond to dispute
- Admin can review and resolve
- Escalation process

---

## Phase 7: UI/UX Enhancements

### 7.1 Task Detail Page Enhancements
**Priority:** HIGH  
**Effort:** 3 days  
**Files:** `components/TaskDetail.tsx`

**Features:**
- Show weekly hour limit (if set)
- Display time estimation
- Show weekly time reports section
- Display weekly payment history
- Show mid-project review eligibility

**New Sections:**
- Weekly Time Reports tab
- Weekly Payments tab
- Mid-Project Review section

---

### 7.2 Dashboard Enhancements
**Priority:** MEDIUM  
**Effort:** 2 days  
**Files:** `app/dashboard/tasks/page.tsx`, `app/dashboard/orders/page.tsx`

**Features:**
- Show pending time report approvals
- Display weekly payment status
- Show time report submission deadlines
- Notifications for deadlines

---

## Phase 8: Notifications & Reminders

### 8.1 Weekly Time Report Reminders
**Priority:** MEDIUM  
**Effort:** 2 days  
**Files:** `lib/weekly-reminders.ts`, `app/api/cron/weekly-reminders/route.ts`

**Features:**
- Remind workers to submit hours (Friday reminder)
- Remind buyers to approve hours (Monday reminder)
- Deadline warnings (Sunday morning)

---

### 8.2 Payment Notifications
**Priority:** MEDIUM  
**Effort:** 1 day  
**Files:** `lib/notifications.ts`

**Features:**
- Notify worker when payment processed
- Notify buyer when charged
- Notify on payment failures

---

## Implementation Timeline

### Week 1-2: Database & Core APIs
- Phase 1: Database schema enhancements
- Phase 2.1: Weekly time report submission API
- Phase 2.2: Approval/rejection APIs

### Week 3-4: UI Components
- Phase 2.3: Weekly time report UI
- Phase 2.4: Time report review UI
- Phase 7.1: Task detail page enhancements

### Week 5-6: Payment System
- Phase 3.1: Automatic weekly payment processing
- Phase 3.2: Weekly payment history
- Phase 6.1: Payment protection

### Week 7-8: Enhanced Features
- Phase 4: Enhanced booking/offer system
- Phase 5: Mid-project reviews
- Phase 6.2: Dispute resolution

### Week 9-10: Polish & Notifications
- Phase 7.2: Dashboard enhancements
- Phase 8: Notifications & reminders
- Testing & bug fixes

---

## Key Design Decisions

1. **Dual Tracking System:** Keep existing clock in/out for real-time tracking, add weekly reporting for payment cycles
2. **Weekly Deadline:** Sunday 23:59 UTC (matches Fiverr)
3. **Minimum Hours:** 8 hours estimation for hourly offers (matches Fiverr)
4. **Payment Timing:** Weekly payments processed Monday after approval
5. **Approval Flow:** Manual approval by default, optional auto-approval
6. **Mid-Project Reviews:** Enabled after 4 weeks + 10 hours (matches Fiverr)

---

## Testing Requirements

1. **Unit Tests:**
   - Time report submission validation
   - Weekly payment calculation
   - Deadline enforcement
   - Hour limit validation

2. **Integration Tests:**
   - Weekly payment processing flow
   - Approval → payment workflow
   - Dispute resolution flow

3. **E2E Tests:**
   - Complete weekly cycle (submit → approve → pay)
   - Mid-project review flow
   - Dispute escalation

---

## Migration Strategy

1. **Backward Compatibility:**
   - Existing tasks continue with current system
   - New hourly tasks use weekly reporting
   - Gradual migration option

2. **Data Migration:**
   - Convert existing clock in/out data to time reports (if needed)
   - Set default weekly limits based on task duration

3. **Feature Flags:**
   - Enable weekly reporting per task type
   - Allow gradual rollout

---

## Success Metrics

1. **Adoption:**
   - % of hourly tasks using weekly reporting
   - Average time reports per task
   - Approval rate

2. **Payment:**
   - Weekly payment success rate
   - Average time to payment
   - Dispute rate

3. **User Satisfaction:**
   - Worker satisfaction with weekly reporting
   - Buyer satisfaction with approval process
   - Mid-project review usage

---

## Notes

- **DO NOT CHANGE:** Existing booking system, clock in/out functionality, task completion workflow
- **ADD ONLY:** Weekly reporting system, payment cycles, mid-project reviews
- **ENHANCE:** Existing offers to support weekly limits and time estimation
- **MAINTAIN:** Backward compatibility with existing tasks


