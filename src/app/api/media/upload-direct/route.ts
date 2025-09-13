// POST /api/media/upload-direct
// Fallback server-side upload to R2 when browser PUT to presigned URL fails (e.g., CORS)
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withCORS, optionsOK } from '@/lib/cors'
import { prisma } from '@/lib/prisma'
import { getR2Client } from '@/lib/r2'
import { PutObjectCommand } from '@aws-sdk/client-s3'

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME || ''

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9_.-]+/g, '_').slice(0, 80)
}

export async function OPTIONS() { return optionsOK() }

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return withCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return withCORS(NextResponse.json({ error: 'file required' }, { status: 400 }))

    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const safe = sanitizeName(file.name || 'upload')
    const id = (globalThis.crypto?.randomUUID?.() || `${Date.now()}`)
    const key = `originals/${session.user.id}/${yyyy}/${mm}/${id}_${safe}`

    const client = getR2Client()
    const array = new Uint8Array(await file.arrayBuffer())
    await client.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: array, ContentType: file.type || 'application/octet-stream' }))

    // Resolve uploader by email or id
    const email = (session.user as any)?.email as string | undefined
    let uploader = null as any
    if (email) uploader = await prisma.user.findFirst({ where: { email } })
    if (!uploader && session.user.id) uploader = await prisma.user.findUnique({ where: { id: session.user.id as string } })
    if (!uploader && email) {
      uploader = await prisma.user.create({ data: { email, name: (session.user as any)?.name || null, image: (session.user as any)?.image || null } })
    }

    const created = await prisma.media.create({
      data: {
        uploaderId: (uploader?.id as string) || (session.user.id as string),
        originalFilename: file.name || 'upload',
        storageKey: key,
        mimeType: file.type || 'application/octet-stream',
        status: 'pending',
      },
      include: { uploader: { select: { id: true, name: true, email: true } } },
    })
    return withCORS(NextResponse.json(created, { status: 201 }))
  } catch (e) {
    console.error('upload-direct error', e)
    return withCORS(NextResponse.json({ error: 'Failed to upload' }, { status: 500 }))
  }
}
