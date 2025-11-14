import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Providers } from './providers'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { UnifiedHeader } from '@/components/header/HeaderData'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Skillyy - On-Demand Developer Marketplace',
  description: 'Hire skilled developers for anything on your to-do list. Post a task, get offers from vetted developers, and get it done.',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export const dynamic = 'force-dynamic'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        {/* Pusher Push Notifications SDK */}
        <Script
          src="https://js.pusher.com/beams/2.1.0/push-notifications-cdn.js"
          strategy="afterInteractive"
        />
        <ErrorBoundary>
          <Providers header={<UnifiedHeader />}>
            {children}
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}

