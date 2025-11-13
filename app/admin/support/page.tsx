'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminSupportTickets } from '@/components/admin/AdminSupportTickets'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, LifeBuoy, Scale, MessageSquare } from 'lucide-react'

export default function AdminSupportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [mounted, status, router])

  useEffect(() => {
    if (mounted && session && session.user?.role !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [mounted, session, router])

  if (!mounted || status === 'loading') {
    return (
      <div className="p-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (status === 'unauthenticated' || session?.user?.role !== 'ADMIN') {
    return (
      <div className="p-8">
        <div className="text-center">Redirecting...</div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Support Tickets</h1>
        <p className="text-sm md:text-base text-muted-foreground">Manage user support requests</p>
      </div>

      {/* Support Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Link href="/admin/support">
          <Card className="transition-all hover:border-primary/40 hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <LifeBuoy className="w-4 h-4 text-primary" />
                Support Inbox
              </CardTitle>
              <CardDescription>
                Review and respond to support tickets from clients and workers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquare className="w-4 h-4" />
                Real-time ticket updates
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/disputes">
          <Card className="transition-all hover:border-primary/40 hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Scale className="w-4 h-4 text-amber-600" />
                Time Report Disputes
              </CardTitle>
              <CardDescription>
                Resolve disagreements between clients and workers over hourly reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="text-xs">
                Escalation queue
              </Badge>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/reports">
          <Card className="transition-all hover:border-primary/40 hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Abuse Reports
              </CardTitle>
              <CardDescription>
                Investigate user and task reports that require moderation attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Track outstanding reports and follow-up actions.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <AdminSupportTickets />
    </div>
  )
}


