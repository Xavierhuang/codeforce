'use client'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Navigation is handled by UnifiedHeader in AppLayout
  return <>{children}</>
}

