// src/app/api/media/[id]/image/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getR2Client } from '@/lib/r2'
import { GetObjectCommand } from '@aws-sdk/client-s3'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || ''
    
    if (!bucketName) {
      return NextResponse.json({ error: 'R2 bucket not configured' }, { status: 500 })
    }

    // データベースからメディア情報を取得
    const { prisma } = await import('@/lib/prisma')
    
    const media = await prisma.media.findUnique({
      where: { id },
      include: { uploader: true }
    })

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    // R2からオブジェクトを取得
    const client = getR2Client()
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: media.storageKey,
    })

    const response = await client.send(command)
    
    if (!response.Body) {
      return NextResponse.json({ error: 'File not found in storage' }, { status: 404 })
    }

    // ストリームを配列に変換
    const chunks = []
    const reader = response.Body.transformToWebStream().getReader()
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    
    const buffer = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
    let offset = 0
    for (const chunk of chunks) {
      buffer.set(chunk, offset)
      offset += chunk.length
    }

    // レスポンスを返す
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': media.mimeType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // 1年キャッシュ
        'Content-Disposition': `inline; filename="${media.originalFilename}"`,
      },
    })

  } catch (error) {
    console.error('Error serving media:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
