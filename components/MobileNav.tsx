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
  Menu
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles?: ('CLIENT' | 'WORKER' | 'ADMIN')[]
}

export function MobileNav() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const { data: user } = useSWR(
    status === 'authenticated' ? '/api/v1/users/me' : null,
    fetcher
  )
  const [open, setOpen] = useState(false)

  if (status !== 'authenticated' || !session || !user) {
    return null
  }

  const isClient = user?.role === 'CLIENT'
  const isWorker = user?.role === 'WORKER'
  const isAdmin = user?.role === 'ADMIN'

  const navItems: NavItem[] = []

  navItems.push({
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['CLIENT', 'WORKER', 'ADMIN'] as ('CLIENT' | 'WORKER' | 'ADMIN')[],
  })

  if (isClient) {
    navItems.push({
      href: '/dashboard/orders',
      label: 'My Orders',
      icon: ShoppingBag,
      roles: ['CLIENT'] as ('CLIENT' | 'WORKER' | 'ADMIN')[],
    })
  }

  if (isWorker) {
    navItems.push(
      {
        href: '/dashboard/tasks',
        label: 'My Tasks',
        icon: Briefcase,
        roles: ['WORKER'] as ('CLIENT' | 'WORKER' | 'ADMIN')[],
      }
    )
  }

  navItems.push({
    href: '/dashboard/calendar',
    label: 'Calendar',
    icon: Calendar,
    roles: ['CLIENT', 'WORKER'] as ('CLIENT' | 'WORKER' | 'ADMIN')[],
  })

  if (isWorker) {
    navItems.push(
      {
        href: '/dashboard/availability',
        label: 'Availability',
        icon: Clock,
        roles: ['WORKER'] as ('CLIENT' | 'WORKER' | 'ADMIN')[],
      },
      {
        href: '/dashboard/verify',
        label: 'Verification',
        icon: ShieldCheck,
        roles: ['WORKER'] as ('CLIENT' | 'WORKER' | 'ADMIN')[],
      }
    )
  }

  if (isAdmin) {
    navItems.push({
      href: '/admin',
      label: 'Admin Panel',
      icon: ShieldCheck,
      roles: ['ADMIN'] as ('CLIENT' | 'WORKER' | 'ADMIN')[],
    })
  }

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role as any)
  )

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild onClick={() => setOpen(true)}>
        <Button variant="ghost" size="icon" className="hidden sm:flex lg:hidden touch-manipulation">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0" onClose={() => setOpen(false)}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b">
            <Link href="/" className="flex items-center justify-center" onClick={() => setOpen(false)}>
              <img src="/favicon.svg" alt="Skillyy" className="h-11 w-11 rounded-lg" />
            </Link>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href !== '/' && item.href !== '/dashboard' && pathname?.startsWith(item.href))
              
              return (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                  <div
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors touch-manipulation ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                </Link>
              )
            })}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  )
}

