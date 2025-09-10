import { NextResponse } from 'next/server'

const ORIGIN = process.env.FRONTEND_URL || 'https://uchinokiroku.com'

export function withCORS(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', ORIGIN)
  res.headers.set('Access-Control-Allow-Credentials', 'true')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  return res
}

export function optionsOK() {
  return withCORS(new NextResponse(null, { status: 204 }))
}

