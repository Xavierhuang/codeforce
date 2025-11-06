'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import toast from 'react-hot-toast'

type FormData = {
  title: string
  description: string
  type: 'VIRTUAL' | 'IN_PERSON'
  category: string
  subcategory?: string
  scheduledAt?: string
  price?: number
  address?: string
  lat?: number
  lng?: number
  estimatedDurationMins?: number
}

const CATEGORIES = [
  'Bug Fix',
  'Web Development',
  'Mobile App',
  'DevOps',
  'Database',
  'API Integration',
  'UI/UX Design',
  'Code Review',
  'Other',
]

export const TaskCreateForm: React.FC = () => {
  const router = useRouter()
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      type: 'VIRTUAL',
    },
  })

  const taskType = watch('type')

  const onSubmit = async (data: FormData) => {
    try {
      const response = await fetch('/api/v1/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create task')
      }

      const task = await response.json()
      toast.success('Task created successfully!')
      router.push(`/tasks/${task.id}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to create task')
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Post a New Task</CardTitle>
        <CardDescription>
          Describe what you need help with. Developers will submit offers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...register('title', { required: 'Title is required' })}
              placeholder="e.g., Fix React component bug"
              className="mt-1"
            />
            {errors.title && (
              <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              {...register('description', { required: 'Description is required' })}
              placeholder="Describe the problem, what you've tried, and what you need..."
              className="mt-1 min-h-[120px]"
            />
            {errors.description && (
              <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <Select
              onValueChange={(value) => setValue('category', value)}
              required
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="virtual"
                value="VIRTUAL"
                {...register('type')}
                className="w-4 h-4"
              />
              <Label htmlFor="virtual" className="cursor-pointer">
                Virtual
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="in-person"
                value="IN_PERSON"
                {...register('type')}
                className="w-4 h-4"
              />
              <Label htmlFor="in-person" className="cursor-pointer">
                In-Person
              </Label>
            </div>
          </div>

          {taskType === 'IN_PERSON' && (
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                {...register('address')}
                placeholder="Enter street address"
                className="mt-1"
              />
            </div>
          )}

          <div>
            <Label htmlFor="price">Budget (Optional)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              {...register('price', { valueAsNumber: true })}
              placeholder="0.00"
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Leave blank to receive offers from developers
            </p>
          </div>

          <div>
            <Label htmlFor="scheduledAt">Schedule (Optional)</Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              {...register('scheduledAt')}
              className="mt-1"
            />
          </div>

          <Button type="submit" className="w-full">
            Post Task
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

