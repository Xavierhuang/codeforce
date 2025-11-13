'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import toast from 'react-hot-toast'
import { signIn } from 'next-auth/react'
import { User, Briefcase, Eye, EyeOff, Check } from 'lucide-react'

export default function SignUpPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roleParam = searchParams.get('role') as 'CLIENT' | 'WORKER' | null
  
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: (roleParam || 'CLIENT') as 'CLIENT' | 'WORKER',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    // Show dialog if no role parameter is provided
    if (!roleParam) {
      setShowRoleDialog(true)
    } else {
      setFormData(prev => ({ ...prev, role: roleParam }))
    }
  }, [roleParam])

  const handleRoleSelect = (role: 'CLIENT' | 'WORKER') => {
    setFormData({ ...formData, role })
    setShowRoleDialog(false)
  }

  // Password validation checks
  const passwordChecks = {
    minLength: formData.password.length >= 8,
    hasUpperCase: /[A-Z]/.test(formData.password),
    hasLowerCase: /[a-z]/.test(formData.password),
    hasNumber: /[0-9]/.test(formData.password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{}|;':"\\|,.<>\/?]/.test(formData.password),
    noSpaces: !/\s/.test(formData.password),
  }

  const isPasswordValid = Object.values(passwordChecks).every(check => check)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.role) {
      setShowRoleDialog(true)
      return
    }
    
    setIsLoading(true)

    try {
      const response = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Signup error:', error)
        // Show detailed validation errors if available
        if (error.details && Array.isArray(error.details)) {
          const errorMessages = error.details.map((d: any) => `${d.field}: ${d.message}`).join(', ')
          throw new Error(errorMessages || error.error || 'Failed to sign up')
        }
        throw new Error(error.error || 'Failed to sign up')
      }

      toast.success('Account created! Signing you in...')

      // Auto sign in after signup
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.ok) {
        router.push('/dashboard')
      } else {
        router.push('/auth/signin')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Role Selection Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={(open) => {
        if (!open && !formData.role) {
          // Don't allow closing without selecting a role
          return
        }
        setShowRoleDialog(open)
      }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md mx-4 sm:mx-auto p-4 sm:p-6">
          <DialogClose onOpenChange={setShowRoleDialog} />
          <DialogHeader className="mb-4 sm:mb-6">
            <DialogTitle className="text-xl sm:text-2xl font-bold text-center">Choose Your Role</DialogTitle>
            <DialogDescription className="text-center text-xs sm:text-sm mt-2">
              Select how you want to use Skillyy
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            <Button
              onClick={() => handleRoleSelect('CLIENT')}
              variant="outline"
              className="h-auto p-4 sm:p-6 flex flex-col items-start gap-2 sm:gap-3 hover:border-primary hover:bg-primary/5 transition-all touch-manipulation active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 w-full">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-semibold text-base sm:text-lg">I&apos;m a Buyer</div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                    I want to hire experts and get work done
                  </div>
                </div>
              </div>
            </Button>
            
            <Button
              onClick={() => handleRoleSelect('WORKER')}
              variant="outline"
              className="h-auto p-4 sm:p-6 flex flex-col items-start gap-2 sm:gap-3 hover:border-primary hover:bg-primary/5 transition-all touch-manipulation active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 w-full">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                  <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-semibold text-base sm:text-lg">I&apos;m an Expert</div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                    I want to offer my services and earn money
                  </div>
                </div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>
              {formData.role === 'WORKER' ? 'Become an Expert' : 'Create Account'}
            </CardTitle>
            <CardDescription>
              {formData.role === 'WORKER'
                ? 'Join as an expert and start earning' 
                : 'Join as a buyer and hire experts'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="password">Password *</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={8}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {formData.password && (
                  <div className="mt-2 space-y-1.5">
                    <div className={`flex items-center gap-2 text-xs transition-colors ${passwordChecks.minLength ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                      <Check className={`h-3.5 w-3.5 ${passwordChecks.minLength ? 'opacity-100' : 'opacity-0'}`} />
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs transition-colors ${passwordChecks.hasUpperCase ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                      <Check className={`h-3.5 w-3.5 ${passwordChecks.hasUpperCase ? 'opacity-100' : 'opacity-0'}`} />
                      <span>One uppercase letter</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs transition-colors ${passwordChecks.hasLowerCase ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                      <Check className={`h-3.5 w-3.5 ${passwordChecks.hasLowerCase ? 'opacity-100' : 'opacity-0'}`} />
                      <span>One lowercase letter</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs transition-colors ${passwordChecks.hasNumber ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                      <Check className={`h-3.5 w-3.5 ${passwordChecks.hasNumber ? 'opacity-100' : 'opacity-0'}`} />
                      <span>One number</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs transition-colors ${passwordChecks.hasSpecialChar ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                      <Check className={`h-3.5 w-3.5 ${passwordChecks.hasSpecialChar ? 'opacity-100' : 'opacity-0'}`} />
                      <span>One special character</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs transition-colors ${passwordChecks.noSpaces ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                      <Check className={`h-3.5 w-3.5 ${passwordChecks.noSpaces ? 'opacity-100' : 'opacity-0'}`} />
                      <span>No spaces</span>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="phone">
                  Phone Number {formData.role === 'WORKER' ? '*' : '(Optional)'}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required={formData.role === 'WORKER'}
                  placeholder="+1234567890"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.role === 'WORKER'
                    ? 'Required for experts to receive SMS notifications about bookings'
                    : 'We\'ll use this to contact you about your tasks'}
                </p>
              </div>
              
              {/* Role Display (read-only if set from dialog) */}
              <div>
                <Label>Account Type</Label>
                <div className="mt-1 p-3 rounded-md border bg-muted/50 flex items-center gap-3">
                  {formData.role === 'WORKER' ? (
                    <>
                      <Briefcase className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <span className="font-medium">Expert</span>
                    </>
                  ) : (
                    <>
                      <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <span className="font-medium">Buyer</span>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRoleDialog(true)}
                    className="ml-auto text-xs"
                  >
                    Change
                  </Button>
                </div>
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading || !formData.role}>
                {isLoading ? 'Creating account...' : 'Sign Up'}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <a href="/auth/signin" className="text-primary hover:underline">
                Sign in
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
