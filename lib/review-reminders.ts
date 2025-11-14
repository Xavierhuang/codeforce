import { prisma } from './prisma'
import { createNotification } from './notifications'

/**
 * Review Reminder System
 * Sends reminders to users to leave reviews for completed tasks
 */

const REMINDER_DELAY_DAYS = 3 // Send reminder 3 days after task completion
const MAX_REMINDERS = 2 // Maximum number of reminders per task

/**
 * Check and send review reminders for completed tasks
 */
export async function sendReviewReminders(): Promise<void> {
  try {
    const now = new Date()
    const reminderDate = new Date(now.getTime() - REMINDER_DELAY_DAYS * 24 * 60 * 60 * 1000)
    
    // Find completed tasks that are eligible for reminders
    const completedTasks = await prisma.task.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: {
          lte: reminderDate, // Completed at least REMINDER_DELAY_DAYS ago
          not: null,
        },
        workerId: {
          not: null,
        },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        worker: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })
    
    for (const task of completedTasks) {
      if (!task.workerId || !task.completedAt) continue
      
      // Check if reviews already exist
      const existingReviews = await prisma.review.findMany({
        where: {
          taskId: task.id,
        },
      })
      
      // Check if reminders have been sent
      const remindersSent = await prisma.notification.count({
        where: {
          taskId: task.id,
          type: 'review_reminder',
        },
      })
      
      // Skip if max reminders reached or reviews already exist
      if (remindersSent >= MAX_REMINDERS || existingReviews.length >= 2) {
        continue
      }
      
      // Check if client has reviewed worker
      const clientReviewedWorker = existingReviews.some(
        r => r.reviewerId === task.clientId && r.targetUserId === task.workerId
      )
      
      // Check if worker has reviewed client
      const workerReviewedClient = existingReviews.some(
        r => r.reviewerId === task.workerId && r.targetUserId === task.clientId
      )
      
      // Send reminder to client if they haven't reviewed
      if (!clientReviewedWorker) {
        await createNotification(
          task.clientId,
          'review_reminder',
          `Don't forget to review ${task.worker?.name || 'your worker'} for the completed task: "${task.title}"`,
          task.id
        )
      }
      
      // Send reminder to worker if they haven't reviewed
      if (!workerReviewedClient) {
        await createNotification(
          task.workerId,
          'review_reminder',
          `Don't forget to review ${task.client?.name || 'your client'} for the completed task: "${task.title}"`,
          task.id
        )
      }
    }
  } catch (error) {
    console.error('Error sending review reminders:', error)
    // Don't throw - reminders are non-critical
  }
}

/**
 * Schedule review reminders (to be called by a cron job or scheduled task)
 */
export async function scheduleReviewReminders(): Promise<void> {
  await sendReviewReminders()
}





