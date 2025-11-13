'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { MapPin, Navigation } from 'lucide-react'
import toast from 'react-hot-toast'

export interface AddressData {
  address: string
  city: string
  state?: string
  postalCode: string
  country: string
  lat: number
  lng: number
  formattedAddress: string
}

interface AddressAutocompleteProps {
  value?: string
  onSelect: (data: AddressData) => void
  label?: string
  placeholder?: string
  required?: boolean
  className?: string
  showLocationButton?: boolean
  onLocationDetected?: (data: AddressData) => void
}

// Suppress the deprecation warning for Autocomplete
// This is a temporary solution until we migrate to PlaceAutocompleteElement
let warningSuppressed = false
const suppressAutocompleteWarning = () => {
  if (typeof window !== 'undefined' && window.console && !warningSuppressed) {
    warningSuppressed = true
    const originalWarn = console.warn
    const originalError = console.error
    
    // Override console.warn to filter Google Maps Autocomplete deprecation warnings
    console.warn = (...args: any[]) => {
      const message = args[0]?.toString() || ''
      // Only suppress the specific Autocomplete deprecation warning
      if (message.includes('google.maps.places.Autocomplete') && 
          (message.includes('PlaceAutocompleteElement') || message.includes('March 1st, 2025'))) {
        return
      }
      originalWarn.apply(console, args)
    }
    
    // Also filter from console.error in case it's logged there
    console.error = (...args: any[]) => {
      const message = args[0]?.toString() || ''
      if (message.includes('google.maps.places.Autocomplete') && 
          (message.includes('PlaceAutocompleteElement') || message.includes('March 1st, 2025'))) {
        return
      }
      originalError.apply(console, args)
    }
  }
}

export function AddressAutocomplete({
  value = '',
  onSelect,
  label = 'Address',
  placeholder = 'Enter address...',
  required = false,
  className = '',
  showLocationButton = true,
  onLocationDetected,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)

  useEffect(() => {
    if (!inputRef.current || !window.google?.maps?.places) return

    // Suppress deprecation warning
    suppressAutocompleteWarning()

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: ['us', 'ca', 'gb', 'au'] },
    })

    autocompleteRef.current = autocomplete

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()

      if (!place.geometry || !place.geometry.location) {
        toast.error('Please select a valid address from the suggestions')
        return
      }

      const addressComponents = place.address_components || []
      let streetNumber = ''
      let route = ''
      let city = ''
      let state = ''
      let postalCode = ''
      let country = ''

      addressComponents.forEach((component: any) => {
        const types = component.types

        if (types.includes('street_number')) {
          streetNumber = component.long_name
        } else if (types.includes('route')) {
          route = component.long_name
        } else if (types.includes('locality') || types.includes('postal_town')) {
          city = component.long_name
        } else if (types.includes('administrative_area_level_1')) {
          state = component.short_name
        } else if (types.includes('postal_code')) {
          postalCode = component.long_name
        } else if (types.includes('country')) {
          country = component.short_name
        }
      })

      const fullAddress = streetNumber && route ? `${streetNumber} ${route}` : place.formatted_address || ''

      const addressData: AddressData = {
        address: fullAddress,
        city: city || '',
        state: state || '',
        postalCode: postalCode || '',
        country: country || '',
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        formattedAddress: place.formatted_address || fullAddress,
      }

      onSelect(addressData)
    })

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [onSelect])

  const detectUserLocation = () => {
    const run = async () => {
      if (!navigator.geolocation) {
        toast.error('Geolocation is not supported by your browser')
        return
      }

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

          const addressData: AddressData = {
            address: data.city ? `${data.city}${data.region ? ', ' + data.region : ''}` : data.country_name || 'Approximate location',
            city: data.city || '',
            state: data.region || data.region_code || '',
            postalCode: data.postal || '',
            country: data.country_code || '',
            lat: latitude,
            lng: longitude,
            formattedAddress: data.city
              ? `${data.city}${data.region ? ', ' + data.region : ''}${data.country_name ? ', ' + data.country_name : ''}`
              : data.country_name || 'Approximate location',
          }

          if (inputRef.current) {
            inputRef.current.value = addressData.formattedAddress
          }

          onSelect(addressData)
          if (onLocationDetected) {
            onLocationDetected(addressData)
          }
          toast.success('Approximate location detected (based on IP).')
        } catch (fallbackError: any) {
          toast.error(fallbackError?.message || 'Unable to determine approximate location.')
        } finally {
          setIsDetectingLocation(false)
        }
      }

      if (navigator.permissions?.query) {
        try {
          const status = await navigator.permissions.query({ name: 'geolocation' })
          if (status.state === 'denied') {
            toast.error('Location permission is blocked. Please enable it in your browser settings and refresh the page.')
            await fallbackToApproximateLocation()
            return
          }
        } catch (permissionError) {
          console.warn('Unable to query geolocation permission (AddressAutocomplete):', permissionError)
        }
      }

      setIsDetectingLocation(true)

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords

            const geocoder = new window.google.maps.Geocoder()
            const latlng = { lat: latitude, lng: longitude }

            geocoder.geocode({ location: latlng }, (results: any, status: any) => {
              setIsDetectingLocation(false)

              if (status === 'OK' && results && results[0]) {
                const place = results[0]
                const addressComponents = place.address_components || []
                let streetNumber = ''
                let route = ''
                let city = ''
                let state = ''
                let postalCode = ''
                let country = ''

                addressComponents.forEach((component: any) => {
                  const types = component.types

                  if (types.includes('street_number')) {
                    streetNumber = component.long_name
                  } else if (types.includes('route')) {
                    route = component.long_name
                  } else if (types.includes('locality') || types.includes('postal_town')) {
                    city = component.long_name
                  } else if (types.includes('administrative_area_level_1')) {
                    state = component.short_name
                  } else if (types.includes('postal_code')) {
                    postalCode = component.long_name
                  } else if (types.includes('country')) {
                    country = component.short_name
                  }
                })

                const fullAddress = streetNumber && route ? `${streetNumber} ${route}` : place.formatted_address || ''

                const addressData: AddressData = {
                  address: fullAddress,
                  city: city || '',
                  state: state || '',
                  postalCode: postalCode || '',
                  country: country || '',
                  lat: latitude,
                  lng: longitude,
                  formattedAddress: place.formatted_address || fullAddress,
                }

                if (inputRef.current) {
                  inputRef.current.value = place.formatted_address || fullAddress
                }

                onSelect(addressData)
                if (onLocationDetected) {
                  onLocationDetected(addressData)
                }
                toast.success('Location detected successfully')
              } else {
                toast.error('Could not determine address from location')
              }
            })
          } catch (error) {
            setIsDetectingLocation(false)
            toast.error('Failed to detect location')
          }
        },
        async (error) => {
          setIsDetectingLocation(false)
          console.error('Geolocation error (AddressAutocomplete):', error)
          if (error.code === error.PERMISSION_DENIED) {
            toast.error('Location access denied. Please enable location permissions in your browser settings.')
            await fallbackToApproximateLocation()
          } else {
            toast.error(error.message || 'Failed to detect location')
            await fallbackToApproximateLocation()
          }
        }
      )
    }

    run()
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        {label && (
          <Label htmlFor="address-autocomplete" className="text-sm">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        {showLocationButton && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={detectUserLocation}
            disabled={isDetectingLocation}
            className="h-7 text-xs"
          >
            <Navigation className="w-3 h-3 mr-1" />
            {isDetectingLocation ? 'Detecting...' : 'Use My Location'}
          </Button>
        )}
      </div>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          id="address-autocomplete"
          ref={inputRef}
          type="text"
          defaultValue={value}
          placeholder={placeholder}
          className="pl-9"
          required={required}
        />
      </div>
    </div>
  )
}




