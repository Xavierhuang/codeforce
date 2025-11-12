'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'

/**
 * Pusher Push Notifications (Beams) initialization
 * Registers the browser device and subscribes to notification interests
 * Follows Pusher Beams setup guide: https://pusher.com/docs/beams/getting-started/web/sdk-integration/
 */
export function PusherBeams() {
  const { data: session } = useSession()
  const initializedRef = useRef(false)
  const beamsClientRef = useRef<any>(null)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    // Only initialize once
    if (initializedRef.current) return

    // Check if Pusher Beams instance ID is configured
    const instanceId = process.env.NEXT_PUBLIC_PUSHER_BEAMS_INSTANCE_ID
    if (!instanceId) {
      // Silently fail if not configured
      return
    }

    // Wait for SDK to load from script tag
    const initBeams = () => {
      // Check if PusherPushNotifications is available (loaded via script tag)
      if (typeof window === 'undefined' || !(window as any).PusherPushNotifications) {
        // Retry after a short delay if SDK hasn't loaded yet
        setTimeout(initBeams, 100)
        return
      }

      const PusherPushNotifications = (window as any).PusherPushNotifications

      try {
        const beamsClient = new PusherPushNotifications.Client({
          instanceId: instanceId,
        })

        beamsClientRef.current = beamsClient

        // Start and subscribe to 'hello' interest (as per Pusher guide)
        beamsClient
          .start()
          .then(() => beamsClient.addDeviceInterest('hello'))
          .then(() => {
            initializedRef.current = true
          })
          .catch((error: any) => {
            // Log all errors for debugging (user can see permission prompts)
            console.error('Pusher Beams error:', error)
          })
      } catch (error: any) {
        console.error('Failed to initialize Pusher Beams:', error)
      }
    }

    // Start initialization
    initBeams()
  }, [])

  // Subscribe to user-specific interests when authenticated
  useEffect(() => {
    if (!session?.user?.id || !initializedRef.current || !beamsClientRef.current) return

    const userInterest = `user-${session.user.id}`
    
    beamsClientRef.current
      .addDeviceInterest(userInterest)
      .then(() => {
        console.log(`Subscribed to user interest: ${userInterest}`)
      })
      .catch((error: any) => {
        // Silently handle errors (might already be subscribed)
        if (error.message && !error.message.includes('already')) {
          console.error('Failed to subscribe to user interest:', error)
        }
      })
  }, [session?.user?.id])

  return null
}

