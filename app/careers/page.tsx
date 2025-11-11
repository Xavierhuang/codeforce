'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Briefcase, MapPin, Clock, ArrowRight } from 'lucide-react'

export default function CareersPage() {
  const openPositions = [
    {
      title: 'Senior Full-Stack Developer',
      department: 'Engineering',
      location: 'Remote',
      type: 'Full-time',
      description: 'Join our engineering team to build and improve the Skillyy platform.'
    },
    {
      title: 'Product Designer',
      department: 'Design',
      location: 'Remote',
      type: 'Full-time',
      description: 'Help shape the user experience and design of Skillyy\'s platform.'
    },
    {
      title: 'Customer Success Manager',
      department: 'Operations',
      location: 'Remote',
      type: 'Full-time',
      description: 'Help our users succeed and ensure they have the best experience possible.'
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header is handled by UnifiedHeader in root layout */}
      <main className="container mx-auto px-4 py-8 md:py-16 max-w-4xl">
        <div className="mb-6">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            ← Back to Home
          </Link>
        </div>

        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Briefcase className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">Careers at Skillyy</h1>
            <p className="text-xl text-muted-foreground">
              Join us in building the future of on-demand technical services
            </p>
          </div>

          {/* Why Work Here */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-6">Why Work at Skillyy?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Remote-First</h3>
                  <p className="text-sm text-muted-foreground">
                    Work from anywhere. We&apos;re a fully remote team with flexible hours.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Impact</h3>
                  <p className="text-sm text-muted-foreground">
                    Help thousands of businesses and developers connect and succeed.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Growth</h3>
                  <p className="text-sm text-muted-foreground">
                    Fast-growing startup with opportunities for career advancement.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Benefits</h3>
                  <p className="text-sm text-muted-foreground">
                    Competitive salary, health insurance, and equity participation.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Open Positions */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Open Positions</h2>
            <div className="space-y-4">
              {openPositions.map((position, idx) => (
                <Card key={idx} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-2">{position.title}</h3>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <Briefcase className="h-4 w-4" />
                            <span>{position.department}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{position.location}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{position.type}</span>
                          </div>
                        </div>
                        <p className="text-muted-foreground">{position.description}</p>
                      </div>
                      <Button variant="outline" className="md:ml-4">
                        Apply <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* General Application */}
          <Card className="bg-primary/5">
            <CardContent className="pt-6 text-center">
              <h2 className="text-2xl font-bold mb-4">Don&apos;t See a Role That Fits?</h2>
              <p className="text-muted-foreground mb-6">
                We&apos;re always looking for talented people. Send us your resume and we&apos;ll keep you in mind for future opportunities.
              </p>
              <Link href="/contact">
                <Button size="lg">Get in Touch</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}




