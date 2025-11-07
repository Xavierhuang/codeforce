'use client'

import { WalletComponent } from '@/components/Wallet'

export default function WalletPage() {
  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Wallet</h1>
        <p className="text-muted-foreground">
          Manage your earnings and request payouts
        </p>
      </div>
      <WalletComponent />
    </div>
  )
}

