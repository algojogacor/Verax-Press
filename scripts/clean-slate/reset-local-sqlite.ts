import { Database } from 'bun:sqlite'
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'

const DB_PATH = path.resolve('db/custom.db')
const BACKUP_PATH = 'D:/Backup/verax-clean-slate-20261111/local-sqlite/custom-backup.db'
const BACKUP_META = 'D:/Backup/verax-clean-slate-20261111/local-sqlite/backup-metadata.json'

// 1. Verify backup existence & checksum
if (!existsSync(BACKUP_PATH) || !existsSync(BACKUP_META)) {
  console.error('SAFETY HALT: Verified local SQLite backup does not exist!')
  process.exit(1)
}

const meta = JSON.parse(readFileSync(BACKUP_META, 'utf8'))
const currentDbHash = createHash('sha256').update(readFileSync(BACKUP_PATH)).digest('hex')
if (currentDbHash !== meta.sha256) {
  console.error('SAFETY HALT: Local SQLite backup hash mismatch! Expected:', meta.sha256, 'Actual:', currentDbHash)
  process.exit(1)
}
console.log('✓ Pre-flight local SQLite backup verified:', currentDbHash)

const db = new Database(DB_PATH)

// 2. Find chief editor user ID
const chiefUser = db.query("SELECT id, email, role, status FROM StaffUser WHERE email = 'chief@verity.test'").get() as {
  id: string
  email: string
  role: string
  status: string
} | null

if (!chiefUser) {
  console.error('SAFETY HALT: Chief Editor account not found in local custom.db!')
  process.exit(1)
}
console.log('✓ Chief Editor account found:', chiefUser.email, 'ID:', chiefUser.id)

// 3. Perform reset in a transaction
console.log('→ Resetting local SQLite database...')
db.exec('BEGIN TRANSACTION;')

try {
  // Clear child editorial tables
  db.exec('DELETE FROM ReviewComment;')
  db.exec('DELETE FROM EditorialReview;')
  db.exec('DELETE FROM SourceReference;')
  db.exec('DELETE FROM ArticleContribution;')
  db.exec('DELETE FROM ArticleVersion;')
  db.exec('DELETE FROM CorrectionRecord;')
  db.exec('DELETE FROM Complaint;')
  db.exec('DELETE FROM Submission;')

  // Break heroMediaId and clear media and articles
  db.exec('UPDATE Article SET heroMediaId = NULL;')
  db.exec('DELETE FROM MediaAsset;')
  db.exec('DELETE FROM Article;')

  // Clear test audit records
  db.exec('DELETE FROM AuditEvent;')

  // Remove test ApiClients, preserve vrtc_demo_agent
  db.exec("DELETE FROM ApiClient WHERE clientId != 'vrtc_demo_agent';")

  // Remove fictional bylines and unneeded personas
  db.exec(`DELETE FROM Person WHERE staffUserId IS NULL OR staffUserId != '${chiefUser.id}';`)

  // Remove test staff users (keep Chief Editor)
  db.exec(`DELETE FROM StaffUser WHERE id != '${chiefUser.id}';`)

  // Record reset AuditEvent
  const auditStmt = db.prepare(`
    INSERT INTO AuditEvent (id, actorType, actorId, actorLabel, action, targetType, targetId, reason, correlationId, metadataJson, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  auditStmt.run(
    `audit_reset_local_${Date.now()}`,
    'SYSTEM',
    chiefUser.id,
    'chief@verity.test',
    'system.clean_slate_reset',
    'SYSTEM',
    'local-sqlite',
    'Authorized complete clean-slate data reset before public launch',
    `reset-local-${Date.now()}`,
    JSON.stringify({
      operation: 'COMPLETE_CLEAN_SLATE_RESET',
      environment: 'local-development',
      timestamp: new Date().toISOString()
    }),
    new Date().toISOString()
  )

  db.exec('COMMIT;')
  console.log('✓ Local SQLite reset transaction committed.')
} catch (err) {
  db.exec('ROLLBACK;')
  console.error('FATAL: Local reset failed and rolled back:', err)
  process.exit(1)
}

// 4. Verify post-reset state
const tables = [
  'StaffUser', 'Contributor', 'Person', 'Desk', 'Article', 'ArticleVersion',
  'ArticleContribution', 'SourceReference', 'EditorialReview', 'ReviewComment',
  'Submission', 'ApiClient', 'MediaAsset', 'Complaint', 'CorrectionRecord', 'AuditEvent'
]

const postCounts: Record<string, number> = {}
for (const t of tables) {
  const row = db.query(`SELECT COUNT(*) as c FROM ${t}`).get() as { c: number }
  postCounts[t] = row.c
}
console.log('Post-reset row counts:', postCounts)

const integrity = db.query('PRAGMA integrity_check').all() as Array<{ integrity_check: string }>
const fk = db.query('PRAGMA foreign_key_check').all()
db.close()

console.log('Integrity check:', integrity[0]?.integrity_check)
console.log('FK violations:', fk.length)

if (integrity[0]?.integrity_check !== 'ok' || fk.length > 0) {
  throw new Error('POST-RESET VERIFICATION FAILED on local SQLite!')
}

console.log('★ Local SQLite Reset: ALL CHECKS PASSED!')
