'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { calculateFees, calculateAmountInCents } from '@/lib/stripe-fees'
import { Star, Wifi, Building2, Clock, MapPin, Calendar, Edit, Check, Tag } from 'lucide-react'
import toast from 'react-hot-toast'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

interface BookingFormData {
  taskType: 'VIRTUAL' | 'IN_PERSON'
  scheduledAt: string
  durationHours: number
  taskDetails: string
  category: string
  relevantSkills: string[] // Skills that match the worker's expertise
  address?: string
  unit?: string
  city?: string
  postalCode?: string
}

export default function BookWorkerPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const workerSlug = params?.slug as string

  const { data: worker, isLoading } = useSWR(
    workerSlug ? `/api/v1/developers/${workerSlug}` : null,
    fetcher
  )

  const [step, setStep] = useState<1 | 2>(1)
  const [formData, setFormData] = useState<BookingFormData>({
    taskType: 'VIRTUAL',
    scheduledAt: '',
    durationHours: 1,
    taskDetails: '',
    category: '',
    relevantSkills: [],
  })
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isCreatingBooking, setIsCreatingBooking] = useState(false)

  // Determine default task type when worker data loads
  useEffect(() => {
    if (worker) {
      const supportsRemote = !worker.serviceType || worker.serviceType === 'VIRTUAL' || worker.serviceType === 'BOTH'
      const supportsOnsite = worker.serviceType === 'IN_PERSON' || worker.serviceType === 'BOTH'

      setFormData(prev => ({
        ...prev,
        taskType: supportsRemote ? 'VIRTUAL' : supportsOnsite ? 'IN_PERSON' : 'VIRTUAL',
      }))
    }
  }, [worker])

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-4 md:py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm md:text-base text-muted-foreground mb-4">Please sign in to book a specialist</p>
            <Button onClick={() => router.push('/auth/signin')} size="sm" className="md:size-default">Sign In</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!worker || !worker.hourlyRate) {
    return (
      <div className="container mx-auto px-4 py-4 md:py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm md:text-base text-muted-foreground">Specialist not found or not available for direct booking</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const baseAmount = worker.hourlyRate * formData.durationHours
  const fees = calculateFees(baseAmount)
  const canProceed: boolean = Boolean(
    formData.scheduledAt &&
    formData.durationHours > 0 &&
    formData.taskDetails.trim().length > 0 &&
    formData.category
  )

  const handleStep1Submit = async () => {
    if (!canProceed) {
      toast.error('Please fill in all required fields')
      return
    }

    if (formData.taskType === 'IN_PERSON' && (!formData.address || !formData.city || !formData.postalCode)) {
      toast.error('Please provide complete address for on-site tasks')
      return
    }

    setIsCreatingBooking(true)
    try {
      const response = await fetch('/api/v1/book/worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerId: worker.id,
          ...formData,
          baseAmount,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create booking')
      }

      const data = await response.json()
      setClientSecret(data.clientSecret)
      setStep(2)
    } catch (error: any) {
      toast.error(error.message || 'Failed to create booking')
    } finally {
      setIsCreatingBooking(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-6xl">
      <div className="grid lg:grid-cols-3 gap-4 md:gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {step === 1 ? (
            <Step1Form
              formData={formData}
              setFormData={setFormData}
              worker={worker}
              onSubmit={handleStep1Submit}
              isLoading={isCreatingBooking}
              canProceed={canProceed}
            />
          ) : (
            <Step2Confirm
              formData={formData}
              worker={worker}
              baseAmount={baseAmount}
              fees={fees}
              clientSecret={clientSecret}
              onBack={() => setStep(1)}
            />
          )}
        </div>

        {/* Right Side Panel */}
        <div className="lg:col-span-1">
          <WorkerInfoPanel worker={worker} baseAmount={baseAmount} fees={fees} durationHours={formData.durationHours} />
        </div>
      </div>
    </div>
  )
}

function Step1Form({
  formData,
  setFormData,
  worker,
  onSubmit,
  isLoading,
  canProceed,
}: {
  formData: BookingFormData
  setFormData: (data: BookingFormData) => void
  worker: any
  onSubmit: () => void
  isLoading: boolean
  canProceed: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Task Type Toggle */}
        <div>
          <Label className="text-sm md:text-base font-semibold mb-3 block">
            Is this a remote task or on-site?
          </Label>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            {(!worker?.serviceType || worker.serviceType === 'VIRTUAL' || worker.serviceType === 'BOTH') && (
              <Button
                type="button"
                variant={formData.taskType === 'VIRTUAL' ? 'default' : 'outline'}
                onClick={() => setFormData({ ...formData, taskType: 'VIRTUAL' })}
                className="flex-1 text-sm md:text-base"
                disabled={worker?.serviceType === 'IN_PERSON'}
              >
                <Wifi className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                Remote
              </Button>
            )}
            {(worker?.serviceType === 'IN_PERSON' || worker?.serviceType === 'BOTH') && (
              <Button
                type="button"
                variant={formData.taskType === 'IN_PERSON' ? 'default' : 'outline'}
                onClick={() => setFormData({ ...formData, taskType: 'IN_PERSON' })}
                className="flex-1 text-sm md:text-base"
                disabled={!worker || worker.serviceType === 'VIRTUAL'}
              >
                <Building2 className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                On-site
              </Button>
            )}
          </div>
        </div>

        {/* Address Fields (only for on-site) */}
        {formData.taskType === 'IN_PERSON' && (
          <div className="space-y-3 md:space-y-4 p-3 md:p-4 border rounded-lg bg-muted/50">
            <Label className="text-sm md:text-base font-semibold">Your Task Location</Label>
            <div>
              <Label htmlFor="address">Street Address *</Label>
              <Input
                id="address"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main St"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="unit">Unit or Apt # (Optional)</Label>
              <Input
                id="unit"
                value={formData.unit || ''}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="Apt 4B"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="New York"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="postalCode">Postal Code *</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode || ''}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder="10001"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Category Selection */}
        <div>
          <Label htmlFor="category" className="text-sm md:text-base">Category *</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Select the category that best matches your needs
          </p>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            required
          >
            <option value="">Select a category...</option>
            <option value="Bug Fix">Bug Fix</option>
            <option value="Web Development">Web Development</option>
            <option value="Mobile App">Mobile App</option>
            <option value="DevOps">DevOps</option>
            <option value="Database">Database</option>
            <option value="API Integration">API Integration</option>
            <option value="UI/UX Design">UI/UX Design</option>
            <option value="Code Review">Code Review</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Relevant Skills - Show worker's skills for matching */}
        {worker?.skills && worker.skills.length > 0 && (
          <div>
            <Label className="text-sm md:text-base">Relevant Skills (Optional)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Select skills that match your task needs. This helps ensure proper matching.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {worker.skills.map((skill: any) => (
                <Badge
                  key={skill.id}
                  variant={formData.relevantSkills.includes(skill.skill) ? 'default' : 'outline'}
                  className="cursor-pointer text-xs"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      relevantSkills: formData.relevantSkills.includes(skill.skill)
                        ? formData.relevantSkills.filter((s) => s !== skill.skill)
                        : [...formData.relevantSkills, skill.skill],
                    })
                  }}
                >
                  <Tag className="w-3 h-3 mr-1" />
                  {skill.skill} ({skill.level})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Task Date & Time */}
        <div>
          <Label htmlFor="scheduledAt" className="text-sm md:text-base">Task Date & Time *</Label>
          <Input
            id="scheduledAt"
            type="datetime-local"
            value={formData.scheduledAt}
            onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
            className="mt-1 text-sm md:text-base"
            required
          />
        </div>

        {/* Task Duration */}
        <div>
          <Label htmlFor="durationHours" className="text-sm md:text-base">Task Duration (hours) *</Label>
          <Input
            id="durationHours"
            type="number"
            min="0.5"
            step="0.5"
            value={formData.durationHours}
            onChange={(e) => setFormData({ ...formData, durationHours: parseFloat(e.target.value) || 0 })}
            className="mt-1 text-sm md:text-base"
            required
          />
        </div>

        {/* Task Details */}
        <div>
          <Label htmlFor="taskDetails" className="text-sm md:text-base">Task Details *</Label>
          <Textarea
            id="taskDetails"
            value={formData.taskDetails}
            onChange={(e) => setFormData({ ...formData, taskDetails: e.target.value })}
            placeholder="Tell us the details of your task..."
            className="mt-1 min-h-[100px] md:min-h-[120px] text-sm md:text-base"
            required
          />
        </div>

        <Button
          onClick={onSubmit}
          disabled={!canProceed || isLoading}
          className="w-full text-sm md:text-base"
          size="lg"
        >
          {isLoading ? 'Creating Booking...' : 'Continue to Payment'}
        </Button>
      </CardContent>
    </Card>
  )
}

function Step2Confirm({
  formData,
  worker,
  baseAmount,
  fees,
  clientSecret,
  onBack,
}: {
  formData: BookingFormData
  worker: any
  baseAmount: number
  fees: any
  clientSecret: string | null
  onBack: () => void
}) {
  if (!clientSecret) {
    return <div>Loading payment form...</div>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg md:text-xl">Confirm & Pay</CardTitle>
          <Button variant="ghost" size="sm" onClick={onBack} className="w-full sm:w-auto text-xs md:text-sm">
            <Edit className="w-3 h-3 md:w-4 md:h-4 mr-2" />
            Edit Details
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 md:space-y-6">
        {/* Task Summary */}
        <div className="space-y-2 p-3 md:p-4 border rounded-lg">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={formData.taskType === 'VIRTUAL' ? 'outline' : 'default'} className="text-xs">
              {formData.taskType === 'VIRTUAL' ? <Wifi className="w-3 h-3 mr-1" /> : <Building2 className="w-3 h-3 mr-1" />}
              {formData.taskType === 'VIRTUAL' ? 'Remote' : 'On-site'}
            </Badge>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs md:text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
              <span>{new Date(formData.scheduledAt).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs md:text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{formData.durationHours} {formData.durationHours === 1 ? 'hour' : 'hours'}</span>
          </div>
          {formData.taskType === 'IN_PERSON' && formData.address && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 mt-0.5" />
              <span>
                {formData.address}
                {formData.unit && `, ${formData.unit}`}
                {formData.city && `, ${formData.city}`}
                {formData.postalCode && ` ${formData.postalCode}`}
              </span>
            </div>
          )}
          <div className="mt-2 pt-2 border-t">
            <p className="text-sm font-medium">Category:</p>
            <Badge variant="secondary" className="mt-1">
              {formData.category}
            </Badge>
            {formData.relevantSkills.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium mb-1">Relevant Skills:</p>
                <div className="flex flex-wrap gap-1">
                  {formData.relevantSkills.map((skill) => (
                    <Badge key={skill} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <p className="text-sm font-medium mt-3">Task Details:</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{formData.taskDetails}</p>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="space-y-2 p-3 md:p-4 border rounded-lg">
          <div className="flex justify-between text-xs md:text-sm">
            <span className="break-words">Hourly Rate × {formData.durationHours} hours</span>
            <span className="ml-2 flex-shrink-0">{formatCurrency(baseAmount)}</span>
          </div>
          <div className="flex justify-between text-xs md:text-sm text-muted-foreground">
            <span>Trust & Support Fee (15%)</span>
            <span className="ml-2 flex-shrink-0">{formatCurrency(fees.trustAndSupportFee)}</span>
          </div>
          <div className="flex justify-between text-xs md:text-sm text-muted-foreground">
            <span>Processing Fee</span>
            <span className="ml-2 flex-shrink-0">{formatCurrency(fees.stripeFee)}</span>
          </div>
          <div className="flex justify-between font-bold text-base md:text-lg pt-2 border-t">
            <span>Total</span>
            <span className="text-primary ml-2 flex-shrink-0">{formatCurrency(fees.totalAmount)}</span>
          </div>
        </div>

        {/* Payment Form */}
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentForm clientSecret={clientSecret} fees={fees} />
        </Elements>
      </CardContent>
    </Card>
  )
}

function PaymentForm({ clientSecret, fees }: { clientSecret: string; fees: any }) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setIsProcessing(true)
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard/orders?success=true`,
        },
        redirect: 'if_required',
      })

      if (error) {
        toast.error(error.message || 'Payment failed')
      } else if (paymentIntent?.status === 'succeeded') {
        toast.success('Payment successful! Task created.')
        router.push('/dashboard/orders?success=true')
      }
    } catch (error: any) {
      toast.error(error.message || 'Payment failed')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" disabled={!stripe || isProcessing} className="w-full" size="lg">
        {isProcessing ? 'Processing...' : `Pay ${formatCurrency(fees.totalAmount)}`}
      </Button>
    </form>
  )
}

function WorkerInfoPanel({
  worker,
  baseAmount,
  fees,
  durationHours,
}: {
  worker: any
  baseAmount: number
  fees: any
  durationHours: number
}) {
  return (
    <Card className="sticky top-20 md:top-24">
      <CardHeader>
        <div className="flex items-center gap-3 md:gap-4">
          {worker.avatarUrl ? (
            <img
              src={worker.avatarUrl}
              alt={worker.name || 'Worker'}
              className="w-12 h-12 md:w-16 md:h-16 rounded-full flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-lg md:text-2xl font-semibold">
                {worker.name?.[0]?.toUpperCase() || worker.email[0].toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base md:text-lg break-words">{worker.name || 'Worker'}</CardTitle>
            <div className="flex items-center gap-1 text-xs md:text-sm">
              <Star className="w-3 h-3 md:w-4 md:h-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
              <span>{worker.rating?.toFixed(1) || '0.0'}</span>
              <span className="text-muted-foreground">({worker.ratingCount || 0} reviews)</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4">
        <div>
          <p className="text-xs md:text-sm text-muted-foreground">Tasks Completed</p>
          <p className="text-xl md:text-2xl font-bold">{worker._count?.tasksAssigned || 0}</p>
        </div>

        <div>
          <p className="text-xs md:text-sm text-muted-foreground">Hourly Rate</p>
          <p className="text-xl md:text-2xl font-bold text-primary">
            {formatCurrency(worker.hourlyRate)}/hour
          </p>
        </div>

        {durationHours > 0 && (
          <div className="pt-3 md:pt-4 border-t">
            <p className="text-xs md:text-sm text-muted-foreground mb-2">Estimated Cost</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs md:text-sm">
                <span className="break-words">{formatCurrency(worker.hourlyRate)} × {durationHours} hrs</span>
                <span className="ml-2 flex-shrink-0">{formatCurrency(baseAmount)}</span>
              </div>
              <div className="flex justify-between text-xs md:text-sm text-muted-foreground">
                <span>+ Fees</span>
                <span className="ml-2 flex-shrink-0">{formatCurrency(fees.trustAndSupportFee + fees.stripeFee)}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t text-sm md:text-base">
                <span>Total</span>
                <span className="text-primary ml-2 flex-shrink-0">{formatCurrency(fees.totalAmount)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

