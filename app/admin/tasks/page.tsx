'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import toast from 'react-hot-toast'
import { Search, Eye, Edit, Trash2, CheckCircle, XCircle, AlertTriangle, MessageSquare, Filter } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch' }))
    throw new Error(error.error || `Failed to fetch: ${res.status}`)
  }
  return res.json()
}

export default function AdminTasksPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [showTaskDetails, setShowTaskDetails] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [editData, setEditData] = useState({ title: '', description: '', price: '' })
  const [newStatus, setNewStatus] = useState('')
  const [adminNotes, setAdminNotes] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data: allTasks, mutate } = useSWR(
    status === 'authenticated' ? '/api/v1/admin/tasks' : null,
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

  // Filter tasks
  const filteredTasks = allTasks?.filter((task: any) => {
    const matchesSearch = !searchQuery || 
      task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.worker?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = !statusFilter || task.status === statusFilter
    
    return matchesSearch && matchesStatus
  }) || []

  const handleEditTask = async () => {
    if (!selectedTask) return

    try {
      const response = await fetch(`/api/v1/admin/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editData.title,
          description: editData.description,
          price: editData.price ? parseFloat(editData.price) : null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update task')
      }

      toast.success('Task updated successfully')
      setShowEditDialog(false)
      setSelectedTask(null)
      mutate()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update task')
    }
  }

  const handleDeleteTask = async () => {
    if (!selectedTask) return

    try {
      const response = await fetch(`/api/v1/admin/tasks/${selectedTask.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete task')
      }

      toast.success('Task deleted successfully')
      setShowDeleteDialog(false)
      setSelectedTask(null)
      mutate()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete task')
    }
  }

  const handleChangeStatus = async () => {
    if (!selectedTask || !newStatus) return

    try {
      const response = await fetch(`/api/v1/admin/tasks/${selectedTask.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          adminNotes: adminNotes || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update task status')
      }

      toast.success('Task status updated')
      setShowStatusDialog(false)
      setNewStatus('')
      setAdminNotes('')
      setSelectedTask(null)
      mutate()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update task status')
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      OPEN: 'outline',
      ASSIGNED: 'secondary',
      IN_PROGRESS: 'default',
      COMPLETED: 'default',
      CANCELLED: 'destructive',
      DISPUTED: 'destructive',
    }
    return (
      <Badge variant={variants[status] || 'outline'} className="text-xs">
        {status.replace('_', ' ')}
      </Badge>
    )
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

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Tasks</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          View and manage all platform tasks ({filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'})
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="search" className="text-xs md:text-sm">Search</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by title, description, client, or worker..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs md:text-sm">Status</Label>
              <Select value={statusFilter || undefined} onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}>
                <SelectTrigger className="mt-1 text-sm">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="ASSIGNED">Assigned</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="DISPUTED">Disputed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">All Tasks</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTasks.length > 0 ? (
            <div className="space-y-3">
              {filteredTasks.map((task: any) => (
                <div
                  key={task.id}
                  className="p-3 md:p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm md:text-base break-words">{task.title}</h3>
                        {getStatusBadge(task.status)}
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 break-words mb-2">
                        {task.description}
                      </p>
                      <div className="flex flex-wrap gap-3 md:gap-4 text-xs md:text-sm text-muted-foreground">
                        <span>Client: {task.client?.name || 'Unknown'}</span>
                        {task.worker && (
                          <span>Worker: {task.worker.name || 'Unknown'}</span>
                        )}
                        {task.price && <span>${task.price}</span>}
                        <span>{format(new Date(task.createdAt), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTask(task)
                          setShowTaskDetails(true)
                        }}
                        className="text-xs"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTask(task)
                          setEditData({
                            title: task.title,
                            description: task.description,
                            price: task.price?.toString() || '',
                          })
                          setShowEditDialog(true)
                        }}
                        className="text-xs"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTask(task)
                          setNewStatus(task.status)
                          setShowStatusDialog(true)
                        }}
                        className="text-xs"
                      >
                        <Filter className="w-3 h-3 mr-1" />
                        Status
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedTask(task)
                          setShowDeleteDialog(true)
                        }}
                        className="text-xs"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No tasks found</p>
          )}
        </CardContent>
      </Card>

      {/* Task Details Dialog */}
      <Dialog open={showTaskDetails} onOpenChange={setShowTaskDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
            <DialogDescription>
              Complete task information
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4 py-4">
              <div>
                <h3 className="font-semibold text-sm mb-2">Basic Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Title:</span>
                    <span className="font-medium break-words text-right">{selectedTask.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    {getStatusBadge(selectedTask.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category:</span>
                    <span className="font-medium">{selectedTask.category}</span>
                  </div>
                  {selectedTask.subcategory && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subcategory:</span>
                      <span className="font-medium">{selectedTask.subcategory}</span>
                    </div>
                  )}
                  {selectedTask.price && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price:</span>
                      <span className="font-medium">${selectedTask.price}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium">{format(new Date(selectedTask.createdAt), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">Description</h3>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg break-words whitespace-pre-wrap">
                  {selectedTask.description}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">Participants</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client:</span>
                    <span className="font-medium">{selectedTask.client?.name || 'Unknown'}</span>
                  </div>
                  {selectedTask.worker && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Worker:</span>
                      <span className="font-medium">{selectedTask.worker.name || 'Unknown'}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t">
                <Link href={`/tasks/${selectedTask.id}`}>
                  <Button variant="outline" className="w-full text-xs md:text-sm">
                    View Full Task Page
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update task details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description *</Label>
              <Textarea
                id="edit-description"
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                className="mt-1 min-h-[100px]"
              />
            </div>
            <div>
              <Label htmlFor="edit-price">Price</Label>
              <Input
                id="edit-price"
                type="number"
                step="0.01"
                value={editData.price}
                onChange={(e) => setEditData({ ...editData, price: e.target.value })}
                className="mt-1"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditTask} disabled={!editData.title.trim() || !editData.description.trim()}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Task Status</DialogTitle>
            <DialogDescription>
              Override task status (use with caution)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="new-status">New Status *</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="ASSIGNED">Assigned</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="DISPUTED">Disputed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="admin-notes">Admin Notes (Optional)</Label>
              <Textarea
                id="admin-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="mt-1 min-h-[80px]"
                placeholder="Reason for status change..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setShowStatusDialog(false)
              setNewStatus('')
              setAdminNotes('')
            }}>
              Cancel
            </Button>
            <Button onClick={handleChangeStatus} disabled={!newStatus}>
              Update Status
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-2">
                Task: <span className="font-medium">{selectedTask.title}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                This will permanently delete the task and all associated data.
              </p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setShowDeleteDialog(false)
              setSelectedTask(null)
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTask}>
              Delete Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
