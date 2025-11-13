'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, MessageCircle, Book, FileText, HelpCircle } from 'lucide-react'
import { useState } from 'react'

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const faqCategories = [
    {
      title: 'Getting Started',
      icon: Book,
      questions: [
        {
          q: 'How do I create an account?',
          a: 'Click "Get Started" in the top navigation, choose your role (Buyer or Expert), and fill out the signup form with your name, email, and password.'
        },
        {
          q: 'What\'s the difference between a Buyer and Expert account?',
          a: 'Buyers use Skillyy to find and hire experts for their projects. Experts offer their services and get paid for completing tasks.'
        },
        {
          q: 'Do I need to verify my account?',
          a: 'Experts must complete verification (including ID verification) to receive bookings. Buyers can start using the platform immediately after signup.'
        }
      ]
    },
    {
      title: 'For Buyers',
      icon: Search,
      questions: [
        {
          q: 'How do I find an expert?',
          a: 'Use the search bar on the home page or browse experts by category. You can filter by skills, ratings, and availability.'
        },
        {
          q: 'How do I book an expert?',
          a: 'Click on an expert\'s profile, then click "Book Now". Fill out the booking form with your project details and submit payment.'
        },
        {
          q: 'How are payments processed?',
          a: 'Payments are securely processed through Stripe and held in escrow until you approve the completed work. You can release payment when satisfied.'
        },
        {
          q: 'What if I\'m not satisfied with the work?',
          a: 'Contact the expert directly through the platform messaging system to discuss revisions. If issues persist, contact our support team.'
        }
      ]
    },
    {
      title: 'For Experts',
      icon: FileText,
      questions: [
        {
          q: 'How do I get verified?',
          a: 'Go to Dashboard > Verification and complete the required steps including ID verification, skills, and service details.'
        },
        {
          q: 'How do I get paid?',
          a: 'Set up your Stripe Connect account in Settings. Once a task is completed and approved, payment is released to your wallet. You can request payouts anytime.'
        },
        {
          q: 'What fees does Skillyy charge?',
          a: 'Skillyy charges a 15% platform fee on all completed tasks. Stripe processing fees (approximately 2.9% + $0.30) also apply.'
        },
        {
          q: 'How do I manage my availability?',
          a: 'Go to Dashboard > Availability to set your working hours and service radius for in-person tasks.'
        }
      ]
    },
    {
      title: 'Account & Settings',
      icon: HelpCircle,
      questions: [
        {
          q: 'How do I update my profile?',
          a: 'Go to Dashboard > Settings to update your name, bio, skills, and other profile information.'
        },
        {
          q: 'How do I change my password?',
          a: 'Go to Dashboard > Settings > Account tab to change your password.'
        },
        {
          q: 'How do I delete my account?',
          a: 'Contact our support team at support@skillyy.com to request account deletion. Note that some information may be retained for legal compliance.'
        }
      ]
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
            <h1 className="text-4xl md:text-5xl font-bold">Help Center</h1>
            <p className="text-xl text-muted-foreground">
              Find answers to common questions and get support
            </p>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Search for help..."
                  className="pl-12 pr-4 py-6 text-lg"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <Link href="/contact" className="flex items-center gap-4">
                  <MessageCircle className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-semibold">Contact Support</h3>
                    <p className="text-sm text-muted-foreground">Get in touch with our team</p>
                  </div>
                </Link>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <Link href="/safety" className="flex items-center gap-4">
                  <HelpCircle className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-semibold">Safety Guide</h3>
                    <p className="text-sm text-muted-foreground">Learn about staying safe</p>
                  </div>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Sections */}
          {faqCategories.map((category) => {
            const Icon = category.icon
            return (
              <Card key={category.title}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Icon className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">{category.title}</h2>
                  </div>
                  <div className="space-y-6">
                    {category.questions.map((faq, idx) => (
                      <div key={idx} className="border-b last:border-0 pb-6 last:pb-0">
                        <h3 className="font-semibold text-lg mb-2">{faq.q}</h3>
                        <p className="text-muted-foreground">{faq.a}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {/* Still Need Help */}
          <Card className="bg-primary/5">
            <CardContent className="pt-6 text-center">
              <h2 className="text-2xl font-bold mb-4">Still Need Help?</h2>
              <p className="text-muted-foreground mb-6">
                Our support team is here to help you
              </p>
              <Link href="/contact">
                <Button size="lg">Contact Support</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

