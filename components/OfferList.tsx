'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { OfferForm } from './OfferForm'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { PaymentForm } from './PaymentForm'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface OfferListProps {
  taskId: string
  isClient: boolean
}

export function OfferList({ taskId, isClient }: OfferListProps) {
  const { data: session } = useSession()
  const { data: offers, mutate } = useSWR(
    taskId ? `/api/v1/tasks/${taskId}/offers` : null,
    fetcher
  )

  const [showOfferForm, setShowOfferForm] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState<{ id: string; clientSecret: string; amount: number } | null>(null)

  const handleAcceptOffer = async (offerId: string) => {
    try {
      const response = await fetch(`/api/v1/tasks/${taskId}/accept-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to accept offer')
      }

      const { clientSecret, paymentIntentId } = await response.json()
      
      // Find the offer to get the amount
      const offer = offers?.find((o: any) => o.id === offerId)
      if (!offer) {
        throw new Error('Offer not found')
      }

      // Calculate total amount (matches backend calculation)
      // Using same fee rates as backend for consistency
      const platformFeeRate = 0.15
      const stripeFeeRate = 0.029
      const stripeFeeFixed = 0.30
      const baseAmount = offer.price
      const platformFee = baseAmount * platformFeeRate
      const stripeFee = baseAmount * stripeFeeRate + stripeFeeFixed
      const totalAmount = Math.round((baseAmount + platformFee + stripeFee) * 100)

      setSelectedOffer({
        id: offerId,
        clientSecret,
        amount: totalAmount,
      })
    } catch (error: any) {
      toast.error(error.message || 'Failed to accept offer')
    }
  }

  const handlePaymentSuccess = () => {
    setSelectedOffer(null)
    mutate()
  }

  const handlePaymentCancel = () => {
    setSelectedOffer(null)
  }

  if (!session) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Please sign in to view offers
        </CardContent>
      </Card>
    )
  }

  // Show payment form if offer is selected
  if (selectedOffer) {
    return (
      <PaymentForm
        clientSecret={selectedOffer.clientSecret}
        amount={selectedOffer.amount}
        onSuccess={handlePaymentSuccess}
        onCancel={handlePaymentCancel}
      />
    )
  }

  return (
    <div className="space-y-4">
      {!isClient && !offers?.some((o: any) => o.workerId === session.user?.id) && (
        <Card>
          <CardHeader>
            <CardTitle>Make an Offer</CardTitle>
          </CardHeader>
          <CardContent>
            {showOfferForm ? (
              <OfferForm
                taskId={taskId}
                onSuccess={() => {
                  setShowOfferForm(false)
                  mutate()
                }}
                onCancel={() => setShowOfferForm(false)}
              />
            ) : (
              <Button onClick={() => setShowOfferForm(true)}>Submit Offer</Button>
            )}
          </CardContent>
        </Card>
      )}

      {offers && offers.length > 0 ? (
        <div className="space-y-4">
          {offers.map((offer: any) => (
            <Card key={offer.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    {offer.worker?.avatarUrl && (
                      <img
                        src={offer.worker.avatarUrl}
                        alt={offer.worker.name || 'Developer'}
                        className="w-10 h-10 rounded-full"
                      />
                    )}
                    <div>
                      <CardTitle className="text-lg">{offer.worker?.name || 'Developer'}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Rating: {offer.worker?.rating?.toFixed(1)} ({offer.worker?.ratingCount} reviews)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{formatCurrency(offer.price)}</p>
                    {offer.hourly && <p className="text-sm text-muted-foreground">per hour</p>}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {offer.message && (
                  <p className="text-muted-foreground mb-4">{offer.message}</p>
                )}
                {offer.estimatedDurationMins && (
                  <p className="text-sm text-muted-foreground mb-4">
                    Estimated duration: {Math.round(offer.estimatedDurationMins / 60)} hours
                  </p>
                )}
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(offer.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                  {isClient && offer.status === 'PENDING' && (
                    <Button onClick={() => handleAcceptOffer(offer.id)}>
                      Accept Offer
                    </Button>
                  )}
                  {offer.status === 'ACCEPTED' && (
                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm">
                      Accepted
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No offers yet
          </CardContent>
        </Card>
      )}
    </div>
  )
}

