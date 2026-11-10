#!/usr/bin/env bun
// Verax Press SQLite backup — uses Prisma VACUUM INTO (safe online backup, no sqlite3 CLI needed).
// Usage: bun scripts/backup-db.ts
import { PrismaClient } from '@prisma/client'
import { mkdirSync, existsSync, statSync } from 'node:fs'
import path from 'node:path'

const BACKUP_DIR = 'db/backups'
const SOURCE_DB = 'db/custom.db'
const TS = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const DEST = path.join(BACKUP_DIR, `custom-${TS}.db`)

if (!existsSync(SOURCE_DB)) {
  console.error(`ERROR: Database not found at ${SOURCE_DB}`)
  process.exit(1)
}

mkdirSync(BACKUP_DIR, { recursive: true })

const db = new PrismaClient()
try {
  // VACUUM INTO creates a consistent snapshot — safe during active writes.
  await db.$executeRawUnsafe(`VACUUM INTO '${DEST}'`)
  console.log(`Backup created: ${DEST}`)
  const size = statSync(DEST).size
  console.log(`Size: ${(size / 1024).toFixed(1)} KB`)
} catch (e) {
  console.error('Backup failed:', e instanceof Error ? e.message : e)
  process.exit(1)
} finally {
  await db.$disconnect()
}

// Verify integrity of the backup.
const verifyDb = new PrismaClient({
  datasources: { db: { url: `file:${path.resolve(DEST)}` } },
})
try {
  const result = (await verifyDb.$queryRawUnsafe('PRAGMA integrity_check;')) as Array<{
    integrity_check: string
  }>
  console.log('Integrity:', result[0]?.integrity_check ?? 'unknown')
} catch (e) {
  console.error('Integrity check failed:', e instanceof Error ? e.message : e)
  process.exit(1)
} finally {
  await verifyDb.$disconnect()
}
