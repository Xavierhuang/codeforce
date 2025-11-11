'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

/**
 * Client-side maintenance mode check
 * Checks the health endpoint to see if maintenance mode is enabled
 * Only redirects non-admin users
 */
export function MaintenanceCheck() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()

  useEffect(() => {
    // Skip check for admin routes, API routes, auth routes, and maintenance page
    if (
      pathname?.startsWith('/admin') ||
      pathname?.startsWith('/api') ||
      pathname?.startsWith('/auth') ||
      pathname === '/maintenance'
    ) {
      return
    }

    // Skip check for admins
    if (session?.user?.role === 'ADMIN') {
      return
    }

    // Check maintenance mode via health endpoint
    fetch('/api/v1/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.maintenanceMode === true) {
          router.push('/maintenance')
        }
      })
      .catch((error) => {
        // If health check fails, continue normally
        console.error('Error checking maintenance mode:', error)
      })
  }, [pathname, session, router])

  return null
}
