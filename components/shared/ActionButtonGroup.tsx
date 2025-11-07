'use client'

import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { ReactNode } from 'react'

export interface ActionButton {
  label: string
  onClick: () => void | Promise<void>
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  disabled?: boolean
  loading?: boolean
  icon?: ReactNode
  className?: string
  tooltip?: string
}

interface ActionButtonGroupProps {
  primary?: ActionButton
  secondary?: ActionButton[]
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

export function ActionButtonGroup({ 
  primary, 
  secondary = [], 
  className = '',
  orientation = 'horizontal'
}: ActionButtonGroupProps) {
  if (!primary && secondary.length === 0) {
    return null
  }

  return (
    <div 
      className={`flex gap-2 ${orientation === 'vertical' ? 'flex-col' : 'flex-row'} ${className}`}
    >
      {primary && (
        <Button
          onClick={primary.onClick}
          disabled={primary.disabled || primary.loading}
          variant={primary.variant || 'default'}
          className={`flex-1 ${primary.className || ''}`}
          size="lg"
          title={primary.tooltip}
        >
          {primary.loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {primary.icon && !primary.loading && <span className="mr-2">{primary.icon}</span>}
          {primary.label}
        </Button>
      )}
      
      {secondary.map((action, index) => (
        <Button
          key={index}
          onClick={action.onClick}
          disabled={action.disabled || action.loading}
          variant={action.variant || 'outline'}
          className={action.className}
          title={action.tooltip}
        >
          {action.loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {action.icon && !action.loading && <span className="mr-2">{action.icon}</span>}
          {action.label}
        </Button>
      ))}
    </div>
  )
}


