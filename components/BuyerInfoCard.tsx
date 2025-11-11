'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { User, ChevronDown, ChevronUp, Building2, Mail, Phone, MapPin, Briefcase, DollarSign, Calendar, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'

interface BuyerInfoCardProps {
  buyer: {
    id: string
    name?: string | null
    email?: string | null
    avatarUrl?: string | null
    phone?: string | null
    company?: string | null
    industry?: string | null
    companySize?: string | null
    budgetRange?: string | null
    rating?: number
    ratingCount?: number
    createdAt?: string | Date
  }
  task?: {
    id?: string
    createdAt?: string | Date
    price?: number | null
  }
  onContact?: () => void
}

export function BuyerInfoCard({ buyer, task, onContact }: BuyerInfoCardProps) {
  const [expanded, setExpanded] = useState(false)

  const hasDetails = buyer.company || buyer.industry || buyer.companySize || buyer.budgetRange

  return (
    <Card className="bg-muted/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Buyer Information</CardTitle>
          {hasDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-6 px-2"
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {buyer.avatarUrl ? (
            <img
              src={buyer.avatarUrl}
              alt={buyer.name || 'Buyer'}
              className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-background flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-background flex-shrink-0">
              <User className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-base md:text-lg break-words">{buyer.name || 'Buyer'}</p>
            {buyer.email && (
              <div className="flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground mt-1">
                <Mail className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{buyer.email}</span>
              </div>
            )}
            {buyer.rating && buyer.ratingCount && (
              <div className="flex items-center gap-1 text-xs md:text-sm text-muted-foreground mt-1">
                <span>⭐ {buyer.rating.toFixed(1)}</span>
                <span>({buyer.ratingCount} reviews)</span>
              </div>
            )}
            {buyer.createdAt && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span>Member since {format(new Date(buyer.createdAt), 'MMM yyyy')}</span>
              </div>
            )}
          </div>
          {task?.id ? (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full sm:w-auto text-xs md:text-sm"
              onClick={() => {
                if (onContact) {
                  onContact()
                }
              }}
            >
              <MessageSquare className="w-3 h-3 md:w-4 md:h-4 mr-1.5" />
              Contact
            </Button>
          ) : null}
        </div>

        {/* Expanded Details */}
        {expanded && hasDetails && (
          <div className="mt-4 pt-4 border-t space-y-3">
            {buyer.company && (
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">Company</div>
                  <div className="text-sm font-medium">{buyer.company}</div>
                </div>
              </div>
            )}
            {buyer.industry && (
              <div className="flex items-start gap-2">
                <Briefcase className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">Industry</div>
                  <div className="text-sm font-medium">{buyer.industry}</div>
                </div>
              </div>
            )}
            {buyer.companySize && (
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">Company Size</div>
                  <div className="text-sm font-medium">{buyer.companySize} employees</div>
                </div>
              </div>
            )}
            {buyer.budgetRange && (
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">Typical Budget Range</div>
                  <div className="text-sm font-medium">{buyer.budgetRange}</div>
                </div>
              </div>
            )}
            {buyer.phone && (
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">Phone</div>
                  <div className="text-sm font-medium">{buyer.phone}</div>
                </div>
              </div>
            )}
            {task?.price && (
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">Task Budget</div>
                  <div className="text-sm font-medium">{formatCurrency(task.price)}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

