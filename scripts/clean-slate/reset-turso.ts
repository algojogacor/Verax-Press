import { createClient } from '@libsql/client'
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'

const TURSO_URL = process.env.TURSO_DATABASE_URL
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN

if (!TURSO_URL || !TURSO_AUTH_TOKEN) {
  console.error('ERROR: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set')
  process.exit(1)
}

// 1. Verify backup existence & checksums before any destructive step
const TURSO_BACKUP_DB = 'D:/Backup/verax-clean-slate-20261111/turso/turso-backup.db'
const TURSO_BACKUP_META = 'D:/Backup/verax-clean-slate-20261111/turso/backup-metadata.json'

if (!existsSync(TURSO_BACKUP_DB) || !existsSync(TURSO_BACKUP_META)) {
  console.error('SAFETY HALT: Verified Turso backup does not exist!')
  process.exit(1)
}

const meta = JSON.parse(readFileSync(TURSO_BACKUP_META, 'utf8'))
const currentDbHash = createHash('sha256').update(readFileSync(TURSO_BACKUP_DB)).digest('hex')
if (currentDbHash !== meta.backupDbSha256) {
  console.error('SAFETY HALT: Turso backup hash mismatch! Expected:', meta.backupDbSha256, 'Actual:', currentDbHash)
  process.exit(1)
}
console.log('✓ Pre-flight backup verification passed:', currentDbHash)

// 2. Target verification
if (!TURSO_URL.includes('verax-aryarizkyap.aws-ap-southeast-1.turso.io')) {
  console.error('SAFETY HALT: Unexpected target Turso database URL:', TURSO_URL)
  process.exit(1)
}
console.log('✓ Target database verified:', TURSO_URL)

const turso = createClient({
  url: TURSO_URL,
  authToken: TURSO_AUTH_TOKEN,
})

// 3. Verify chief editor account before reset
const chiefRes = await turso.execute({
  sql: "SELECT id, email, role, status FROM StaffUser WHERE email = 'chief@verity.test' AND role = 'CHIEF_EDITOR'",
  args: []
})
if (chiefRes.rows.length === 0) {
  console.error('SAFETY HALT: Active Chief Editor account not found in Turso!')
  process.exit(1)
}
const chiefId = String(chiefRes.rows[0].id)
console.log('✓ Chief Editor account verified:', chiefRes.rows[0].email, 'ID:', chiefId, 'Status:', chiefRes.rows[0].status)

// 4. Verify Desks before reset
const desksRes = await turso.execute("SELECT id, slug FROM Desk ORDER BY sortOrder")
console.log('✓ Desks before reset:', desksRes.rows.map(r => r.slug))

// 5. Execute reset inside transaction/batch
console.log('→ Executing Turso Cloud clean-slate reset...')

const statements = [
  // A. Clear all child editorial tables
  'DELETE FROM ReviewComment',
  'DELETE FROM EditorialReview',
  'DELETE FROM SourceReference',
  'DELETE FROM ArticleContribution',
  'DELETE FROM ArticleVersion',
  'DELETE FROM CorrectionRecord',
  'DELETE FROM Complaint',
  'DELETE FROM Submission',

  // B. Break self-referencing heroMediaId before removing articles and media
  'UPDATE Article SET heroMediaId = NULL',
  'DELETE FROM MediaAsset',
  'DELETE FROM Article',

  // C. Clear test audit records
  'DELETE FROM AuditEvent',

  // D. Remove obsolete test ApiClients, preserve vrtc_demo_agent
  "DELETE FROM ApiClient WHERE clientId != 'vrtc_demo_agent'",

  // E. Remove fictional bylines and unneeded personas (keep Chief Editor person)
  `DELETE FROM Person WHERE staffUserId IS NULL OR staffUserId != '${chiefId}'`,

  // F. Remove test staff users (keep Chief Editor)
  `DELETE FROM StaffUser WHERE id != '${chiefId}'`,

  // G. Record the clean-slate reset in AuditEvent
  {
    sql: `INSERT INTO AuditEvent (id, actorType, actorId, actorLabel, action, targetType, targetId, reason, correlationId, metadataJson, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      `audit_reset_${Date.now()}`,
      'SYSTEM',
      chiefId,
      'chief@verity.test',
      'system.clean_slate_reset',
      'SYSTEM',
      'turso-production',
      'Authorized complete clean-slate data reset before public launch',
      `reset-${Date.now()}`,
      JSON.stringify({
        operation: 'COMPLETE_CLEAN_SLATE_RESET',
        authorizedBy: 'Owner',
        timestamp: new Date().toISOString(),
        tablesCleared: [
          'Article', 'ArticleVersion', 'ArticleContribution', 'SourceReference',
          'EditorialReview', 'ReviewComment', 'CorrectionRecord', 'Complaint',
          'Submission', 'MediaAsset'
        ],
        preserved: {
          chiefEditor: 'chief@verity.test',
          desks: ['hukum-keadilan', 'teknologi-kebijakan', 'nasional-publik'],
          apiClient: 'vrtc_demo_agent'
        }
      }),
      new Date().toISOString()
    ]
  }
]

const tx = await turso.transaction('write')
try {
  for (const stmt of statements) {
    if (typeof stmt === 'string') {
      await tx.execute(stmt)
    } else {
      await tx.execute(stmt)
    }
  }
  await tx.commit()
  console.log('✓ Turso reset transaction committed successfully!')
} catch (err) {
  await tx.rollback()
  console.error('FATAL: Reset transaction failed and rolled back:', err)
  process.exit(1)
}

// 6. Post-reset recount and verification
console.log('→ Verifying post-reset state...')
const tables = [
  'StaffUser', 'Contributor', 'Person', 'Desk', 'Article', 'ArticleVersion',
  'ArticleContribution', 'SourceReference', 'EditorialReview', 'ReviewComment',
  'Submission', 'ApiClient', 'MediaAsset', 'Complaint', 'CorrectionRecord', 'AuditEvent'
]

const postCounts: Record<string, number> = {}
for (const t of tables) {
  const res = await turso.execute(`SELECT COUNT(*) as c FROM "${t}"`)
  postCounts[t] = Number(res.rows[0].c)
}
console.log('Post-reset row counts:', postCounts)

// Verify expected counts
const expectedZero = [
  'Article', 'ArticleVersion', 'ArticleContribution', 'SourceReference',
  'EditorialReview', 'ReviewComment', 'CorrectionRecord', 'Complaint',
  'Submission', 'MediaAsset', 'Contributor'
]

for (const t of expectedZero) {
  if (postCounts[t] !== 0) {
    throw new Error(`POST-RESET VERIFICATION FAILED: Table ${t} is not empty! Count=${postCounts[t]}`)
  }
}

if (postCounts['StaffUser'] !== 1) {
  throw new Error(`POST-RESET VERIFICATION FAILED: Expected 1 StaffUser, found ${postCounts['StaffUser']}`)
}
if (postCounts['Person'] !== 1) {
  throw new Error(`POST-RESET VERIFICATION FAILED: Expected 1 Person, found ${postCounts['Person']}`)
}
if (postCounts['Desk'] !== 3) {
  throw new Error(`POST-RESET VERIFICATION FAILED: Expected 3 Desks, found ${postCounts['Desk']}`)
}
if (postCounts['ApiClient'] !== 1) {
  throw new Error(`POST-RESET VERIFICATION FAILED: Expected 1 ApiClient, found ${postCounts['ApiClient']}`)
}
if (postCounts['AuditEvent'] !== 1) {
  throw new Error(`POST-RESET VERIFICATION FAILED: Expected 1 AuditEvent, found ${postCounts['AuditEvent']}`)
}

// Verify foreign keys and integrity
const fkRes = await turso.execute('PRAGMA foreign_key_check')
console.log('FK check violations:', fkRes.rows.length)
if (fkRes.rows.length > 0) {
  throw new Error(`POST-RESET VERIFICATION FAILED: Foreign key violations detected! ${JSON.stringify(fkRes.rows)}`)
}

const intRes = await turso.execute('PRAGMA integrity_check')
console.log('Integrity check:', intRes.rows[0])

console.log('★ Turso Cloud Main Database Reset: ALL CHECKS PASSED!')
