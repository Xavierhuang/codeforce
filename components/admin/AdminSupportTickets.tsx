'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { MessageSquare, Send, CheckCircle, Clock, AlertCircle, X, User, Mail } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const CATEGORIES = [
  { value: 'GENERAL_SUPPORT', label: 'General Support' },
  { value: 'TECHNICAL_ISSUE', label: 'Technical Issue' },
  { value: 'ACCOUNT_ISSUE', label: 'Account Issue' },
  { value: 'REPORT_USER', label: 'Report User' },
  { value: 'REPORT_TASK', label: 'Report Task' },
  { value: 'PAYMENT_ISSUE', label: 'Payment Issue' },
  { value: 'VERIFICATION', label: 'Verification' },
  { value: 'OTHER', label: 'Other' },
]

const STATUSES = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
]

const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800 border-blue-200',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  RESOLVED: 'bg-green-100 text-green-800 border-green-200',
  CLOSED: 'bg-gray-100 text-gray-800 border-gray-200',
}

export function AdminSupportTickets() {
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [priorityFilter, setPriorityFilter] = useState<string>('')
  const [replyMessage, setReplyMessage] = useState('')
  const [isReplying, setIsReplying] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const queryParams = new URLSearchParams()
  if (statusFilter) queryParams.set('status', statusFilter)
  if (categoryFilter) queryParams.set('category', categoryFilter)
  if (priorityFilter) queryParams.set('priority', priorityFilter)

  const { data: tickets, isLoading, mutate } = useSWR(
    `/api/v1/admin/support?${queryParams.toString()}`,
    fetcher
  )

  const { data: ticketDetails, mutate: mutateTicket } = useSWR(
    selectedTicket ? `/api/v1/support/${selectedTicket}` : null,
    fetcher
  )

  const handleReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) {
      return
    }

    setIsReplying(true)
    try {
      const response = await fetch(`/api/v1/support/${selectedTicket}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyMessage }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send reply')
      }

      toast.success('Reply sent!')
      setReplyMessage('')
      mutate()
      mutateTicket()
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reply')
    } finally {
      setIsReplying(false)
    }
  }

  const handleUpdateTicket = async (field: 'status' | 'priority' | 'assignedTo', value: string | null) => {
    if (!selectedTicket) return

    setIsUpdating(true)
    try {
      const updateData: any = {}
      if (field === 'status') updateData.status = value
      if (field === 'priority') updateData.priority = value
      if (field === 'assignedTo') updateData.assignedTo = value

      const response = await fetch(`/api/v1/admin/support/${selectedTicket}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update ticket')
      }

      toast.success('Ticket updated')
      mutate()
      mutateTicket()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update ticket')
    } finally {
      setIsUpdating(false)
    }
  }

  const openTickets = tickets?.filter((t: any) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length || 0

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Support Tickets</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {openTickets} open ticket{openTickets !== 1 ? 's' : ''} • {tickets?.length || 0} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs md:text-sm">Status</Label>
              <Select value={statusFilter || undefined} onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs md:text-sm">Category</Label>
              <Select value={categoryFilter || undefined} onValueChange={(value) => setCategoryFilter(value === 'all' ? '' : value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs md:text-sm">Priority</Label>
              <Select value={priorityFilter || undefined} onValueChange={(value) => setPriorityFilter(value === 'all' ? '' : value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  {PRIORITIES.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Tickets List */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 text-center text-muted-foreground">
                  <p className="text-sm">Loading tickets...</p>
                </div>
              ) : !tickets || tickets.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No support tickets found</p>
                </div>
              ) : (
                <div className="divide-y">
                  {tickets.map((ticket: any) => (
                    <button
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket.id)}
                      className={`w-full text-left p-3 md:p-4 hover:bg-muted/50 transition-colors ${
                        selectedTicket === ticket.id ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-1">
                        <p className="font-medium text-xs md:text-sm break-words line-clamp-2">{ticket.subject}</p>
                        <Badge className={`${STATUS_COLORS[ticket.status] || 'bg-gray-100'} text-[10px] px-1.5 py-0.5 flex-shrink-0`}>
                          {ticket.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-[10px] md:text-xs text-muted-foreground mb-1">
                        {ticket.user?.name || ticket.user?.email || 'Unknown User'}
                      </p>
                      <p className="text-[10px] md:text-xs text-muted-foreground">
                        {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
                      </p>
                      {ticket._count?.messages > 0 && (
                        <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                          {ticket._count.messages} message{ticket._count.messages !== 1 ? 's' : ''}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ticket Details */}
        <div className="lg:col-span-2">
          {selectedTicket && ticketDetails ? (
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <CardTitle className="text-base md:text-lg break-words">{ticketDetails.subject}</CardTitle>
                      <Badge className={STATUS_COLORS[ticketDetails.status] || 'bg-gray-100'}>
                        {ticketDetails.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs md:text-sm">
                      {CATEGORIES.find((c) => c.value === ticketDetails.category)?.label || ticketDetails.category} • Created{' '}
                      {format(new Date(ticketDetails.createdAt), 'MMM d, yyyy h:mm a')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* User Info */}
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{ticketDetails.user?.name || 'Unknown User'}</span>
                    <Badge variant="secondary" className="text-xs">
                      {ticketDetails.user?.role}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="w-3 h-3" />
                    <span>{ticketDetails.user?.email}</span>
                  </div>
                </div>

                {/* Ticket Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 border rounded-lg">
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={ticketDetails.status}
                      onValueChange={(value) => handleUpdateTicket('status', value)}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="mt-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Priority</Label>
                    <Select
                      value={ticketDetails.priority}
                      onValueChange={(value) => handleUpdateTicket('priority', value)}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="mt-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((priority) => (
                          <SelectItem key={priority.value} value={priority.value}>
                            {priority.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Assigned To</Label>
                    <Select
                      value={ticketDetails.assignedTo || undefined}
                      onValueChange={(value) => handleUpdateTicket('assignedTo', value === 'unassigned' ? null : value)}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="mt-1 text-xs">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {/* TODO: Load admin users for assignment */}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Messages */}
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {ticketDetails.messages?.map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-lg ${
                        msg.isAdmin
                          ? 'bg-primary/10 border border-primary/20'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs md:text-sm">
                            {msg.isAdmin ? 'Admin' : msg.user?.name || 'User'}
                          </span>
                          {msg.isAdmin && (
                            <Badge variant="secondary" className="text-[10px]">
                              Admin
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] md:text-xs text-muted-foreground">
                          {format(new Date(msg.createdAt), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-xs md:text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                    </div>
                  ))}
                </div>

                {/* Reply Form */}
                {ticketDetails.status !== 'CLOSED' && (
                  <div className="border-t pt-4">
                    <Label htmlFor="admin-reply" className="text-xs md:text-sm">Reply as Admin</Label>
                    <Textarea
                      id="admin-reply"
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type your reply..."
                      className="mt-1 min-h-[80px] md:min-h-[100px] text-sm"
                    />
                    <Button
                      onClick={handleReply}
                      disabled={!replyMessage.trim() || isReplying}
                      className="mt-2 w-full sm:w-auto text-sm"
                      size="sm"
                    >
                      <Send className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                      {isReplying ? 'Sending...' : 'Send Reply'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  {tickets && tickets.length > 0
                    ? 'Select a ticket to view details'
                    : 'No support tickets found'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}


