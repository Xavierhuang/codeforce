'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { MessageSquare, Plus, Send, X, Clock, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'

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

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800 border-blue-200',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  RESOLVED: 'bg-green-100 text-green-800 border-green-200',
  CLOSED: 'bg-gray-100 text-gray-800 border-gray-200',
}

const STATUS_ICONS: Record<string, any> = {
  OPEN: AlertCircle,
  IN_PROGRESS: Clock,
  RESOLVED: CheckCircle,
  CLOSED: X,
}

export default function SupportPage() {
  const { data: session } = useSession()
  const [showNewTicketDialog, setShowNewTicketDialog] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isReplying, setIsReplying] = useState(false)

  const [newTicket, setNewTicket] = useState({
    category: 'GENERAL_SUPPORT',
    subject: '',
    description: '',
  })

  const { data: ticketsData, isLoading, mutate, error: ticketsError } = useSWR(
    session ? '/api/v1/support' : null,
    fetcher
  )

  // Safely handle tickets data - ensure it's always an array
  const tickets = Array.isArray(ticketsData) ? ticketsData : []

  const { data: ticketDetails } = useSWR(
    selectedTicket ? `/api/v1/support/${selectedTicket}` : null,
    fetcher
  )

  const handleCreateTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.description.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/v1/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTicket),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create ticket')
      }

      toast.success('Support ticket created! An admin will review it soon.')
      setShowNewTicketDialog(false)
      setNewTicket({ category: 'GENERAL_SUPPORT', subject: '', description: '' })
      // Use setTimeout to defer mutate call and avoid setState during render warning
      setTimeout(() => mutate(), 0)
    } catch (error: any) {
      toast.error(error.message || 'Failed to create ticket')
    } finally {
      setIsSubmitting(false)
    }
  }

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
      // Use setTimeout to defer mutate call and avoid setState during render warning
      setTimeout(() => {
        mutate()
        // Refresh ticket details
        if (selectedTicket) {
          mutate(`/api/v1/support/${selectedTicket}`)
        }
      }, 0)
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reply')
    } finally {
      setIsReplying(false)
    }
  }

  const handleCloseTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to close this ticket?')) {
      return
    }

    try {
      const response = await fetch(`/api/v1/support/${ticketId}/close`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to close ticket')
      }

      toast.success('Ticket closed')
      // Use setTimeout to defer mutate call and avoid setState during render warning
      setTimeout(() => {
        mutate()
        if (selectedTicket === ticketId) {
          setSelectedTicket(null)
        }
      }, 0)
    } catch (error: any) {
      toast.error(error.message || 'Failed to close ticket')
    }
  }

  const getStatusBadge = (status: string) => {
    const StatusIcon = STATUS_ICONS[status] || AlertCircle
    return (
      <Badge className={STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'}>
        <StatusIcon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="text-center py-12">Loading support tickets...</div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Support</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Get help from our support team or report issues
          </p>
        </div>
        <Button 
          className="w-full sm:w-auto"
          onClick={() => setShowNewTicketDialog(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Support Ticket
        </Button>
        <Dialog open={showNewTicketDialog} onOpenChange={setShowNewTicketDialog}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Support Ticket</DialogTitle>
              <DialogDescription>
                Describe your issue and we&apos;ll get back to you as soon as possible
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <select
                  id="category"
                  value={newTicket.category}
                  onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  placeholder="Brief description of your issue"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  placeholder="Provide details about your issue..."
                  className="mt-1 min-h-[120px]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewTicketDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTicket} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Ticket'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Tickets List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Your Tickets</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {tickets?.length || 0} total ticket{tickets?.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {ticketsError ? (
                <div className="p-6 text-center text-red-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Error loading tickets. Please try again.</p>
                </div>
              ) : !tickets || tickets.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No support tickets yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {tickets.map((ticket: any) => (
                    <button
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket.id)}
                      className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${
                        selectedTicket === ticket.id ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-medium text-sm break-words">{ticket.subject}</p>
                        {getStatusBadge(ticket.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {CATEGORIES.find((c) => c.value === ticket.category)?.label || ticket.category}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
                      </p>
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
                      <CardTitle className="text-lg md:text-xl break-words">{ticketDetails.subject}</CardTitle>
                      {getStatusBadge(ticketDetails.status)}
                    </div>
                    <CardDescription className="text-xs md:text-sm">
                      {CATEGORIES.find((c) => c.value === ticketDetails.category)?.label || ticketDetails.category} • Created{' '}
                      {format(new Date(ticketDetails.createdAt), 'MMM d, yyyy h:mm a')}
                    </CardDescription>
                    {ticketDetails.assignedAdmin && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Assigned to: {ticketDetails.assignedAdmin.name || ticketDetails.assignedAdmin.email}
                      </p>
                    )}
                  </div>
                  {ticketDetails.status !== 'CLOSED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCloseTicket(ticketDetails.id)}
                      className="w-full sm:w-auto"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Close Ticket
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Messages */}
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
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
                          <span className="font-medium text-sm">
                            {msg.isAdmin ? 'Admin' : msg.user?.name || 'You'}
                          </span>
                          {msg.isAdmin && (
                            <Badge variant="secondary" className="text-xs">
                              Admin
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(msg.createdAt), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                    </div>
                  ))}
                </div>

                {/* Reply Form */}
                {ticketDetails.status !== 'CLOSED' && (
                  <div className="border-t pt-4">
                    <Label htmlFor="reply">Reply</Label>
                    <Textarea
                      id="reply"
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type your reply..."
                      className="mt-1 min-h-[100px]"
                    />
                    <Button
                      onClick={handleReply}
                      disabled={!replyMessage.trim() || isReplying}
                      className="mt-2 w-full sm:w-auto"
                    >
                      <Send className="w-4 h-4 mr-2" />
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
                <p className="text-muted-foreground">
                  {tickets && tickets.length > 0
                    ? 'Select a ticket to view details'
                    : 'Create your first support ticket to get started'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

