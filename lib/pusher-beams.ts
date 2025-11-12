import PushNotifications from '@pusher/push-notifications-server'

/**
 * Pusher Push Notifications (Beams) server-side client
 * Used to send push notifications to devices
 */
let beamsClient: PushNotifications | null = null

function getBeamsClient(): PushNotifications | null {
  const instanceId = process.env.NEXT_PUBLIC_PUSHER_BEAMS_INSTANCE_ID
  const secretKey = process.env.PUSHER_BEAMS_PRIMARY_KEY

  if (!instanceId || !secretKey) {
    return null
  }

  if (!beamsClient) {
    beamsClient = new PushNotifications({
      instanceId,
      secretKey,
    })
  }

  return beamsClient
}

/**
 * Send a push notification to device interests
 */
export async function sendPushNotificationToInterests(
  interests: string[],
  title: string,
  body: string,
  deepLink?: string
): Promise<string | null> {
  try {
    const client = getBeamsClient()
    if (!client) {
      console.warn('Pusher Beams not configured - skipping push notification')
      return null
    }

    const publishResponse = await client.publishToInterests(interests, {
      web: {
        notification: {
          title,
          body,
          deep_link: deepLink || process.env.NEXT_PUBLIC_APP_URL || 'https://skillyy.com',
        },
      },
    })

    return publishResponse.publishId
  } catch (error) {
    console.error('Failed to send push notification:', error)
    return null
  }
}

/**
 * Send a push notification to a specific user
 * Uses the user's device interest (user-{userId})
 */
export async function sendPushNotificationToUser(
  userId: string,
  title: string,
  body: string,
  deepLink?: string
): Promise<string | null> {
  return sendPushNotificationToInterests([`user-${userId}`], title, body, deepLink)
}

/**
 * Send push notification to multiple users
 */
export async function sendPushNotificationToUsers(
  userIds: string[],
  title: string,
  body: string,
  deepLink?: string
): Promise<string | null> {
  const interests = userIds.map((userId) => `user-${userId}`)
  return sendPushNotificationToInterests(interests, title, body, deepLink)
}

