import * as React from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import { Button } from './button'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

/**
 * Standardized Empty State Component
 * Provides consistent empty states across the application
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      {Icon && (
        <Icon className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
      )}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-4">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="default">
          {action.label}
        </Button>
      )}
    </div>
  )
}

interface EmptyStateCardProps extends EmptyStateProps {
  className?: string
}

/**
 * Empty state within a card
 */
export function EmptyStateCard(props: EmptyStateCardProps) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <EmptyState {...props} />
    </div>
  )
}





