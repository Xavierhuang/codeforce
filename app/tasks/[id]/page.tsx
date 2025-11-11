'use client'

import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { TaskDetail } from '@/components/TaskDetail'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch task' }))
    console.error('API Error Response:', error)
    throw new Error(error.error || error.message || error.details || `HTTP ${res.status}`)
  }
  return res.json()
}

export default function TaskPage() {
  const params = useParams()
  const id = params?.id as string
  const { data, error, isLoading } = useSWR(
    id ? `/api/v1/tasks/${id}` : null,
    fetcher
  )

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="text-center">
          <div className="text-destructive text-lg font-semibold mb-2">
            {error ? 'Error loading task' : 'Task not found'}
          </div>
          {error && typeof error === 'object' && 'message' in error && (
            <div className="text-sm text-muted-foreground mb-4">
              {String(error.message)}
            </div>
          )}
          {error && typeof error === 'object' && 'details' in error && (
            <div className="text-xs text-muted-foreground mb-4">
              {String(error.details)}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-8" suppressHydrationWarning>
      <TaskDetail task={data} />
    </div>
  )
}

