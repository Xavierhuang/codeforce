'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { OfferForm } from './OfferForm'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { CheckCircle2, Star, User, Clock, DollarSign, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { AvatarDisplay } from '@/components/AvatarDisplay'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    // Return empty array for 403/404 errors instead of throwing
    if (res.status === 403 || res.status === 404) {
      return []
    }
    throw new Error('Failed to fetch')
  }
  return res.json()
}

interface OfferListProps {
  taskId: string
  isClient: boolean
  onAcceptOffer?: (offerId: string) => void
  acceptingOfferId?: string | null
}

export function OfferList({ taskId, isClient, onAcceptOffer, acceptingOfferId: externalAcceptingOfferId }: OfferListProps) {
  const { data: session } = useSession()
  const { data: offers, mutate } = useSWR(
    taskId ? `/api/v1/tasks/${taskId}/offers` : null,
    fetcher
  )
  const [showOfferForm, setShowOfferForm] = useState(false)
  const [internalAcceptingOfferId, setInternalAcceptingOfferId] = useState<string | null>(null)

  // Use external acceptingOfferId if provided, otherwise use internal state
  const acceptingOfferId = externalAcceptingOfferId !== undefined ? externalAcceptingOfferId : internalAcceptingOfferId

  const handleAcceptOffer = async (offerId: string) => {
    if (!confirm('Are you sure you want to accept this offer? This will create a payment and assign the task to the developer.')) {
      return
    }

    // If parent provided handler, use it
    if (onAcceptOffer) {
      onAcceptOffer(offerId)
      return
    }

    // Otherwise use internal handler
    setInternalAcceptingOfferId(offerId)
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

      toast.success('Offer accepted! Task assigned to developer.')
      mutate()
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to accept offer')
    } finally {
      setInternalAcceptingOfferId(null)
    }
  }

  if (!taskId) {
    return null
  }

  const pendingOffers = Array.isArray(offers) ? offers.filter((o: any) => o.status === 'PENDING') : []
  const acceptedOffers = Array.isArray(offers) ? offers.filter((o: any) => o.status === 'ACCEPTED') : []
  const declinedOffers = Array.isArray(offers) ? offers.filter((o: any) => o.status === 'DECLINED') : []

  return (
    <div className="space-y-6">
      {/* Submit Offer Button for Workers */}
      {!isClient && !showOfferForm && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <Button onClick={() => setShowOfferForm(true)} className="w-full" size="lg">
              Submit an Offer
            </Button>
          </CardContent>
        </Card>
      )}

      {showOfferForm && (
        <Card>
          <CardHeader>
            <CardTitle>Submit Your Offer</CardTitle>
          </CardHeader>
          <CardContent>
            <OfferForm
              taskId={taskId}
              onSuccess={() => {
                setShowOfferForm(false)
                mutate()
              }}
              onCancel={() => setShowOfferForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Pending Offers Section */}
      {pendingOffers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Pending Offers ({pendingOffers.length})
            </h3>
            {isClient && (
              <p className="text-sm text-muted-foreground">
                Review and accept the best offer
              </p>
            )}
          </div>
          {pendingOffers.map((offer: any) => (
            <Card 
              key={offer.id} 
              className={`border-2 transition-all ${
                isClient 
                  ? 'border-primary/30 hover:border-primary/50 hover:shadow-lg' 
                  : ''
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                  <div className="flex-1 space-y-4">
                    {/* Developer Info */}
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-full border-2 border-background overflow-hidden">
                        <AvatarDisplay
                          src={offer.worker?.avatarUrl || undefined}
                          alt={offer.worker?.name || 'Developer'}
                          fallback={offer.worker?.name?.[0]?.toUpperCase() || 'D'}
                          className="w-full h-full"
                          cropX={offer.worker?.avatarCropX ?? undefined}
                          cropY={offer.worker?.avatarCropY ?? undefined}
                          cropScale={offer.worker?.avatarCropScale ?? undefined}
                          size={64}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-lg">{offer.worker?.name || 'Anonymous'}</h4>
                          {offer.worker?.verificationStatus === 'VERIFIED' && (
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              <ShieldCheck className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        {offer.worker?.rating && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{offer.worker.rating.toFixed(1)}</span>
                            </div>
                            <span>({offer.worker.ratingCount || 0} reviews)</span>
                          </div>
                        )}
                        {offer.worker?.slug && (
                          <Link 
                            href={`/developers/${offer.worker.slug}`}
                            className="text-sm text-primary hover:underline mt-1 inline-block"
                          >
                            View Profile →
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-bold text-primary">
                        {formatCurrency(offer.price)}
                      </span>
                      {offer.hourly && (
                        <span className="text-muted-foreground">per hour</span>
                      )}
                      {offer.estimatedDurationMins && (
                        <span className="text-sm text-muted-foreground">
                          (~{Math.round(offer.estimatedDurationMins / 60)} hours)
                        </span>
                      )}
                    </div>

                    {/* Message */}
                    {offer.message && (
                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{offer.message}</p>
                      </div>
                    )}

                    {/* Skills */}
                    {offer.worker?.skills && offer.worker.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {offer.worker.skills.slice(0, 6).map((skill: any) => (
                          <Badge key={skill.id} variant="outline" className="text-xs">
                            {skill.skill}
                          </Badge>
                        ))}
                        {offer.worker.skills.length > 6 && (
                          <Badge variant="outline" className="text-xs">
                            +{offer.worker.skills.length - 6} more
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>Submitted {format(new Date(offer.createdAt), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  </div>

                  {/* Accept Button - Very Prominent */}
                  {isClient && offer.status === 'PENDING' && (
                    <div className="flex flex-col gap-2 md:w-48">
                      <Button
                        onClick={() => handleAcceptOffer(offer.id)}
                        disabled={acceptingOfferId === offer.id}
                        size="lg"
                        className="w-full"
                      >
                        {acceptingOfferId === offer.id ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            Accepting...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5 mr-2" />
                            Accept Offer
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-center text-muted-foreground">
                        You'll be redirected to payment
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Accepted Offers */}
      {acceptedOffers.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-muted-foreground">
            Accepted Offer
          </h3>
          {acceptedOffers.map((offer: any) => (
            <Card key={offer.id} className="border-green-200 bg-green-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {offer.worker?.avatarUrl && (
                      <img
                        src={offer.worker.avatarUrl}
                        alt={offer.worker.name || 'Developer'}
                        className="w-12 h-12 rounded-full"
                      />
                    )}
                    <div>
                      <p className="font-semibold">{offer.worker?.name || 'Anonymous'}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(offer.price)} • Accepted
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Accepted
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Offers */}
      {offers && Array.isArray(offers) && offers.length === 0 && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No offers yet</h3>
              <p className="text-muted-foreground mb-6">
                Be the first to submit an offer for this task!
              </p>
              {!isClient && !showOfferForm && (
                <Button onClick={() => setShowOfferForm(true)}>
                  Submit an Offer
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
