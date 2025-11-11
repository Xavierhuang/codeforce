'use client'

import { SessionProvider } from 'next-auth/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { AppLayout } from '@/components/AppLayout'
import { Footer } from '@/components/Footer'
import { useSession } from 'next-auth/react'
import { MaintenanceCheck } from '@/components/MaintenanceCheck'

function FooterWrapper({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  // Show footer for logged-out users (when status is 'unauthenticated')
  const showFooter = status === 'unauthenticated'
  
  return (
    <>
      {children}
      {showFooter && <Footer />}
    </>
  )
}

export function Providers({ children, header }: { children: React.ReactNode; header: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <MaintenanceCheck />
        {header}
        <AppLayout>
          <FooterWrapper>
            {children}
          </FooterWrapper>
        </AppLayout>
        <Toaster position="top-right" />
      </QueryClientProvider>
    </SessionProvider>
  )
}

