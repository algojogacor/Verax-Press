/**
 * Verax Press — Phase 1 Database Migration Script
 * Safely migrates StaffUser roles, adds username, handles invitations,
 * and sets up ContributorApplication foundation.
 *
 * Targets:
 *   - Local development SQLite (`db/custom.db`)
 *   - Isolated test database (`db/isolated-test.db`)
 *
 * NOTE: Production Turso Cloud is NEVER targeted by default.
 */

import { createClient } from "@libsql/client"
import { copyFileSync, existsSync, readFileSync } from "node:fs"
import path from "node:path"

export async function runRoleAndStaffMigration(targetDbPath: string): Promise<void> {
  const absolutePath = path.resolve(targetDbPath)
  if (!existsSync(absolutePath)) {
    throw new Error(`Target database file not found: ${absolutePath}`)
  }

  // Double check that we never touch a Turso remote URL in this script
  if (targetDbPath.includes("turso") || targetDbPath.includes("libsql://")) {
    throw new Error(`SAFETY HALT: This script is only for local SQLite files. Target: ${targetDbPath}`)
  }

  console.log(`Starting migration on: ${absolutePath}`)

  // Create pre-migration snapshot
  const backupPath = `${absolutePath}.pre-role-migration-${Date.now()}.bak`
  copyFileSync(absolutePath, backupPath)
  console.log(`Pre-migration backup created: ${backupPath}`)

  const client = createClient({ url: `file:${absolutePath.replace(/\\/g, "/")}` })

  // 1. Preflight checks
  const existingStaff = await client.execute("SELECT id, email, name, role, status FROM StaffUser")
  console.log(`Found ${existingStaff.rows.length} existing StaffUser records.`)

  const volunteers = existingStaff.rows.filter(r => r.role === "VOLUNTEER")
  if (volunteers.length > 0) {
    throw new Error(
      `SAFETY HALT: Ditemukan ${volunteers.length} akun StaffUser dengan role VOLUNTEER. ` +
      `Migrasi dibatalkan secara otomatis untuk mencegah konversi tidak sah menjadi WRITER. ` +
      `Tindakan manual diperlukan untuk memisahkan akun volunteer ke tabel Contributor sebelum melanjutkan.`
    )
  }

  // 2. Execute migration inside transaction
  await client.execute("PRAGMA foreign_keys = OFF")

  try {
    // A. Recreate StaffUser table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "new_StaffUser" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "username" TEXT NOT NULL,
        "email" TEXT,
        "name" TEXT NOT NULL,
        "role" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "passwordHash" TEXT NOT NULL,
        "lastLoginAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Migrate existing data into new_StaffUser
    // For username: if email has '@', use prefix before '@'; otherwise use entire identifier (e.g. 'pemredVP')
    // For email: if email has '@', keep as email; otherwise NULL
    // For role: CHIEF_EDITOR -> CHIEF_EDITOR; EDITOR & INTERNAL_AUTHOR -> WRITER
    await client.execute(`
      INSERT INTO "new_StaffUser" (
        "id", "username", "email", "name", "role", "status", "passwordHash", "lastLoginAt", "createdAt", "updatedAt"
      )
      SELECT
        "id",
        CASE
          WHEN instr("email", '@') > 0 THEN substr("email", 1, instr("email", '@') - 1)
          ELSE "email"
        END AS "username",
        CASE
          WHEN instr("email", '@') > 0 THEN "email"
          ELSE NULL
        END AS "email",
        "name",
        CASE
          WHEN "role" = 'CHIEF_EDITOR' THEN 'CHIEF_EDITOR'
          ELSE 'WRITER'
        END AS "role",
        "status",
        "passwordHash",
        "lastLoginAt",
        "createdAt",
        "updatedAt"
      FROM "StaffUser"
    `)

    await client.execute('DROP TABLE "StaffUser"')
    await client.execute('ALTER TABLE "new_StaffUser" RENAME TO "StaffUser"')

    await client.execute('CREATE UNIQUE INDEX "StaffUser_username_key" ON "StaffUser"("username")')
    await client.execute('CREATE UNIQUE INDEX "StaffUser_email_key" ON "StaffUser"("email")')
    await client.execute('CREATE UNIQUE INDEX "StaffUser_username_nocase_idx" ON "StaffUser"("username" COLLATE NOCASE)')

    // B. Recreate Contributor table with username support
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "new_Contributor" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "username" TEXT,
        "email" TEXT NOT NULL,
        "passwordHash" TEXT NOT NULL,
        "adultConfirmedAt" DATETIME,
        "status" TEXT NOT NULL DEFAULT 'INVITED',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.execute(`
      INSERT INTO "new_Contributor" ("id", "username", "email", "passwordHash", "adultConfirmedAt", "status", "createdAt", "updatedAt")
      SELECT "id", NULL, "email", "passwordHash", "adultConfirmedAt", "status", "createdAt", "updatedAt" FROM "Contributor"
    `)

    await client.execute('DROP TABLE "Contributor"')
    await client.execute('ALTER TABLE "new_Contributor" RENAME TO "Contributor"')
    await client.execute('CREATE UNIQUE INDEX "Contributor_username_key" ON "Contributor"("username")')
    await client.execute('CREATE UNIQUE INDEX "Contributor_email_key" ON "Contributor"("email")')

    // C. Create StaffInvitation table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "StaffInvitation" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "username" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "email" TEXT,
        "role" TEXT NOT NULL DEFAULT 'WRITER',
        "tokenHash" TEXT NOT NULL,
        "expiresAt" DATETIME NOT NULL,
        "acceptedAt" DATETIME,
        "revokedAt" DATETIME,
        "invitedById" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "StaffInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "StaffUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `)
    await client.execute('CREATE UNIQUE INDEX IF NOT EXISTS "StaffInvitation_username_key" ON "StaffInvitation"("username")')
    await client.execute('CREATE UNIQUE INDEX IF NOT EXISTS "StaffInvitation_tokenHash_key" ON "StaffInvitation"("tokenHash")')
    await client.execute('CREATE INDEX IF NOT EXISTS "StaffInvitation_tokenHash_idx" ON "StaffInvitation"("tokenHash")')
    await client.execute('CREATE INDEX IF NOT EXISTS "StaffInvitation_username_idx" ON "StaffInvitation"("username")')
    await client.execute('CREATE INDEX IF NOT EXISTS "StaffInvitation_expiresAt_idx" ON "StaffInvitation"("expiresAt")')

    // D. Create ContributorApplication foundation table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "ContributorApplication" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "bio" TEXT,
        "portfolioUrl" TEXT,
        "motivation" TEXT,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "decidedById" TEXT,
        "decidedAt" DATETIME,
        "decisionNote" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ContributorApplication_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "StaffUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `)
    await client.execute('CREATE INDEX IF NOT EXISTS "ContributorApplication_email_idx" ON "ContributorApplication"("email")')
    await client.execute('CREATE INDEX IF NOT EXISTS "ContributorApplication_status_idx" ON "ContributorApplication"("status")')

    // Re-enable foreign keys
    await client.execute("PRAGMA foreign_keys = ON")

    // Integrity check
    const integrity = await client.execute("PRAGMA integrity_check")
    console.log("PRAGMA integrity_check:", integrity.rows[0])

    const fkCheck = await client.execute("PRAGMA foreign_key_check")
    if (fkCheck.rows.length > 0) {
      throw new Error(`Foreign key check failed! Violations: ${JSON.stringify(fkCheck.rows)}`)
    }
    console.log("Foreign key check passed: 0 violations.")

    // Post-migration summary
    const migratedUsers = await client.execute("SELECT id, username, email, name, role, status FROM StaffUser")
    console.log("Migrated StaffUser rows:")
    console.table(migratedUsers.rows)

    console.log("Migration completed successfully.")
  } catch (err) {
    console.error("Migration failed! Restoring backup...", err)
    copyFileSync(backupPath, absolutePath)
    throw err
  }
}

// Allow direct CLI execution
if (import.meta.main) {
  const target = process.argv[2] || "db/custom.db"
  runRoleAndStaffMigration(target)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
