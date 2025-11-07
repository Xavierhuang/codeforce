# Implementation Plan - Skilly.com Direct Booking Flow

## ✅ Already Working

1. **Search & Browse Specialists**
   - ✅ `/developers` page exists
   - ✅ Search API (`/api/v1/search/developers`)
   - ✅ Developer profile pages (`/developers/[slug]`)
   - ✅ Skills filtering
   - ✅ Location filtering

2. **Chat & Notifications**
   - ✅ Pusher chat with presence indicators
   - ✅ Typing indicators
   - ✅ Twilio SMS notifications
   - ✅ Notification system

3. **Payment & Task Creation**
   - ✅ Stripe integration
   - ✅ Webhook handler (auto-creates tasks)
   - ✅ Task creation API

4. **Worker Dashboard**
   - ✅ Task list (`/dashboard/tasks`)
   - ✅ Cancel task functionality

5. **Buyer Dashboard**
   - ✅ Orders list (`/dashboard/orders`)

---

## ❌ Needs to be Added/Updated

### 1. Database Schema Updates
- [ ] Add `hourlyRate` field to User model (for workers)
- [ ] Add `serviceType` field to User model (VIRTUAL, IN_PERSON, BOTH)

### 2. Developer Browse Page Updates
- [ ] Display hourly rate on developer cards
- [ ] Show "Remote" or "On-site" badges
- [ ] Show tasks completed count
- [ ] Link to booking page instead of profile

### 3. Task Booking Page (NEW)
**Route:** `/book/[workerSlug]` or `/book/worker/[workerId]`

**Step 1: Task Details**
- [ ] Remote/On-site toggle at top
- [ ] Conditional fields:
  - If Remote: Date/Time, Duration, Task Details
  - If On-site: Address fields + Date/Time + Duration + Task Details
- [ ] Right-side panel:
  - Worker profile image
  - Name, rating, tasks completed
  - Hourly rate
  - Live total cost calculation (hourly rate × hours)

**Step 2: Confirm & Pay**
- [ ] Review all entered details
- [ ] Price breakdown:
  - Hourly rate × duration = subtotal
  - Platform fee (15%)
  - Trust & Support fee (15%)
  - Total payable
- [ ] Edit button to go back
- [ ] Stripe payment integration
- [ ] On success:
  - Create task (auto-accepted)
  - Initialize chat
  - Send notifications

### 4. API Endpoints
- [ ] `POST /api/v1/book/worker/[workerId]` - Create booking (task + payment)
- [ ] Update worker profile API to include hourlyRate
- [ ] Update search API to include hourlyRate

### 5. Worker Profile Updates
- [ ] Display hourly rate prominently
- [ ] Show service type (Remote/On-site/Both)
- [ ] "Book Now" button (for buyers)

---

## 📋 Implementation Steps

### Phase 1: Database & API Updates
1. Update Prisma schema (add hourlyRate, serviceType)
2. Run migration
3. Update worker profile API
4. Update search API

### Phase 2: Developer Browse Page
1. Update developer cards to show hourly rate
2. Add service type badges
3. Update click action to go to booking page

### Phase 3: Booking Page
1. Create booking page component
2. Implement two-step form
3. Add right-side panel with worker info
4. Implement price calculation
5. Integrate Stripe payment

### Phase 4: Task Creation Flow
1. Update webhook handler for direct bookings
2. Ensure auto-accept logic works
3. Test chat initialization
4. Test notifications

---

## 🎯 Key Requirements

1. **Hourly Rate**: Workers set hourly rate in profile
2. **Service Type**: Workers specify Remote/On-site/Both
3. **Price Calculation**: hourlyRate × duration (in hours)
4. **Auto-Accept**: Tasks are automatically accepted on payment
5. **Chat Initiation**: Chat starts immediately after payment
6. **Notifications**: Worker gets notified (Pusher + SMS if offline)

