import Pusher from 'pusher'

// Only create Pusher server instance if credentials are configured
let pusherServerInstance: Pusher | null = null

function getPusherServer(): Pusher | null {
  // Check if Pusher credentials are configured
  const appId = process.env.PUSHER_APP_ID
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY
  const secret = process.env.PUSHER_SECRET
  const cluster = process.env.PUSHER_CLUSTER

  // Return null if any required credential is missing or empty
  if (!appId || !key || !secret || !cluster || 
      appId.trim() === '' || key.trim() === '' || secret.trim() === '' || cluster.trim() === '') {
    return null
  }

  // Return cached instance if it exists
  if (pusherServerInstance) {
    return pusherServerInstance
  }

  // Create new Pusher server instance
  try {
    pusherServerInstance = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    })
    return pusherServerInstance
  } catch (error) {
    console.warn('Failed to initialize Pusher server:', error)
    return null
  }
}

// Export a getter function instead of direct instance
export function getPusherServerInstance(): Pusher | null {
  return getPusherServer()
}

// For backward compatibility, export pusherServer as a getter object
export const pusherServer = {
  trigger: (channel: string, event: string, data: any) => {
    const server = getPusherServer()
    if (!server) {
      // Silently fail if Pusher is not configured
      return Promise.resolve()
    }
    return server.trigger(channel, event, data)
  },
  authorizeChannel: (socketId: string, channel: string, options?: any) => {
    const server = getPusherServer()
    if (!server) {
      // Return error response if Pusher is not configured
      throw new Error('Pusher is not configured')
    }
    return server.authorizeChannel(socketId, channel, options)
  },
}

export function triggerMessageEvent(taskId: string, message: any) {
  const server = getPusherServer()
  if (!server) {
    return Promise.resolve()
  }
  return server.trigger(`private-task-${taskId}`, 'new-message', message)
}

export function triggerTypingEvent(taskId: string, userId: string, isTyping: boolean) {
  const server = getPusherServer()
  if (!server) {
    return Promise.resolve()
  }
  return server.trigger(`private-task-${taskId}`, 'typing', {
    userId,
    isTyping,
  })
}

