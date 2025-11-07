'use client'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Sidebar is now handled globally in AppLayout
  return <>{children}</>
}

