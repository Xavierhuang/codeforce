import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { handleApiError, Errors } from '@/lib/errors'
import { validateBody, validateParams } from '@/lib/validation'
import { ReviewIdParamSchema } from '@/lib/validation-schemas'
import { z } from 'zod'

const HelpfulVoteSchema = z.object({
  helpful: z.boolean(),
}).strict()

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    
    // Validate route parameters
    const paramValidation = validateParams(params, ReviewIdParamSchema)
    if (!paramValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid review ID',
          details: paramValidation.errors.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      )
    }
    
    const reviewId = paramValidation.data.id
    
    // Validate request body
    const validation = await validateBody(req, HelpfulVoteSchema)
    if (!validation.success) {
      return validation.response
    }
    
    const { helpful } = validation.data
    
    // Fetch review
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    })
    
    if (!review) {
      throw Errors.notFound('Review')
    }
    
    // Only allow votes on approved reviews
    if (review.status !== 'APPROVED') {
      throw Errors.businessRule('You can only vote on approved reviews')
    }
    
    // Check if user already voted
    const existingVote = await prisma.reviewHelpfulVote.findUnique({
      where: {
        reviewId_userId: {
          reviewId,
          userId: user.id,
        },
      },
    })
    
    // Update or create vote and update helpful count
    const result = await prisma.$transaction(async (tx) => {
      let vote
      let helpfulCountChange = 0
      
      if (existingVote) {
        // Update existing vote
        if (existingVote.helpful !== helpful) {
          // Vote changed
          helpfulCountChange = helpful ? 2 : -2 // +1 for new, -1 for old
        } else {
          // Same vote - remove it
          await tx.reviewHelpfulVote.delete({
            where: {
              reviewId_userId: {
                reviewId,
                userId: user.id,
              },
            },
          })
          helpfulCountChange = helpful ? -1 : 0 // Only helpful votes count
        }
      } else {
        // Create new vote
        vote = await tx.reviewHelpfulVote.create({
          data: {
            reviewId,
            userId: user.id,
            helpful,
          },
        })
        helpfulCountChange = helpful ? 1 : 0 // Only helpful votes count
      }
      
      // Update helpful count
      if (helpfulCountChange !== 0) {
        await tx.review.update({
          where: { id: reviewId },
          data: {
            helpfulCount: {
              increment: helpfulCountChange,
            },
          },
        })
      }
      
      return vote || existingVote
    })
    
    // Fetch updated review
    const updatedReview = await prisma.review.findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        helpfulCount: true,
      },
    })
    
    return NextResponse.json({
      vote: result,
      helpfulCount: updatedReview?.helpfulCount || 0,
    })
  } catch (error: unknown) {
    return handleApiError(error, 'Failed to vote on review')
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    
    // Validate route parameters
    const paramValidation = validateParams(params, ReviewIdParamSchema)
    if (!paramValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid review ID',
          details: paramValidation.errors.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      )
    }
    
    const reviewId = paramValidation.data.id
    
    // Get user's vote if exists
    const vote = await prisma.reviewHelpfulVote.findUnique({
      where: {
        reviewId_userId: {
          reviewId,
          userId: user.id,
        },
      },
    })
    
    return NextResponse.json({
      voted: !!vote,
      helpful: vote?.helpful || null,
    })
  } catch (error: unknown) {
    return handleApiError(error, 'Failed to fetch vote status')
  }
}


