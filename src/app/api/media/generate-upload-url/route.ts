// POST /api/media/generate-upload-url
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withCORS, optionsOK } from '@/lib/cors'
import { createPresignedPutUrl } from '@/lib/r2'

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9_.-]+/g, '_').slice(0, 80)
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return withCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }
    const body = await req.json().catch(() => null)
    const fileName = typeof body?.fileName === 'string' ? body.fileName : 'upload'
    const fileType = typeof body?.fileType === 'string' ? body.fileType : 'application/octet-stream'
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const safe = sanitizeName(fileName)
    const id = (globalThis.crypto?.randomUUID?.() || `${Date.now()}`)
    const key = `originals/${session.user.id}/${yyyy}/${mm}/${id}_${safe}`

    const { url } = await createPresignedPutUrl({ key, contentType: fileType })
    return withCORS(NextResponse.json({ url, storageKey: key }))
  } catch (e: any) {
    console.error('generate-upload-url error', e)
    return withCORS(NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 }))
  }
}

export async function OPTIONS() {
  return optionsOK()
}
