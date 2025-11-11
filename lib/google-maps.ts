export interface GeocodeResult {
  address: string
  city: string
  state?: string
  postalCode: string
  country: string
  lat: number
  lng: number
  formattedAddress: string
}

export function parseAddressComponents(place: google.maps.places.PlaceResult | google.maps.GeocoderResult): GeocodeResult {
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

  let lat = 0
  let lng = 0

  if ('geometry' in place && place.geometry?.location) {
    if (typeof place.geometry.location.lat === 'function') {
      lat = place.geometry.location.lat()
      lng = place.geometry.location.lng()
    } else {
      lat = place.geometry.location.lat
      lng = place.geometry.location.lng
    }
  }

  return {
    address: fullAddress,
    city: city || '',
    state: state || '',
    postalCode: postalCode || '',
    country: country || '',
    lat,
    lng,
    formattedAddress: place.formatted_address || fullAddress,
  }
}

export function geocodeAddress(address: string): Promise<GeocodeResult> {
  return new Promise((resolve, reject) => {
    if (!window.google?.maps?.Geocoder) {
      reject(new Error('Google Maps API not loaded'))
      return
    }

    const geocoder = new window.google.maps.Geocoder()

    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        resolve(parseAddressComponents(results[0]))
      } else {
        reject(new Error(`Geocoding failed: ${status}`))
      }
    })
  })
}

export function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
  return new Promise((resolve, reject) => {
    if (!window.google?.maps?.Geocoder) {
      reject(new Error('Google Maps API not loaded'))
      return
    }

    const geocoder = new window.google.maps.Geocoder()

    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        resolve(parseAddressComponents(results[0]))
      } else {
        reject(new Error(`Reverse geocoding failed: ${status}`))
      }
    })
  })
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  unit: 'km' | 'miles' = 'miles'
): number {
  if (!window.google?.maps?.geometry) {
    const R = unit === 'km' ? 6371 : 3959
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const from = new window.google.maps.LatLng(lat1, lng1)
  const to = new window.google.maps.LatLng(lat2, lng2)
  const distance = window.google.maps.geometry.spherical.computeDistanceBetween(from, to)

  return unit === 'km' ? distance / 1000 : distance / 1609.34
}

export function isLocationWithinRadius(
  centerLat: number,
  centerLng: number,
  testLat: number,
  testLng: number,
  radiusMiles: number
): boolean {
  const distance = calculateDistance(centerLat, centerLng, testLat, testLng, 'miles')
  return distance <= radiusMiles
}




