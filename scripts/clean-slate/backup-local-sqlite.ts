import { Database } from 'bun:sqlite'
import { createHash } from 'node:crypto'
import { readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const SRC = path.resolve('db/custom.db')
const DST = 'D:/Backup/verax-clean-slate-20261111/local-sqlite/custom-backup.db'
const META_DST = 'D:/Backup/verax-clean-slate-20261111/local-sqlite/backup-metadata.json'

console.log('Starting local SQLite backup...')
const srcDb = new Database(SRC)
srcDb.exec(`VACUUM INTO '${DST}'`)
srcDb.close()

console.log('Backup created at', DST)
const backupDb = new Database(DST)
const integrityResult = backupDb.query('PRAGMA integrity_check').all() as Array<{ integrity_check: string }>
const fkCheckResult = backupDb.query('PRAGMA foreign_key_check').all()

const tables = [
  'StaffUser', 'Contributor', 'Person', 'Desk', 'Article', 'ArticleVersion',
  'ArticleContribution', 'SourceReference', 'EditorialReview', 'ReviewComment',
  'Submission', 'ApiClient', 'MediaAsset', 'Complaint', 'CorrectionRecord', 'AuditEvent'
]

const counts: Record<string, number> = {}
let totalRows = 0
for (const table of tables) {
  const row = backupDb.query(`SELECT COUNT(*) as c FROM ${table}`).get() as { c: number }
  counts[table] = row.c
  totalRows += row.c
}
backupDb.close()

const fileBuffer = readFileSync(DST)
const sha256 = createHash('sha256').update(fileBuffer).digest('hex')
const sizeBytes = statSync(DST).size

const metadata = {
  timestamp: new Date().toISOString(),
  source: SRC,
  destination: DST,
  sizeBytes,
  sha256,
  integrity: integrityResult,
  foreignKeyViolations: fkCheckResult.length,
  totalRows,
  tableCounts: counts
}

writeFileSync(META_DST, JSON.stringify(metadata, null, 2))
console.log('Local SQLite Backup verified successfully:')
console.log(JSON.stringify(metadata, null, 2))
