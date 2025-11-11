'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import toast from 'react-hot-toast'
import { Shield, Download, Trash2, FileText, Search } from 'lucide-react'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch' }))
    throw new Error(error.error || `Failed to fetch: ${res.status}`)
  }
  return res.json()
}

export default function AdminCompliancePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [searchEmail, setSearchEmail] = useState('')
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data: userData } = useSWR(
    searchEmail && status === 'authenticated' ? `/api/v1/admin/users?email=${searchEmail}` : null,
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

  const handleExportData = async () => {
    if (!selectedUser) return

    setIsExporting(true)
    try {
      const response = await fetch(`/api/v1/admin/compliance/export?userId=${selectedUser.id}`)
      
      if (!response.ok) {
        throw new Error('Failed to export user data')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `user-data-${selectedUser.id}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('User data exported successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to export data')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!selectedUser) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/v1/admin/compliance/delete?userId=${selectedUser.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete account')
      }

      toast.success('User account deleted successfully')
      setShowDeleteDialog(false)
      setSelectedUser(null)
      setSearchEmail('')
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete account')
    } finally {
      setIsDeleting(false)
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

  const foundUser = userData && userData.length > 0 ? userData[0] : null

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Compliance & Data Management</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          GDPR compliance tools for data export and account deletion
        </p>
      </div>

      {/* Search User */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Search User</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Find a user by email to perform compliance actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Enter user email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => {
              if (foundUser) {
                setSelectedUser(foundUser)
              }
            }} disabled={!foundUser}>
              Search
            </Button>
          </div>
          {foundUser && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="font-medium text-sm">{foundUser.name || 'No name'}</p>
              <p className="text-xs text-muted-foreground">{foundUser.email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Role: {foundUser.role} • Joined: {new Date(foundUser.createdAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {selectedUser && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <Download className="w-5 h-5" />
                Export User Data
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Download all user data in JSON format (GDPR compliance)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleExportData}
                disabled={isExporting}
                className="w-full"
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export Data'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-destructive" />
                Delete Account
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Permanently delete user account and all associated data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
                className="w-full"
                variant="destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Info Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            GDPR Compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>Data Export:</strong> Users can request their data to be exported. This includes all personal information, tasks, messages, and activity history.
            </p>
            <p>
              <strong>Right to Deletion:</strong> Users have the right to request account deletion. This action permanently removes all user data from the platform.
            </p>
            <p>
              <strong>Data Retention:</strong> Deleted accounts are permanently removed and cannot be recovered. Ensure you have proper backups before deletion.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User Account</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All user data will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="py-4">
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg mb-4">
                <p className="text-sm font-medium text-destructive mb-2">Warning: Permanent Deletion</p>
                <p className="text-xs text-muted-foreground">
                  This will delete:
                </p>
                <ul className="text-xs text-muted-foreground mt-2 list-disc list-inside space-y-1">
                  <li>User profile and account</li>
                  <li>All tasks (posted and assigned)</li>
                  <li>All messages and conversations</li>
                  <li>All reviews and ratings</li>
                  <li>All support tickets</li>
                  <li>All payment and payout records</li>
                </ul>
              </div>
              <div className="space-y-2 text-sm">
                <p><strong>User:</strong> {selectedUser.name || 'No name'}</p>
                <p><strong>Email:</strong> {selectedUser.email}</p>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete Account'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


