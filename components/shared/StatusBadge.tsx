'use client'

import { Badge } from '@/components/ui/badge'
import { 
  Circle, 
  Clock, 
  UserCheck, 
  Play, 
  CheckCircle, 
  X, 
  AlertTriangle 
} from 'lucide-react'
import { TaskStatus } from '@prisma/client'

interface StatusBadgeProps {
  status: TaskStatus | string
  className?: string
  showIcon?: boolean
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  OPEN: {
    label: 'Open',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Circle,
  },
  OFFERED: {
    label: 'Offered',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock,
  },
  ASSIGNED: {
    label: 'Assigned',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: UserCheck,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: Play,
  },
  COMPLETED: {
    label: 'Completed',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: X,
  },
  DISPUTED: {
    label: 'Disputed',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: AlertTriangle,
  },
}

export function StatusBadge({ status, className = '', showIcon = true }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: Circle,
  }

  const Icon = config.icon

  return (
    <Badge 
      variant="outline" 
      className={`${config.color} ${className} flex items-center gap-1.5 font-medium`}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      <span>{config.label}</span>
    </Badge>
  )
}




