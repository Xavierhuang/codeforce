'use client'

import { WalletComponent } from '@/components/Wallet'

export default function WalletPage() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Wallet</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Manage your earnings and request payouts
        </p>
      </div>
      <WalletComponent />
    </div>
  )
}

