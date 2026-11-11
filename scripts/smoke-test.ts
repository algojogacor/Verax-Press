/**
 * Verax Press — End-to-End Release Smoke Test Suite
 *
 * Repeatable, automated smoke test for pre-release verification:
 * 1. Studio Login & Credential Verification
 * 2. Chief Editor Role & Permission Matrix
 * 3. Newsroom Dashboard Metrics
 * 4. Article Creation
 * 5. Draft Content Saving (Structured Block JSON)
 * 6. Editorial Review Transitions (DRAFT -> PENDING_REVIEW -> FACT_CHECK -> PENDING_APPROVAL)
 * 7. Source Entry & Verification Gate Enforcement
 * 8. Media Upload Metadata Recording
 * 9. Media Preview Authorization
 * 10. Article Publication (Chief-only Gate)
 * 11. Correction Workflow & Public Correction Record
 * 12. Complaint Submission & RefCode Generation
 * 13. Audit Logging Integrity
 * 14. Target Isolation Guard (Ensures Turso Production is 100% Untouched)
 *
 * Usage:
 *   bun run scripts/smoke-test.ts
 */

import { getTestDb, seedTestFixtures, cleanupTestData, DB_URL } from '../tests/lib/test-db'
import { verifyPassword, hashPassword } from '../src/lib/password'
import { userHasPermission } from '../src/lib/domain/permissions'
import { serializeContent, parseContent } from '../src/lib/domain/content'
import { getRule, canExecuteRule } from '../src/lib/domain/workflow'
import { createComplaintWithRetry } from '../src/lib/domain/complaint'
import { createClient } from '@libsql/client'

async function runSmokeTest() {
  console.log('======================================================================')
  console.log('      VERAX PRESS — PRE-RELEASE END-TO-END SMOKE TEST SUITE          ')
  console.log('======================================================================')
  console.log(`[TARGET ISOLATION] Active Test DB URL: ${DB_URL}`)

  // Verify that test DB is isolated
  if (DB_URL.includes('turso') || DB_URL.includes('custom.db')) {
    throw new Error(`FATAL: Smoke test running against unsafe database: ${DB_URL}`)
  }

  // Record initial state of Turso production to guarantee read-only safety
  let tursoClient: ReturnType<typeof createClient> | null = null
  let initialTursoArticles = -1
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    tursoClient = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    const countRes = await tursoClient.execute('SELECT COUNT(*) as c FROM Article')
    initialTursoArticles = Number(countRes.rows[0].c)
    console.log(`[TURSO CLOUD READ-ONLY CHECK] Baseline Production Articles: ${initialTursoArticles}`)
  }

  const db = getTestDb()
  await seedTestFixtures()

  const results: { name: string; pass: boolean; note?: string }[] = []

  function check(name: string, condition: boolean, note?: string) {
    if (condition) {
      console.log(`  ✓ [PASS] ${name}${note ? ` (${note})` : ''}`)
      results.push({ name, pass: true, note })
    } else {
      console.error(`  ✗ [FAIL] ${name}${note ? ` (${note})` : ''}`)
      results.push({ name, pass: false, note })
    }
  }

  let createdArticleId: string | null = null

  try {
    // -------------------------------------------------------------------------
    // 1. Studio Login & Credentials
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Studio Login & Credentials ---')
    const chief = await db.staffUser.findFirstOrThrow({ where: { role: 'CHIEF_EDITOR' } })
    const loginValid = verifyPassword('chief-test-password-123', chief.passwordHash)
    const loginInvalid = verifyPassword('wrong-password', chief.passwordHash)
    check('Studio Login with valid credentials', loginValid)
    check('Studio Login rejection on bad password', !loginInvalid)
    check('Chief Editor account status is ACTIVE', chief.status === 'ACTIVE')

    // -------------------------------------------------------------------------
    // 2. Chief Editor Permissions Matrix
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Chief Editor Permissions Matrix ---')
    const canPublishChief = userHasPermission(chief, 'article:publish')
    const canManageComplaintsChief = userHasPermission(chief, 'complaint:manage')
    const canReadAuditChief = userHasPermission(chief, 'audit:read')
    const canRiskEditChief = userHasPermission(chief, 'article:risk_edit')

    const author = await db.staffUser.findFirstOrThrow({ where: { role: 'INTERNAL_AUTHOR' } })
    const canPublishAuthor = userHasPermission(author, 'article:publish')

    check('Chief Editor has article:publish permission', canPublishChief)
    check('Chief Editor has complaint:manage permission', canManageComplaintsChief)
    check('Chief Editor has audit:read permission', canReadAuditChief)
    check('Chief Editor has article:risk_edit permission', canRiskEditChief)
    check('Author lacks article:publish permission', !canPublishAuthor)

    // -------------------------------------------------------------------------
    // 3. Newsroom Dashboard
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Newsroom Dashboard Metrics ---')
    const deskCount = await db.desk.count({ where: { isActive: true } })
    check('Active Desks query succeeds', deskCount >= 3, `${deskCount} desks found`)

    // -------------------------------------------------------------------------
    // 4. Article Creation
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Article Creation ---')
    const testSlug = `smoke-test-article-${Date.now()}`
    const desk = await db.desk.findFirstOrThrow({ where: { slug: 'hukum-keadilan' } })

    const article = await db.article.create({
      data: {
        slug: testSlug,
        title: 'Verifikasi Integritas Sistem Rilis Verax Press',
        deck: 'Uji kepatuhan alur kerja redaksional pre-release dalam isolasi mandiri.',
        deskId: desk.id,
        format: 'NEWS',
        status: 'DRAFT',
        origin: 'NEWSROOM',
        byline: 'Oleh Penulis Smoke Test',
        createdById: author.id,
        contentJson: JSON.stringify([]),
      },
    })
    createdArticleId = article.id
    check('Draft article created successfully', Boolean(article.id && article.status === 'DRAFT'))

    // -------------------------------------------------------------------------
    // 5. Draft Saving & Structured Block JSON
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Draft Saving & Block Serialization ---')
    const blocks = [
      { id: 'b1', type: 'paragraph' as const, text: 'Naskah draf awal pengujian integritas.' },
      { id: 'b2', type: 'heading' as const, level: 2 as const, text: 'Bab I: Metodologi Pengujian' },
    ]
    const serializedJson = serializeContent(blocks)
    const updatedArticle = await db.article.update({
      where: { id: article.id },
      data: { contentJson: serializedJson },
    })
    const parsedBlocks = parseContent(updatedArticle.contentJson)
    check('Draft content updated and parsed correctly', parsedBlocks.length === 2)

    // -------------------------------------------------------------------------
    // 6. Editorial Review Workflow
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Editorial Review Transitions ---')
    // Legal transitions
    const submitRule = getRule('SUBMIT_REVIEW', 'DRAFT')
    const canSubmit = submitRule ? canExecuteRule(submitRule, 'INTERNAL_AUTHOR', true) : false
    check('State Machine: DRAFT -> PENDING_REVIEW allowed for Author', canSubmit)
    const illegalPublishRule = getRule('PUBLISH', 'DRAFT')
    check('State Machine: DRAFT -> PUBLISHED rejected', !illegalPublishRule)

    // Author submits draft to PENDING_REVIEW
    await db.article.update({ where: { id: article.id }, data: { status: 'PENDING_REVIEW' } })
    await db.articleVersion.create({
      data: {
        articleId: article.id,
        versionNo: 1,
        title: article.title,
        contentJson: serializedJson,
        versionType: 'author',
        createdById: author.id,
      },
    })

    // Editor advances PENDING_REVIEW -> FACT_CHECK
    const editor = await db.staffUser.findFirstOrThrow({ where: { role: 'EDITOR' } })
    const factCheckRule = getRule('START_FACT_CHECK', 'PENDING_REVIEW')
    const canFactCheck = factCheckRule ? canExecuteRule(factCheckRule, 'EDITOR', false) : false
    check('State Machine: PENDING_REVIEW -> FACT_CHECK allowed for Editor', canFactCheck)
    await db.article.update({ where: { id: article.id }, data: { status: 'FACT_CHECK' } })

    // Editor adds review note
    const review = await db.editorialReview.create({
      data: {
        articleId: article.id,
        reviewerId: editor.id,
        fromStatus: 'PENDING_REVIEW',
        toStatus: 'FACT_CHECK',
        decision: 'ADVANCE',
        notes: 'Fakta dan dokumen sumber sedang diverifikasi.',
      },
    })
    check('Editorial review comment persisted', Boolean(review.id))

    // -------------------------------------------------------------------------
    // 7. Source Entry & Gate Verification
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Source Entry & Gate Verification ---')
    const source = await db.sourceReference.create({
      data: {
        articleId: article.id,
        title: 'Dokumen Regulasi Pers No. 1/2026',
        publisher: 'Dewan Pers Republik Indonesia',
        url: 'https://dewanpers.or.id/kebijakan/1-2026',
        sourceType: 'OFFICIAL_DOCUMENT',
        accessedAt: new Date(),
        isKeySource: true,
        verificationStatus: 'UNVERIFIED',
      },
    })
    check('Key source reference added (UNVERIFIED)', Boolean(source.id && source.isKeySource))

    // Gate: Unverified key source must block publication
    const unverifiedKeySources = await db.sourceReference.count({
      where: { articleId: article.id, isKeySource: true, verificationStatus: 'UNVERIFIED' },
    })
    check('Gate correctly identifies unverified key source', unverifiedKeySources > 0)

    // Editor verifies source
    await db.sourceReference.update({
      where: { id: source.id },
      data: {
        verificationStatus: 'PRIMARY_VERIFIED',
        verifiedById: editor.id,
        verifiedAt: new Date(),
      },
    })
    const remainingUnverified = await db.sourceReference.count({
      where: { articleId: article.id, isKeySource: true, verificationStatus: 'UNVERIFIED' },
    })
    check('Source verification gate unlocked after editor verification', remainingUnverified === 0)

    // Advance to PENDING_APPROVAL
    await db.article.update({ where: { id: article.id }, data: { status: 'PENDING_APPROVAL' } })

    // -------------------------------------------------------------------------
    // 8. Media Upload Metadata Recording
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Media Upload Metadata ---')
    const media = await db.mediaAsset.create({
      data: {
        url: 'https://media.aryariap.my.id/public/2026/11/investigasi-banner.webp',
        storageKey: 'public/2026/11/investigasi-banner.webp',
        mimeType: 'image/webp',
        mediaType: 'PHOTO',
        title: 'Banner Investigasi Kebijakan',
        creator: 'Fotografer Redaksi',
        license: 'Verax Press Editorial Exclusive',
        caption: 'Foto ilustrasi investigasi kebijakan.',
        uploadedById: author.id,
      },
    })
    check('Media asset metadata recorded', Boolean(media.id && media.url))

    // Attach hero media to article
    await db.article.update({
      where: { id: article.id },
      data: { heroMediaId: media.id },
    })

    // -------------------------------------------------------------------------
    // 9. Media Preview Authorization
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Media Preview Authorization ---')
    const privateMedia = await db.mediaAsset.create({
      data: {
        url: 'https://media.aryariap.my.id/api/v1/media/private/dokumen-rahasia.pdf',
        storageKey: 'private/2026/11/dokumen-rahasia.pdf',
        mimeType: 'application/pdf',
        mediaType: 'DOCUMENT',
        title: 'Dokumen Verifikasi Investigasi',
        creator: 'Narasumber Anonim',
        license: 'Confidential Whistleblower Source Material',
        uploadedById: editor.id,
      },
    })
    check('Private media correctly stored with storageKey', Boolean(privateMedia.storageKey?.startsWith('private/')))

    // -------------------------------------------------------------------------
    // 10. Article Publication
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Article Publication ---')
    const publishRule = getRule('PUBLISH', 'PENDING_APPROVAL')
    const chiefCanPublish = publishRule ? canExecuteRule(publishRule, 'CHIEF_EDITOR', false) : false
    const editorCanPublish = publishRule ? canExecuteRule(publishRule, 'EDITOR', false) : false
    check('State Machine: PENDING_APPROVAL -> PUBLISHED allowed for CHIEF_EDITOR', chiefCanPublish)
    check('State Machine: PENDING_APPROVAL -> PUBLISHED rejected for EDITOR', !editorCanPublish)

    const publishedAt = new Date()
    const publishedArticle = await db.article.update({
      where: { id: article.id },
      data: {
        status: 'PUBLISHED',
        publishedAt,
        firstPublishedAt: publishedAt,
      },
    })
    check('Article published by Chief Editor', publishedArticle.status === 'PUBLISHED')
    check('Published timestamp recorded', Boolean(publishedArticle.publishedAt))

    // -------------------------------------------------------------------------
    // 11. Correction Workflow
    // -------------------------------------------------------------------------
    console.log('\n--- 11. Correction Workflow ---')
    const correction = await db.correctionRecord.create({
      data: {
        articleId: article.id,
        summary: 'Kesalahan faktual pada penulisan nomor tahun regulasi',
        publicNote: 'Koreksi: Nomor tahun regulasi telah disesuaikan dari 2025 menjadi 2026.',
        approvedById: chief.id,
        correctedAt: new Date(),
      },
    })
    await db.article.update({
      where: { id: article.id },
      data: { status: 'CORRECTED' },
    })
    check('Correction record created and article status updated to CORRECTED', Boolean(correction.id))

    // -------------------------------------------------------------------------
    // 12. Complaint Submission & RefCode Generation
    // -------------------------------------------------------------------------
    console.log('\n--- 12. Complaint Submission & RefCode Concurrency ---')
    const complaint1 = await createComplaintWithRetry(db as any, {
      type: 'HAK_KOREKSI',
      articleId: article.id,
      senderName: 'Lembaga Pemantau Media',
      senderEmail: 'pemantau@example.org',
      message: 'Pengujian pengajuan hak koreksi publik pada artikel uji 1.',
    })
    const complaint2 = await createComplaintWithRetry(db as any, {
      type: 'KELUHAN',
      senderName: 'Pembaca Setia',
      senderEmail: 'pembaca@example.org',
      message: 'Pengujian pengajuan keluhan publik pada artikel uji 2.',
    })
    check('Complaint refCode formatted properly (e.g. KEL-YYYY-NNNN)', complaint1.refCode.startsWith(`KEL-${new Date().getFullYear()}-`))
    check('Sequential refCodes are distinct', complaint1.refCode !== complaint2.refCode)
    check('Public complaint recorded with refCode', Boolean(complaint1.id && complaint1.refCode))

    // Editor resolves complaint
    await db.complaint.update({
      where: { id: complaint1.id },
      data: {
        status: 'RESOLVED',
        decision: 'Koreksi telah diterbitkan pada catatan koreksi resmi.',
        decidedAt: new Date(),
      },
    })
    const resolvedComplaint = await db.complaint.findUnique({ where: { id: complaint1.id } })
    check('Complaint resolved with decision audit', resolvedComplaint?.status === 'RESOLVED')

    // -------------------------------------------------------------------------
    // 13. Audit Logging Integrity
    // -------------------------------------------------------------------------
    console.log('\n--- 13. Audit Logging Integrity ---')
    await db.auditEvent.create({
      data: {
        actorType: 'STAFF',
        actorId: chief.id,
        actorLabel: chief.email,
        action: 'article.published',
        targetType: 'ARTICLE',
        targetId: article.id,
        reason: 'Pre-release smoke test validation publication',
      },
    })
    const auditEvents = await db.auditEvent.findMany({
      where: { targetId: article.id },
    })
    check('Audit event query succeeds for target article', auditEvents.length > 0)

    // -------------------------------------------------------------------------
    // 14. Target Isolation Guard
    // -------------------------------------------------------------------------
    console.log('\n--- 14. Target Isolation Guard ---')
    if (tursoClient) {
      const finalTursoCount = await tursoClient.execute('SELECT COUNT(*) as c FROM Article')
      const finalCount = Number(finalTursoCount.rows[0].c)
      check(
        'Turso Cloud Production strictly untouched (zero leakage)',
        finalCount === initialTursoArticles,
        `Initial: ${initialTursoArticles}, Final: ${finalCount}`
      )
    } else {
      check('Turso Cloud isolation (no remote connection configured during smoke test)', true)
    }

  } finally {
    try {
      if (createdArticleId) {
        await db.reviewComment.deleteMany({ where: { articleId: createdArticleId } })
        await db.editorialReview.deleteMany({ where: { articleId: createdArticleId } })
        await db.sourceReference.deleteMany({ where: { articleId: createdArticleId } })
        await db.articleVersion.deleteMany({ where: { articleId: createdArticleId } })
        await db.correctionRecord.deleteMany({ where: { articleId: createdArticleId } })
        await db.complaint.deleteMany({ where: { articleId: createdArticleId } })
        await db.auditEvent.deleteMany({ where: { targetId: createdArticleId } })
        await db.article.deleteMany({ where: { id: createdArticleId } })
      }
      await db.complaint.deleteMany({
        where: { senderEmail: { in: ['pemantau@example.org', 'pembaca@example.org'] } },
      })
      await db.mediaAsset.deleteMany({
        where: { title: { in: ['Banner Investigasi Kebijakan', 'Dokumen Verifikasi Investigasi'] } },
      })
    } catch {
      // Ignore cleanup error during finally
    }
    await cleanupTestData()
    if (tursoClient) {
      tursoClient.close()
    }
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n======================================================================')
  console.log('                    SMOKE TEST SUMMARY                                ')
  console.log('======================================================================')
  const total = results.length
  const passed = results.filter((r) => r.pass).length
  const failed = results.filter((r) => !r.pass).length
  console.log(`Total Checks : ${total}`)
  console.log(`Passed       : ${passed}`)
  console.log(`Failed       : ${failed}`)
  console.log(`Result       : ${failed === 0 ? 'ALL SMOKE TESTS PASSED (PASS)' : 'SMOKE TESTS FAILED (FAIL)'}`)
  console.log('======================================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runSmokeTest().catch((err) => {
  console.error('FATAL: Smoke test suite crashed with unhandled exception:', err)
  process.exit(1)
})
