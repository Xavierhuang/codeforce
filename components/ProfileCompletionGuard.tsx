'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

/**
 * Component that checks profile completion and redirects to profile setup if incomplete
 * Should be used in dashboard layout to enforce profile completion
 */
export function ProfileCompletionGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { data: completionStatus, isLoading } = useSWR(
    status === 'authenticated' && pathname !== '/dashboard/profile' ? '/api/v1/users/profile-completion' : null,
    fetcher
  )

  useEffect(() => {
    // Skip check if not authenticated or on profile page
    if (status !== 'authenticated' || pathname === '/dashboard/profile' || isLoading) {
      return
    }

    // Redirect to profile setup if profile is incomplete
    if (completionStatus && !completionStatus.isComplete) {
      router.push('/dashboard/profile?onboarding=true')
    }
  }, [completionStatus, status, pathname, isLoading, router])

  // Show loading state while checking
  if (status === 'loading' || (status === 'authenticated' && pathname !== '/dashboard/profile' && isLoading)) {
    return (
      <div className="min-h-screen bg-[#F3F2EF] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

