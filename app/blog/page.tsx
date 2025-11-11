'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, User, ArrowRight } from 'lucide-react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function BlogPage() {
  const { data: blogData, isLoading } = useSWR('/api/v1/blog', fetcher)
  const blogPosts = blogData?.posts || []

  return (
    <div className="min-h-screen bg-background">
      {/* Header is handled by UnifiedHeader in root layout */}
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
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading blog posts...</p>
            </div>
          ) : blogPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogPosts.map((post: any) => (
                <Card key={post.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div>
                        {post.category && (
                          <span className="text-xs font-semibold text-primary">{post.category}</span>
                        )}
                        <h2 className="text-xl font-bold mt-2 mb-3">{post.title}</h2>
                        {post.excerpt && (
                          <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{post.author?.name || 'Skillyy Team'}</span>
                          </div>
                          {post.publishedAt && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Link href={`/blog/${post.slug}`}>
                        <Button variant="ghost" size="sm" className="w-full">
                          Read More <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-muted/50">
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">
                  No blog posts yet. Check back soon for updates, tips, and platform news.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}




