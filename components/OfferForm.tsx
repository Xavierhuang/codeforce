'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import toast from 'react-hot-toast'

interface OfferFormProps {
  taskId: string
  onSuccess: () => void
  onCancel: () => void
}

type FormData = {
  price: number
  hourly: boolean
  message?: string
  estimatedDurationMins?: number
}

export function OfferForm({ taskId, onSuccess, onCancel }: OfferFormProps) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      hourly: false,
    },
  })

  const isHourly = watch('hourly')

  const onSubmit = async (data: FormData) => {
    try {
      const response = await fetch(`/api/v1/tasks/${taskId}/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit offer')
      }

      toast.success('Offer submitted successfully!')
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit offer')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="price">Price *</Label>
        <div className="flex gap-2 mt-1">
          <Input
            id="price"
            type="number"
            step="0.01"
            {...register('price', {
              required: 'Price is required',
              valueAsNumber: true,
              min: { value: 0.01, message: 'Price must be greater than 0' },
            })}
            placeholder="0.00"
            className="flex-1"
          />
        </div>
        {errors.price && (
          <p className="text-sm text-destructive mt-1">{errors.price.message}</p>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="hourly"
          {...register('hourly')}
          className="w-4 h-4"
        />
        <Label htmlFor="hourly" className="cursor-pointer">
          Hourly rate
        </Label>
      </div>

      {isHourly && (
        <div>
          <Label htmlFor="estimatedDurationMins">Estimated Duration (minutes)</Label>
          <Input
            id="estimatedDurationMins"
            type="number"
            {...register('estimatedDurationMins', {
              valueAsNumber: true,
              min: { value: 1, message: 'Duration must be at least 1 minute' },
            })}
            placeholder="60"
            className="mt-1"
          />
        </div>
      )}

      <div>
        <Label htmlFor="message">Message (Optional)</Label>
        <Textarea
          id="message"
          {...register('message')}
          placeholder="Tell the client why you're a good fit for this task..."
          className="mt-1"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit">Submit Offer</Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

