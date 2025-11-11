'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Navigation, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import { AddressData } from './AddressAutocomplete'

interface LocationPickerProps {
  lat?: number
  lng?: number
  onLocationChange: (lat: number, lng: number) => void
  onAddressChange?: (address: AddressData) => void
  height?: string
  zoom?: number
  className?: string
  readOnly?: boolean
  showControls?: boolean
}

export function LocationPicker({
  lat,
  lng,
  onLocationChange,
  onAddressChange,
  height = '400px',
  zoom = 15,
  className = '',
  readOnly = false,
  showControls = true,
}: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return

    const defaultLat = lat || 40.7128
    const defaultLng = lng || -74.0060

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: defaultLat, lng: defaultLng },
      zoom: zoom,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    })

    mapInstanceRef.current = map

    const marker = new window.google.maps.Marker({
      map: map,
      position: { lat: defaultLat, lng: defaultLng },
      draggable: !readOnly,
      animation: window.google.maps.Animation.DROP,
    })

    markerRef.current = marker

    marker.addListener('dragend', () => {
      const position = marker.getPosition()
      if (position) {
        const newLat = position.lat()
        const newLng = position.lng()
        onLocationChange(newLat, newLng)

        if (onAddressChange) {
          const geocoder = new window.google.maps.Geocoder()
          geocoder.geocode({ location: { lat: newLat, lng: newLng } }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              const place = results[0]
              const addressComponents = place.address_components || []
              let streetNumber = ''
              let route = ''
              let city = ''
              let state = ''
              let postalCode = ''
              let country = ''

              addressComponents.forEach((component) => {
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
                lat: newLat,
                lng: newLng,
                formattedAddress: place.formatted_address || fullAddress,
              }

              onAddressChange(addressData)
            }
          })
        }
      }
    })

    if (!readOnly) {
      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          const newLat = e.latLng.lat()
          const newLng = e.latLng.lng()
          marker.setPosition({ lat: newLat, lng: newLng })
          onLocationChange(newLat, newLng)

          if (onAddressChange) {
            const geocoder = new window.google.maps.Geocoder()
            geocoder.geocode({ location: { lat: newLat, lng: newLng } }, (results, status) => {
              if (status === 'OK' && results && results[0]) {
                const place = results[0]
                const addressComponents = place.address_components || []
                let streetNumber = ''
                let route = ''
                let city = ''
                let state = ''
                let postalCode = ''
                let country = ''

                addressComponents.forEach((component) => {
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
                  lat: newLat,
                  lng: newLng,
                  formattedAddress: place.formatted_address || fullAddress,
                }

                onAddressChange(addressData)
              }
            })
          }
        }
      })
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null)
      }
    }
  }, [])

  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && lat && lng) {
      const position = { lat, lng }
      mapInstanceRef.current.setCenter(position)
      markerRef.current.setPosition(position)
    }
  }, [lat, lng])

  const detectUserLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }

    setIsDetectingLocation(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords

        if (mapInstanceRef.current && markerRef.current) {
          const newPosition = { lat: latitude, lng: longitude }
          mapInstanceRef.current.setCenter(newPosition)
          mapInstanceRef.current.setZoom(zoom)
          markerRef.current.setPosition(newPosition)
          onLocationChange(latitude, longitude)

          if (onAddressChange) {
            const geocoder = new window.google.maps.Geocoder()
            geocoder.geocode({ location: newPosition }, (results, status) => {
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

                addressComponents.forEach((component) => {
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

                onAddressChange(addressData)
                toast.success('Location detected successfully')
              } else {
                setIsDetectingLocation(false)
                toast.error('Could not determine address from location')
              }
            })
          } else {
            setIsDetectingLocation(false)
            toast.success('Location detected successfully')
          }
        }
      },
      (error) => {
        setIsDetectingLocation(false)
        if (error.code === error.PERMISSION_DENIED) {
          toast.error('Location access denied. Please enable location permissions.')
        } else {
          toast.error('Failed to detect location')
        }
      }
    )
  }

  return (
    <div className={className}>
      {showControls && (
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {readOnly ? 'Location' : 'Select Location on Map'}
          </Label>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={detectUserLocation}
              disabled={isDetectingLocation}
              className="text-xs"
            >
              <Navigation className="w-3 h-3 mr-1" />
              {isDetectingLocation ? 'Detecting...' : 'Use My Location'}
            </Button>
          )}
        </div>
      )}
      <Card>
        <CardContent className="p-0">
          <div ref={mapRef} style={{ height, width: '100%' }} className="rounded-lg" />
        </CardContent>
      </Card>
      {showControls && !readOnly && (
        <p className="text-xs text-muted-foreground mt-2">
          Click on the map or drag the marker to set your location
        </p>
      )}
    </div>
  )
}

