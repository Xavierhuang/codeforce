'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function AuthenticatedLayout({
  children,
  requireAuth = true,
}: {
  children: React.ReactNode
  requireAuth?: boolean
}) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (requireAuth && status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router, requireAuth])

  if (requireAuth && (status === 'loading' || !session)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // No sidebar - using unified header navigation
  return <>{children}</>
}




