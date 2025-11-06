'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function TasksPage() {
  const [filters, setFilters] = useState({
    status: 'open',
    category: '',
    type: '',
  })

  const queryParams = new URLSearchParams()
  if (filters.status) queryParams.set('status', filters.status.toUpperCase())
  if (filters.category) queryParams.set('category', filters.category)
  if (filters.type) queryParams.set('type', filters.type)

  const { data: tasks, isLoading } = useSWR(
    `/api/v1/tasks?${queryParams.toString()}`,
    fetcher
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Browse Tasks</h1>
          <p className="text-muted-foreground">
            Find development tasks that match your skills
          </p>
        </div>
        <Link href="/tasks/new">
          <Button>Post a Task</Button>
        </Link>
      </div>

      <div className="mb-6 flex gap-4">
        <Input
          placeholder="Search tasks..."
          className="max-w-sm"
        />
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">All Categories</option>
          <option value="Bug Fix">Bug Fix</option>
          <option value="Web Development">Web Development</option>
          <option value="Mobile App">Mobile App</option>
          <option value="DevOps">DevOps</option>
        </select>
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">All Types</option>
          <option value="VIRTUAL">Virtual</option>
          <option value="IN_PERSON">In-Person</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading tasks...</div>
      ) : tasks && tasks.length > 0 ? (
        <div className="grid gap-4">
          {tasks.map((task: any) => (
            <Card key={task.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <Link href={`/tasks/${task.id}`}>
                      <CardTitle className="hover:text-primary cursor-pointer">
                        {task.title}
                      </CardTitle>
                    </Link>
                    <CardDescription className="mt-1">
                      {task.category} • {task.type} • {task._count?.offers || 0} offers
                    </CardDescription>
                  </div>
                  {task.price && (
                    <div className="text-right">
                      <p className="text-2xl font-bold">{formatCurrency(task.price)}</p>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground line-clamp-2 mb-4">
                  {task.description}
                </p>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {task.client?.avatarUrl && (
                      <img
                        src={task.client.avatarUrl}
                        alt={task.client.name || 'Client'}
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {task.client?.name || 'Anonymous'}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(task.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No tasks found. Be the first to post one!
          </CardContent>
        </Card>
      )}
    </div>
  )
}

