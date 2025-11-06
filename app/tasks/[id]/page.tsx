'use client'

import { use } from 'react'
import useSWR from 'swr'
import { TaskDetail } from '@/components/TaskDetail'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, error, isLoading } = useSWR(
    id ? `/api/v1/tasks/${id}` : null,
    fetcher
  )

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-destructive">
          {error ? 'Error loading task' : 'Task not found'}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <TaskDetail task={data} />
    </div>
  )
}

