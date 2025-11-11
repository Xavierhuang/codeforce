'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Target, Shield, Zap } from 'lucide-react'

export default function AboutPage() {
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
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">About Skillyy</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Connecting clients with skilled technical professionals for on-demand development work
            </p>
          </div>

          {/* Mission */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed">
                Skillyy is revolutionizing how businesses connect with technical talent. We&apos;ve built a platform that makes it easy to find, hire, and work with skilled developers, designers, and technical professionals. Whether you need a quick bug fix, a full-stack application, or ongoing technical support, Skillyy connects you with verified professionals ready to get the job done.
              </p>
            </CardContent>
          </Card>

          {/* Values */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl md:text-3xl font-bold mb-6">Our Values</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Trust & Safety</h3>
                    <p className="text-sm text-muted-foreground">
                      We verify all developers and provide secure payment processing to ensure safe transactions.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Speed & Efficiency</h3>
                    <p className="text-sm text-muted-foreground">
                      Get matched with qualified professionals quickly and start your project without delay.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Quality First</h3>
                    <p className="text-sm text-muted-foreground">
                      We maintain high standards through verification, reviews, and continuous platform improvements.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Transparency</h3>
                    <p className="text-sm text-muted-foreground">
                      Clear pricing, honest reviews, and open communication between clients and developers.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl md:text-3xl font-bold mb-6">How Skillyy Works</h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Search & Browse</h3>
                    <p className="text-muted-foreground">
                      Browse verified developer profiles, filter by skills, ratings, and availability. Find the perfect match for your project.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Book Directly</h3>
                    <p className="text-muted-foreground">
                      Select a developer and fill out a simple booking form. Secure payment is held in escrow until work is completed.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Get It Done</h3>
                    <p className="text-muted-foreground">
                      Communicate directly with your developer, track progress, and release payment only when you&apos;re satisfied with the work.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <div className="text-center space-y-4 py-8">
            <h2 className="text-2xl md:text-3xl font-bold">Ready to Get Started?</h2>
            <p className="text-muted-foreground">
              Join thousands of clients and developers using Skillyy
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup?role=CLIENT">
                <Button size="lg">Become a Buyer</Button>
              </Link>
              <Link href="/auth/signup?role=WORKER">
                <Button size="lg" variant="outline">Become a Developer</Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}




