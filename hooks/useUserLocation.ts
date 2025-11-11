'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { reverseGeocode, GeocodeResult } from '@/lib/google-maps'

interface UseUserLocationReturn {
  location: { lat: number; lng: number } | null
  address: GeocodeResult | null
  isLoading: boolean
  error: string | null
  detectLocation: () => void
}

export function useUserLocation(): UseUserLocationReturn {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [address, setAddress] = useState<GeocodeResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const detectLocation = () => {
    if (!navigator.geolocation) {
      const errorMsg = 'Geolocation is not supported by your browser'
      setError(errorMsg)
      toast.error(errorMsg)
      return
    }

    setIsLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          const newLocation = { lat: latitude, lng: longitude }
          setLocation(newLocation)

          if (window.google?.maps) {
            try {
              const addressData = await reverseGeocode(latitude, longitude)
              setAddress(addressData)
            } catch (err) {
              console.error('Reverse geocoding failed:', err)
            }
          }
        } catch (err: any) {
          const errorMsg = err.message || 'Failed to process location'
          setError(errorMsg)
          toast.error(errorMsg)
        } finally {
          setIsLoading(false)
        }
      },
      (err) => {
        setIsLoading(false)
        let errorMsg = 'Failed to detect location'

        if (err.code === err.PERMISSION_DENIED) {
          errorMsg = 'Location access denied. Please enable location permissions.'
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          errorMsg = 'Location information is unavailable.'
        } else if (err.code === err.TIMEOUT) {
          errorMsg = 'Location request timed out.'
        }

        setError(errorMsg)
        toast.error(errorMsg)
      }
    )
  }

  return {
    location,
    address,
    isLoading,
    error,
    detectLocation,
  }
}




