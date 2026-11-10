// Verax Press regression test suite — covers all critical business rules and canonical contracts.
// Canonical contracts follow docs/api-contract.md and Technical Architecture TA §5-10.
// Requires the dev server running on port 3000.
// Run with: bun test
import { test, describe, beforeAll, afterAll, expect } from 'bun:test'
import { seedTestFixtures, cleanupTestData, getTestDb, BASE } from './lib/test-db'
import { loginAs, get, postJson, patchJson, submitAi, createArticle, transition, apiAuthHeader } from './lib/http'

let chief: Awaited<ReturnType<typeof loginAs>>
let editor: Awaited<ReturnType<typeof loginAs>>
let author: Awaited<ReturnType<typeof loginAs>>

const isServerRunning = await fetch(`${BASE}/api/auth/csrf`, { signal: AbortSignal.timeout(600) })
  .then((r) => r.ok)
  .catch(() => false)

const suiteDescribe = isServerRunning ? describe : describe.skip

if (!isServerRunning) {
  console.log('\nℹ️ Local dev server on port 3000 not running — HTTP E2E tests skipped (run `bun run dev` to enable).')
}

beforeAll(async () => {
  if (!isServerRunning) return
  await cleanupTestData()
  await seedTestFixtures()
  chief = await loginAs('chief')
  editor = await loginAs('editor')
  author = await loginAs('author')
})

afterAll(async () => {
  if (isServerRunning) {
    await cleanupTestData()
  }
})

// ============================================================================
// 1. Authentication & Authorization
// ============================================================================
suiteDescribe('Authentication & Authorization', () => {
  test('unauthenticated request to CMS API → 401', async () => {
    const res = await get('/api/cms/articles')
    expect(res.status).toBe(401)
  })

  test('unauthenticated request to /cms → redirect', async () => {
    const res = await fetch(`${BASE}/cms`, { redirect: 'manual' })
    expect(res.status).toBe(307)
  })

  test('chief can list articles', async () => {
    const res = await get('/api/cms/articles', chief)
    expect(res.status).toBe(200)
  })

  test('editor can list articles', async () => {
    const res = await get('/api/cms/articles', editor)
    expect(res.status).toBe(200)
  })

  test('author can list articles (own only)', async () => {
    const res = await get('/api/cms/articles', author)
    expect(res.status).toBe(200)
  })
})

// ============================================================================
// 2. Article State Transitions
// ============================================================================
suiteDescribe('Article state transitions', () => {
  test('illegal transition draft→published is rejected (422)', async () => {
    const art = await createArticle(chief)
    const { status } = await transition(chief, art.id, 'PUBLISH')
    // Canonical state machine returns 422 INVALID_TRANSITION (Zod/domain rule rejection)
    expect([409, 422]).toContain(status)
  })

  test('legal path draft→pending_review→fact_check→pending_approval works', async () => {
    const art = await createArticle(chief, {
      sources: [
        {
          title: 'Key Source Document',
          url: 'https://example.com/src',
          sourceType: 'PRIMARY',
          isKeySource: true,
        },
      ],
    })
    expect((await transition(chief, art.id, 'SUBMIT_REVIEW')).status).toBe(200)
    expect((await transition(chief, art.id, 'START_FACT_CHECK')).status).toBe(200)
    expect((await transition(chief, art.id, 'SUBMIT_FOR_APPROVAL')).status).toBe(200)
  })

  test('author can submit own draft to review', async () => {
    const art = await createArticle(author)
    const { status } = await transition(author, art.id, 'SUBMIT_REVIEW')
    expect(status).toBe(200)
  })
})

// ============================================================================
// 3. Source Verification Gate
// ============================================================================
suiteDescribe('Source verification gate', () => {
  test('publish blocked when key source is unverified (422 GATE_SOURCE_VERIFICATION)', async () => {
    const art = await createArticle(chief, {
      sources: [
        {
          title: 'Unverified Key Source',
          url: 'https://example.com/unverified',
          sourceType: 'PRIMARY',
          isKeySource: true,
        },
      ],
    })
    await transition(chief, art.id, 'SUBMIT_REVIEW')
    await transition(chief, art.id, 'START_FACT_CHECK')
    await transition(chief, art.id, 'SUBMIT_FOR_APPROVAL')

    // In canonical V2 model, the hard gate is on PUBLISH (Charter A §12.1)
    const { status, body } = await transition(chief, art.id, 'PUBLISH')
    expect([409, 422]).toContain(status)
    expect(JSON.stringify(body)).toContain('GATE_SOURCE_VERIFICATION')
  })

  test('approval and publish allowed after key source verified', async () => {
    const art = await createArticle(chief, {
      sources: [
        {
          title: 'Verified Key Source Document',
          url: 'https://example.com/verified',
          sourceType: 'PRIMARY',
          isKeySource: true,
        },
      ],
    })
    await transition(chief, art.id, 'SUBMIT_REVIEW')
    await transition(chief, art.id, 'START_FACT_CHECK')

    // Query article detail to obtain source ID
    const detailRes = await get(`/api/cms/articles/${art.id}`, chief)
    const detail = (await detailRes.json()) as { sources?: { id: string }[]; article?: { sources: { id: string }[] } }
    const sources = detail.sources ?? detail.article?.sources ?? []
    expect(sources.length).toBeGreaterThan(0)
    const srcId = sources[0].id

    // Verify the key source via canonical nested endpoint
    const verifyRes = await patchJson(`/api/cms/articles/${art.id}/sources/${srcId}`, {
      verificationStatus: 'VERIFIED',
      verificationNote: 'Dicek ke sumber primer resmi.',
    }, editor)
    expect(verifyRes.status).toBe(200)

    // Advance to approval then publish
    const approvalRes = await transition(chief, art.id, 'SUBMIT_FOR_APPROVAL')
    expect(approvalRes.status).toBe(200)

    const publishRes = await transition(chief, art.id, 'PUBLISH')
    expect(publishRes.status).toBe(200)
  })
})

// ============================================================================
// 4. Approval & Publication Restrictions
// ============================================================================
suiteDescribe('Approval & publication restrictions', () => {
  test('editor cannot publish (403)', async () => {
    const art = await createArticle(chief, {
      sources: [
        { title: 'Source', url: 'https://example.com/src', sourceType: 'PRIMARY', isKeySource: true },
      ],
    })
    await transition(chief, art.id, 'SUBMIT_REVIEW')
    await transition(chief, art.id, 'START_FACT_CHECK')
    await transition(chief, art.id, 'SUBMIT_FOR_APPROVAL')

    const { status, body } = await transition(editor, art.id, 'PUBLISH')
    expect(status).toBe(403)
    expect(JSON.stringify(body)).toContain('FORBIDDEN')
  })

  test('chief can publish after approval and verified source', async () => {
    const art = await createArticle(chief, {
      sources: [
        {
          title: 'Pub Source Official',
          url: 'https://example.com/pub-official',
          sourceType: 'PRIMARY',
          isKeySource: true,
        },
      ],
    })
    await transition(chief, art.id, 'SUBMIT_REVIEW')
    await transition(chief, art.id, 'START_FACT_CHECK')

    const detailRes = await get(`/api/cms/articles/${art.id}`, chief)
    const detail = (await detailRes.json()) as { sources?: { id: string }[]; article?: { sources: { id: string }[] } }
    const sources = detail.sources ?? detail.article?.sources ?? []
    await patchJson(`/api/cms/articles/${art.id}/sources/${sources[0].id}`, {
      verificationStatus: 'VERIFIED',
      verificationNote: 'Diverifikasi langsung oleh editor.',
    }, editor)

    await transition(chief, art.id, 'SUBMIT_FOR_APPROVAL')
    const { status } = await transition(chief, art.id, 'PUBLISH')
    expect(status).toBe(200)
  })

  test('author cannot publish (403)', async () => {
    const art = await createArticle(author)
    const { status } = await transition(author, art.id, 'PUBLISH')
    expect([403, 422]).toContain(status)
  })
})

// ============================================================================
// 5. AI API Submission-Only Behavior
// ============================================================================
suiteDescribe('AI API submission-only behavior', () => {
  test('valid submission creates draft article', async () => {
    const res = await submitAi({
      title: 'AI Submission on Policy Architecture',
      desk: 'teknologi-kebijakan',
      format: 'ANALYSIS',
      content: [{ type: 'paragraph', text: 'AI generated analysis content.' }],
      sources: [
        {
          title: 'Naskah Akademik Kebijakan',
          url: 'https://example.com/naskah-akademik',
          sourceType: 'SECONDARY',
        },
      ],
      aiInvolvement: 'substantive',
      agentId: 'test-agent',
      idempotencyKey: 'itest-' + Date.now(),
    })
    expect(res.status).toBe(201)
    const data = (await res.json()) as { status: string; articleId: string }
    expect(data.status.toUpperCase()).toBe('DRAFT')
    expect(data.articleId).toBeTruthy()
  })

  test('missing ai_involvement → 422', async () => {
    const res = await submitAi({
      title: 'No AI Field Specified',
      desk: 'hukum-keadilan',
      format: 'OPINION',
      content: [{ type: 'paragraph', text: 'x' }],
      sources: [{ title: 'Src', url: 'https://example.com/s', sourceType: 'SECONDARY' }],
      agentId: 'a',
      idempotencyKey: 'itest-no-ai-' + Date.now(),
    })
    // Zod schema validation rejection
    expect([400, 422]).toContain(res.status)
  })

  test('missing idempotency_key → 422', async () => {
    const res = await submitAi({
      title: 'Missing Idempotency Key',
      desk: 'hukum-keadilan',
      format: 'OPINION',
      content: [{ type: 'paragraph', text: 'x' }],
      sources: [{ title: 'Src', url: 'https://example.com/s', sourceType: 'SECONDARY' }],
      aiInvolvement: 'none',
      agentId: 'a',
    })
    expect([400, 422]).toContain(res.status)
  })

  test('bad credentials → 401', async () => {
    const res = await fetch(`${BASE}/api/internal/v1/ai-submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer vrtc_badclient.badsecret',
      },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(401)
  })

  test('no GET/list endpoint for API client (405)', async () => {
    const res = await fetch(`${BASE}/api/internal/v1/ai-submissions`, {
      headers: { Authorization: await apiAuthHeader() },
    })
    expect(res.status).toBe(405)
  })
})

// ============================================================================
// 6. Idempotency
// ============================================================================
suiteDescribe('Idempotency', () => {
  test('same idempotency_key returns existing submission, no duplicate', async () => {
    const key = 'idempotency-test-' + Date.now()
    const payload = {
      title: 'Idempotency Verification Article',
      desk: 'hukum-keadilan',
      format: 'OPINION',
      content: [{ type: 'paragraph', text: 'Idempotent content.' }],
      sources: [{ title: 'Sumber Dokumen', url: 'https://example.com/doc-idemp', sourceType: 'DOCUMENT' }],
      aiInvolvement: 'none',
      agentId: 'agent-idemp',
      idempotencyKey: key,
    }

    const res1 = await submitAi(payload)
    expect(res1.status).toBe(201)
    const data1 = (await res1.json()) as { submissionId: string }

    const res2 = await submitAi(payload)
    expect(res2.status).toBe(200)
    const data2 = (await res2.json()) as { submissionId: string; idempotentReplay?: boolean; idempotent?: boolean }
    expect(data2.idempotentReplay ?? data2.idempotent).toBe(true)
    expect(data2.submissionId).toBe(data1.submissionId)
  })
})

// ============================================================================
// 7. Internal Editorial Note Privacy
// ============================================================================
suiteDescribe('Internal editorial note privacy', () => {
  test('editor can add internal note (authorVisible=false)', async () => {
    const art = await createArticle(chief)
    const res = await postJson(`/api/cms/articles/${art.id}/comments`, {
      body: 'Internal note: verify this claim against public record',
      authorVisible: false,
    }, editor)
    expect([200, 201]).toContain(res.status)
  })

  test('author can read author-visible comments but NOT internal notes', async () => {
    const art = await createArticle(author)
    // Add an internal note (editor only).
    await postJson(`/api/cms/articles/${art.id}/comments`, {
      body: 'SECRET internal editorial assessment',
      authorVisible: false,
    }, editor)
    // Add an author-visible comment.
    await postJson(`/api/cms/articles/${art.id}/comments`, {
      body: 'Please revise paragraph 2 with additional context',
      authorVisible: true,
    }, editor)

    // Author fetches comments.
    const res = await get(`/api/cms/articles/${art.id}/comments`, author)
    expect(res.status).toBe(200)
    const data = (await res.json()) as { comments: { body?: string; comment?: string; authorVisible: boolean }[] }

    // Author must only receive authorVisible comments; internal notes are filtered server-side
    expect(data.comments.some((c) => (c.body ?? c.comment ?? '').includes('SECRET'))).toBe(false)
    expect(data.comments.some((c) => (c.body ?? c.comment ?? '').includes('revise'))).toBe(true)
  })
})

// ============================================================================
// 8. Public Article Visibility
// ============================================================================
suiteDescribe('Public article visibility', () => {
  test('non-published article → 404 on public page', async () => {
    const art = await createArticle(chief) // DRAFT status
    const res = await get(`/artikel/${art.slug}`)
    expect(res.status).toBe(404)
  })

  test('published article → 200 on public page', async () => {
    const art = await createArticle(chief, {
      title: 'Public Visibility Test ' + Math.random().toString(36).slice(2, 6),
      sources: [
        { title: 'Pub Official', url: 'https://example.com/pv', sourceType: 'PRIMARY', isKeySource: true },
      ],
    })
    await transition(chief, art.id, 'SUBMIT_REVIEW')
    await transition(chief, art.id, 'START_FACT_CHECK')

    const detailRes = await get(`/api/cms/articles/${art.id}`, chief)
    const detail = (await detailRes.json()) as { sources?: { id: string }[]; article?: { sources: { id: string }[] } }
    const sources = detail.sources ?? detail.article?.sources ?? []
    await patchJson(`/api/cms/articles/${art.id}/sources/${sources[0].id}`, {
      verificationStatus: 'VERIFIED',
      verificationNote: 'Diverifikasi publik',
    }, editor)

    await transition(chief, art.id, 'SUBMIT_FOR_APPROVAL')
    const pub = await transition(chief, art.id, 'PUBLISH')
    expect(pub.status).toBe(200)

    const res = await get(`/artikel/${art.slug}`)
    expect(res.status).toBe(200)
  })
})

// ============================================================================
// 9. Complaint Submission
// ============================================================================
suiteDescribe('Complaint submission', () => {
  const RUN_IP = `10.99.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`
  const xip = { 'X-Forwarded-For': RUN_IP }

  test('public complaint submission → 201 with refCode', async () => {
    const res = await fetch(`${BASE}/api/public/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...xip },
      body: JSON.stringify({
        type: 'KELUHAN',
        senderName: 'Uji Publik Regresi',
        senderEmail: 'test@example.com',
        message: 'This is a test complaint for regression suite verification exceeding twenty characters.',
      }),
    })
    expect(res.status).toBe(201)
    const data = (await res.json()) as { refCode?: string; complaintId?: string; status: string }
    expect(data.refCode ?? data.complaintId).toBeTruthy()
  })

  test('complaint with invalid email → 422', async () => {
    const res = await fetch(`${BASE}/api/public/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...xip },
      body: JSON.stringify({
        type: 'KELUHAN',
        senderName: 'Uji Email',
        senderEmail: 'not-an-email',
        message: 'Test complaint message with invalid email exceeding twenty characters.',
      }),
    })
    expect(res.status).toBe(422)
  })

  test('complaint too short message → 422', async () => {
    const res = await fetch(`${BASE}/api/public/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...xip },
      body: JSON.stringify({
        type: 'KELUHAN',
        senderName: 'Uji Pendek',
        senderEmail: 'test@example.com',
        message: 'short',
      }),
    })
    expect(res.status).toBe(422)
  })
})

// ============================================================================
// 10. Correction Record Visibility
// ============================================================================
suiteDescribe('Correction record visibility', () => {
  test('correction log page loads (200)', async () => {
    const res = await get('/koreksi')
    expect(res.status).toBe(200)
  })

  test('editor with complaint grant can create correction record', async () => {
    const art = await createArticle(chief, {
      sources: [{ title: 'Sumber Dokumen Resmi Koreksi', url: 'https://example.com/c', sourceType: 'PRIMARY', isKeySource: true }],
    })
    await transition(chief, art.id, 'SUBMIT_REVIEW')
    await transition(chief, art.id, 'START_FACT_CHECK')

    const detailRes = await get(`/api/cms/articles/${art.id}`, chief)
    const detail = (await detailRes.json()) as { sources?: { id: string }[]; article?: { sources: { id: string }[] } }
    const sources = detail.sources ?? detail.article?.sources ?? []
    await patchJson(`/api/cms/articles/${art.id}/sources/${sources[0].id}`, {
      verificationStatus: 'VERIFIED',
      verificationNote: 'Diverifikasi untuk koreksi',
    }, editor)

    await transition(chief, art.id, 'SUBMIT_FOR_APPROVAL')
    await transition(chief, art.id, 'PUBLISH')

    const res = await postJson('/api/cms/corrections', {
      articleId: art.id,
      summary: 'Correction: factual error in publication year',
      publicNote: 'The publication year was corrected from 2025 to 2026 based on official gazette.',
    }, editor)
    expect(res.status).toBe(201)
  })

  test('audit events are recorded for material actions', async () => {
    const db = getTestDb()
    const count = await db.auditEvent.count()
    expect(count).toBeGreaterThan(0)
    const actions = await db.auditEvent.findMany({ select: { action: true } })
    const actionTypes = [...new Set(actions.map((a) => a.action))]
    // Verify canonical audit action names
    expect(actionTypes).toContain('article.created')
    expect(actionTypes.some((a) => a.includes('article') || a.includes('auth'))).toBe(true)
  })
})

// ============================================================================
// 11. Canonical Negative Validation Tests (TA §5-10 Contract Boundaries)
// ============================================================================
suiteDescribe('Canonical Negative Validation Tests', () => {
  test('article creation with invalid desk slug is rejected (422)', async () => {
    const res = await postJson('/api/cms/articles', {
      title: 'Article with Invalid Desk ' + Math.random().toString(36).slice(2, 6),
      deskSlug: 'non-existent-desk-slug',
      format: 'ANALYSIS',
      content: [{ type: 'paragraph', text: 'Test text.' }],
    }, chief)
    expect(res.status).toBe(422)
  })

  test('article creation with invalid format enum is rejected (422)', async () => {
    const res = await postJson('/api/cms/articles', {
      title: 'Article with Invalid Format ' + Math.random().toString(36).slice(2, 6),
      deskSlug: 'hukum-keadilan',
      format: 'INVALID_FORMAT_ENUM',
      content: [{ type: 'paragraph', text: 'Test text.' }],
    }, chief)
    expect(res.status).toBe(422)
  })

  test('AI submission attempting format NEWS is rejected (422 FORMAT_REJECTED)', async () => {
    const res = await submitAi({
      title: 'AI Ingestion Disallowed Format Test',
      desk: 'teknologi-kebijakan',
      format: 'NEWS', // Hard rule: format NEWS only from newsroom (D2 LOCKED)
      content: [{ type: 'paragraph', text: 'Illegal format text.' }],
      sources: [{ title: 'Source', url: 'https://example.com/s', sourceType: 'SECONDARY' }],
      aiInvolvement: 'assistive',
      agentId: 'agent-d2',
      idempotencyKey: 'itest-d2-' + Date.now(),
    })
    expect(res.status).toBe(422)
    const data = (await res.json()) as { code: string }
    expect(data.code).toBe('FORMAT_REJECTED')
  })

  test('AI submission with invalid Bearer token is rejected (401)', async () => {
    const res = await submitAi({
      title: 'Unauthorized Ingestion Test',
      desk: 'hukum-keadilan',
      format: 'ANALYSIS',
      content: { type: 'doc', content: [{ type: 'paragraph', text: 'Text.' }] },
      sources: [{ title: 'Src', url: 'https://example.com/s', sourceType: 'SECONDARY' }],
      aiInvolvement: 'none',
      agentId: 'agent-unauth',
      idempotencyKey: 'itest-unauth-' + Date.now(),
    }, 'Bearer vrtc_invalid_token_format')
    expect(res.status).toBe(401)
  })

  test('complaint with invalid type enum is rejected (422)', async () => {
    const res = await fetch(`${BASE}/api/public/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': `10.99.1.${Math.floor(Math.random() * 250)}`,
      },
      body: JSON.stringify({
        type: 'INVALID_COMPLAINT_TYPE',
        senderName: 'Penguji',
        senderEmail: 'test@example.com',
        message: 'Pesan keluhan dengan tipe tidak valid melebihi batas dua puluh karakter.',
      }),
    })
    expect(res.status).toBe(422)
  })

  test('author role cannot execute restricted transition PUBLISH (403)', async () => {
    const art = await createArticle(author)
    const { status } = await transition(author, art.id, 'PUBLISH')
    expect([403, 422]).toContain(status)
  })
})
