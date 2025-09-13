#!/usr/bin/env node
// Simple auth smoke test: /health -> /api/auth/providers -> /api/auth/session
// Usage: SMOKE_BASE=https://api.uchinokiroku.com node scripts/smoke-auth.mjs

const base = process.env.SMOKE_BASE || 'https://api.uchinokiroku.com'

async function main() {
  let ok = true
  const results = {}
  const now = new Date().toISOString()
  try {
    const h = await fetch(`${base}/api/health`, { redirect: 'manual' })
    results.health = { status: h.status }
    ok &&= h.ok
  } catch (e) {
    ok = false
    results.health = { error: String(e) }
  }

  try {
    const r = await fetch(`${base}/api/auth/providers`, { redirect: 'manual' })
    const j = await r.json().catch(() => null)
    const providers = j && typeof j === 'object' ? Object.keys(j) : []
    results.providers = { status: r.status, providers }
    ok &&= r.ok && providers.length > 0
  } catch (e) {
    ok = false
    results.providers = { error: String(e) }
  }

  try {
    const r = await fetch(`${base}/api/auth/session`, { redirect: 'manual', credentials: 'include' })
    const j = await r.json().catch(() => null)
    const hasUser = j && typeof j === 'object' && j.user
    results.session = { status: r.status, hasUser: !!hasUser }
    // Note: session may legitimately be null when unauthenticated; do not fail on this
  } catch (e) {
    ok = false
    results.session = { error: String(e) }
  }

  console.log(JSON.stringify({ ok, base, time: now, results }, null, 2))
  process.exit(ok ? 0 : 1)
}

main()

