'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, User, ArrowLeft } from 'lucide-react'
import useSWR from 'swr'
import { useParams } from 'next/navigation'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function BlogPostPage() {
  const params = useParams()
  const slug = params?.slug as string
  const { data: post, isLoading } = useSWR(
    slug ? `/api/v1/blog/${slug}` : null,
    fetcher
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 md:py-16 max-w-4xl">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 md:py-16 max-w-4xl">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Post Not Found</h1>
            <p className="text-muted-foreground mb-6">The blog post you're looking for doesn't exist.</p>
            <Link href="/blog">
              <button className="text-primary hover:underline">← Back to Blog</button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header is handled by UnifiedHeader in root layout */}
      <main className="container mx-auto px-4 py-8 md:py-16 max-w-4xl">
        <div className="mb-6">
          <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>
        </div>

        <article>
          <Card>
            <CardContent className="pt-6">
              {post.category && (
                <span className="text-xs font-semibold text-primary">{post.category}</span>
              )}
              <h1 className="text-3xl md:text-4xl font-bold mt-2 mb-4">{post.title}</h1>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6 pb-4 border-b">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{post.author?.name || 'Skillyy Team'}</span>
                </div>
                {post.publishedAt && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                )}
              </div>

              {post.featuredImageUrl && (
                <div className="mb-6">
                  <img
                    src={post.featuredImageUrl}
                    alt={post.title}
                    className="w-full h-auto rounded-lg"
                  />
                </div>
              )}

              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                  {post.content}
                </div>
              </div>
            </CardContent>
          </Card>
        </article>
      </main>
    </div>
  )
}




