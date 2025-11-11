'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function HomeActions() {
  const router = useRouter()

  const handleBecomeBuyer = () => {
    window.location.href = '/auth/signup?role=CLIENT'
  }

  const handleBecomeDeveloper = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    window.location.href = '/auth/signup?role=WORKER'
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <Button 
        onClick={(e) => {
          e.preventDefault()
          handleBecomeBuyer()
        }}
        size="lg" 
        className="px-8 touch-manipulation"
        type="button"
      >
        Become a Buyer
      </Button>
      <Button 
        onClick={handleBecomeDeveloper}
        size="lg" 
        variant="outline" 
        className="px-8 touch-manipulation"
        type="button"
      >
        Become a Developer
      </Button>
    </div>
  )
}



