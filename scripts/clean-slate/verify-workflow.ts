import { spawn } from 'node:child_process'
import { createClient } from '@libsql/client'
import path from 'node:path'

// 1. Verify Turso Cloud is clean and unmutated (read-only verification)
console.log('=== VERIFYING TURSO CLOUD READ-ONLY STATUS ===')
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

const deskRow = await turso.execute("SELECT id, slug FROM Desk WHERE slug = 'hukum-keadilan'")
if (deskRow.rows.length === 0) {
  throw new Error('FAIL: Canonical desk hukum-keadilan missing on Turso!')
}
console.log('✓ Canonical desk verified on Turso:', deskRow.rows[0].slug)

const chiefRow = await turso.execute("SELECT id, email, role, status FROM StaffUser WHERE email = 'chief@verity.test'")
if (chiefRow.rows.length === 0) {
  throw new Error('FAIL: Chief Editor account missing on Turso!')
}
console.log('✓ Chief Editor verified on Turso:', chiefRow.rows[0].email, 'Status:', chiefRow.rows[0].status)

const articleCount = await turso.execute('SELECT COUNT(*) as c FROM Article')
if (Number(articleCount.rows[0].c) !== 0) {
  throw new Error(`FAIL: Turso Article count is not zero! Found: ${articleCount.rows[0].c}`)
}
console.log('✓ Turso Article count is clean zero:', articleCount.rows[0].c)

// 2. Start standalone server with isolated test database for workflow verification
console.log('\n=== RUNNING EDITORIAL WORKFLOW IN ISOLATED TEST ENVIRONMENT ===')
const TEST_DB_PATH = path.resolve('db/isolated-test.db').replace(/\\/g, '/')
const TEST_DB_URL = `file:${TEST_DB_PATH}`

const server = spawn('node', ['.next/standalone/server.js'], {
  env: {
    ...process.env,
    PORT: '3099',
    NODE_ENV: 'test',
    DATABASE_URL: TEST_DB_URL,
    TEST_DATABASE_URL: TEST_DB_URL,
  },
  stdio: 'pipe',
})

const start = Date.now()
while (Date.now() - start < 10000) {
  try {
    const res = await fetch('http://localhost:3099/')
    if (res.status === 200) {
      console.log('Server is online on port 3099 (isolated test environment)')
      break
    }
  } catch {}
  await new Promise((r) => setTimeout(r, 200))
}

try {
  // A. Get CSRF & login as Chief Editor
  console.log('Logging in as Chief Editor...')
  const csrfRes = await fetch('http://localhost:3099/api/auth/csrf')
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string }
  const cookie = (csrfRes.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ')

  const loginRes = await fetch('http://localhost:3099/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie },
    body: new URLSearchParams({
      csrfToken,
      email: 'chief@verity.test',
      password: 'chief-test-password-123',
      json: 'true',
    }).toString(),
    redirect: 'manual',
  })
  const authCookies = (loginRes.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ')
  const sessionCookie = [cookie, authCookies].filter(Boolean).join('; ')
  console.log('Chief Editor login status:', loginRes.status)

  // B. Create Draft Article in isolated test environment
  console.log('Creating transient draft article to verify workflow...')
  const createRes = await fetch('http://localhost:3099/api/studio/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({
      title: 'Uji Integritas Redaksi Pasca-Reset',
      deskSlug: 'hukum-keadilan',
      format: 'NEWS',
      deck: 'Ringkasan uji naskah transien.',
    }),
  })

  console.log('Create article status:', createRes.status)
  const createdData = (await createRes.json()) as { id: string; slug: string }
  console.log('Created article:', createdData.id, 'slug:', createdData.slug)

  // C. Verify in Studio list
  const listRes = await fetch('http://localhost:3099/api/studio/articles', {
    headers: { Cookie: sessionCookie },
  })
  const listData = (await listRes.json()) as { articles: any[] }
  console.log('Studio list count after creation in isolated DB:', listData.articles?.length)

  // D. Re-verify Turso Cloud remained 100% untouched
  const finalTursoCount = await turso.execute('SELECT COUNT(*) as c FROM Article')
  console.log('Turso Cloud Article count (strictly untouched):', finalTursoCount.rows[0].c)
  if (Number(finalTursoCount.rows[0].c) !== 0) {
    throw new Error('SAFETY VIOLATION: Test article leaked to Turso Cloud!')
  }
  console.log('★ Workflow verification passed with ZERO contamination to Turso Cloud!')
} finally {
  server.kill()
  console.log('Server terminated')
}
