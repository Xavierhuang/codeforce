'use client'

import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { BottomNav } from '@/components/BottomNav'
import { useEffect, useState } from 'react'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const { data: session, status } = useSession()
  const pathname = usePathname()
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Navigation is handled by UnifiedHeader in root layout
  // Don't show bottom nav on auth pages or home page
  const isAuthPage = pathname?.startsWith('/auth')
  const isHomePage = pathname === '/'
  const showBottomNav = mounted && status === 'authenticated' && session && !isAuthPage && !isHomePage

  return (
    <>
      <div className="pb-16 md:pb-0">
        {children}
      </div>
      {showBottomNav && <BottomNav />}
    </>
  )
}

