import { z } from 'zod'
import {
  emailSchema,
  passwordSchema,
  phoneSchema,
  urlSchema,
  titleSchema,
  descriptionSchema,
  bioSchema,
  commentSchema,
  messageSchema,
  latSchema,
  lngSchema,
  ratingSchema,
  priceSchema,
  durationSchema,
  roleSchema,
  taskStatusSchema,
  taskTypeSchema,
  serviceTypeSchema,
  idSchema,
} from './validation'

/**
 * Validation schemas for all API endpoints
 */

// ==================== AUTH SCHEMAS ====================

export const SignupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().max(100).optional().or(z.literal('')),
  phone: phoneSchema,
  role: roleSchema.optional().default('CLIENT'),
}).strict()

// ==================== TASK SCHEMAS ====================

export const TaskCreateSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  type: taskTypeSchema.optional().default('VIRTUAL'),
  category: z.string().min(1).max(100),
  subcategory: z.string().max(100).optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  lat: latSchema.optional().nullable(),
  lng: lngSchema.optional().nullable(),
  budget: priceSchema.optional().nullable(),
  estimatedDurationMins: durationSchema.optional().nullable(),
}).strict()

export const TaskUpdateSchema = z.object({
  title: titleSchema.optional(),
  description: descriptionSchema.optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  addressLat: latSchema.optional().nullable(),
  addressLng: lngSchema.optional().nullable(),
  estimatedDurationMins: durationSchema.optional().nullable(),
}).strict()

export const AdminTaskUpdateSchema = TaskUpdateSchema.extend({
  status: taskStatusSchema.optional(),
  price: priceSchema.optional().nullable(),
}).strict()

export const TaskQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  category: z.string().max(100).optional(),
  type: taskTypeSchema.optional(),
  myTasks: z.string().transform((val) => val === 'true').optional(),
  near: z.string().regex(/^-?\d+\.?\d*,-?\d+\.?\d*$/).optional(), // "lat,lng"
  radius: z.string().transform((val) => parseFloat(val)).pipe(z.number().positive()).optional(),
}).partial()

// ==================== REVIEW SCHEMAS ====================

export const ReviewCreateSchema = z.object({
  targetUserId: idSchema,
  taskId: idSchema,
  rating: ratingSchema,
  comment: commentSchema,
  serviceName: z.string().max(100).optional().nullable(),
}).strict()

export const ReviewQuerySchema = z.object({
  targetUserId: idSchema,
  taskId: idSchema.optional(),
  reviewerId: idSchema.optional(),
  page: z.string().transform((val) => parseInt(val)).pipe(z.number().int().positive()).optional().default('1'),
  limit: z.string().transform((val) => parseInt(val)).pipe(z.number().int().positive().max(100)).optional().default('20'),
}).refine((data) => data.targetUserId !== undefined, {
  message: 'targetUserId is required',
})

// ==================== OFFER SCHEMAS ====================

export const OfferCreateSchema = z.object({
  price: priceSchema,
  message: messageSchema.optional().nullable(),
  estimatedCompletionDate: z.string().datetime().optional().nullable(),
}).strict()

// ==================== USER PROFILE SCHEMAS ====================

export const UserProfileUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: bioSchema,
  phone: phoneSchema,
  website: urlSchema,
  linkedinUrl: urlSchema,
  githubUrl: urlSchema,
  avatarUrl: urlSchema,
  bannerUrl: urlSchema,
  locationLat: latSchema.optional().nullable(),
  locationLng: lngSchema.optional().nullable(),
  serviceRadiusMiles: z.number().int().min(0).max(1000).optional().nullable(),
  hourlyRate: priceSchema.optional().nullable(),
  serviceType: serviceTypeSchema.optional().nullable(),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/).optional().nullable(),
  availability: z.any().optional(), // JSON field
  skills: z.array(z.object({
    skill: z.string().min(1).max(100),
    level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
  })).optional(),
  yearsOfExperience: z.number().int().min(0).max(100).optional().nullable(),
  education: z.string().max(500).optional().nullable(),
  languages: z.string().max(500).optional().nullable(),
  certifications: z.string().max(1000).optional().nullable(),
  idDocumentUrl: urlSchema,
  idDocumentType: z.enum(['passport', 'drivers_license', 'national_id']).optional().nullable(),
}).strict()

// ==================== MESSAGE SCHEMAS ====================

export const MessageCreateSchema = z.object({
  content: messageSchema,
  taskId: idSchema,
}).strict()

// ==================== SUPPORT TICKET SCHEMAS ====================

export const SupportTicketCreateSchema = z.object({
  subject: z.string().min(1).max(200),
  description: descriptionSchema,
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  category: z.string().max(100).optional().nullable(),
}).strict()

export const SupportTicketReplySchema = z.object({
  message: messageSchema,
}).strict()

export const SupportTicketUpdateSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedTo: idSchema.optional().nullable(),
}).strict()

// ==================== VERIFICATION SCHEMAS ====================

export const VerificationRequestSchema = z.object({
  idDocumentUrl: urlSchema.refine((val) => val !== null && val !== undefined, {
    message: 'ID document URL is required',
  }),
  idDocumentType: z.enum(['passport', 'drivers_license', 'national_id']),
}).strict()

// ==================== BOOKING SCHEMAS ====================

export const BookWorkerSchema = z.object({
  workerId: idSchema,
  serviceName: z.string().min(1).max(100),
  scheduledAt: z.string().datetime(),
  address: z.string().max(500).optional().nullable(),
  addressLat: latSchema.optional().nullable(),
  addressLng: lngSchema.optional().nullable(),
  message: messageSchema.optional().nullable(),
}).strict()

// ==================== ROUTE PARAMETER SCHEMAS ====================

export const TaskIdParamSchema = z.object({
  id: idSchema,
})

export const ReviewIdParamSchema = z.object({
  id: idSchema,
})

export const FileIdParamSchema = z.object({
  fileId: z.string().regex(/^[a-z_]+:[a-f0-9-]+$/), // "type:uuid"
})

export const SlugParamSchema = z.object({
  slug: z.string().min(1).max(100),
})

export const ServiceNameParamSchema = z.object({
  serviceName: z.string().min(1).max(100),
})



