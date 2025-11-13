'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

export function HomeSearchBar() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="relative mb-6">
      <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-muted-foreground w-6 h-6" />
      <Input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Describe one task, e.g. fix the hole in my wall"
        className="w-full pl-14 pr-4 py-6 text-lg rounded-lg border-2 focus:border-primary h-16"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && searchQuery.trim()) {
            router.push(`/developers?search=${encodeURIComponent(searchQuery.trim())}`)
          }
        }}
      />
    </div>
  )
}





