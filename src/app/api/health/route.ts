// src/app/api/health/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const startedAt = Date.now()
  const health: any = {
    status: 'ok',
    uptime: process.uptime(),
    checks: {
      database: false,
    },
  }
  try {
    // Lightweight DB check; do not fail the endpoint on error
    await prisma.$queryRawUnsafe('SELECT 1')
    health.checks.database = true
  } catch (e) {
    health.checks.database = false
  }
  health.responseTimeMs = Date.now() - startedAt
  return NextResponse.json(health, { status: 200 })
}

