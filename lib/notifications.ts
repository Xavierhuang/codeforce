import { prisma } from './prisma'
import { pusherServer } from './pusher'
import { sendPushNotificationToUser } from './pusher-beams'

/**
 * Notification helper functions
 */

export type NotificationType =
  | 'task_created'
  | 'task_completed'
  | 'offer_submitted'
  | 'offer_accepted'
  | 'message_received'
  | 'support_ticket_created'
  | 'support_ticket_replied'
  | 'support_ticket_status_changed'
  | 'verification_requested'
  | 'verification_approved'
  | 'verification_rejected'
  | 'account_suspended'
  | 'platform_announcement'
  | 'review_received'
  | 'review_reminder'
  | 'payment_received'
  | 'payout_processed'
  | 'time_report_submitted'
  | 'time_report_approved'
  | 'time_report_rejected'
  | 'time_report_disputed'

/**
 * Get notification title based on type
 */
function getNotificationTitle(type: NotificationType): string {
  const titles: Record<NotificationType, string> = {
    task_created: 'New Task',
    task_completed: 'Task Completed',
    offer_submitted: 'New Offer',
    offer_accepted: 'Offer Accepted',
    message_received: 'New Message',
    support_ticket_created: 'Support Ticket',
    support_ticket_replied: 'Support Reply',
    support_ticket_status_changed: 'Ticket Updated',
    verification_requested: 'Verification Request',
    verification_approved: 'Verification Approved',
    verification_rejected: 'Verification Rejected',
    account_suspended: 'Account Suspended',
    platform_announcement: 'Platform Announcement',
    review_received: 'New Review',
    review_reminder: 'Review Reminder',
    payment_received: 'Payment Received',
    payout_processed: 'Payout Processed',
    time_report_submitted: 'Time Report Submitted',
    time_report_approved: 'Time Report Approved',
    time_report_rejected: 'Time Report Rejected',
    time_report_disputed: 'Time Report Disputed',
  }
  return titles[type] || 'Notification'
}

/**
 * Create a notification for a user
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  message: string,
  taskId?: string
): Promise<void> {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        message,
        taskId,
      },
    })

    // Trigger Pusher event for real-time notification
    try {
      await pusherServer.trigger(`private-user-${userId}`, 'notification', {
        type,
        message,
        taskId,
        id: notification.id,
        createdAt: notification.createdAt.toISOString(),
      })
    } catch (pusherError) {
      console.error(`Failed to trigger Pusher event for user ${userId}:`, pusherError)
      // Don't throw - Pusher failures shouldn't break notification creation
    }

    // Send push notification via Pusher Beams
    try {
      const deepLink = taskId 
        ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://skillyy.com'}/tasks/${taskId}`
        : undefined
      
      await sendPushNotificationToUser(
        userId,
        getNotificationTitle(type),
        message,
        deepLink
      )
    } catch (beamsError) {
      console.error(`Failed to send push notification for user ${userId}:`, beamsError)
      // Don't throw - push notifications are optional
    }
  } catch (error) {
    console.error(`Failed to create notification for user ${userId}:`, error)
    // Don't throw - notifications are non-critical
  }
}

/**
 * Create notifications for multiple users
 */
export async function createNotifications(
  userIds: string[],
  type: NotificationType,
  message: string,
  taskId?: string
): Promise<void> {
  try {
    // Create notifications in database
    await Promise.all(
      userIds.map((userId) =>
        prisma.notification.create({
          data: {
            userId,
            type,
            message,
            taskId,
          },
        })
      )
    )

    // Trigger Pusher events for real-time notifications
    try {
      await Promise.all(
        userIds.map((userId) =>
          pusherServer.trigger(`private-user-${userId}`, 'notification', {
            type,
            message,
            taskId,
            createdAt: new Date().toISOString(),
          }).catch((err) => {
            console.error(`Failed to trigger Pusher event for user ${userId}:`, err)
          })
        )
      )
    } catch (pusherError) {
      console.error('Failed to trigger Pusher events for notifications:', pusherError)
      // Don't throw - Pusher failures shouldn't break notification creation
    }

    // Send push notifications via Pusher Beams
    try {
      const { sendPushNotificationToUsers } = await import('./pusher-beams')
      const deepLink = taskId 
        ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://skillyy.com'}/tasks/${taskId}`
        : undefined
      
      await sendPushNotificationToUsers(
        userIds,
        getNotificationTitle(type),
        message,
        deepLink
      )
    } catch (beamsError) {
      console.error('Failed to send push notifications:', beamsError)
      // Don't throw - push notifications are optional
    }
  } catch (error) {
    console.error('Failed to create notifications:', error)
    // Don't throw - notifications are non-critical
  }
}

/**
 * Notify admins about an event
 */
export async function notifyAdmins(
  type: NotificationType,
  message: string,
  taskId?: string
): Promise<void> {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    })

    await createNotifications(
      admins.map((admin) => admin.id),
      type,
      message,
      taskId
    )
  } catch (error) {
    console.error('Failed to notify admins:', error)
    // Don't throw - notifications are non-critical
  }
}

/**
 * Check if user is offline and send SMS notification if needed
 * This is a placeholder - implement actual SMS sending logic if needed
 */
export async function checkAndSendOfflineNotification(
  userId: string,
  userName: string,
  phone: string | null,
  message: string,
  taskId?: string
): Promise<void> {
  try {
    // Check if user has phone number
    if (!phone) {
      return
    }

    // TODO: Implement actual offline check and SMS sending
    // For now, just create a notification
    await createNotification(
      userId,
      'platform_announcement',
      message,
      taskId
    )
  } catch (error) {
    console.error(`Failed to send offline notification to user ${userId}:`, error)
    // Don't throw - notifications are non-critical
  }
}
