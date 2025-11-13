import { prisma } from '@/lib/prisma'

export type PaymentLogLevel = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
export type PaymentEventType = 
  | 'payment_intent_created'
  | 'payment_authorized'
  | 'payment_captured'
  | 'payment_failed'
  | 'webhook_received'
  | 'capture_attempted'
  | 'capture_succeeded'
  | 'capture_failed'
  | 'amount_mismatch'
  | 'task_created'
  | 'task_completed'
  | 'wallet_updated'
  | 'wallet_update_failed'
  | 'payment_protection_applied'
  | 'payment_protection_failed'
  | 'payment_requires_method'
  | 'weekly_payment_processed'
  | 'weekly_payment_failed'

interface PaymentLogData {
  paymentIntentId?: string
  eventType: PaymentEventType
  level?: PaymentLogLevel
  message: string
  details?: any
  source?: 'client' | 'server' | 'webhook' | 'task_completion'
  transactionId?: string
  taskId?: string
  buyerId?: string
  workerId?: string
  amount?: number
  metadata?: any
}

/**
 * Log payment events to database for admin observation
 */
export async function logPaymentEvent(data: PaymentLogData): Promise<void> {
  try {
    // Find transaction by paymentIntentId if transactionId not provided
    let transactionId = data.transactionId
    if (!transactionId && data.paymentIntentId) {
      const transaction = await prisma.transaction.findUnique({
        where: { paymentIntentId: data.paymentIntentId },
        select: { id: true },
      })
      transactionId = transaction?.id
    }

    // Build details object with all available metadata
    const details: any = {
      ...(data.details || {}),
      ...(data.metadata || {}),
    }
    if (data.taskId) details.taskId = data.taskId
    if (data.buyerId) details.buyerId = data.buyerId
    if (data.workerId) details.workerId = data.workerId
    if (data.amount !== undefined) details.amount = data.amount

    // PaymentIntentId is required in schema, so we need to provide a value
    // For events without paymentIntentId, use a placeholder or skip logging
    if (!data.paymentIntentId && !transactionId) {
      console.warn('[PAYMENT_LOG] Skipping log - no paymentIntentId or transactionId provided')
      return
    }

    await prisma.paymentLog.create({
      data: {
        paymentIntentId: data.paymentIntentId || 'N/A', // Use placeholder if not provided
        transactionId: transactionId || undefined,
        eventType: data.eventType,
        level: (data.level || 'INFO') as PaymentLogLevel,
        message: data.message,
        details: Object.keys(details).length > 0 ? details : undefined,
        source: data.source || 'server',
      },
    })

    // Also log to console for immediate visibility
    const logPrefix = `[PAYMENT_LOG:${data.level || 'INFO'}]`
    const logMessage = `${logPrefix} ${data.eventType}: ${data.message}`
    
    if (data.level === 'ERROR' || data.level === 'CRITICAL') {
      console.error(logMessage, data.details)
    } else if (data.level === 'WARNING') {
      console.warn(logMessage, data.details)
    } else {
      console.log(logMessage, data.details)
    }
  } catch (error: any) {
    // Don't fail the operation if logging fails
    console.error('[PAYMENT_LOG] Failed to log payment event:', error)
  }
}

