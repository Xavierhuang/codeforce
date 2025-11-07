import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher'
import { sendOfflineNotification } from '@/lib/twilio'

export async function createNotification(
  userId: string,
  type: string,
  message: string,
  taskId?: string
) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      message,
      taskId,
    },
  })

  // Emit Pusher event for real-time notification
  try {
    await pusherServer.trigger(`user-${userId}`, 'notification', notification)
  } catch (error) {
    console.error('Failed to emit Pusher notification:', error)
  }

  return notification
}

export async function checkAndSendOfflineNotification(
  userId: string,
  username: string,
  phone: string | null | undefined,
  message: string,
  taskId: string
) {
  if (!phone) return false

  // Check if user is online via Pusher presence
  // For now, we'll send SMS if phone exists (presence check can be added later)
  // In production, check Pusher presence channel first
  
  try {
    await sendOfflineNotification(phone, username, message, taskId)
    return true
  } catch (error) {
    console.error('Failed to send offline notification:', error)
    return false
  }
}


