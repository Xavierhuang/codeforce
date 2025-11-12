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
    if (!src) {
      return {}
    }

    // cropX/Y are normalized center points (0-1 range)
    // CSS object-position uses percentages where 0% is left/top, 100% is right/bottom
    const xPercent = cropX !== null && cropX !== undefined ? cropX * 100 : 50
    const yPercent = cropY !== null && cropY !== undefined ? cropY * 100 : 50
    
    // Apply scale (zoom) - CSS transform scale
    // Only apply scale if it's greater than 1 to avoid shrinking
    const scale = cropScale && cropScale > 1 ? cropScale : 1

    const style: React.CSSProperties = {
      objectPosition: `${xPercent}% ${yPercent}%`,
      objectFit: 'cover',
    }

    // Only apply transform if scale > 1
    if (scale > 1) {
      style.transform = `scale(${scale})`
      style.transformOrigin = 'center center'
    }

    return style
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
        className="w-full h-full"
        style={imageStyle}
      />
    </div>
  )
}

