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
import { Star, Wifi, Building2, Clock, MapPin, Calendar, Edit, Check, Tag, AlertCircle, Info, FileText, DollarSign } from 'lucide-react'
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
  weeklyHourLimit?: number // Optional weekly hour limit for hourly work
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

  const { data: currentUser } = useSWR(
    session ? '/api/v1/users/me' : null,
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
    weeklyHourLimit: undefined,
  })
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isCreatingBooking, setIsCreatingBooking] = useState(false)
  const [serverFees, setServerFees] = useState<any>(null) // Store fees from server

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
  // Use server fees if available, otherwise calculate client-side (for preview only)
  const fees = serverFees || calculateFees(baseAmount)
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

    // Check if buyer needs verification
    if (currentUser && currentUser.verificationStatus !== 'VERIFIED') {
      toast.error('You must be verified before booking experts. Please complete verification in your dashboard.')
      router.push('/dashboard/verify')
      return
    }

    setIsCreatingBooking(true)
    try {
      console.log('[PAYMENT] Creating booking request:', {
        workerId: worker.id,
        baseAmount,
        durationHours: formData.durationHours,
        taskType: formData.taskType,
      })

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
        console.error('[PAYMENT] Booking creation failed:', error)
        
        // If verification error, redirect to verification page
        if (response.status === 403 && error.error?.includes('verified')) {
          toast.error(error.error)
          router.push('/dashboard/verify')
          return
        }
        
        throw new Error(error.error || 'Failed to create booking')
      }

      const data = await response.json()
      console.log('[PAYMENT] Booking created successfully:', {
        paymentIntentId: data.paymentIntentId,
        clientSecret: data.clientSecret ? '***' : null,
        fees: data.fees,
        displayedTotal: data.fees?.totalAmount,
        paymentIntentAmount: data.fees?.totalAmount ? Math.round(data.fees.totalAmount * 100) : null,
      })

      // IMPORTANT: Use fees from server to ensure consistency
      setServerFees(data.fees)
      setClientSecret(data.clientSecret)
      setStep(2)
    } catch (error: any) {
      console.error('[PAYMENT] Error creating booking:', error)
      toast.error(error.message || 'Failed to create booking')
    } finally {
      setIsCreatingBooking(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-7xl">
      {/* Progress Stepper */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center justify-center max-w-2xl mx-auto overflow-x-auto px-2 sm:px-0">
          <div className="flex items-center flex-1 min-w-[260px] sm:min-w-0">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
              step >= 1 ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30 text-muted-foreground'
            }`}>
              {step > 1 ? <Check className="w-5 h-5" /> : <span className="font-semibold">1</span>}
            </div>
            <div className={`flex-1 h-1 mx-2 transition-all ${
              step >= 2 ? 'bg-primary' : 'bg-muted-foreground/30'
            }`} />
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
              step >= 2 ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30 text-muted-foreground'
            }`}>
              {step > 2 ? <Check className="w-5 h-5" /> : <span className="font-semibold">2</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 text-center sm:flex-row sm:justify-between sm:text-left max-w-2xl mx-auto mt-2">
          <span className={`text-xs md:text-sm font-medium ${step >= 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
            Task Details
          </span>
          <span className={`text-xs md:text-sm font-medium ${step >= 2 ? 'text-foreground' : 'text-muted-foreground'}`}>
            Payment
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
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
              fees={serverFees || fees}
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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const validateField = (field: string, value: any) => {
    const errors: Record<string, string> = {}
    
    switch (field) {
      case 'scheduledAt':
        if (!value) {
          errors.scheduledAt = 'Please select a date and time'
        } else if (new Date(value) < new Date()) {
          errors.scheduledAt = 'Please select a future date and time'
        }
        break
      case 'durationHours':
        if (!value || value <= 0) {
          errors.durationHours = 'Duration must be greater than 0'
        } else if (value < 0.5) {
          errors.durationHours = 'Minimum duration is 0.5 hours'
        }
        break
      case 'taskDetails':
        if (!value || value.trim().length < 10) {
          errors.taskDetails = 'Please provide at least 10 characters of task details'
        }
        break
      case 'category':
        if (!value) {
          errors.category = 'Please select a category'
        }
        break
      case 'address':
        if (formData.taskType === 'IN_PERSON' && (!value || value.trim().length === 0)) {
          errors.address = 'Address is required for on-site tasks'
        }
        break
      case 'city':
        if (formData.taskType === 'IN_PERSON' && (!value || value.trim().length === 0)) {
          errors.city = 'City is required for on-site tasks'
        }
        break
      case 'postalCode':
        if (formData.taskType === 'IN_PERSON' && (!value || value.trim().length === 0)) {
          errors.postalCode = 'Postal code is required for on-site tasks'
        }
        break
    }
    
    setValidationErrors(prev => ({ ...prev, ...errors }))
    return Object.keys(errors).length === 0
  }

  const handleFieldChange = (field: keyof BookingFormData, value: any) => {
    setFormData({ ...formData, [field]: value })
    // Clear error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
    // Validate field
    validateField(field, value)
  }

  return (
    <Card className="shadow-lg border-2">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
        <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
          <Calendar className="w-5 h-5 md:w-6 md:h-6" />
          Task Details
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Fill in the details below to book {worker?.name || 'this specialist'}
        </p>
      </CardHeader>
      <CardContent className="space-y-6 md:space-y-8 pt-6">
        {/* Task Type Toggle */}
        <div>
          <Label className="text-sm md:text-base font-semibold mb-3 block flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Task Type *
          </Label>
          <div className="flex flex-col sm:flex-row gap-3">
            {(!worker?.serviceType || worker.serviceType === 'VIRTUAL' || worker.serviceType === 'BOTH') && (
              <Button
                type="button"
                variant={formData.taskType === 'VIRTUAL' ? 'default' : 'outline'}
                onClick={() => handleFieldChange('taskType', 'VIRTUAL')}
                className={`flex-1 h-12 md:h-14 text-sm md:text-base transition-all ${
                  formData.taskType === 'VIRTUAL' 
                    ? 'shadow-md scale-[1.02]' 
                    : 'hover:scale-[1.01]'
                }`}
                disabled={worker?.serviceType === 'IN_PERSON'}
              >
                <Wifi className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                <div className="text-left">
                  <div className="font-semibold">Remote</div>
                  <div className="text-xs opacity-80">Work from anywhere</div>
                </div>
              </Button>
            )}
            {(worker?.serviceType === 'IN_PERSON' || worker?.serviceType === 'BOTH') && (
              <Button
                type="button"
                variant={formData.taskType === 'IN_PERSON' ? 'default' : 'outline'}
                onClick={() => handleFieldChange('taskType', 'IN_PERSON')}
                className={`flex-1 h-12 md:h-14 text-sm md:text-base transition-all ${
                  formData.taskType === 'IN_PERSON' 
                    ? 'shadow-md scale-[1.02]' 
                    : 'hover:scale-[1.01]'
                }`}
                disabled={!worker || worker.serviceType === 'VIRTUAL'}
              >
                <Building2 className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                <div className="text-left">
                  <div className="font-semibold">On-site</div>
                  <div className="text-xs opacity-80">In-person service</div>
                </div>
              </Button>
            )}
          </div>
        </div>

        {/* Address Fields (only for on-site) */}
        {formData.taskType === 'IN_PERSON' && (
          <div className="space-y-4 p-4 md:p-6 border-2 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-primary" />
              <Label className="text-base md:text-lg font-semibold">Task Location</Label>
            </div>
            <div>
              <Label htmlFor="address" className="text-sm font-medium">
                Street Address *
              </Label>
              <Input
                id="address"
                value={formData.address || ''}
                onChange={(e) => handleFieldChange('address', e.target.value)}
                onBlur={() => validateField('address', formData.address)}
                placeholder="123 Main St"
                className={`mt-2 ${validationErrors.address ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />
              {validationErrors.address && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.address}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="unit" className="text-sm font-medium">
                Unit or Apt # <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="unit"
                value={formData.unit || ''}
                onChange={(e) => handleFieldChange('unit', e.target.value)}
                placeholder="Apt 4B"
                className="mt-2"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city" className="text-sm font-medium">City *</Label>
                <Input
                  id="city"
                  value={formData.city || ''}
                  onChange={(e) => handleFieldChange('city', e.target.value)}
                  onBlur={() => validateField('city', formData.city)}
                  placeholder="New York"
                  className={`mt-2 ${validationErrors.city ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {validationErrors.city && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.city}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="postalCode" className="text-sm font-medium">Postal Code *</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode || ''}
                  onChange={(e) => handleFieldChange('postalCode', e.target.value)}
                  onBlur={() => validateField('postalCode', formData.postalCode)}
                  placeholder="10001"
                  className={`mt-2 ${validationErrors.postalCode ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {validationErrors.postalCode && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.postalCode}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Category Selection */}
        <div>
          <Label htmlFor="category" className="text-sm md:text-base font-semibold flex items-center gap-2 mb-2">
            <Tag className="w-4 h-4" />
            Category *
          </Label>
          <p className="text-xs text-muted-foreground mb-3">
            Select the category that best matches your needs
          </p>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => handleFieldChange('category', e.target.value)}
            onBlur={() => validateField('category', formData.category)}
            className={`flex h-11 w-full rounded-lg border-2 bg-background px-4 py-2 text-sm font-medium transition-all ${
              validationErrors.category 
                ? 'border-red-500 focus-visible:ring-red-500' 
                : 'border-input focus-visible:ring-ring focus-visible:border-primary'
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
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
          {validationErrors.category && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {validationErrors.category}
            </p>
          )}
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
          <Label htmlFor="scheduledAt" className="text-sm md:text-base font-semibold flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4" />
            Task Date & Time *
          </Label>
          <Input
            id="scheduledAt"
            type="datetime-local"
            value={formData.scheduledAt}
            onChange={(e) => handleFieldChange('scheduledAt', e.target.value)}
            onBlur={() => validateField('scheduledAt', formData.scheduledAt)}
            className={`mt-2 h-11 text-sm md:text-base ${
              validationErrors.scheduledAt ? 'border-red-500 focus-visible:ring-red-500' : ''
            }`}
            required
          />
          {validationErrors.scheduledAt && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {validationErrors.scheduledAt}
            </p>
          )}
        </div>

        {/* Task Duration */}
        <div>
          <Label htmlFor="durationHours" className="text-sm md:text-base font-semibold flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4" />
            Task Duration (hours) *
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="durationHours"
              type="number"
              min="0.5"
              step="0.5"
              value={formData.durationHours}
              onChange={(e) => handleFieldChange('durationHours', parseFloat(e.target.value) || 0)}
              onBlur={() => validateField('durationHours', formData.durationHours)}
              className={`mt-2 h-11 text-sm md:text-base flex-1 ${
                validationErrors.durationHours ? 'border-red-500 focus-visible:ring-red-500' : ''
              }`}
              required
            />
            <div className="mt-2 text-sm text-muted-foreground">
              = {formatCurrency(worker?.hourlyRate * formData.durationHours || 0)}
            </div>
          </div>
          {validationErrors.durationHours && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {validationErrors.durationHours}
            </p>
          )}
        </div>

        {/* Weekly Hour Limit (Optional) */}
        <div>
          <div className="flex items-start gap-2 mb-2">
            <Label htmlFor="weeklyHourLimit" className="text-sm md:text-base font-semibold flex items-center gap-2">
              <Info className="w-4 h-4" />
              Weekly Hour Limit <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
          </div>
          <div className="space-y-2">
            <Input
              id="weeklyHourLimit"
              type="number"
              min="1"
              step="1"
              value={formData.weeklyHourLimit || ''}
              onChange={(e) => handleFieldChange('weeklyHourLimit', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="e.g., 20 hours per week"
              className="mt-2 h-11 text-sm md:text-base"
            />
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-800 dark:text-blue-200">
                Set a weekly limit to help manage expectations. The worker will report hours weekly, and you can adjust this limit after booking.
              </p>
            </div>
          </div>
        </div>

        {/* Task Details */}
        <div>
          <Label htmlFor="taskDetails" className="text-sm md:text-base font-semibold flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4" />
            Task Details *
          </Label>
          <Textarea
            id="taskDetails"
            value={formData.taskDetails}
            onChange={(e) => handleFieldChange('taskDetails', e.target.value)}
            onBlur={() => validateField('taskDetails', formData.taskDetails)}
            placeholder="Describe your task in detail. Include requirements, deliverables, timeline expectations, and any specific skills needed..."
            className={`mt-2 min-h-[120px] md:min-h-[150px] text-sm md:text-base resize-y ${
              validationErrors.taskDetails ? 'border-red-500 focus-visible:ring-red-500' : ''
            }`}
            required
          />
          <div className="flex items-center justify-between mt-1">
            {validationErrors.taskDetails ? (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {validationErrors.taskDetails}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {formData.taskDetails.length}/500 characters
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Minimum 10 characters required
            </p>
          </div>
        </div>

        {/* Continue Button */}
        <div className="pt-4 border-t">
          <Button
            onClick={onSubmit}
            disabled={!canProceed || isLoading}
            className="w-full h-12 md:h-14 text-base md:text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            size="lg"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating Booking...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                Continue to Payment
                <Check className="w-5 h-5" />
              </div>
            )}
          </Button>
          {!canProceed && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Please fill in all required fields to continue
            </p>
          )}
        </div>
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
  const [currentClientSecret, setCurrentClientSecret] = useState<string | null>(clientSecret)
  const [isRecreating, setIsRecreating] = useState(false)

  // Update client secret when it changes
  useEffect(() => {
    setCurrentClientSecret(clientSecret)
  }, [clientSecret])

  const handleRecreatePaymentIntent = async () => {
    setIsRecreating(true)
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
        throw new Error(error.error || 'Failed to recreate payment')
      }

      const data = await response.json()
      setCurrentClientSecret(data.clientSecret)
      toast.success('Payment form refreshed. Please try again.')
    } catch (error: any) {
      toast.error(error.message || 'Failed to recreate payment')
    } finally {
      setIsRecreating(false)
    }
  }

  if (!currentClientSecret) {
    return <div>Loading payment form...</div>
  }

  return (
    <Card className="shadow-lg border-2">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
              <Check className="w-5 h-5 md:w-6 md:h-6" />
              Confirm & Pay
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Review your booking details and complete payment
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onBack} className="w-full sm:w-auto text-xs md:text-sm">
            <Edit className="w-3 h-3 md:w-4 md:h-4 mr-2" />
            Edit Details
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 md:space-y-6 pt-6">
        {/* Task Summary */}
        <div className="space-y-4 p-4 md:p-6 border-2 rounded-xl bg-gradient-to-br from-muted/30 to-muted/10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant={formData.taskType === 'VIRTUAL' ? 'outline' : 'default'} className="text-xs px-3 py-1">
              {formData.taskType === 'VIRTUAL' ? <Wifi className="w-3 h-3 mr-1" /> : <Building2 className="w-3 h-3 mr-1" />}
              {formData.taskType === 'VIRTUAL' ? 'Remote' : 'On-site'}
            </Badge>
            <Badge variant="secondary" className="text-xs px-3 py-1">
              <Tag className="w-3 h-3 mr-1" />
              {formData.category}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Scheduled</p>
                <p className="text-sm font-semibold">{new Date(formData.scheduledAt).toLocaleDateString()}</p>
                <p className="text-xs text-muted-foreground">{new Date(formData.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-sm font-semibold">{formData.durationHours} {formData.durationHours === 1 ? 'hour' : 'hours'}</p>
                {formData.weeklyHourLimit && (
                  <p className="text-xs text-muted-foreground">Weekly limit: {formData.weeklyHourLimit}h</p>
                )}
              </div>
            </div>
          </div>

          {formData.taskType === 'IN_PERSON' && formData.address && (
            <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Location</p>
                <p className="text-sm font-medium">
                  {formData.address}
                  {formData.unit && `, ${formData.unit}`}
                  {formData.city && `, ${formData.city}`}
                  {formData.postalCode && ` ${formData.postalCode}`}
                </p>
              </div>
            </div>
          )}

          {formData.relevantSkills.length > 0 && (
            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-2">Relevant Skills:</p>
              <div className="flex flex-wrap gap-2">
                {formData.relevantSkills.map((skill) => (
                  <Badge key={skill} variant="outline" className="text-xs">
                    <Tag className="w-3 h-3 mr-1" />
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-2 font-semibold">Task Description:</p>
            <p className="text-sm text-foreground whitespace-pre-wrap bg-background/50 p-3 rounded-lg">{formData.taskDetails}</p>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="space-y-3 p-4 md:p-6 border-2 rounded-xl bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10">
          <h3 className="text-base md:text-lg font-semibold flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            Payment Summary
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Base Amount</span>
              <span className="font-medium">{formatCurrency(baseAmount)}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Info className="w-3 h-3" />
                {formatCurrency(worker?.hourlyRate || 0)}/hr × {formData.durationHours} hrs
              </span>
            </div>
            <div className="flex justify-between items-center text-sm pt-2 border-t border-green-200 dark:border-green-800">
              <span className="text-muted-foreground">Trust & Support Fee (15%)</span>
              <span className="font-medium">{formatCurrency(fees.trustAndSupportFee)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Processing Fee</span>
              <span className="font-medium">{formatCurrency(fees.stripeFee)}</span>
            </div>
            <div className="flex justify-between items-center font-bold text-lg md:text-xl pt-3 border-t-2 border-green-300 dark:border-green-700">
              <span>Total Amount</span>
              <span className="text-green-600 dark:text-green-400">{formatCurrency(fees.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        {currentClientSecret && (
          <Elements 
            key={currentClientSecret} 
            stripe={stripePromise} 
            options={{ 
              clientSecret: currentClientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#10b981',
                  colorBackground: 'transparent',
                  colorText: 'hsl(var(--foreground))',
                  colorDanger: '#ef4444',
                  fontFamily: 'system-ui, sans-serif',
                  spacingUnit: '4px',
                  borderRadius: '8px',
                },
              },
            }}
          >
            <PaymentForm 
              clientSecret={currentClientSecret} 
              fees={fees}
              onRecreatePaymentIntent={handleRecreatePaymentIntent}
              isRecreating={isRecreating}
            />
          </Elements>
        )}
      </CardContent>
    </Card>
  )
}

function PaymentForm({ 
  clientSecret, 
  fees,
  onRecreatePaymentIntent,
  isRecreating 
}: { 
  clientSecret: string
  fees: any
  onRecreatePaymentIntent?: () => void
  isRecreating?: boolean
}) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Handle PaymentElement ready state
  useEffect(() => {
    if (!elements) return

    const paymentElement = elements.getElement('payment')
    if (paymentElement) {
      paymentElement.on('ready', () => {
        setIsReady(true)
        setError(null)
      })
      paymentElement.on('change', (event: any) => {
        if (event.error) {
          setError(event.error.message)
        } else {
          setError(null)
        }
      })
      
      // Fallback: if ready event doesn't fire within 3 seconds, assume it's ready
      const timeout = setTimeout(() => {
        setIsReady(true)
      }, 3000)
      
      return () => clearTimeout(timeout)
    } else {
      // If element not found, try again after a short delay
      const retryTimeout = setTimeout(() => {
        const retryElement = elements.getElement('payment')
        if (retryElement) {
          retryElement.on('ready', () => {
            setIsReady(true)
            setError(null)
          })
          setIsReady(true) // Assume ready if element exists
        }
      }, 1000)
      
      return () => clearTimeout(retryTimeout)
    }
  }, [elements])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!stripe || !elements) {
      setError('Payment system not ready. Please refresh the page.')
      return
    }

    if (isProcessing) {
      return // Prevent double submission
    }

    setIsProcessing(true)
    setError(null)

    // Extract payment intent ID from client secret for logging
    const paymentIntentId = clientSecret?.split('_secret_')[0] || 'unknown'

    try {
      console.log('[PAYMENT] Starting payment submission:', {
        paymentIntentId,
        expectedAmount: fees.totalAmount,
        expectedAmountCents: Math.round(fees.totalAmount * 100),
        timestamp: new Date().toISOString(),
      })

      // Submit the form first to validate
      const { error: submitError } = await elements.submit()
      if (submitError) {
        console.error('[PAYMENT] Form validation error:', submitError)
        setError(submitError.message || 'Please check your payment details')
        setIsProcessing(false)
        return
      }

      console.log('[PAYMENT] Form validated, confirming payment...')

      // Confirm payment
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard/orders?success=true`,
        },
        redirect: 'if_required',
      })

      if (confirmError) {
        console.error('[PAYMENT] Payment confirmation error:', {
          code: confirmError.code,
          type: confirmError.type,
          message: confirmError.message,
          paymentIntentId,
          timestamp: new Date().toISOString(),
        })

        // Check for specific error codes that indicate payment intent issues
        const errorCode = confirmError.code || ''
        const errorType = confirmError.type || ''
        
        // If payment intent is invalid or already used, suggest recreating
        if (
          errorCode === 'payment_intent_unexpected_state' ||
          errorCode === 'resource_missing' ||
          errorType === 'invalid_request_error' ||
          confirmError.message?.includes('No such payment_intent') ||
          confirmError.message?.includes('already been confirmed')
        ) {
          setError('Payment session expired. Please refresh the payment form and try again.')
          toast.error('Payment session expired. Please refresh and try again.')
          if (onRecreatePaymentIntent) {
            // Auto-recreate after a short delay
            setTimeout(() => {
              onRecreatePaymentIntent()
            }, 2000)
          }
        } else {
          setError(confirmError.message || 'Payment failed. Please try another payment method.')
          toast.error(confirmError.message || 'Payment failed')
        }
      } else if (paymentIntent) {
        // Log payment result
        console.log('[PAYMENT] Payment confirmed:', {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          expectedAmount: Math.round(fees.totalAmount * 100),
          amountMatch: paymentIntent.amount === Math.round(fees.totalAmount * 100),
          currency: paymentIntent.currency,
          captureMethod: paymentIntent.capture_method,
          timestamp: new Date().toISOString(),
        })

        // Verify amount matches
        const expectedAmountCents = Math.round(fees.totalAmount * 100)
        if (paymentIntent.amount !== expectedAmountCents) {
          console.error('[PAYMENT] CRITICAL: AMOUNT MISMATCH!', {
            expected: expectedAmountCents,
            actual: paymentIntent.amount,
            difference: paymentIntent.amount - expectedAmountCents,
            paymentIntentId: paymentIntent.id,
            displayedTotal: fees.totalAmount,
            actualTotal: paymentIntent.amount / 100,
          })
          // Still proceed, but log the discrepancy
        }

        if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture') {
          // Payment succeeded or authorized (manual capture)
          console.log('[PAYMENT] Payment successful, redirecting...')
          toast.success('Payment authorized! Task will be created shortly.')
          router.push('/dashboard/orders?success=true')
        } else if (paymentIntent.status === 'requires_action') {
          // Payment requires additional authentication
          console.log('[PAYMENT] Payment requires action')
          setError('Please complete the authentication step')
        } else {
          console.warn('[PAYMENT] Unexpected payment status:', paymentIntent.status)
          setError(`Payment status: ${paymentIntent.status}. Please wait...`)
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || 'A processing error occurred. Please try again.'
      console.error('[PAYMENT] Payment submission exception:', {
        error: errorMessage,
        stack: error.stack,
        paymentIntentId,
        timestamp: new Date().toISOString(),
      })
      setError(errorMessage)
      toast.error(errorMessage)
      
      // If it's a network or API error, suggest recreating payment intent
      if (error.message?.includes('Failed to fetch') || error.message?.includes('Network')) {
        if (onRecreatePaymentIntent) {
          setTimeout(() => {
            onRecreatePaymentIntent()
          }, 2000)
        }
      }
    } finally {
      setIsProcessing(false)
    }
  }

  // Detect mobile device
  const [isMobile, setIsMobile] = useState(false)
  const [stripeLoaded, setStripeLoaded] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Check if Stripe is loaded
  useEffect(() => {
    if (typeof window !== 'undefined' && stripe) {
      setStripeLoaded(true)
    }
  }, [stripe])

  if (!stripeLoaded) {
    return (
      <div className="border rounded-lg p-4 min-h-[300px] flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading payment system...</div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border rounded-lg p-3 md:p-4 min-h-[300px] w-full">
        <div style={{ minHeight: '300px', width: '100%' }}>
          <PaymentElement 
            options={{
              layout: isMobile ? 'accordion' : 'tabs',
              defaultValues: {
                billingDetails: {
                  address: {
                    country: 'US',
                  },
                },
              },
            }}
          />
        </div>
      </div>
      
      {error && (
        <div className="space-y-2">
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
            {error}
          </div>
          {onRecreatePaymentIntent && (
            <Button
              type="button"
              variant="outline"
              onClick={onRecreatePaymentIntent}
              disabled={isRecreating}
              className="w-full"
            >
              {isRecreating ? 'Refreshing...' : 'Refresh Payment Form'}
            </Button>
          )}
        </div>
      )}

      <Button 
        type="submit" 
        disabled={!stripe || !isReady || isProcessing || isRecreating} 
        className="w-full" 
        size="lg"
      >
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

