'use client'

import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { BottomNav } from '@/components/BottomNav'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  
  // Don't show sidebar on auth pages or home page
  const isAuthPage = pathname?.startsWith('/auth')
  const isHomePage = pathname === '/'
  const showSidebar = status === 'authenticated' && session && !isAuthPage && !isHomePage
  const showHeader = status === 'authenticated' && session && !isAuthPage && !isHomePage
  const showBottomNav = status === 'authenticated' && session && !isAuthPage && !isHomePage

  if (showSidebar) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 md:ml-64 overflow-auto pb-16 md:pb-0">
          {showHeader && <Header />}
          <div className="container mx-auto px-4 py-4 md:py-8">
            {children}
          </div>
          {showBottomNav && <BottomNav />}
        </main>
      </div>
    )
  }

  return (
    <>
      {showHeader && <Header />}
      <div className="pb-16 md:pb-0">
        {children}
      </div>
      {showBottomNav && <BottomNav />}
    </>
  )
}

