export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Admin pages now use the main AppLayout with unified sidebar
  return <>{children}</>
}
