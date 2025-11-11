'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

interface PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientSecret: string
  fees: {
    baseAmount: number
    platformFee: number
    trustAndSupportFee: number
    stripeFee: number
    totalAmount: number
  }
  taskTitle: string
  onSuccess: () => void
}

function PaymentForm({ clientSecret, fees, taskTitle, onSuccess, onClose }: {
  clientSecret: string
  fees: PaymentModalProps['fees']
  taskTitle: string
  onSuccess: () => void
  onClose: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!stripe || !elements) {
      return
    }

    setLoading(true)
    setError(null)

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: 'if_required',
    })

    if (submitError) {
      setError(submitError.message || 'Payment failed')
      setLoading(false)
    } else {
      toast.success('Payment successful! Task assigned.')
      onSuccess()
      onClose()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Task Price</span>
            <span className="font-medium">{formatCurrency(fees.baseAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Platform Fee (15%)</span>
            <span className="font-medium">{formatCurrency(fees.trustAndSupportFee)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Stripe Fee</span>
            <span className="font-medium">{formatCurrency(fees.stripeFee)}</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatCurrency(fees.totalAmount)}</span>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <PaymentElement />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            {error}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="flex-1"
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={!stripe || loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay ${formatCurrency(fees.totalAmount)}`
          )}
        </Button>
      </div>
    </form>
  )
}

export function PaymentModal({ open, onOpenChange, clientSecret, fees, taskTitle, onSuccess }: PaymentModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogClose onOpenChange={onOpenChange} />
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
          <DialogDescription>
            Pay for "{taskTitle}" to assign the task to the developer
          </DialogDescription>
        </DialogHeader>
        
        {clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm
              clientSecret={clientSecret}
              fees={fees}
              taskTitle={taskTitle}
              onSuccess={onSuccess}
              onClose={() => onOpenChange(false)}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  )
}




