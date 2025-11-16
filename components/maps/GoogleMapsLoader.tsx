'use client'

import { useEffect, useState, useRef } from 'react'

interface GoogleMapsLoaderProps {
  children: React.ReactNode
}

// Global state to prevent multiple script loads
const globalLoadState = {
  isLoading: false,
  isLoaded: false,
  error: null as string | null,
  callbacks: [] as Array<() => void>,
}

export function GoogleMapsLoader({ children }: GoogleMapsLoaderProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const hasLoadedRef = useRef(false)
  const hasErrorRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (hasLoadedRef.current || hasErrorRef.current) return

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim().replace(/^["']|["']$/g, '')

    if (!apiKey) {
      hasErrorRef.current = true
      setLoadError('Google Maps API key is not configured. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env file.')
      return
    }

    // Check if already loaded globally
    if (globalLoadState.isLoaded && window.google && window.google.maps) {
      hasLoadedRef.current = true
      setIsLoaded(true)
      return
    }

    // Check if there's a global error
    if (globalLoadState.error) {
      hasErrorRef.current = true
      setLoadError(globalLoadState.error)
      return
    }

    // If loading is in progress, wait for it
    if (globalLoadState.isLoading) {
      const callback = () => {
        if (window.google && window.google.maps) {
          hasLoadedRef.current = true
          setIsLoaded(true)
        } else if (globalLoadState.error) {
          hasErrorRef.current = true
          setLoadError(globalLoadState.error)
        }
      }
      globalLoadState.callbacks.push(callback)
      return () => {
        const index = globalLoadState.callbacks.indexOf(callback)
        if (index > -1) {
          globalLoadState.callbacks.splice(index, 1)
        }
      }
    }

    // Check if script already exists in DOM
    const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`)
    if (existingScript) {
      globalLoadState.isLoading = true
      // Wait for it to load
      const checkLoaded = setInterval(() => {
        if (window.google && window.google.maps) {
          globalLoadState.isLoaded = true
          globalLoadState.isLoading = false
          hasLoadedRef.current = true
          setIsLoaded(true)
          globalLoadState.callbacks.forEach(cb => cb())
          globalLoadState.callbacks = []
          clearInterval(checkLoaded)
        }
      }, 100)
      
      return () => clearInterval(checkLoaded)
    }

    // Set up global error handler for Google Maps API errors
    const originalErrorHandler = window.onerror
    const googleMapsErrorHandler = (message: string | Event, source?: string, lineno?: number, colno?: number, error?: Error) => {
      if (typeof message === 'string' && (message.includes('maps.googleapis.com') || message.includes('Google Maps') || message.includes('InvalidKey') || message.includes('RefererNotAllowed'))) {
        hasErrorRef.current = true
        let errorMsg = 'Failed to load Google Maps. '
        
        if (message.includes('InvalidKey')) {
          errorMsg += 'Invalid API key. Please check your NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env file.'
        } else if (message.includes('RefererNotAllowed')) {
          errorMsg += 'API key restrictions are blocking this domain. Please add your domain to allowed referrers in Google Cloud Console.'
        } else if (message.includes('OVER_QUERY_LIMIT')) {
          errorMsg += 'API quota exceeded. Please check your billing status in Google Cloud Console.'
        } else {
          errorMsg += 'Please check your API key, ensure Maps JavaScript API is enabled, and verify billing is enabled in Google Cloud Console.'
        }
        
        setLoadError(errorMsg)
        window.onerror = originalErrorHandler
        return true
      }
      return false
    }
    window.onerror = googleMapsErrorHandler as any

    // Mark as loading globally
    globalLoadState.isLoading = true

    // Set up callback function (use a unique name to avoid conflicts)
    const callbackName = `initGoogleMaps_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    ;(window as any)[callbackName] = () => {
      window.onerror = originalErrorHandler
      if (window.google && window.google.maps) {
        globalLoadState.isLoaded = true
        globalLoadState.isLoading = false
        hasLoadedRef.current = true
        setIsLoaded(true)
        // Notify all waiting callbacks
        globalLoadState.callbacks.forEach(cb => cb())
        globalLoadState.callbacks = []
        delete (window as any)[callbackName]
      } else {
        globalLoadState.error = 'Google Maps API loaded but initialization failed. Please check your API key and restrictions.'
        globalLoadState.isLoading = false
        hasErrorRef.current = true
        setLoadError(globalLoadState.error)
        // Notify all waiting callbacks
        globalLoadState.callbacks.forEach(cb => cb())
        globalLoadState.callbacks = []
        delete (window as any)[callbackName]
      }
    }
    
    // Also catch Google Maps API errors via window.onerror
    const checkForGoogleMapsErrors = () => {
      // Check console for Google Maps errors after a delay
      setTimeout(() => {
        if (!hasLoadedRef.current && !hasErrorRef.current) {
          // Check if there's a script error in the console
          const scripts = document.querySelectorAll('script[src*="maps.googleapis.com"]')
          scripts.forEach((script) => {
            script.addEventListener('error', () => {
              hasErrorRef.current = true
              setLoadError('Failed to load Google Maps script. Check browser console for details.')
            })
          })
        }
      }, 2000)
    }
    checkForGoogleMapsErrors()

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,marker&callback=${callbackName}&loading=async`
    script.async = true
    script.defer = true

    script.onerror = (event: Event | string) => {
      window.onerror = originalErrorHandler
      hasErrorRef.current = true
      
      // Try to fetch the script URL directly to see the actual error response
      fetch(`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,marker`)
        .then(response => {
          if (!response.ok) {
            return response.text().then(text => {
              console.error('Google Maps API Error Response:', text)
              let errorMsg = 'Failed to load Google Maps script. '
              
              if (text.includes('InvalidKey') || response.status === 403) {
                errorMsg += 'Invalid API key or key restrictions are blocking access. '
              } else if (text.includes('RefererNotAllowed')) {
                errorMsg += 'API key restrictions are blocking this domain. Add skillyy.com/* and www.skillyy.com/* to allowed referrers. '
              } else if (response.status === 400) {
                errorMsg += 'Bad request. Check API key format and ensure Maps JavaScript API is enabled. '
              }
              
              errorMsg += `HTTP Status: ${response.status}. Check browser console (F12) for details.`
              globalLoadState.error = errorMsg
              globalLoadState.isLoading = false
              setLoadError(errorMsg)
              // Notify all waiting callbacks
              globalLoadState.callbacks.forEach(cb => cb())
              globalLoadState.callbacks = []
            })
          }
        })
        .catch(fetchError => {
          console.error('Failed to fetch Google Maps script:', fetchError)
          const errorMsg = 'Failed to load Google Maps script. This could be due to network issues, API key restrictions, or the Maps JavaScript API not being enabled. Check browser console (F12) for details.'
          globalLoadState.error = errorMsg
          globalLoadState.isLoading = false
          setLoadError(errorMsg)
          // Notify all waiting callbacks
          globalLoadState.callbacks.forEach(cb => cb())
          globalLoadState.callbacks = []
        })
      
      delete (window as any)[callbackName]
      
      // Log detailed error for debugging
      console.error('Google Maps script load error:', {
        event,
        apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'missing',
        scriptUrl: script.src,
      })
    }

    // Add timeout to detect if callback never fires
    const timeout = setTimeout(() => {
      if (!hasLoadedRef.current && !hasErrorRef.current && globalLoadState.isLoading) {
        window.onerror = originalErrorHandler
        const errorMsg = 'Google Maps failed to load within timeout. Please check your API key, billing status, and API restrictions in Google Cloud Console.'
        globalLoadState.error = errorMsg
        globalLoadState.isLoading = false
        hasErrorRef.current = true
        setLoadError(errorMsg)
        // Notify all waiting callbacks
        globalLoadState.callbacks.forEach(cb => cb())
        globalLoadState.callbacks = []
        delete (window as any)[callbackName]
      }
    }, 10000) // 10 second timeout

    document.head.appendChild(script)

    return () => {
      clearTimeout(timeout)
      window.onerror = originalErrorHandler
      // Don't remove the script if other components might be using it
      // Only clean up the callback if this component unmounts before loading completes
      if (globalLoadState.isLoading && !globalLoadState.isLoaded) {
        const index = globalLoadState.callbacks.indexOf(() => {
          if (window.google && window.google.maps) {
            hasLoadedRef.current = true
            setIsLoaded(true)
          }
        })
        if (index > -1) {
          globalLoadState.callbacks.splice(index, 1)
        }
      }
    }
  }, [])

  if (loadError) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim().replace(/^["']|["']$/g, '')
    const apiKeyPreview = apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` : 'Not set'
    
    return (
      <div className="p-4 border border-destructive rounded-lg bg-destructive/10">
        <p className="text-sm text-destructive font-medium mb-2">Google Maps Error</p>
        <p className="text-sm text-destructive mb-3">{loadError}</p>
        
        <div className="text-xs text-muted-foreground space-y-2 mb-3">
          <div className="bg-muted/50 p-2 rounded">
            <p className="font-semibold mb-1">Current Configuration:</p>
            <p>API Key: <code className="bg-background px-1 rounded">{apiKeyPreview}</code></p>
            <p>Status: {apiKey ? '✅ Set' : '❌ Missing'}</p>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Quick Checklist:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>✅ Check if <code className="bg-muted px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> is set in your <code className="bg-muted px-1 rounded">.env</code> file</li>
            <li>⚠️ <strong>Restart your dev server</strong> after adding/changing the API key (Ctrl+C then <code className="bg-muted px-1 rounded">npm run dev</code>)</li>
            <li>Enable "Maps JavaScript API" in <a href="https://console.cloud.google.com/apis/library/maps-backend.googleapis.com" target="_blank" rel="noopener noreferrer" className="underline text-primary">Google Cloud Console</a></li>
            <li>Enable billing in Google Cloud Console (free tier available)</li>
            <li>If API key has restrictions, add <code className="bg-muted px-1 rounded">skillyy.com/*</code> and <code className="bg-muted px-1 rounded">www.skillyy.com/*</code> to allowed referrers</li>
            <li>Check browser console (F12) for specific Google Maps API error messages</li>
          </ul>
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <p className="font-semibold text-yellow-800 mb-1">💡 Common Issues:</p>
            <ul className="list-disc list-inside space-y-1 text-yellow-700">
              <li>API key format should start with "AIza" (not "AlzaSy")</li>
              <li>Maps JavaScript API must be enabled (not just created)</li>
              <li>Billing account must be linked (even for free tier)</li>
              <li>If restricted, HTTP referrers must include <code className="bg-yellow-100 px-1 rounded">skillyy.com/*</code> and <code className="bg-yellow-100 px-1 rounded">www.skillyy.com/*</code> for production</li>
              <li>Check browser console (F12 → Console tab) for the actual error message from Google</li>
            </ul>
          </div>
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
            <p className="font-semibold text-blue-800 mb-1">🔍 Debug Steps:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>Open browser console (F12)</li>
              <li>Look for any red error messages mentioning "maps.googleapis.com"</li>
              <li>Check the Network tab to see if the script request is being blocked</li>
              <li>Try accessing this URL directly in your browser (replace YOUR_KEY with your actual API key): <code className="bg-blue-100 px-1 rounded break-all text-xs">https://maps.googleapis.com/maps/api/js?key=YOUR_KEY</code></li>
              <li>If you see an error page, it will tell you exactly what's wrong (InvalidKey, RefererNotAllowed, etc.)</li>
            </ol>
          </div>
          <p className="mt-2">
            See <a href="/GOOGLE_MAPS_SETUP.md" target="_blank" rel="noopener noreferrer" className="underline text-primary">setup instructions</a> for detailed help.
          </p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="p-4 border rounded-lg bg-muted">
        <p className="text-sm text-muted-foreground">Loading Google Maps...</p>
      </div>
    )
  }

  return <>{children}</>
}

declare global {
  interface Window {
    google: any
  }
}




