import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import Link from 'next/link'

export function HeaderLoading() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 safe-area-inset-top shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="CodeForce" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" disabled>
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}



