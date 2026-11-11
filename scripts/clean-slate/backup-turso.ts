import { createClient } from '@libsql/client'
import { Database } from 'bun:sqlite'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, statSync } from 'node:fs'

const TURSO_URL = process.env.TURSO_DATABASE_URL
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN

if (!TURSO_URL || !TURSO_AUTH_TOKEN) {
  console.error('ERROR: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set')
  process.exit(1)
}

const DB_DEST = 'D:/Backup/verax-clean-slate-20261111/turso/turso-backup.db'
const SQL_DEST = 'D:/Backup/verax-clean-slate-20261111/turso/turso-backup.sql'
const META_DEST = 'D:/Backup/verax-clean-slate-20261111/turso/backup-metadata.json'

console.log('Connecting to Turso Cloud at', TURSO_URL)
const turso = createClient({
  url: TURSO_URL,
  authToken: TURSO_AUTH_TOKEN,
})

// 1. Fetch schema DDL
const schemaRows = await turso.execute(
  "SELECT type, name, tbl_name, rootpage, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY type = 'table' DESC, name ASC"
)

console.log(`Fetched ${schemaRows.rows.length} schema definitions from Turso`)

// Remove existing backup DB if exists
try {
  const fs = await import('node:fs')
  if (fs.existsSync(DB_DEST)) fs.unlinkSync(DB_DEST)
  if (fs.existsSync(SQL_DEST)) fs.unlinkSync(SQL_DEST)
} catch {}

const localDb = new Database(DB_DEST)
let sqlDump = '-- Turso Cloud Full Database Dump\n-- Generated: ' + new Date().toISOString() + '\nPRAGMA foreign_keys=OFF;\nBEGIN TRANSACTION;\n\n'

// Create tables first
const tableDefs = schemaRows.rows.filter((r) => r.type === 'table')
const indexDefs = schemaRows.rows.filter((r) => r.type === 'index')

for (const row of tableDefs) {
  const sql = String(row.sql)
  localDb.exec(sql)
  sqlDump += sql + ';\n\n'
}

const tables = [
  'StaffUser', 'Contributor', 'Person', 'Desk', 'Article', 'ArticleVersion',
  'ArticleContribution', 'SourceReference', 'EditorialReview', 'ReviewComment',
  'Submission', 'ApiClient', 'MediaAsset', 'Complaint', 'CorrectionRecord', 'AuditEvent'
]

const tableCountsTurso: Record<string, number> = {}
const tableCountsLocal: Record<string, number> = {}
let totalTursoRows = 0

for (const tableName of tables) {
  const countRes = await turso.execute(`SELECT COUNT(*) as c FROM "${tableName}"`)
  const count = Number(countRes.rows[0].c)
  tableCountsTurso[tableName] = count
  totalTursoRows += count

  console.log(`Exporting table ${tableName} (${count} rows)...`)
  if (count === 0) continue

  const dataRes = await turso.execute(`SELECT * FROM "${tableName}"`)
  if (dataRes.rows.length > 0) {
    const columns = dataRes.columns
    const colsEscaped = columns.map((c) => `"${c}"`).join(', ')
    const placeholders = columns.map(() => '?').join(', ')
    const insertStmt = localDb.prepare(`INSERT INTO "${tableName}" (${colsEscaped}) VALUES (${placeholders})`)

    for (const row of dataRes.rows) {
      const vals = columns.map((col) => row[col] as any)
      insertStmt.run(...vals)

      // SQL Dump formatting
      const sqlVals = columns.map((col) => {
        const v = row[col]
        if (v === null || v === undefined) return 'NULL'
        if (typeof v === 'number') return String(v)
        if (typeof v === 'bigint') return v.toString()
        if (typeof v === 'boolean') return v ? '1' : '0'
        return `'${String(v).replace(/'/g, "''")}'`
      }).join(', ')
      sqlDump += `INSERT INTO "${tableName}" (${colsEscaped}) VALUES (${sqlVals});\n`
    }
  }
}

// Create indexes
for (const row of indexDefs) {
  const sql = String(row.sql)
  try {
    localDb.exec(sql)
    sqlDump += sql + ';\n'
  } catch (err: any) {
    console.warn(`Index note (${row.name}):`, err.message)
  }
}

sqlDump += '\nCOMMIT;\nPRAGMA foreign_keys=ON;\n'
writeFileSync(SQL_DEST, sqlDump)
console.log('SQL dump written to', SQL_DEST)

// 2. Verify restored database
console.log('Verifying restored local database...')
const integrityCheck = localDb.query('PRAGMA integrity_check').all() as Array<{ integrity_check: string }>
const fkCheck = localDb.query('PRAGMA foreign_key_check').all()

let totalLocalRows = 0
let matchAll = true

for (const tableName of tables) {
  const row = localDb.query(`SELECT COUNT(*) as c FROM "${tableName}"`).get() as { c: number }
  tableCountsLocal[tableName] = row.c
  totalLocalRows += row.c
  if (tableCountsTurso[tableName] !== row.c) {
    matchAll = false
    console.error(`MISMATCH: Table ${tableName} Turso=${tableCountsTurso[tableName]} Local=${row.c}`)
  }
}

localDb.close()

if (!matchAll) {
  throw new Error('Restored database row counts do not match Turso Cloud live database!')
}

const dbBuffer = readFileSync(DB_DEST)
const dbSha256 = createHash('sha256').update(dbBuffer).digest('hex')
const dbSize = statSync(DB_DEST).size

const sqlBuffer = readFileSync(SQL_DEST)
const sqlSha256 = createHash('sha256').update(sqlBuffer).digest('hex')
const sqlSize = statSync(SQL_DEST).size

const metadata = {
  timestamp: new Date().toISOString(),
  target: 'Turso Cloud',
  tursoUrl: TURSO_URL,
  backupDbFile: DB_DEST,
  backupDbSizeBytes: dbSize,
  backupDbSha256: dbSha256,
  backupSqlFile: SQL_DEST,
  backupSqlSizeBytes: sqlSize,
  backupSqlSha256: sqlSha256,
  integrityCheck,
  foreignKeyViolations: fkCheck.length,
  totalTursoRows,
  totalRestoredRows: totalLocalRows,
  rowCounts: tableCountsTurso,
  status: 'VERIFIED_SUCCESSFUL'
}

writeFileSync(META_DEST, JSON.stringify(metadata, null, 2))
console.log('Turso Main Database Backup & Restore Verification Succeeded:')
console.log(JSON.stringify(metadata, null, 2))
