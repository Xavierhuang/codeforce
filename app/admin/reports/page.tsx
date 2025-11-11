'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import toast from 'react-hot-toast'
import { AlertTriangle, Eye, CheckCircle, XCircle, User, FileText } from 'lucide-react'
import { format } from 'date-fns'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch' }))
    throw new Error(error.error || `Failed to fetch: ${res.status}`)
  }
  return res.json()
}

export default function AdminReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [showReportDetails, setShowReportDetails] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch support tickets that are reports
  const { data: allTickets, mutate } = useSWR(
    status === 'authenticated' ? '/api/v1/admin/support' : null,
    fetcher
  )

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

  // Filter reports (REPORT_USER or REPORT_TASK categories)
  const reports = allTickets?.filter((ticket: any) => 
    ticket.category === 'REPORT_USER' || ticket.category === 'REPORT_TASK'
  ) || []

  const filteredReports = reports.filter((report: any) => {
    if (!categoryFilter) return true
    return report.category === categoryFilter
  })

  const handleResolveReport = async (ticketId: string, action: 'resolved' | 'dismissed') => {
    try {
      const response = await fetch(`/api/v1/admin/support/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action === 'resolved' ? 'RESOLVED' : 'CLOSED',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update report')
      }

      toast.success(`Report ${action === 'resolved' ? 'resolved' : 'dismissed'}`)
      setShowReportDetails(false)
      setSelectedReport(null)
      setResolutionNotes('')
      mutate()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update report')
    }
  }

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

  const getCategoryLabel = (category: string) => {
    return category === 'REPORT_USER' ? 'Report User' : 'Report Task'
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Reports</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Manage user and task reports ({filteredReports.length} {filteredReports.length === 1 ? 'report' : 'reports'})
        </p>
      </div>

      {/* Filter */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs md:text-sm">Category</Label>
              <Select value={categoryFilter || undefined} onValueChange={(value) => setCategoryFilter(value === 'all' ? '' : value)}>
                <SelectTrigger className="mt-1 text-sm">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="REPORT_USER">Report User</SelectItem>
                  <SelectItem value="REPORT_TASK">Report Task</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">All Reports</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredReports.length > 0 ? (
            <div className="space-y-3">
              {filteredReports.map((report: any) => (
                <div
                  key={report.id}
                  className="p-3 md:p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <h3 className="font-medium text-sm md:text-base break-words">{report.subject}</h3>
                        <Badge variant="destructive" className="text-xs">
                          {getCategoryLabel(report.category)}
                        </Badge>
                        <Badge
                          variant={
                            report.status === 'OPEN' ? 'default' :
                            report.status === 'RESOLVED' ? 'secondary' :
                            'outline'
                          }
                          className="text-xs"
                        >
                          {report.status}
                        </Badge>
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground mb-2">
                        Reported by: {report.user?.name || report.user?.email || 'Unknown'}
                      </p>
                      <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 break-words">
                        {report.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(report.createdAt), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedReport(report)
                          setShowReportDetails(true)
                        }}
                        className="text-xs"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No reports found</p>
          )}
        </CardContent>
      </Card>

      {/* Report Details Dialog */}
      <Dialog open={showReportDetails} onOpenChange={setShowReportDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
            <DialogDescription>
              Review and resolve user reports
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4 py-4">
              <div>
                <h3 className="font-semibold text-sm mb-2">Report Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category:</span>
                    <Badge variant="destructive">{getCategoryLabel(selectedReport.category)}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge
                      variant={
                        selectedReport.status === 'OPEN' ? 'default' :
                        selectedReport.status === 'RESOLVED' ? 'secondary' :
                        'outline'
                      }
                    >
                      {selectedReport.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Priority:</span>
                    <Badge variant="secondary">{selectedReport.priority}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reported:</span>
                    <span className="font-medium">{format(new Date(selectedReport.createdAt), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">Reporter</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{selectedReport.user?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium">{selectedReport.user?.email || 'Unknown'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">Subject</h3>
                <p className="text-sm font-medium break-words">{selectedReport.subject}</p>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">Description</h3>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg break-words whitespace-pre-wrap">
                  {selectedReport.description}
                </p>
              </div>

              {selectedReport.messages && selectedReport.messages.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">Conversation</h3>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {selectedReport.messages.map((msg: any) => (
                      <div
                        key={msg.id}
                        className={`p-2 rounded-lg text-xs ${
                          msg.isAdmin ? 'bg-primary/10' : 'bg-muted'
                        }`}
                      >
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">{msg.isAdmin ? 'Admin' : msg.user?.name || 'User'}</span>
                          <span className="text-muted-foreground">
                            {format(new Date(msg.createdAt), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <p className="break-words">{msg.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedReport.status === 'OPEN' && (
                <div className="pt-4 border-t">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="resolution-notes">Resolution Notes (Optional)</Label>
                      <Textarea
                        id="resolution-notes"
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        className="mt-1 min-h-[80px]"
                        placeholder="Add notes about how this report was handled..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleResolveReport(selectedReport.id, 'dismissed')}
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Dismiss
                      </Button>
                      <Button
                        onClick={() => handleResolveReport(selectedReport.id, 'resolved')}
                        className="flex-1"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark Resolved
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}


