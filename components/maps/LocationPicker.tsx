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
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return

    const defaultLat = lat || 40.7128
    const defaultLng = lng || -74.0060

    // Use new map ID for AdvancedMarkerElement (or fallback to default)
    // Try multiple ways to access the Map ID (build-time vs runtime)
    // In Next.js, NEXT_PUBLIC_ vars are embedded at build time and available via process.env
    const mapId = (typeof window !== 'undefined' && (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID) 
      || (typeof window !== 'undefined' && (process as any).env?.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID)
      || (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID)
      || '4ff2b7b883cdd06db24b1343' // Hardcoded fallback to your Map ID
    
    // Debug logging
    console.log('[LocationPicker] Map ID from env:', mapId)
    console.log('[LocationPicker] Google Maps loaded:', !!window.google?.maps)
    console.log('[LocationPicker] Marker library available:', !!window.google?.maps?.marker)
    
    // Helper function to check if AdvancedMarkerElement is available
    const checkAdvancedMarkerAvailable = (): boolean => {
      try {
        const available = !!(
          window.google?.maps?.marker &&
          window.google.maps.marker.AdvancedMarkerElement &&
          window.google.maps.marker.PinElement
        )
        console.log('[LocationPicker] AdvancedMarkerElement check:', available)
        return available
      } catch (e) {
        console.error('[LocationPicker] Error checking AdvancedMarkerElement:', e)
        return false
      }
    }

    // Wait for marker library to load (with timeout)
    const waitForMarkerLibrary = (callback: () => void, maxAttempts = 20, attempt = 0) => {
      const available = checkAdvancedMarkerAvailable()
      console.log(`[LocationPicker] Wait attempt ${attempt}/${maxAttempts}, AdvancedMarker available:`, available)
      
      if (available) {
        console.log('[LocationPicker] AdvancedMarkerElement library is ready!')
        callback()
        return
      }
      
      if (attempt >= maxAttempts) {
        console.warn('[LocationPicker] AdvancedMarkerElement library not available after waiting, falling back to legacy Marker API')
        console.warn('[LocationPicker] Debug info:', {
          googleMaps: !!window.google?.maps,
          markerNamespace: !!window.google?.maps?.marker,
          AdvancedMarkerElement: !!window.google?.maps?.marker?.AdvancedMarkerElement,
          PinElement: !!window.google?.maps?.marker?.PinElement,
          mapId
        })
        callback()
        return
      }
      
      setTimeout(() => {
        waitForMarkerLibrary(callback, maxAttempts, attempt + 1)
      }, 150)
    }

    waitForMarkerLibrary(() => {
      // Re-check AdvancedMarkerElement availability right before creating the map
      // Sometimes the library loads but isn't immediately available
      const finalCheck = checkAdvancedMarkerAvailable()
      const finalMapId = mapId !== 'DEMO_MAP_ID' && mapId && mapId.trim() !== '' ? mapId : '4ff2b7b883cdd06db24b1343'
      
      console.log('[LocationPicker] ===== FINAL CHECK BEFORE MAP CREATION =====')
      console.log('[LocationPicker] AdvancedMarker available:', finalCheck)
      console.log('[LocationPicker] Map ID:', finalMapId)
      console.log('[LocationPicker] Will use AdvancedMarker:', finalCheck && finalMapId)
      
      const map = new window.google.maps.Map(mapRef.current!, {
        center: { lat: defaultLat, lng: defaultLng },
        zoom: zoom,
        mapId: finalMapId, // Always set mapId when we have a valid one
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      })

      mapInstanceRef.current = map

      // Wait a bit more after map creation to ensure marker library is fully initialized
      setTimeout(() => {
        // Use AdvancedMarkerElement if available, otherwise fallback to Marker
        let marker: any
        const advancedMarkerAvailable = checkAdvancedMarkerAvailable()
        const hasValidMapId = finalMapId && finalMapId.trim() !== '' && finalMapId !== 'DEMO_MAP_ID'
        const useAdvancedMarker = advancedMarkerAvailable && hasValidMapId
        
        console.log('[LocationPicker] ===== DECISION AFTER MAP CREATION =====')
        console.log('[LocationPicker] advancedMarkerAvailable:', advancedMarkerAvailable)
        console.log('[LocationPicker] hasValidMapId:', hasValidMapId, '(mapId:', finalMapId, ')')
        console.log('[LocationPicker] useAdvancedMarker:', useAdvancedMarker)
        console.log('[LocationPicker] Will use:', useAdvancedMarker ? 'AdvancedMarkerElement' : 'Legacy Marker')
        console.log('[LocationPicker] ====================')
        
        if (useAdvancedMarker) {
        // New AdvancedMarkerElement API
        const AdvancedMarkerElement = window.google.maps.marker.AdvancedMarkerElement
        const PinElement = window.google.maps.marker.PinElement
        
        const pinElement = new PinElement({
          background: '#94FE0C',
          borderColor: '#7FE00A',
          glyphColor: '#000000',
          scale: 1.2,
        })

        marker = new AdvancedMarkerElement({
          map: map,
          position: { lat: defaultLat, lng: defaultLng },
          content: pinElement.element,
          gmpDraggable: !readOnly,
        })

        marker.addListener('dragend', () => {
          const position = marker.position
          if (position) {
            const newLat = typeof position.lat === 'function' ? position.lat() : position.lat
            const newLng = typeof position.lng === 'function' ? position.lng() : position.lng
            onLocationChange(newLat, newLng)

            if (onAddressChange) {
              const geocoder = new window.google.maps.Geocoder()
              geocoder.geocode({ location: { lat: newLat, lng: newLng } }, (results: any, status: any) => {
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
          map.addListener('click', (e: any) => {
            if (e.latLng) {
              const newLat = e.latLng.lat()
              const newLng = e.latLng.lng()
              const newPosition = { lat: newLat, lng: newLng }
              marker.position = newPosition
              onLocationChange(newLat, newLng)

              if (onAddressChange) {
                const geocoder = new window.google.maps.Geocoder()
                geocoder.geocode({ location: { lat: newLat, lng: newLng } }, (results: any, status: any) => {
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
        
          console.log('Using AdvancedMarkerElement API with Map ID:', finalMapId)
        } else {
          // Fallback to legacy Marker API if AdvancedMarkerElement is not available
          console.warn('Falling back to legacy Marker API. Map ID:', finalMapId, 'AdvancedMarker available:', advancedMarkerAvailable)
          console.warn('[LocationPicker] Marker library check:', {
            markerNamespace: !!window.google?.maps?.marker,
            AdvancedMarkerElement: !!window.google?.maps?.marker?.AdvancedMarkerElement,
            PinElement: !!window.google?.maps?.marker?.PinElement,
          })
          marker = new window.google.maps.Marker({
            map: map,
            position: { lat: defaultLat, lng: defaultLng },
            draggable: !readOnly,
            animation: window.google.maps.Animation.DROP,
          })

          marker.addListener('dragend', () => {
            const position = marker.getPosition()
            if (position) {
              const newLat = position.lat()
              const newLng = position.lng()
              onLocationChange(newLat, newLng)

              if (onAddressChange) {
                const geocoder = new window.google.maps.Geocoder()
                geocoder.geocode({ location: { lat: newLat, lng: newLng } }, (results: any, status: any) => {
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
            map.addListener('click', (e: any) => {
              if (e.latLng) {
                const newLat = e.latLng.lat()
                const newLng = e.latLng.lng()
                marker.setPosition({ lat: newLat, lng: newLng })
                onLocationChange(newLat, newLng)

                if (onAddressChange) {
                  const geocoder = new window.google.maps.Geocoder()
                  geocoder.geocode({ location: { lat: newLat, lng: newLng } }, (results: any, status: any) => {
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
      
      markerRef.current = marker
      }, 100) // Small delay to ensure marker library is fully initialized
    })

    return () => {
      if (markerRef.current) {
        // AdvancedMarkerElement uses map property, Marker uses setMap
        if (markerRef.current.map !== undefined) {
          markerRef.current.map = null
        } else if (markerRef.current.setMap) {
        markerRef.current.setMap(null)
        }
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

          const newPosition = { lat: latitude, lng: longitude }

          if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.setCenter(newPosition)
            mapInstanceRef.current.setZoom(zoom)
            // Handle both AdvancedMarkerElement and Marker APIs
            if (markerRef.current.position !== undefined) {
              markerRef.current.position = newPosition
            } else if (markerRef.current.setPosition) {
              markerRef.current.setPosition(newPosition)
            }
          }

          onLocationChange(latitude, longitude)

          if (onAddressChange) {
            const geocoder = new window.google.maps.Geocoder()
            geocoder.geocode({ location: newPosition }, (results: any, status: any) => {
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
                  address: fullAddress || place.formatted_address || data.city || 'Approximate location',
                  city: city || data.city || '',
                  state: state || data.region || data.region_code || '',
                  postalCode: postalCode || data.postal || '',
                  country: country || data.country_code || '',
                  lat: latitude,
                  lng: longitude,
                  formattedAddress: fullAddress
                    || place.formatted_address
                    || (data.city ? `${data.city}${data.region ? ', ' + data.region : ''}` : 'Approximate location'),
                }

                onAddressChange(addressData)
              }
            })
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
          console.warn('Unable to query geolocation permission (LocationPicker):', permissionError)
        }
      }

    setIsDetectingLocation(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords

        if (mapInstanceRef.current && markerRef.current) {
          const newPosition = { lat: latitude, lng: longitude }
          mapInstanceRef.current.setCenter(newPosition)
          mapInstanceRef.current.setZoom(zoom)
            // Handle both AdvancedMarkerElement and Marker APIs
            if (markerRef.current.position !== undefined) {
              markerRef.current.position = newPosition
            } else if (markerRef.current.setPosition) {
          markerRef.current.setPosition(newPosition)
            }
          onLocationChange(latitude, longitude)

          if (onAddressChange) {
            const geocoder = new window.google.maps.Geocoder()
            geocoder.geocode({ location: newPosition }, (results: any, status: any) => {
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
        async (error) => {
        setIsDetectingLocation(false)
          console.error('Geolocation error (LocationPicker):', error)
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

