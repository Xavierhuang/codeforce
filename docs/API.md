# CodeForce Platform API Documentation

## Base URL
```
/api/v1
```

## Authentication

Most endpoints require authentication via NextAuth.js session cookies. Include credentials in requests.

### Authentication Endpoints

#### Sign Up
```http
POST /api/v1/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "phone": "+1234567890",  // Required for WORKER role
  "role": "CLIENT" | "WORKER"
}
```

**Rate Limit:** 5 requests per 15 minutes

**Response:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "CLIENT",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### Sign In
Authentication is handled via NextAuth.js at `/api/auth/signin`. Use NextAuth client methods.

---

## Tasks

### Create Task
```http
POST /api/v1/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Task Title",
  "description": "Task description",
  "category": "category_name",
  "subcategory": "subcategory_name",
  "type": "VIRTUAL" | "IN_PERSON",
  "price": 100.00,
  "estimatedDurationMins": 60,
  "address": "123 Main St",  // Required for IN_PERSON
  "addressLat": 40.7128,     // Required for IN_PERSON
  "addressLng": -74.0060,    // Required for IN_PERSON
  "scheduledAt": "2024-01-01T10:00:00Z"
}
```

**Rate Limit:** 10 requests per minute  
**Authorization:** CLIENT or ADMIN only

**Response:**
```json
{
  "id": "task_id",
  "title": "Task Title",
  "description": "Task description",
  "status": "OPEN",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Get Tasks
```http
GET /api/v1/tasks?status=OPEN&category=category&type=VIRTUAL&myTasks=true
```

**Query Parameters:**
- `status`: Filter by task status (OPEN, OFFERED, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED, DISPUTED)
- `category`: Filter by category
- `type`: Filter by service type (VIRTUAL, IN_PERSON)
- `myTasks`: If true, returns user's own tasks
- `near`: Location filter (lat,lng)
- `radius`: Radius in miles for location filter

**Rate Limit:** 100 requests per minute

**Response:**
```json
[
  {
    "id": "task_id",
    "title": "Task Title",
    "status": "OPEN",
    "client": {
      "id": "client_id",
      "name": "Client Name",
      "rating": 4.5,
      "ratingCount": 10
    },
    "offers": [],
    "_count": {
      "offers": 0,
      "messages": 0
    }
  }
]
```

### Get Task by ID
```http
GET /api/v1/tasks/{id}
Authorization: Bearer <token>
```

**Rate Limit:** 100 requests per minute  
**Authorization:** Task client, worker, admin, or user with offer

**Response:**
```json
{
  "id": "task_id",
  "title": "Task Title",
  "description": "Task description",
  "status": "OPEN",
  "client": { ... },
  "worker": { ... },
  "offers": [ ... ],
  "attachments": [ ... ]
}
```

### Update Task
```http
PUT /api/v1/tasks/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "description": "Updated description",
  "status": "IN_PROGRESS"
}
```

**Authorization:** Task client or ADMIN only

### Complete Task
```http
POST /api/v1/tasks/{id}/complete
Authorization: Bearer <token>
```

**Authorization:** Task worker only  
**Notification:** Sends notification to client

---

## Offers

### Submit Offer
```http
POST /api/v1/tasks/{id}/offers
Authorization: Bearer <token>
Content-Type: application/json

{
  "price": 150.00,
  "hourly": false,
  "message": "I can complete this task",
  "estimatedDurationMins": 90
}
```

**Rate Limit:** 20 requests per minute  
**Authorization:** WORKER only  
**Notification:** Sends notification to client

**Response:**
```json
{
  "id": "offer_id",
  "price": 150.00,
  "status": "PENDING",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Get Offers for Task
```http
GET /api/v1/tasks/{id}/offers
Authorization: Bearer <token>
```

**Authorization:** Task client or ADMIN only

**Response:**
```json
[
  {
    "id": "offer_id",
    "price": 150.00,
    "worker": {
      "id": "worker_id",
      "name": "Worker Name",
      "rating": 4.8,
      "skills": [ ... ]
    }
  }
]
```

### Accept Offer
```http
POST /api/v1/tasks/{id}/offers/{offerId}/accept
Authorization: Bearer <token>
```

**Authorization:** Task client only

---

## Reviews

### Create Review
```http
POST /api/v1/reviews
Authorization: Bearer <token>
Content-Type: application/json

{
  "targetUserId": "user_id",
  "taskId": "task_id",
  "rating": 5,
  "comment": "Great work!",
  "serviceName": "General Mounting"  // Optional
}
```

**Rate Limit:** 5 requests per hour  
**Authorization:** Authenticated user  
**Validation:** Task must be COMPLETED, user must have been involved

**Response:**
```json
{
  "id": "review_id",
  "rating": 5,
  "comment": "Great work!",
  "status": "PENDING",
  "reviewer": {
    "id": "reviewer_id",
    "name": "Reviewer Name"
  },
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Get Reviews
```http
GET /api/v1/reviews?targetUserId={user_id}&page=1&limit=10
Authorization: Bearer <token>
```

**Query Parameters:**
- `targetUserId`: Required - User ID to get reviews for
- `taskId`: Optional - Filter by task
- `reviewerId`: Optional - Filter by reviewer
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

**Response:**
```json
{
  "reviews": [
    {
      "id": "review_id",
      "rating": 5,
      "comment": "Great work!",
      "reviewer": { ... },
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

### Update Review
```http
PATCH /api/v1/reviews/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "rating": 4,
  "comment": "Updated comment"
}
```

**Authorization:** Reviewer only  
**Time Limit:** 24 hours from creation

### Delete Review
```http
DELETE /api/v1/reviews/{id}
Authorization: Bearer <token>
```

**Authorization:** Reviewer or ADMIN

### Report Review
```http
POST /api/v1/reviews/{id}/report
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "SPAM" | "INAPPROPRIATE" | "FAKE" | "OTHER",
  "description": "Additional details"
}
```

**Rate Limit:** Standard API limits  
**Authorization:** Authenticated user (cannot report own review)

### Reply to Review
```http
POST /api/v1/reviews/{id}/reply
Authorization: Bearer <token>
Content-Type: application/json

{
  "reply": "Thank you for your feedback!"
}
```

**Authorization:** Target user only  
**Time Limit:** 30 days from review creation, 7 days to edit reply

### Vote on Review Helpfulness
```http
POST /api/v1/reviews/{id}/helpful
Authorization: Bearer <token>
Content-Type: application/json

{
  "helpful": true
}
```

**Response:**
```json
{
  "vote": {
    "id": "vote_id",
    "helpful": true
  },
  "helpfulCount": 5
}
```

---

## File Uploads

### Upload File
```http
POST /api/v1/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <file>
type: "id_document" | "avatar" | "banner" | "attachment"
```

**Rate Limit:** 10 requests per hour  
**Authorization:** Authenticated user

**File Types:**
- `id_document`: JPEG, PNG, WebP, PDF (max 10MB)
- `avatar`: JPEG, PNG, WebP (max 5MB)
- `banner`: JPEG, PNG, WebP (max 10MB)
- `attachment`: JPEG, PNG, WebP, PDF (max 5MB)

**Response:**
```json
{
  "url": "/uploads/filename.jpg",
  "filename": "filename.jpg",
  "mimeType": "image/jpeg",
  "size": 1024000
}
```

---

## Support Tickets

### Create Support Ticket
```http
POST /api/v1/support
Authorization: Bearer <token>
Content-Type: application/json

{
  "category": "TECHNICAL" | "BILLING" | "ACCOUNT" | "OTHER",
  "subject": "Issue Subject",
  "description": "Detailed description",
  "attachments": ["url1", "url2"]
}
```

**Rate Limit:** 5 requests per hour  
**Authorization:** Authenticated user  
**Notification:** Sends notification to admins

**Response:**
```json
{
  "id": "ticket_id",
  "subject": "Issue Subject",
  "status": "OPEN",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Get Support Tickets
```http
GET /api/v1/support?status=OPEN
Authorization: Bearer <token>
```

**Query Parameters:**
- `status`: Filter by status (OPEN, IN_PROGRESS, RESOLVED, CLOSED)

**Response:**
```json
[
  {
    "id": "ticket_id",
    "subject": "Issue Subject",
    "status": "OPEN",
    "messages": [ ... ]
  }
]
```

### Reply to Support Ticket
```http
POST /api/v1/support/{id}/reply
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "Reply message"
}
```

**Notification:** Sends notification to other party (user or admins)

---

## Admin Endpoints

### Admin: Get All Users
```http
GET /api/v1/admin/users
Authorization: Bearer <token>
```

**Authorization:** ADMIN only  
**Rate Limit:** 200 requests per minute

### Admin: Suspend User
```http
POST /api/v1/admin/users/suspend
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user_id",
  "reason": "Violation of terms",
  "duration": "7"  // Days, or null for permanent
}
```

**Authorization:** ADMIN only  
**Notification:** Sends notification to suspended user

### Admin: Moderate Review
```http
PATCH /api/v1/admin/reviews/{id}/moderate
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "APPROVED" | "REJECTED" | "FLAGGED",
  "moderationReason": "Reason for moderation"
}
```

**Authorization:** ADMIN only

### Admin: Get Review Reports
```http
GET /api/v1/admin/reviews/reports?status=PENDING&page=1&limit=20
Authorization: Bearer <token>
```

**Query Parameters:**
- `status`: Filter by report status
- `reviewId`: Filter by review ID
- `reporterId`: Filter by reporter ID
- `page`: Page number
- `limit`: Items per page

### Admin: Update Review Report
```http
PATCH /api/v1/admin/reviews/reports/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "REVIEWED" | "RESOLVED" | "DISMISSED",
  "resolutionNotes": "Notes"
}
```

### Admin: Get Review Analytics
```http
GET /api/v1/admin/reviews/analytics?startDate=2024-01-01&endDate=2024-12-31&serviceName=General%20Mounting
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate`: ISO 8601 datetime
- `endDate`: ISO 8601 datetime
- `serviceName`: Filter by service name

**Response:**
```json
{
  "summary": {
    "totalReviews": 100,
    "averageRating": 4.5,
    "ratingDistribution": {
      "5": 60,
      "4": 25,
      "3": 10,
      "2": 3,
      "1": 2
    },
    "commentRate": 75.5,
    "replyRate": 30.2,
    "uniqueReviewers": 80,
    "uniqueTargets": 50
  },
  "byService": {
    "General Mounting": {
      "count": 30,
      "avgRating": 4.7
    }
  },
  "overTime": {
    "2024-01": { "count": 10, "avgRating": 4.5 },
    "2024-02": { "count": 15, "avgRating": 4.6 }
  }
}
```

### Admin: Get Support Tickets
```http
GET /api/v1/admin/support?status=OPEN&assignedTo=admin_id&page=1&limit=20
Authorization: Bearer <token>
```

**Authorization:** ADMIN only

### Admin: Update Support Ticket
```http
PATCH /api/v1/admin/support/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "IN_PROGRESS",
  "assignedTo": "admin_id",
  "priority": "HIGH"
}
```

**Notification:** Sends notification to user if status changed

### Admin: Get Admin Users
```http
GET /api/v1/admin/users/admins
Authorization: Bearer <token>
```

**Authorization:** ADMIN only

### Admin: Get Platform Settings
```http
GET /api/v1/admin/settings
Authorization: Bearer <token>
```

**Response:**
```json
{
  "platformFeeRate": 0.15,
  "platformName": "CodeForce",
  "supportEmail": "support@codeforce.com",
  "announcement": "Platform announcement"
}
```

### Admin: Update Platform Settings
```http
POST /api/v1/admin/settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "platformFeeRate": 0.15,
  "platformName": "CodeForce",
  "supportEmail": "support@codeforce.com",
  "announcement": "New announcement"
}
```

**Notification:** Sends announcement notification to all users if announcement is provided

---

## User Endpoints

### Get Current User
```http
GET /api/v1/users/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "User Name",
  "role": "CLIENT",
  "rating": 4.5,
  "ratingCount": 10
}
```

### Request Verification
```http
POST /api/v1/users/verify
Authorization: Bearer <token>
Content-Type: multipart/form-data

idDocument: <file>
```

**Authorization:** WORKER only  
**Notification:** Sends notification to admins

---

## Error Responses

All endpoints return standardized error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }  // Only in development
}
```

### Common Error Codes

- `AUTH_UNAUTHORIZED` (401): Authentication required
- `AUTH_FORBIDDEN` (403): Insufficient permissions
- `AUTH_INVALID_CREDENTIALS` (401): Invalid login credentials
- `VAL_VALIDATION_ERROR` (400): Request validation failed
- `RES_NOT_FOUND` (404): Resource not found
- `RES_ALREADY_EXISTS` (409): Resource already exists
- `RATE_LIMIT_EXCEEDED` (429): Rate limit exceeded
- `BIZ_RULE_VIOLATION` (400): Business rule violation
- `SRV_INTERNAL_ERROR` (500): Internal server error

### Rate Limit Error Response

```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

**Headers:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Unix timestamp when limit resets
- `Retry-After`: Seconds until retry allowed

---

## Rate Limiting

Rate limits are applied per endpoint type:

- **Auth endpoints**: 5 requests per 15 minutes
- **General API**: 100 requests per minute
- **Review creation**: 5 per hour
- **File uploads**: 10 per hour
- **Support tickets**: 5 per hour
- **Task creation**: 10 per minute
- **Offer submission**: 20 per minute
- **Admin endpoints**: 200 per minute

Rate limiting uses user ID when authenticated, IP address otherwise.

---

## Pagination

Endpoints that support pagination use query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

Response includes pagination metadata:
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

---

## Webhooks

### Stripe Webhooks
```http
POST /api/webhooks/stripe
Stripe-Signature: <signature>
```

Handles Stripe payment events. Verify signature using Stripe webhook secret.

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- All monetary values are in USD cents or as decimal numbers
- File uploads are stored locally (MVP) - consider S3 for production
- Rate limiting uses in-memory storage (MVP) - consider Redis for production
- Review status defaults to PENDING and requires admin approval
- Only APPROVED reviews count toward user ratings





