'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, User, ArrowRight } from 'lucide-react'

export default function BlogPage() {
  const blogPosts = [
    {
      title: 'How to Find the Right Developer for Your Project',
      excerpt: 'Learn the key factors to consider when hiring a developer through Skillyy, including skills, ratings, and communication.',
      author: 'Skillyy Team',
      date: '2025-01-15',
      category: 'For Buyers'
    },
    {
      title: 'Tips for Building a Strong Developer Profile',
      excerpt: 'Discover how to create a compelling profile that attracts clients and helps you get more bookings.',
      author: 'Skillyy Team',
      date: '2025-01-10',
      category: 'For Developers'
    },
    {
      title: 'Understanding Payment Processing on Skillyy',
      excerpt: 'A comprehensive guide to how payments work, including escrow, fees, and payout schedules.',
      author: 'Skillyy Team',
      date: '2025-01-05',
      category: 'Platform Updates'
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-white sticky top-0 z-50 safe-area-inset-top">
        <div className="container mx-auto px-4 py-3 md:py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <img src="/logo.svg" alt="Skillyy" className="h-8 md:h-[50px] w-auto" />
          </Link>
          <div className="hidden md:flex gap-6 items-center">
            <Link href="/tasks" className="text-sm font-medium text-gray-900 hover:text-gray-700 transition-colors">
              Browse Tasks
            </Link>
            <Link href="/developers" className="text-sm font-medium text-gray-900 hover:text-gray-700 transition-colors">
              Find Developers
            </Link>
            <Link href="/auth/signin">
              <Button size="sm" variant="outline">Sign In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm" className="bg-[#94FE0C] hover:bg-[#7FE00A] text-gray-900">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 md:py-16 max-w-6xl">
        <div className="mb-6">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            ← Back to Home
          </Link>
        </div>

        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">Skillyy Blog</h1>
            <p className="text-xl text-muted-foreground">
              Tips, guides, and updates from the Skillyy team
            </p>
          </div>

          {/* Blog Posts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogPosts.map((post, idx) => (
              <Card key={idx} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-semibold text-primary">{post.category}</span>
                      <h2 className="text-xl font-bold mt-2 mb-3">{post.title}</h2>
                      <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{post.author}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="w-full">
                      Read More <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Coming Soon */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">
                More blog posts coming soon! Check back regularly for updates, tips, and platform news.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}


