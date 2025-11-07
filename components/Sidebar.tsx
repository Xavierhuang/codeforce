'use client'

import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Search,
  ExternalLink,
  Copy,
  ShoppingBag,
  Briefcase
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QRCode } from '@/components/QRCode'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles?: ('CLIENT' | 'WORKER' | 'ADMIN')[]
}

export function Sidebar() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const { data: user } = useSWR(
    status === 'authenticated' ? '/api/v1/users/me' : null,
    fetcher
  )
  const [profileUrl, setProfileUrl] = useState('')
  const [slug, setSlug] = useState<string | null>(null)

  useEffect(() => {
    if (user?.slug) {
      setSlug(user.slug)
      if (typeof window !== 'undefined') {
        setProfileUrl(`${window.location.origin}/developers/${user.slug}`)
      }
    } else if (user?.role === 'WORKER' && user?.id) {
      const baseSlug = user.name || user.email?.split('@')[0] || user.id
      setSlug(baseSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
    }
  }, [user])

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
      },
      {
        href: '/tasks',
        label: 'Browse Tasks',
        icon: Search,
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
    <aside className="hidden md:flex w-64 border-r bg-card flex-col fixed left-0 top-0 h-screen z-40">
      <div className="p-6 border-b">
        <Link href="/" className="flex items-center">
          <img src="/logo.svg" alt="Skillyy" className="h-8 w-auto" />
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/' && item.href !== '/dashboard' && pathname?.startsWith(item.href))
          
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
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

      {/* Profile Share Section for Workers */}
      {isWorker && slug && (
        <div className="p-4 border-t space-y-3">
          <div className="text-xs font-semibold text-muted-foreground mb-2">
            Share Profile
          </div>
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            <input
              type="text"
              value={profileUrl}
              readOnly
              className="flex-1 text-xs bg-transparent border-0 outline-none truncate"
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => {
                navigator.clipboard.writeText(profileUrl)
                alert('Link copied to clipboard!')
              }}
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
          {profileUrl && (
            <div className="flex justify-center">
              <QRCode value={profileUrl} size={100} />
            </div>
          )}
          <Link href={`/developers/${slug}`} target="_blank">
            <Button variant="outline" size="sm" className="w-full">
              <ExternalLink className="w-3 h-3 mr-2" />
              View Profile
            </Button>
          </Link>
        </div>
      )}
    </aside>
  )
}

