import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Helper function to get or create setting
async function getOrCreateSetting(key: string, defaultValue: string, description?: string) {
  const setting = await prisma.settings.findUnique({
    where: { key },
  })
  
  if (!setting) {
    return await prisma.settings.create({
      data: {
        key,
        value: defaultValue,
        description,
      },
    })
  }
  
  return setting
}

// Helper function to update setting
async function updateSetting(key: string, value: string, updatedBy: string, description?: string) {
  return await prisma.settings.upsert({
    where: { key },
    update: {
      value,
      updatedBy,
      description,
    },
    create: {
      key,
      value,
      updatedBy,
      description,
    },
  })
}

// POST - Save platform settings
export async function POST(req: NextRequest) {
  try {
    const admin = await requireRole('ADMIN')
    const body = await req.json()
    const { 
      platformFeeRate, 
      platformName, 
      supportEmail, 
      announcement,
      minTaskAmount,
      maxTaskAmount,
      workerVerificationRequired,
      autoApprovePayouts,
      maintenanceMode,
      allowNewRegistrations,
      requireEmailVerification,
      trustAndSupportFeeRate,
    } = body

    // Save settings to database
    const settingsToSave = [
      { key: 'platformFeeRate', value: platformFeeRate || '0.15', description: 'Platform fee percentage (0-1)' },
      { key: 'platformName', value: platformName || 'Skillyy', description: 'Platform name' },
      { key: 'supportEmail', value: supportEmail || 'support@skillyy.com', description: 'Support email address' },
      { key: 'minTaskAmount', value: minTaskAmount || '5.00', description: 'Minimum task amount in USD' },
      { key: 'maxTaskAmount', value: maxTaskAmount || '10000.00', description: 'Maximum task amount in USD' },
      { key: 'workerVerificationRequired', value: workerVerificationRequired !== undefined ? String(workerVerificationRequired) : 'true', description: 'Require worker verification before accepting tasks' },
      { key: 'autoApprovePayouts', value: autoApprovePayouts !== undefined ? String(autoApprovePayouts) : 'false', description: 'Automatically approve payout requests' },
      { key: 'maintenanceMode', value: maintenanceMode !== undefined ? String(maintenanceMode) : 'false', description: 'Enable maintenance mode' },
      { key: 'allowNewRegistrations', value: allowNewRegistrations !== undefined ? String(allowNewRegistrations) : 'true', description: 'Allow new user registrations' },
      { key: 'requireEmailVerification', value: requireEmailVerification !== undefined ? String(requireEmailVerification) : 'false', description: 'Require email verification for new users' },
      { key: 'trustAndSupportFeeRate', value: trustAndSupportFeeRate || '0.05', description: 'Trust and support fee percentage (0-1)' },
    ]

    await Promise.all(
      settingsToSave.map(({ key, value, description }) =>
        updateSetting(key, value, admin.id, description)
      )
    )

    // Handle announcement separately (don't save to settings, just send)
    if (announcement && announcement.trim()) {
      // This is handled by the broadcast endpoint now
    }

    return NextResponse.json({
      message: 'Settings saved successfully',
      settings: {
        platformFeeRate,
        platformName,
        supportEmail,
        minTaskAmount,
        maxTaskAmount,
        workerVerificationRequired,
        autoApprovePayouts,
        maintenanceMode,
        allowNewRegistrations,
        requireEmailVerification,
        trustAndSupportFeeRate,
      },
    })
  } catch (error: any) {
    console.error('Error saving settings:', error)
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// GET - Get platform settings
export async function GET(req: NextRequest) {
  try {
    const admin = await requireRole('ADMIN')

    // Fetch settings from database, with defaults
    const settings = await prisma.settings.findMany()
    const settingsMap: Record<string, string> = {}
    
    settings.forEach((setting) => {
      settingsMap[setting.key] = setting.value
    })

    // Return settings with defaults if not found
    return NextResponse.json({
      platformFeeRate: settingsMap.platformFeeRate || process.env.STRIPE_PLATFORM_FEE_RATE || '0.15',
      platformName: settingsMap.platformName || 'Skillyy',
      supportEmail: settingsMap.supportEmail || 'support@skillyy.com',
      minTaskAmount: settingsMap.minTaskAmount || '5.00',
      maxTaskAmount: settingsMap.maxTaskAmount || '10000.00',
      workerVerificationRequired: settingsMap.workerVerificationRequired !== undefined ? settingsMap.workerVerificationRequired === 'true' : true,
      autoApprovePayouts: settingsMap.autoApprovePayouts === 'true',
      maintenanceMode: settingsMap.maintenanceMode === 'true',
      allowNewRegistrations: settingsMap.allowNewRegistrations !== 'false',
      requireEmailVerification: settingsMap.requireEmailVerification === 'true',
      trustAndSupportFeeRate: settingsMap.trustAndSupportFeeRate || '0.05',
    })
  } catch (error: any) {
    console.error('Error fetching settings:', error)
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


