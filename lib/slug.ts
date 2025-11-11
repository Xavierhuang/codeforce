/**
 * Generate a URL-friendly slug from a string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

/**
 * Generate a unique slug by appending a number if needed
 */
export function generateUniqueSlug(base: string, existingSlugs: string[]): string {
  let slug = generateSlug(base)
  let uniqueSlug = slug
  let counter = 1

  // Case-insensitive comparison
  const lowerExisting = existingSlugs.map(s => s.toLowerCase())
  const lowerSlug = slug.toLowerCase()

  while (lowerExisting.includes(uniqueSlug.toLowerCase())) {
    uniqueSlug = `${slug}-${counter}`
    counter++
  }

  return uniqueSlug
}

