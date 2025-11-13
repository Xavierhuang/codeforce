import { prisma } from './prisma'

/**
 * Get a platform setting value from the database
 * Falls back to environment variable or default value
 */
export async function getSetting(key: string, defaultValue: string): Promise<string> {
  try {
    const setting = await prisma.settings.findUnique({
      where: { key },
    })
    return setting?.value || defaultValue
  } catch (error) {
    console.error(`Error fetching setting ${key}:`, error)
    return defaultValue
  }
}

/**
 * Get multiple platform settings at once
 */
export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  try {
    const settings = await prisma.settings.findMany({
      where: { key: { in: keys } },
    })
    const settingsMap: Record<string, string> = {}
    settings.forEach((setting) => {
      settingsMap[setting.key] = setting.value
    })
    return settingsMap
  } catch (error) {
    console.error('Error fetching settings:', error)
    return {}
  }
}

/**
 * Get all platform settings as a typed object
 */
export async function getPlatformSettings(): Promise<{
  platformFeeRate: number
  platformName: string
  supportEmail: string
  minTaskAmount: number
  maxTaskAmount: number
  trustAndSupportFeeRate: number
  workerVerificationRequired: boolean
  autoApprovePayouts: boolean
  maintenanceMode: boolean
  allowNewRegistrations: boolean
  requireEmailVerification: boolean
}> {
  const settings = await getSettings([
    'platformFeeRate',
    'platformName',
    'supportEmail',
    'minTaskAmount',
    'maxTaskAmount',
    'trustAndSupportFeeRate',
    'workerVerificationRequired',
    'autoApprovePayouts',
    'maintenanceMode',
    'allowNewRegistrations',
    'requireEmailVerification',
  ])

  return {
    platformFeeRate: parseFloat(settings.platformFeeRate || process.env.STRIPE_PLATFORM_FEE_RATE || '0.15'),
    platformName: settings.platformName || 'Skillyy',
    supportEmail: settings.supportEmail || 'support@skillyy.com',
    minTaskAmount: parseFloat(settings.minTaskAmount || '5.00'),
    maxTaskAmount: parseFloat(settings.maxTaskAmount || '10000.00'),
    trustAndSupportFeeRate: parseFloat(settings.trustAndSupportFeeRate || '0.05'),
    workerVerificationRequired: settings.workerVerificationRequired !== 'false',
    autoApprovePayouts: settings.autoApprovePayouts === 'true',
    maintenanceMode: settings.maintenanceMode === 'true',
    allowNewRegistrations: settings.allowNewRegistrations !== 'false',
    requireEmailVerification: settings.requireEmailVerification === 'true',
  }
}



