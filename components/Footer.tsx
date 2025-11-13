'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function Footer() {
  const router = useRouter()

  const handleBecomeExpert = () => {
    router.push('/auth/signup?role=WORKER')
  }

  return (
    <footer className="border-t bg-gray-50 mt-16" suppressHydrationWarning>
      <div className="container mx-auto px-4 py-8" suppressHydrationWarning>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8" suppressHydrationWarning>
          <div>
            <h3 className="font-semibold mb-4">Skillyy</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-foreground">About Us</Link></li>
              <li>
                <button 
                  onClick={handleBecomeExpert} 
                  type="button" 
                  className="hover:text-foreground text-left w-full"
                >
                  Become an Expert
                </button>
              </li>
              <li><Link href="/careers" className="hover:text-foreground">Careers</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/help" className="hover:text-foreground">Help Center</Link></li>
              <li><Link href="/contact" className="hover:text-foreground">Contact Us</Link></li>
              <li><Link href="/safety" className="hover:text-foreground">Safety</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-foreground">Terms of Service</Link></li>
              <li><Link href="/cookie" className="hover:text-foreground">Cookie Policy</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Connect</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/blog" className="hover:text-foreground">Blog</Link></li>
              <li><Link href="/careers" className="hover:text-foreground">Careers</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t pt-8 text-center text-sm text-muted-foreground" suppressHydrationWarning>
          <p>&copy; {new Date().getFullYear()} Skillyy, Inc. All rights reserved.</p>
          <p className="mt-2">Connecting clients with skilled technical professionals including experts, editors, designers, and social media managers.</p>
        </div>
      </div>
    </footer>
  )
}

