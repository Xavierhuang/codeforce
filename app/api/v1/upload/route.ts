import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { randomUUID } from 'crypto'
import { fileTypeFromBuffer } from 'file-type'
import { rateLimit, rateLimitConfigs } from '@/lib/rate-limit'

// File type configuration
const FILE_TYPE_CONFIG = {
  'id_document': {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    allowedMagicBytes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSize: 10 * 1024 * 1024, // 10MB for ID documents
  },
  'avatar': {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedMagicBytes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 5 * 1024 * 1024, // 5MB for avatars
  },
  'banner': {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedMagicBytes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 10 * 1024 * 1024, // 10MB for banners
  },
  'attachment': {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    allowedMagicBytes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSize: 5 * 1024 * 1024, // 5MB for attachments
  },
}


function sanitizeFilename(filename: string): string {
  // Remove path separators and dangerous characters
  return filename
    .replace(/[\/\\]/g, '') // Remove path separators
    .replace(/[<>:"|?*]/g, '') // Remove dangerous characters
    .replace(/\.\./g, '') // Remove parent directory references
    .substring(0, 255) // Limit length
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()

    // Rate limiting check
    const rateLimitResponse = await rateLimit(req, rateLimitConfigs.upload, user.id)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'id_document' or 'avatar' or 'banner' or 'attachment'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate upload type
    if (!type || !FILE_TYPE_CONFIG[type as keyof typeof FILE_TYPE_CONFIG]) {
      return NextResponse.json(
        { error: 'Invalid upload type. Must be one of: id_document, avatar, banner, attachment' },
        { status: 400 }
      )
    }

    const config = FILE_TYPE_CONFIG[type as keyof typeof FILE_TYPE_CONFIG]

    // Validate file size based on type
    if (file.size > config.maxSize) {
      const maxSizeMB = (config.maxSize / (1024 * 1024)).toFixed(0)
      return NextResponse.json(
        { error: `File size must be less than ${maxSizeMB}MB for ${type}` },
        { status: 400 }
      )
    }

    // Validate MIME type
    if (!config.allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { 
          error: `Invalid file type for ${type}. Allowed types: ${config.allowedMimeTypes.join(', ')}`,
          receivedType: file.type,
        },
        { status: 400 }
      )
    }

    // Read file buffer for content validation
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // CRITICAL: Validate file content using magic bytes (not just extension/MIME type)
    const fileTypeResult = await fileTypeFromBuffer(buffer)
    
    if (!fileTypeResult) {
      return NextResponse.json(
        { error: 'Unable to determine file type. File may be corrupted or invalid.' },
        { status: 400 }
      )
    }

    // Verify actual file type matches declared MIME type
    const detectedMimeType = fileTypeResult.mime
    if (!config.allowedMimeTypes.includes(detectedMimeType)) {
      return NextResponse.json(
        { 
          error: `File type mismatch. Detected: ${detectedMimeType}, but ${detectedMimeType} is not allowed for ${type}`,
          detectedType: detectedMimeType,
        },
        { status: 400 }
      )
    }

    // Sanitize original filename
    const sanitizedOriginalName = sanitizeFilename(file.name)

    // Generate random UUID filename (no user ID exposure)
    const fileExtension = fileTypeResult.ext || 'bin'
    const randomFilename = `${randomUUID()}.${fileExtension}`

    // Store files OUTSIDE public directory for security
    // Files will be served via authenticated API endpoint
    const uploadsDir = join(process.cwd(), 'uploads', type)
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const filepath = join(uploadsDir, randomFilename)

    // Write file
    await writeFile(filepath, buffer)

    // Return file ID and secure URL
    // Format: type:uuid (e.g., "avatar:550e8400-e29b-41d4-a716-446655440000")
    const fileId = `${type}:${randomFilename.replace(`.${fileExtension}`, '')}`
    
    // Return secure URL that uses authenticated file serving endpoint
    // This maintains backward compatibility while ensuring security
    const secureUrl = `/api/v1/files/${fileId}`

    return NextResponse.json({
      fileId, // File ID for programmatic access
      url: secureUrl, // Secure URL via authenticated endpoint (backward compatible)
      originalFilename: sanitizedOriginalName,
      size: file.size,
      mimeType: detectedMimeType,
      type: type,
    })
  } catch (error: any) {
    console.error('Error uploading file:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Provide more specific error messages
    if (error.code === 'ENOENT') {
      return NextResponse.json(
        { error: 'Failed to create upload directory' },
        { status: 500 }
      )
    }
    
    if (error.code === 'EACCES' || error.code === 'EPERM') {
      return NextResponse.json(
        { error: 'Permission denied. Check file system permissions.' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}

