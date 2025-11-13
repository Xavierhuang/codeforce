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

  const fallbackToApproximateLocation = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/')
      if (!response.ok) {
        throw new Error('Approximate location lookup failed (ipapi.co unavailable).')
      }

      const data = await response.json()
      const latitude = parseFloat(data.latitude)
      const longitude = parseFloat(data.longitude)

      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        throw new Error('Approximate location lookup returned invalid coordinates.')
      }

      const newLocation = { lat: latitude, lng: longitude }
      setLocation(newLocation)

      try {
        const addressData = await reverseGeocode(latitude, longitude)
        setAddress(addressData)
      } catch (reverseError) {
        console.warn('Reverse geocoding for approximate location failed:', reverseError)
      }

      toast.success('Approximate location detected (based on IP).')
      setError(null)
    } catch (fallbackError: any) {
      const message = fallbackError?.message || 'Unable to determine approximate location.'
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const detectLocation = () => {
    const run = async () => {
      if (!navigator.geolocation) {
        const errorMsg = 'Geolocation is not supported by your browser'
        setError(errorMsg)
        toast.error(errorMsg)
        return
      }

      if (navigator.permissions?.query) {
        try {
          const status = await navigator.permissions.query({ name: 'geolocation' })
          if (status.state === 'denied') {
            const errorMsg = 'Location permission is blocked. Please enable it in your browser settings and refresh.'
            setError(errorMsg)
            toast.error(errorMsg)
            return
          }
        } catch (permissionError) {
          console.warn('Unable to query geolocation permission:', permissionError)
        }
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
        async (err) => {
          setIsLoading(false)
          console.error('Geolocation error:', err)
          let errorMsg = 'Failed to detect location'

          if (err.code === err.PERMISSION_DENIED) {
            errorMsg = 'Location access denied. Please enable location permissions in your browser.'
            setError(errorMsg)
            toast.error(errorMsg)
            await fallbackToApproximateLocation()
            return
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            errorMsg = 'Location information is unavailable.'
          } else if (err.code === err.TIMEOUT) {
            errorMsg = 'Location request timed out.'
          } else if (err.message) {
            errorMsg = err.message
          }

          setError(errorMsg)
          toast.error(errorMsg)
          await fallbackToApproximateLocation()
        }
      )
    }

    run()
  }

  return {
    location,
    address,
    isLoading,
    error,
    detectLocation,
  }
}






