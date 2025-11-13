import { NextRequest, NextResponse } from 'next/server'
import { processWeeklyPayments } from '@/lib/weekly-payment-processor'

/**
 * POST /api/cron/weekly-payments
 * Cron job endpoint to process weekly payments for approved time reports
 * 
 * Should be called every Monday at 00:00 UTC
 * Can be triggered by:
 * - External cron service (cron-job.org, EasyCron, etc.)
 * - Server cron job
 * - Scheduled task service
 * 
 * Security: Should be protected with a secret token or IP whitelist
 */
export async function POST(req: NextRequest) {
  try {
    // Optional: Verify cron secret token
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'your-secret-token-here'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[CRON] Starting weekly payment processing...')
    
    const result = await processWeeklyPayments()

    if (result.success) {
      console.log(`[CRON] Weekly payment processing completed: ${result.processed.length} payments processed`)
      return NextResponse.json({
        success: true,
        message: `Processed ${result.processed.length} weekly payments`,
        processed: result.processed.length,
        errors: result.errors.length,
        details: result.processed,
      })
    } else {
      console.error(`[CRON] Weekly payment processing completed with errors: ${result.errors.length} errors`)
      return NextResponse.json({
        success: false,
        message: `Processed ${result.processed.length} payments with ${result.errors.length} errors`,
        processed: result.processed.length,
        errors: result.errors,
        details: result.processed,
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('[CRON] Error processing weekly payments:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cron/weekly-payments
 * Health check endpoint (optional)
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'Weekly payment processor cron endpoint',
    schedule: 'Every Monday at 00:00 UTC',
    status: 'active',
  })
}


