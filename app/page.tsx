'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Bug, Globe, Smartphone, Settings } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-primary">
            CodeForce
          </Link>
          <div className="flex gap-4 items-center">
            <Link href="/tasks" className="text-sm font-medium hover:text-primary">
              Browse Tasks
            </Link>
            <Link href="/developers" className="text-sm font-medium hover:text-primary">
              Find Developers
            </Link>
            <Link href="/auth/signin">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto py-20">
          {/* Main Headline */}
          <h1 className="text-6xl md:text-7xl font-bold text-center mb-6 leading-tight">
            <span className="text-primary">Hire skilled developers</span>
            <br />
            <span className="text-foreground">for anything on your to-do list.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            From bug fixes to full-stack projects, book trusted developers who show up ready to help. 
            Simply choose your task, pick a time, and get back to what matters.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                placeholder="What do you need help with?"
                className="w-full pl-12 pr-4 py-6 text-lg rounded-full border-2 focus:border-primary"
              />
              <Link href="/tasks/new">
                <Button 
                  size="lg" 
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full px-8"
                >
                  Post Task
                </Button>
              </Link>
            </div>
            
            {/* Quick Categories */}
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {['Bug Fix', 'Web Development', 'Mobile App', 'API Integration', 'DevOps'].map((cat) => (
                <Link 
                  key={cat} 
                  href={`/tasks?category=${encodeURIComponent(cat)}`}
                  className="px-4 py-2 text-sm bg-muted hover:bg-primary hover:text-primary-foreground rounded-full transition-colors"
                >
                  {cat}
                </Link>
              ))}
            </div>
          </div>

          {/* Category Navigation */}
          <div className="flex justify-center gap-8 mb-16">
            <Link href="/tasks?category=Bug Fix" className="flex flex-col items-center group">
              <div className="w-12 h-12 rounded-full bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center mb-2 transition-colors">
                <Bug className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-primary">Bug Fix</span>
            </Link>
            <Link href="/tasks?category=Web Development" className="flex flex-col items-center group">
              <div className="w-12 h-12 rounded-full bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center mb-2 transition-colors">
                <Globe className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium">Web Dev</span>
            </Link>
            <Link href="/tasks?category=Mobile App" className="flex flex-col items-center group">
              <div className="w-12 h-12 rounded-full bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center mb-2 transition-colors">
                <Smartphone className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium">Mobile</span>
            </Link>
            <Link href="/tasks?category=DevOps" className="flex flex-col items-center group">
              <div className="w-12 h-12 rounded-full bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center mb-2 transition-colors">
                <Settings className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium">DevOps</span>
            </Link>
          </div>
        </div>

        {/* How It Works */}
        <section className="bg-muted/30 py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-12">
              How it works
            </h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-2">Post your task</h3>
                <p className="text-muted-foreground">
                  Describe what you need help with. Our AI assists you in creating a clear task description.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-2">Get matched</h3>
                <p className="text-muted-foreground">
                  Receive offers from vetted developers. Browse profiles and pick the perfect match.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-2">Get it done</h3>
                <p className="text-muted-foreground">
                  Pay securely through escrow. Release payment only when you're completely satisfied.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of clients and developers building together
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/tasks/new">
              <Button size="lg" className="px-8">
                Post Your First Task
              </Button>
            </Link>
            <Link href="/developers">
              <Button size="lg" variant="outline" className="px-8">
                Become a Developer
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-gray-50 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-4">CodeForce</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/" className="hover:text-foreground">About Us</Link></li>
                <li><Link href="/developers" className="hover:text-foreground">Become a Developer</Link></li>
                <li><Link href="/tasks" className="hover:text-foreground">Browse Tasks</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/help" className="hover:text-foreground">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-foreground">Contact Us</Link></li>
                <li><Link href="/safety" className="hover:text-foreground">Safety</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground">Terms of Service</Link></li>
                <li><Link href="/cookie" className="hover:text-foreground">Cookie Policy</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Connect</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/blog" className="hover:text-foreground">Blog</Link></li>
                <li><Link href="/careers" className="hover:text-foreground">Careers</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} CodeForce, Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

