'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface AvatarDisplayProps {
  src?: string | null
  alt?: string
  fallback?: string
  className?: string
  cropX?: number | null
  cropY?: number | null
  cropScale?: number | null
  size?: number
}

/**
 * AvatarDisplay component that applies crop/position data to avatars
 * Uses CSS object-position and transform to position the image properly
 */
export function AvatarDisplay({
  src,
  alt = 'Avatar',
  fallback,
  className,
  cropX,
  cropY,
  cropScale,
  size = 40,
}: AvatarDisplayProps) {
  const imageStyle = useMemo(() => {
    if (!src || (!cropX && !cropY && !cropScale)) {
      return {}
    }

    // Convert crop position (0-1) to CSS object-position percentage
    // cropX/Y of 0 means top-left, 1 means bottom-right
    // CSS object-position uses percentages where 0% is left/top, 100% is right/bottom
    const xPercent = cropX !== null && cropX !== undefined ? cropX * 100 : 50
    const yPercent = cropY !== null && cropY !== undefined ? cropY * 100 : 50
    
    // Apply scale (zoom) - CSS transform scale
    const scale = cropScale && cropScale > 1 ? cropScale : 1

    return {
      objectPosition: `${xPercent}% ${yPercent}%`,
      transform: scale > 1 ? `scale(${scale})` : undefined,
      transformOrigin: 'center center',
    }
  }, [src, cropX, cropY, cropScale])

  if (!src) {
    return (
      <div
        className={cn(
          'rounded-full bg-[#94FE0C]/20 flex items-center justify-center text-gray-900 font-semibold',
          className
        )}
        style={{ width: size, height: size }}
      >
        {fallback || '?'}
      </div>
    )
  }

  return (
    <div
      className={cn('rounded-full overflow-hidden relative', className)}
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        style={imageStyle}
      />
    </div>
  )
}

