'use client'

import Pusher from 'pusher-js'

let pusherInstance: Pusher | null = null

export function getPusherClient(): Pusher | null {
  if (typeof window === 'undefined') {
    return null
  }

  // Check if Pusher credentials are configured
  const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY
  const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER

  // Return null if credentials are missing or empty
  if (!pusherKey || !pusherCluster || pusherKey.trim() === '' || pusherCluster.trim() === '') {
    return null
  }

  // Return cached instance if it exists
  if (pusherInstance) {
    return pusherInstance
  }

  // Create new Pusher instance with error handling
  try {
    pusherInstance = new Pusher(pusherKey, {
      cluster: pusherCluster,
      authEndpoint: '/api/pusher/auth',
      // Don't override Content-Type - let Pusher-js use its default form-encoded format
      enabledTransports: ['ws', 'wss'],
      disabledTransports: [],
    })

    // Handle connection errors silently
    pusherInstance.connection.bind('error', (err: any) => {
      // Only log if credentials are actually configured (shouldn't happen)
      if (pusherKey && pusherCluster) {
        console.warn('Pusher connection error:', err)
      }
    })

    return pusherInstance
  } catch (error) {
    console.warn('Failed to initialize Pusher:', error)
    return null
  }
}

