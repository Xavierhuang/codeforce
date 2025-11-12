import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getCurrentUser } from '@/lib/auth-helpers'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// File ID format: "type:uuid" (e.g., "avatar:550e8400-e29b-41d4-a716-446655440000")
// We need to map this back to the actual filename with extension
// For now, we'll store the mapping in the database or reconstruct from fileId

export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    // Parse fileId: "type:uuid"
    const [type, uuid] = params.fileId.split(':')
    
    if (!type || !uuid) {
      return NextResponse.json(
        { error: 'Invalid file ID format' },
        { status: 400 }
      )
    }

    // Validate type
    const allowedTypes = ['id_document', 'avatar', 'banner', 'attachment']
    if (!allowedTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      )
    }

    // Security: Require authentication for sensitive files (id_document, attachment)
    // Allow public access for avatar and banner (needed for public profiles)
    const publicTypes = ['avatar', 'banner']
    const requiresAuth = !publicTypes.includes(type)
    
    if (requiresAuth) {
      const user = await getCurrentUser()
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
    }
    
    // Try common extensions for the file type
    const possibleExtensions = type === 'id_document' || type === 'attachment' 
      ? ['pdf', 'jpg', 'jpeg', 'png', 'webp']
      : ['jpg', 'jpeg', 'png', 'webp']

    let filepath: string | null = null
    let foundExtension: string | null = null

    // Try to find the file with different extensions
    for (const ext of possibleExtensions) {
      const testPath = join(process.cwd(), 'uploads', type, `${uuid}.${ext}`)
      if (existsSync(testPath)) {
        filepath = testPath
        foundExtension = ext
        break
      }
    }

    if (!filepath || !foundExtension) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Read file
    const fileBuffer = await readFile(filepath)

    // Determine MIME type
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
    }

    const mimeType = mimeTypes[foundExtension] || 'application/octet-stream'

    // Return file with appropriate headers
    // Public files (avatar, banner) can be cached publicly, private files should be cached privately
    const cacheControl = publicTypes.includes(type)
      ? 'public, max-age=31536000, immutable' // Cache publicly for 1 year (immutable)
      : 'private, max-age=3600' // Cache privately for 1 hour
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${uuid}.${foundExtension}"`,
        'Cache-Control': cacheControl,
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error: any) {
    console.error('Error serving file:', error)
    
    if (error.code === 'ENOENT') {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    )
  }
}



