'use client'

import Pusher from 'pusher-js'

export function getPusherClient() {
  if (typeof window === 'undefined') {
    return null
  }

  if (!process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
    return null
  }

  return new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
    authEndpoint: '/api/pusher/auth',
    auth: {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  })
}

