// src/lib/r2.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID || ''
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || ''
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || ''
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || ''
const R2_ENDPOINT = process.env.CLOUDFLARE_R2_ENDPOINT || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '')
export const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || ''

export function getR2Client() {
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT) {
    throw new Error('R2 credentials or endpoint missing')
  }
  return new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  })
}

export async function createPresignedPutUrl(opts: { key: string; contentType: string; expiresIn?: number }) {
  if (!R2_BUCKET_NAME) throw new Error('R2 bucket missing')
  const client = getR2Client()
  const cmd = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: opts.key,
    ContentType: opts.contentType,
  })
  const url = await getSignedUrl(client, cmd, { expiresIn: opts.expiresIn ?? 60 * 5 })
  return { url }
}

export function publicUrlFor(key: string) {
  if (R2_PUBLIC_URL) return `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`
  // fallback virtual-host style
  return `${R2_ENDPOINT.replace(/\/$/, '')}/${R2_BUCKET_NAME}/${key}`
}

