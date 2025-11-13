import * as React from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

/**
 * Standardized Loading Components
 * Provides consistent loading states across the application
 */

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
}

/**
 * Loading spinner component
 */
export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-muted-foreground', sizeClasses[size])} />
      {text && (
        <span className={cn(
          'text-muted-foreground',
          size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
        )}>
          {text}
        </span>
      )}
    </div>
  )
}

interface LoadingSkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
}

/**
 * Skeleton loading component for placeholder content
 */
export function LoadingSkeleton({
  className,
  variant = 'rectangular',
  width,
  height,
}: LoadingSkeletonProps) {
  const baseClasses = 'animate-pulse bg-muted rounded'
  
  const variantClasses = {
    text: 'h-4',
    circular: 'rounded-full',
    rectangular: '',
  }

  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={style}
    />
  )
}

interface LoadingCardProps {
  className?: string
  showHeader?: boolean
  showContent?: boolean
  lines?: number
}

/**
 * Loading card component for card-based content
 */
export function LoadingCard({
  className,
  showHeader = true,
  showContent = true,
  lines = 3,
}: LoadingCardProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-6', className)}>
      {showHeader && (
        <div className="mb-4 space-y-2">
          <LoadingSkeleton variant="text" width="60%" height={24} />
          <LoadingSkeleton variant="text" width="40%" height={16} />
        </div>
      )}
      {showContent && (
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <LoadingSkeleton
              key={i}
              variant="text"
              width={i === lines - 1 ? '80%' : '100%'}
              height={16}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface LoadingListProps {
  className?: string
  items?: number
  showAvatar?: boolean
  lines?: number
}

/**
 * Loading list component for list-based content
 */
export function LoadingList({
  className,
  items = 3,
  showAvatar = false,
  lines = 2,
}: LoadingListProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {showAvatar && (
            <LoadingSkeleton variant="circular" width={40} height={40} />
          )}
          <div className="flex-1 space-y-2">
            {Array.from({ length: lines }).map((_, j) => (
              <LoadingSkeleton
                key={j}
                variant="text"
                width={j === lines - 1 ? '60%' : '100%'}
                height={16}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

interface LoadingPageProps {
  className?: string
  message?: string
}

/**
 * Full page loading component
 */
export function LoadingPage({ className, message = 'Loading...' }: LoadingPageProps) {
  return (
    <div className={cn('flex items-center justify-center min-h-[400px]', className)}>
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

interface LoadingInlineProps {
  className?: string
  text?: string
}

/**
 * Inline loading component for buttons and small spaces
 */
export function LoadingInline({ className, text }: LoadingInlineProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Loader2 className="w-4 h-4 animate-spin" />
      {text && <span>{text}</span>}
    </span>
  )
}




