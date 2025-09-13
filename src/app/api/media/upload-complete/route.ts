// POST /api/media/upload-complete
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withCORS, optionsOK } from '@/lib/cors'
import { prisma } from '@/lib/prisma'

export async function OPTIONS() {
  return optionsOK()
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return withCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const body = await req.json().catch(() => null as any)
    const storageKey = typeof body?.storageKey === 'string' ? body.storageKey : ''
    const originalFilename = typeof body?.originalFilename === 'string' ? body.originalFilename : 'upload'
    const fileType = typeof body?.fileType === 'string' ? body.fileType : 'application/octet-stream'

    if (!storageKey) {
      return withCORS(NextResponse.json({ error: 'storageKey required' }, { status: 400 }))
    }

    try {
      // Resolve uploader by email or id to satisfy FK
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
          originalFilename,
          storageKey,
          mimeType: fileType,
          status: 'pending',
        },
        include: { uploader: { select: { id: true, name: true, email: true } } },
      })
      return withCORS(NextResponse.json(created, { status: 201 }))
    } catch (e: any) {
      // handle unique(storageKey) conflict → return existing
      if (e && typeof e === 'object' && (e as any).code === 'P2002') {
        const existing = await prisma.media.findUnique({
          where: { storageKey },
          include: { uploader: { select: { id: true, name: true, email: true } } },
        })
        if (existing) return withCORS(NextResponse.json(existing))
      }
      console.error('upload-complete error', e)
      return withCORS(NextResponse.json({ error: 'Failed to record upload' }, { status: 500 }))
    }
  } catch (e) {
    console.error('upload-complete fatal', e)
    return withCORS(NextResponse.json({ error: 'Failed to record upload' }, { status: 500 }))
  }
}
