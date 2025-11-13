'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { Search, Filter, AlertCircle, CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch' }))
    throw new Error(error.error || `Failed to fetch: ${res.status}`)
  }
  return res.json()
}

const LEVEL_COLORS: Record<string, string> = {
  INFO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  WARNING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  ERROR: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  CRITICAL: 'bg-red-200 text-red-900 dark:bg-red-950 dark:text-red-100',
}

const LEVEL_ICONS: Record<string, any> = {
  INFO: Info,
  WARNING: AlertTriangle,
  ERROR: XCircle,
  CRITICAL: AlertCircle,
}

function getLevelBadge(level: string) {
  const Icon = LEVEL_ICONS[level] || Info
  return (
    <Badge className={LEVEL_COLORS[level] || 'bg-gray-100'}>
      <Icon className="w-3 h-3 mr-1" />
      {level}
    </Badge>
  )
}

export default function AdminPaymentLogsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('')
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('')
  const [sourceFilter, setSourceFilter] = useState<string>('')

  const handleLevelChange = (value: string) => setLevelFilter(value === 'all' ? '' : value)
  const handleEventTypeChange = (value: string) => setEventTypeFilter(value === 'all' ? '' : value)
  const handleSourceChange = (value: string) => setSourceFilter(value === 'all' ? '' : value)

  useEffect(() => {
    setMounted(true)
  }, [])

  const buildUrl = () => {
    const params = new URLSearchParams()
    if (levelFilter) params.set('level', levelFilter)
    if (eventTypeFilter) params.set('eventType', eventTypeFilter)
    if (sourceFilter) params.set('source', sourceFilter)
    params.set('limit', '200')
    return `/api/v1/admin/payment-logs?${params.toString()}`
  }

  const { data: logsData, mutate } = useSWR(
    status === 'authenticated' ? buildUrl() : null,
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

  // Filter logs by search query
  const filteredLogs = logsData?.logs?.filter((log: any) => {
    const matchesSearch = !searchQuery ||
      log.paymentIntentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.transaction?.buyer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.transaction?.buyer?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  }) || []

  // Count by level
  const levelCounts = filteredLogs.reduce((acc: any, log: any) => {
    acc[log.level] = (acc[log.level] || 0) + 1
    return acc
  }, {})

  if (!mounted) {
    return null
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Payment Logs</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Monitor all payment events and activities
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logsData?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{levelCounts.INFO || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{levelCounts.WARNING || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{(levelCounts.ERROR || 0) + (levelCounts.CRITICAL || 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search payment logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Select value={levelFilter || 'all'} onValueChange={handleLevelChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="INFO">Info</SelectItem>
                  <SelectItem value="WARNING">Warning</SelectItem>
                  <SelectItem value="ERROR">Error</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={eventTypeFilter || 'all'} onValueChange={handleEventTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="payment_intent_created">Payment Intent Created</SelectItem>
                  <SelectItem value="payment_authorized">Payment Authorized</SelectItem>
                  <SelectItem value="payment_captured">Payment Captured</SelectItem>
                  <SelectItem value="capture_attempted">Capture Attempted</SelectItem>
                  <SelectItem value="capture_succeeded">Capture Succeeded</SelectItem>
                  <SelectItem value="capture_failed">Capture Failed</SelectItem>
                  <SelectItem value="amount_mismatch">Amount Mismatch</SelectItem>
                  <SelectItem value="payment_failed">Payment Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={sourceFilter || 'all'} onValueChange={handleSourceChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="server">Server</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                  <SelectItem value="task_completion">Task Completion</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Payment Event Logs</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''} shown
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLogs.length > 0 ? (
            <div className="space-y-3">
              {filteredLogs.map((log: any) => (
                <div
                  key={log.id}
                  className={`p-3 md:p-4 border rounded-lg ${
                    log.level === 'CRITICAL' ? 'border-red-500 bg-red-50 dark:bg-red-950/20' :
                    log.level === 'ERROR' ? 'border-red-300 bg-red-50/50 dark:bg-red-950/10' :
                    log.level === 'WARNING' ? 'border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/10' :
                    'hover:bg-muted/50'
                  } transition-colors`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getLevelBadge(log.level)}
                        <span className="text-xs md:text-sm font-medium text-muted-foreground">
                          {log.eventType}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {log.source}
                        </Badge>
                      </div>
                      <p className="text-sm md:text-base mb-2">{log.message}</p>
                      <div className="space-y-1 text-xs md:text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Payment Intent:</span> {log.paymentIntentId}
                        </div>
                        {log.transaction && (
                          <>
                            {log.transaction.buyer && (
                              <div>
                                <span className="font-medium">Buyer:</span> {log.transaction.buyer.name || log.transaction.buyer.email}
                              </div>
                            )}
                            {log.transaction.worker && (
                              <div>
                                <span className="font-medium">Worker:</span> {log.transaction.worker.name || log.transaction.worker.email}
                              </div>
                            )}
                            {log.transaction.task && (
                              <div>
                                <span className="font-medium">Task:</span> {log.transaction.task.title || log.transaction.task.id}
                              </div>
                            )}
                          </>
                        )}
                        {log.details && (
                          <div className="mt-2">
                            <details className="cursor-pointer">
                              <summary className="text-xs font-medium">View Details</summary>
                              <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-2">
                          {format(new Date(log.createdAt), 'MMM d, yyyy h:mm:ss a')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No payment logs found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


