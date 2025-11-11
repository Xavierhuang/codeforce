'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Mail, Phone, MessageSquare, Send } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // In a real app, this would send to an API endpoint
    setTimeout(() => {
      toast.success('Thank you for your message! We&apos;ll get back to you soon.')
      setFormData({ name: '', email: '', subject: '', message: '' })
      setIsSubmitting(false)
    }, 1000)
  }

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
            <h1 className="text-4xl md:text-5xl font-bold">Contact Us</h1>
            <p className="text-xl text-muted-foreground">
              We&apos;re here to help. Get in touch with our team.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Contact Info */}
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-bold mb-6">Get in Touch</h2>
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Mail className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Email</h3>
                        <a href="mailto:support@skillyy.com" className="text-primary hover:underline">
                          support@skillyy.com
                        </a>
                        <p className="text-sm text-muted-foreground mt-1">
                          We typically respond within 24 hours
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Help Center</h3>
                        <Link href="/help" className="text-primary hover:underline">
                          Visit Help Center
                        </Link>
                        <p className="text-sm text-muted-foreground mt-1">
                          Find answers to common questions
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4">Business Hours</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monday - Friday</span>
                      <span>9:00 AM - 6:00 PM EST</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Saturday</span>
                      <span>10:00 AM - 4:00 PM EST</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sunday</span>
                      <span>Closed</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contact Form */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold mb-6">Send us a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
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
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      rows={6}
                      className="mt-1"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      'Sending...'
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}




