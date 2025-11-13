'use client'

import { Badge } from '@/components/ui/badge'
import { TaskerBadgeTier } from '@/lib/badge-tier'
import { Star, Award, Sparkles, Crown, Gem } from 'lucide-react'

interface TaskerBadgeProps {
  tier: TaskerBadgeTier
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const tierConfig: Record<TaskerBadgeTier, { 
  label: string
  icon: React.ComponentType<{ className?: string }>
  className: string
}> = {
  STARTER: {
    label: 'Starter',
    icon: Star,
    className: 'bg-gray-100 text-gray-700 border-gray-300',
  },
  VERIFIED: {
    label: 'Verified',
    icon: Award,
    className: 'bg-blue-100 text-blue-700 border-blue-300',
  },
  PROFESSIONAL: {
    label: 'Professional',
    icon: Sparkles,
    className: 'bg-purple-100 text-purple-700 border-purple-300',
  },
  EXPERT: {
    label: 'Expert',
    icon: Crown,
    className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  },
  ELITE: {
    label: 'Elite',
    icon: Gem,
    className: 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-orange-500',
  },
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
}

const iconSizeClasses = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
}

export function TaskerBadge({ tier, size = 'md', className = '' }: TaskerBadgeProps) {
  const config = tierConfig[tier]
  const Icon = config.icon

  return (
    <Badge
      className={`
        ${config.className}
        ${sizeClasses[size]}
        ${className}
        inline-flex items-center gap-1 font-semibold border
      `}
    >
      <Icon className={iconSizeClasses[size]} />
      <span>{config.label}</span>
    </Badge>
  )
}





