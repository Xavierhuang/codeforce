import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { randomUUID } from 'crypto'
import { fileTypeFromBuffer } from 'file-type'

// File type configuration for task assignment files
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[\/\\]/g, '')
    .replace(/[<>:"|?*]/g, '')
    .replace(/\.\./g, '')
    .substring(0, 255)
}

/**
 * POST /api/v1/tasks/[id]/assignment-files
 * Upload files for task assignment (when worker accepts/starts task)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const taskId = params.id

    // Verify task exists and user has permission
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        worker: true,
        client: true,
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Only assigned worker can upload assignment files
    if (task.workerId !== user.id) {
      return NextResponse.json(
        { error: 'Only the assigned worker can upload assignment files' },
        { status: 403 }
      )
    }

    // Task must be ASSIGNED or IN_PROGRESS
    if (task.status !== 'ASSIGNED' && task.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Files can only be uploaded for ASSIGNED or IN_PROGRESS tasks' },
        { status: 400 }
      )
    }

    const formData = await req.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    if (files.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 files allowed per upload' },
        { status: 400 }
      )
    }

    const uploadedFiles = []

    for (const file of files) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds maximum size of 10MB` },
          { status: 400 }
        )
      }

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `File type "${file.type}" is not allowed. Allowed types: images, PDF, Word, Excel, text files` },
          { status: 400 }
        )
      }

      // Read file buffer for content validation
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Validate file content using magic bytes
      const fileTypeResult = await fileTypeFromBuffer(buffer)
      
      if (!fileTypeResult) {
        return NextResponse.json(
          { error: `Unable to determine file type for "${file.name}". File may be corrupted.` },
          { status: 400 }
        )
      }

      // Verify actual file type matches declared MIME type
      const detectedMimeType = fileTypeResult.mime
      if (!ALLOWED_MIME_TYPES.includes(detectedMimeType)) {
        return NextResponse.json(
          { error: `File type mismatch for "${file.name}". Detected: ${detectedMimeType}` },
          { status: 400 }
        )
      }

      // Sanitize original filename
      const sanitizedOriginalName = sanitizeFilename(file.name)

      // Generate random UUID filename
      const fileExtension = fileTypeResult.ext || 'bin'
      const randomFilename = `${randomUUID()}.${fileExtension}`

      // Store files in uploads/assignment directory
      const uploadsDir = join(process.cwd(), 'uploads', 'assignment')
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true })
      }

      const filepath = join(uploadsDir, randomFilename)
      await writeFile(filepath, buffer)

      // Create attachment record in database
      const attachment = await prisma.attachment.create({
        data: {
          url: `/api/v1/files/assignment:${randomFilename.replace(`.${fileExtension}`, '')}`,
          filename: sanitizedOriginalName,
          mimeType: detectedMimeType,
          uploadedBy: user.id,
          taskId: taskId,
        },
      })

      uploadedFiles.push({
        id: attachment.id,
        url: attachment.url,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        size: file.size,
      })
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
      message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
    })
  } catch (error: any) {
    console.error('Error uploading assignment files:', error)
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/tasks/[id]/assignment-files
 * Get all assignment files for a task
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const taskId = params.id

    // Verify task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        worker: true,
        client: true,
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Only task participants (worker or client) can view assignment files
    if (task.workerId !== user.id && task.clientId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized to view assignment files' },
        { status: 403 }
      )
    }

    // Get all attachments for this task (excluding message attachments)
    const attachments = await prisma.attachment.findMany({
      where: {
        taskId: taskId,
        messageId: null, // Only task-level attachments, not message attachments
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      files: attachments,
    })
  } catch (error: any) {
    console.error('Error fetching assignment files:', error)
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}


