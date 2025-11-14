# Google Maps Integration Setup

This application now includes Google Maps integration for location matching, address autocomplete, and user location detection.

## Features

1. **Address Autocomplete**: Users can type addresses and get suggestions from Google Places API
2. **Location Detection**: Users can detect their current location using browser geolocation
3. **Interactive Map**: Users can pick locations on an interactive map
4. **Location Matching**: Calculate distances between locations for matching workers with tasks

## Setup

### 1. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Create credentials (API Key)
5. Restrict the API key (recommended):
   - Application restrictions: HTTP referrers (web sites)
   - Add your domain(s) to the allowed referrers

### 2. Add API Key to Environment Variables

Add the following to your `.env` file:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

**Important**: The `NEXT_PUBLIC_` prefix is required for client-side access to the API key.

### 3. Restart Development Server

After adding the API key, restart your Next.js development server:

```bash
npm run dev
```

## Components

### GoogleMapsLoader
Wrapper component that loads the Google Maps JavaScript API. Wrap pages that use maps with this component.

```tsx
import { GoogleMapsLoader } from '@/components/maps/GoogleMapsLoader'

<GoogleMapsLoader>
  {/* Your page content */}
</GoogleMapsLoader>
```

### AddressAutocomplete
Input field with Google Places autocomplete and location detection.

```tsx
import { AddressAutocomplete, AddressData } from '@/components/maps/AddressAutocomplete'

<AddressAutocomplete
  value={address}
  onSelect={(data: AddressData) => {
    // Handle address selection
    setAddress(data.address)
    setLat(data.lat)
    setLng(data.lng)
  }}
  label="Address"
  placeholder="Enter address..."
  required
  showLocationButton={true}
/>
```

### LocationPicker
Interactive map component for selecting locations.

```tsx
import { LocationPicker } from '@/components/maps/LocationPicker'

<LocationPicker
  lat={latitude}
  lng={longitude}
  onLocationChange={(lat, lng) => {
    setLat(lat)
    setLng(lng)
  }}
  onAddressChange={(addressData) => {
    // Optional: Handle address change
  }}
  height="400px"
/>
```

## Utility Functions

### Geocoding
Convert addresses to coordinates:

```tsx
import { geocodeAddress } from '@/lib/google-maps'

const result = await geocodeAddress('123 Main St, New York, NY')
console.log(result.lat, result.lng)
```

### Reverse Geocoding
Convert coordinates to addresses:

```tsx
import { reverseGeocode } from '@/lib/google-maps'

const result = await reverseGeocode(40.7128, -74.0060)
console.log(result.formattedAddress)
```

### Distance Calculation
Calculate distance between two points:

```tsx
import { calculateDistance } from '@/lib/google-maps'

const distance = calculateDistance(
  40.7128, -74.0060,  // Point 1
  40.7589, -73.9851,  // Point 2
  'miles'  // or 'km'
)
```

### Location Matching
Check if a location is within a radius:

```tsx
import { isLocationWithinRadius } from '@/lib/google-maps'

const isWithinRadius = isLocationWithinRadius(
  40.7128, -74.0060,  // Center
  40.7589, -73.9851,  // Test point
  25  // Radius in miles
)
```

## Hook

### useUserLocation
Hook for detecting user's current location:

```tsx
import { useUserLocation } from '@/hooks/useUserLocation'

const { location, address, isLoading, error, detectLocation } = useUserLocation()

// Call detectLocation() to start detection
```

## Usage in Forms

The Google Maps components are already integrated into:

1. **Booking Form** (`app/book/[slug]/page.tsx`): For selecting task locations
2. **Verification Page** (`app/dashboard/verify/page.tsx`): For setting worker location

## API Integration

When creating tasks or bookings, the following location data is stored:

- `address`: Street address
- `city`: City name
- `postalCode`: Postal/ZIP code
- `addressLat`: Latitude (for tasks)
- `addressLng`: Longitude (for tasks)
- `locationLat`: Latitude (for workers)
- `locationLng`: Longitude (for workers)

## Notes

- The Google Maps API requires billing to be enabled (though there's a free tier)
- Make sure to restrict your API key to prevent unauthorized usage
- The components handle loading states and errors gracefully
- Location detection requires user permission (browser will prompt)







