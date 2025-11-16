/**
 * Mobile Responsiveness Utilities
 * Provides consistent mobile-friendly classes and helpers
 */

/**
 * Responsive text sizes
 */
export const textSizes = {
  xs: 'text-xs sm:text-sm',
  sm: 'text-sm sm:text-base',
  base: 'text-base sm:text-lg',
  lg: 'text-lg sm:text-xl',
  xl: 'text-xl sm:text-2xl',
}

/**
 * Responsive padding
 */
export const padding = {
  xs: 'p-2 sm:p-3',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
}

/**
 * Responsive gap
 */
export const gap = {
  xs: 'gap-2 sm:gap-3',
  sm: 'gap-3 sm:gap-4',
  md: 'gap-4 sm:gap-6',
  lg: 'gap-6 sm:gap-8',
}

/**
 * Touch-friendly button sizes
 */
export const buttonSizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 sm:h-11 px-4 sm:px-6 text-sm sm:text-base',
  lg: 'h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg',
}

/**
 * Responsive grid columns
 */
export const gridCols = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
}

/**
 * Responsive flex direction
 */
export const flexDirection = {
  col: 'flex-col sm:flex-row',
  row: 'flex-row',
}

/**
 * Mobile-first breakpoint helpers
 */
export const breakpoints = {
  sm: 'sm:', // 640px
  md: 'md:', // 768px
  lg: 'lg:', // 1024px
  xl: 'xl:', // 1280px
}

/**
 * Safe area insets for mobile devices
 */
export const safeArea = {
  top: 'safe-area-inset-top',
  bottom: 'safe-area-inset-bottom',
  left: 'safe-area-inset-left',
  right: 'safe-area-inset-right',
}

/**
 * Touch manipulation for better mobile interactions
 */
export const touch = {
  manipulation: 'touch-manipulation',
  none: 'touch-none',
}







