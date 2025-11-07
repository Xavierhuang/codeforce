'use client'

import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Search,
  ShoppingBag,
  Briefcase,
  Wallet
} from 'lucide-react'
import { cn } from '@/lib/utils'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles?: ('CLIENT' | 'WORKER' | 'ADMIN')[]
}

export function BottomNav() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const { data: user } = useSWR(
    status === 'authenticated' ? '/api/v1/users/me' : null,
    fetcher
  )

  if (status !== 'authenticated' || !session || !user) {
    return null
  }

  const isClient = user?.role === 'CLIENT'
  const isWorker = user?.role === 'WORKER'

  // Only show bottom nav on main dashboard pages
  const showBottomNav = pathname?.startsWith('/dashboard') || pathname === '/tasks'
  if (!showBottomNav) return null

  // Primary navigation items for bottom nav (max 5)
  const primaryNavItems: NavItem[] = [
    {
      href: '/dashboard',
      label: 'Home',
      icon: LayoutDashboard,
      roles: ['CLIENT', 'WORKER', 'ADMIN'] as ('CLIENT' | 'WORKER' | 'ADMIN')[],
    },
  ]

  if (isClient) {
    primaryNavItems.push({
      href: '/dashboard/orders',
      label: 'Orders',
      icon: ShoppingBag,
      roles: ['CLIENT'] as ('CLIENT' | 'WORKER' | 'ADMIN')[],
    })
  }

  if (isWorker) {
    primaryNavItems.push(
      {
        href: '/dashboard/tasks',
        label: 'Tasks',
        icon: Briefcase,
        roles: ['WORKER'] as ('CLIENT' | 'WORKER' | 'ADMIN')[],
      },
      {
        href: '/tasks',
        label: 'Browse',
        icon: Search,
        roles: ['WORKER'] as ('CLIENT' | 'WORKER' | 'ADMIN')[],
      },
      {
        href: '/dashboard/wallet',
        label: 'Wallet',
        icon: Wallet,
        roles: ['WORKER'] as ('CLIENT' | 'WORKER' | 'ADMIN')[],
      }
    )
  }

  primaryNavItems.push({
    href: '/dashboard/calendar',
    label: 'Calendar',
    icon: Calendar,
    roles: ['CLIENT', 'WORKER'] as ('CLIENT' | 'WORKER' | 'ADMIN')[],
  })

  const filteredNavItems = primaryNavItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role as any)
  ).slice(0, 5) // Limit to 5 items for bottom nav

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-inset-bottom">
      {/* Background with blur */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 border-t border-border/50" />
      
      {/* Shadow overlay */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      <div className="relative grid grid-cols-5 h-[68px] safe-area-inset-bottom">
        {filteredNavItems.map((item, index) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/' && item.href !== '/dashboard' && pathname?.startsWith(item.href))
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 touch-manipulation',
                'transition-all duration-200 ease-out',
                'active:scale-95',
                isActive && 'text-primary'
              )}
            >
              {/* Active indicator background */}
              {isActive && (
                <div className="absolute inset-x-2 top-1.5 bottom-1.5 bg-primary/10 rounded-lg transition-all duration-200" />
              )}
              
              {/* Icon container */}
              <div className={cn(
                'relative z-10 flex items-center justify-center w-full transition-all duration-200',
                isActive ? 'scale-110' : 'scale-100'
              )}>
                <Icon className={cn(
                  'h-6 w-6 transition-all duration-200',
                  isActive 
                    ? 'text-primary' 
                    : 'text-muted-foreground'
                )} />
              </div>
              
              {/* Label */}
              <span className={cn(
                'relative z-10 text-[10px] font-medium transition-all duration-200 leading-tight text-center w-full',
                isActive 
                  ? 'text-primary scale-105' 
                  : 'text-muted-foreground scale-100'
              )}>
                {item.label}
              </span>
              
              {/* Active dot indicator */}
              {isActive && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary transition-all duration-200" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
