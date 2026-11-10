// Test database setup — seeds test fixtures into the SAME database the dev server uses.
// Cleans up test-created rows before/after the run. Test user accounts use @verity.test emails
// to avoid collision with dev seed accounts.
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '@/lib/password'
import { hashClientSecret } from '@/lib/api-key'

const DB_URL = process.env.DATABASE_URL || 'file:../db/custom.db'

let testDb: PrismaClient | null = null

export function getTestDb(): PrismaClient {
  if (!testDb) {
    testDb = new PrismaClient({
      datasources: { db: { url: DB_URL } },
      log: ['warn', 'error'],
    })
  }
  return testDb
}

// Per-run client ID with mandatory vrtc_ prefix required by Ingestion API (TA §9.2).
export const TEST_AGENT_CLIENT_ID = `vrtc_testagent_${Date.now().toString(36)}`

// Seed test fixtures (idempotent — upsert). Does NOT delete dev data.
export async function seedTestFixtures(): Promise<void> {
  const db = getTestDb()
  const chiefHash = hashPassword(CHIEF_PW)
  const editorHash = hashPassword(EDITOR_PW)
  const authorHash = hashPassword(AUTHOR_PW)

  await db.staffUser.upsert({
    where: { email: 'chief@verity.test' },
    update: { passwordHash: chiefHash, role: 'CHIEF_EDITOR', status: 'ACTIVE', name: 'Chief Test' },
    create: {
      email: 'chief@verity.test',
      name: 'Chief Test',
      passwordHash: chiefHash,
      role: 'CHIEF_EDITOR',
      status: 'ACTIVE',
    },
  })
  await db.staffUser.upsert({
    where: { email: 'editor@verity.test' },
    update: {
      passwordHash: editorHash,
      role: 'EDITOR',
      status: 'ACTIVE',
      name: 'Editor Test',
      canManageComplaints: true,
    },
    create: {
      email: 'editor@verity.test',
      name: 'Editor Test',
      passwordHash: editorHash,
      role: 'EDITOR',
      status: 'ACTIVE',
      canManageComplaints: true,
    },
  })
  await db.staffUser.upsert({
    where: { email: 'author@verity.test' },
    update: { passwordHash: authorHash, role: 'INTERNAL_AUTHOR', status: 'ACTIVE', name: 'Author Test' },
    create: {
      email: 'author@verity.test',
      name: 'Author Test',
      passwordHash: authorHash,
      role: 'INTERNAL_AUTHOR',
      status: 'ACTIVE',
    },
  })

  await db.apiClient.create({
    data: {
      clientId: TEST_AGENT_CLIENT_ID,
      secretHash: hashClientSecret(API_SECRET),
      scopes: 'submit',
      status: 'ACTIVE',
      name: 'Test Agent (per-run)',
    },
  }).catch(() => {
    // Already exists in this process — reuse.
  })
}

export const CANONICAL_SEED_SLUGS = [
  'selamat-datang-di-verax-press',
  'cara-verax-press-memverifikasi-sumber',
  'kebijakan-verax-press-soal-penggunaan-ai',
  'media-independen-dan-disiplin-sumber',
  'lima-tahap-sebelum-terbit-alur-editorial-verax-press',
  'anatomi-koreksi-terbuka-verax-press',
  'satu-pintu-untuk-mesin-kiriman-ai-verax-press',
  'di-zaman-banjir-konten-kehati-hatian-adalah-keunggulan',
  'tiga-dokumen-fondasi-verax-press',
  'perlindungan-sumber-dan-anonimitas-verax-press',
  'isi-artikel-terstruktur-bukan-html-lepas',
  'kode-etik-jurnalistik-sebagai-rujukan-bukan-stiker',
  'analisis-peta-regulasi-ai-indonesia',
  'explainer-apa-itu-hak-jawab-dan-hak-koreksi',
  'catatan-kebijakan-status-pse-media-digital',
  'laporan-verax-press-menangani-keluhan-pembaca',
]

// Clean up all test-created rows (articles, submissions, complaints, etc.) but NOT the
// test user accounts or api_client (those are stable fixtures). Call after the run.
export async function cleanupTestData(): Promise<void> {
  const db = getTestDb()

  // Find all test-created articles — strictly excluding canonical seed slugs
  const testArticles = await db.article.findMany({
    where: {
      slug: { notIn: CANONICAL_SEED_SLUGS },
      OR: [
        { title: { startsWith: 'Test Article' } },
        { title: { startsWith: 'Public Visibility Test' } },
        { title: { startsWith: 'Idempotency' } },
        { title: { startsWith: 'AI Submission' } },
        { title: { startsWith: 'AI Ingestion' } },
        { title: { startsWith: 'Unauthorized Ingestion' } },
        { slug: { startsWith: 'ai-submission-' } },
        { slug: { startsWith: 'idempotency-' } },
        { slug: { startsWith: 'test-article-' } },
        { slug: { startsWith: 'public-visibility-' } },
      ],
    },
    select: { id: true },
  })
  const testArticleIds = testArticles.map((a) => a.id)

  await db.reviewComment.deleteMany({
    where: { articleId: { in: testArticleIds } },
  })
  await db.editorialReview.deleteMany({
    where: { articleId: { in: testArticleIds } },
  })
  await db.articleContribution.deleteMany({
    where: { articleId: { in: testArticleIds } },
  })
  await db.complaint.deleteMany({
    where: {
      OR: [
        { senderEmail: { contains: 'test@example' } },
        { articleId: { in: testArticleIds } },
      ],
    },
  })
  await db.correctionRecord.deleteMany({
    where: { articleId: { in: testArticleIds } },
  })
  await db.submission.deleteMany({
    where: {
      OR: [
        { agentId: { startsWith: 'verity-agent-test' } },
        { agentId: { startsWith: 'test-agent' } },
        { agentId: { startsWith: 'agent-' } },
        { articleId: { in: testArticleIds } },
      ],
    },
  })
  await db.sourceReference.deleteMany({
    where: { articleId: { in: testArticleIds } },
  })
  await db.articleVersion.deleteMany({
    where: { articleId: { in: testArticleIds } },
  })

  // Clean only explicitly generated test articles, preserving seed editorial articles
  if (testArticleIds.length > 0) {
    await db.article.deleteMany({
      where: { id: { in: testArticleIds } },
    })
  }

  // Clean test-originated audit events.
  await db.auditEvent.deleteMany({
    where: {
      OR: [
        { actorType: 'API_CLIENT' },
        { targetId: { in: testArticleIds } },
      ],
    },
  })
}

export const API_SECRET = 'test-api-secret-for-regression-suite-0123456789'
export const CHIEF_PW = 'chief-test-password-123'
export const EDITOR_PW = 'editor-test-password-123'
export const AUTHOR_PW = 'author-test-password-123'
export const BASE = 'http://localhost:3000'
