import Pusher from 'pusher'

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: process.env.PUSHER_CLUSTER || 'us2',
  useTLS: true,
})

export function triggerMessageEvent(taskId: string, message: any) {
  return pusherServer.trigger(`private-task-${taskId}`, 'new-message', message)
}

export function triggerTypingEvent(taskId: string, userId: string, isTyping: boolean) {
  return pusherServer.trigger(`private-task-${taskId}`, 'typing', {
    userId,
    isTyping,
  })
}

