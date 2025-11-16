import { NextRequest, NextResponse } from 'next/server'
import { getPlatformSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

/**
 * Health check endpoint that also returns maintenance mode status
 * Can be used by middleware or other services to check platform status
 */
export async function GET(req: NextRequest) {
  try {
    const settings = await getPlatformSettings()
    return NextResponse.json({
      status: 'ok',
      maintenanceMode: settings.maintenanceMode,
      allowNewRegistrations: settings.allowNewRegistrations,
    })
  } catch (error) {
    // If settings can't be fetched, return defaults
    return NextResponse.json({
      status: 'ok',
      maintenanceMode: false,
      allowNewRegistrations: true,
    })
  }
}






