'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function AuthRedirect() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.replace('/dashboard')
    }
  }, [status, session, router])

  if (status === 'authenticated') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return null
}



