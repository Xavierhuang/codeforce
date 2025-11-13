'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, AlertTriangle, CheckCircle, Lock, Users, Eye } from 'lucide-react'

export default function SafetyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header is handled by UnifiedHeader in root layout */}
      <main className="container mx-auto px-4 py-8 md:py-16 max-w-4xl">
        <div className="mb-6">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            ← Back to Home
          </Link>
        </div>

        <div className="space-y-8 md:space-y-12">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">Safety & Security</h1>
            <p className="text-xl text-muted-foreground">
              Your safety is our top priority. Learn how we protect you.
            </p>
          </div>

          {/* Verification */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4 mb-6">
                <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold mb-2">Expert Verification</h2>
                  <p className="text-muted-foreground">
                    All experts on Skillyy must complete our verification process, which includes:
                  </p>
                  <ul className="list-disc pl-6 mt-4 space-y-2">
                    <li>Identity verification with government-issued ID</li>
                    <li>Skills and experience validation</li>
                    <li>Background checks (where permitted by law)</li>
                    <li>Professional portfolio review</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Secure Payments */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4 mb-6">
                <Lock className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold mb-2">Secure Payment Processing</h2>
                  <p className="text-muted-foreground mb-4">
                    All payments are processed securely through Stripe, a PCI-compliant payment processor. Your payment information is never stored on our servers.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Payments held in escrow until work is completed</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Release payment only when you're satisfied</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Dispute resolution process available</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Safety Tips */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-6">Safety Tips</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    For Buyers
                  </h3>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Always communicate through the Skillyy platform</li>
                    <li>Review expert profiles, ratings, and past work before booking</li>
                    <li>Be clear about your project requirements and expectations</li>
                    <li>Never share personal payment information outside the platform</li>
                    <li>Report any suspicious behavior immediately</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    For Experts
                  </h3>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Complete your verification to build trust</li>
                    <li>Keep all communication on the platform</li>
                    <li>Set clear expectations and timelines</li>
                    <li>Never ask clients to pay outside the platform</li>
                    <li>Report any issues or concerns to support</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reporting */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="h-8 w-8 text-orange-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold mb-2">Report Issues</h2>
                  <p className="text-muted-foreground mb-4">
                    If you encounter any safety concerns, harassment, or fraudulent activity, please report it immediately.
                  </p>
                  <Link href="/contact">
                    <Button>Report an Issue</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Eye className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold mb-2">Privacy Protection</h2>
                  <p className="text-muted-foreground mb-4">
                    We take your privacy seriously. Your personal information is protected according to our Privacy Policy.
                  </p>
                  <Link href="/privacy">
                    <Button variant="outline">Read Privacy Policy</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}




