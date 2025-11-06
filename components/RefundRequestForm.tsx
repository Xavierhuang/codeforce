'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'

interface RefundRequestFormProps {
  taskId: string
  taskPrice: number
  onSuccess?: () => void
  onCancel?: () => void
}

export function RefundRequestForm({
  taskId,
  taskPrice,
  onSuccess,
  onCancel,
}: RefundRequestFormProps) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [amount, setAmount] = useState(taskPrice.toString())
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!reason.trim()) {
      toast.error('Please provide a reason for the refund request')
      return
    }

    const refundAmount = parseFloat(amount)
    if (isNaN(refundAmount) || refundAmount <= 0 || refundAmount > taskPrice) {
      toast.error('Invalid refund amount')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/v1/tasks/${taskId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: reason.trim(),
          amount: refundAmount,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to request refund')
      }

      toast.success('Refund request submitted successfully')
      
      if (onSuccess) {
        onSuccess()
      } else {
        router.refresh()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to request refund')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Refund</CardTitle>
        <CardDescription>
          Submit a refund request for this task. The refund will be reviewed and processed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Refund Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                max={taskPrice}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Maximum refund amount: ${taskPrice.toFixed(2)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Refund</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please explain why you are requesting a refund..."
              rows={4}
              required
              className="resize-none"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Submitting...' : 'Submit Refund Request'}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Your refund request will be reviewed. You will be notified once a decision is made.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}

