import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServerUser, getHeaderNotifications, getAdminBadgeCounts } from '@/lib/server-data'
import { UnifiedHeaderClient } from './UnifiedHeaderClient'
import { HeaderLoading } from './HeaderLoading'

async function HeaderData() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return <UnifiedHeaderClient user={null} initialNotifications={null} adminBadges={null} />
  }

  // Fetch user first to check if admin
  const user = await getServerUser()
  
  if (!user) {
    return <UnifiedHeaderClient user={null} initialNotifications={null} adminBadges={null} />
  }

  // Fetch data in parallel
  const [notifications, adminBadges] = await Promise.all([
    getHeaderNotifications(user.id),
    user.role === 'ADMIN' ? getAdminBadgeCounts() : Promise.resolve(null),
  ])

  return (
    <UnifiedHeaderClient 
      user={user}
      initialNotifications={notifications}
      adminBadges={adminBadges}
    />
  )
}

export function UnifiedHeader() {
  return (
    <Suspense fallback={<HeaderLoading />}>
      <HeaderData />
    </Suspense>
  )
}

