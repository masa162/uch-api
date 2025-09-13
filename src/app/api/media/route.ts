// GET /api/media
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withCORS, optionsOK } from '@/lib/cors'
import { publicUrlFor } from '@/lib/r2'

export async function OPTIONS() {
  return optionsOK()
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '24', 10) || 24, 1), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0)

    const items = await prisma.media.findMany({
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
      include: {
        uploader: { select: { id: true, name: true, email: true } },
        optimized: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    })

    const mapped = items.map((m) => {
      const opt = m.optimized?.[0]
      const url = opt ? publicUrlFor(opt.storageKey) : publicUrlFor(m.storageKey)
      return {
        id: m.id,
        createdAt: m.createdAt,
        mimeType: m.mimeType,
        originalFilename: m.originalFilename,
        url,
        thumbnailUrl: url,
        uploader: m.uploader,
        status: m.status,
      }
    })

    return withCORS(NextResponse.json({ items: mapped, nextOffset: offset + items.length }))
  } catch (e) {
    console.error('GET /api/media error', e)
    return withCORS(NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 }))
  }
}

