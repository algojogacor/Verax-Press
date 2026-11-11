/**
 * Verax Press - Production Chief Editor Identity Bootstrap Script
 *
 * Atomically updates the placeholder development Chief Editor account
 * (chief@verity.test / Ratna Dewanti) to authentic production credentials.
 *
 * Target Database Safety:
 *   Must explicitly provide VERAX_DB_TARGET ("turso" | "local").
 *   Rejects ambiguous or mismatched database configurations.
 *   Never logs passwords, hashes, tokens, or raw secrets.
 *
 * Usage for Turso Production:
 *   $env:VERAX_DB_TARGET="turso"
 *   $env:TURSO_DATABASE_URL="libsql://verax-aryarizkyap.aws-ap-southeast-1.turso.io"
 *   $env:TURSO_AUTH_TOKEN="<token>"
 *   $env:VERAX_ADMIN_EMAIL="editor@veraxpress.id"
 *   $env:VERAX_ADMIN_NAME="Official Editor Name"
 *   $env:VERAX_ADMIN_PASSWORD="YourHighEntropyPassword"
 *   $env:VERAX_ADMIN_BIO="Pemimpin Redaksi Verax Press."
 *   bun run scripts/bootstrap-chief-editor.ts
 *
 * Usage for Local Development:
 *   $env:VERAX_DB_TARGET="local"
 *   $env:DATABASE_URL="file:db/custom.db"
 *   $env:VERAX_ADMIN_EMAIL="editor@veraxpress.id"
 *   $env:VERAX_ADMIN_NAME="Official Editor Name"
 *   $env:VERAX_ADMIN_PASSWORD="YourHighEntropyPassword"
 *   $env:VERAX_ADMIN_BIO="Pemimpin Redaksi Verax Press."
 *   bun run scripts/bootstrap-chief-editor.ts
 */

import { createClient } from "@libsql/client"
import { hashPassword } from "../src/lib/password"

const dbTarget = (process.env.VERAX_DB_TARGET || "").trim().toLowerCase()
const tursoUrl = (process.env.TURSO_DATABASE_URL || "").trim()
const tursoAuthToken = (process.env.TURSO_AUTH_TOKEN || "").trim()
const localDbUrl = (process.env.DATABASE_URL || "file:db/custom.db").trim()

const prodChiefEmail = (process.env.VERAX_ADMIN_EMAIL || "").trim()
const prodChiefName = (process.env.VERAX_ADMIN_NAME || "").trim()
const prodChiefPass = process.env.VERAX_ADMIN_PASSWORD || ""
const prodChiefBio = (process.env.VERAX_ADMIN_BIO || "Pemimpin Redaksi Verax Press.").trim()

// 1. Explicit target verification & rejection of ambiguous targets
if (!dbTarget || (dbTarget !== "turso" && dbTarget !== "local")) {
  console.error("FATAL: VERAX_DB_TARGET must be explicitly set to 'turso' or 'local'.")
  console.error("  Example: $env:VERAX_DB_TARGET='turso'")
  process.exit(1)
}

// 2. Input validation
if (!prodChiefEmail || !prodChiefName || !prodChiefPass || prodChiefName.length < 2) {
  console.error("FATAL: Missing or invalid required environment variables:")
  console.error("  - VERAX_ADMIN_EMAIL (valid email or username)")
  console.error("  - VERAX_ADMIN_NAME (min 2 characters)")
  console.error("  - VERAX_ADMIN_PASSWORD (min 8 characters)")
  process.exit(1)
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const usernameRegex = /^[a-zA-Z0-9_.-]{3,50}$/
if (!emailRegex.test(prodChiefEmail) && !usernameRegex.test(prodChiefEmail)) {
  console.error("FATAL: VERAX_ADMIN_EMAIL format is invalid. Must be an email address or username identifier (3-50 alphanumeric characters).")
  process.exit(1)
}

if (prodChiefPass.length < 8) {
  console.error("FATAL: VERAX_ADMIN_PASSWORD must be at least 8 characters.")
  process.exit(1)
}

// 3. Database connection resolution & isolation checks
let targetUrl: string
let authToken: string | undefined

if (dbTarget === "turso") {
  if (!tursoUrl) {
    console.error("FATAL: TURSO_DATABASE_URL is required when VERAX_DB_TARGET='turso'.")
    process.exit(1)
  }
  if (!tursoAuthToken) {
    console.error("FATAL: TURSO_AUTH_TOKEN is required when VERAX_DB_TARGET='turso'.")
    process.exit(1)
  }
  if (!tursoUrl.startsWith("libsql://") && !tursoUrl.startsWith("https://")) {
    console.error("FATAL: TURSO_DATABASE_URL must start with 'libsql://' or 'https://' when target is 'turso'. Aborting.")
    process.exit(1)
  }
  if (
    tursoUrl.includes("file:") ||
    tursoUrl.endsWith(".db") ||
    tursoUrl.endsWith(".sqlite") ||
    tursoUrl.endsWith(".sqlite3")
  ) {
    console.error("FATAL: TURSO_DATABASE_URL points to a local file, but target is 'turso'. Aborting.")
    process.exit(1)
  }
  targetUrl = tursoUrl
  authToken = tursoAuthToken
} else {
  // Local SQLite target
  if (
    localDbUrl.startsWith("libsql://") ||
    localDbUrl.startsWith("https://") ||
    localDbUrl.startsWith("http://") ||
    localDbUrl.includes("turso.io")
  ) {
    console.error("FATAL: DATABASE_URL points to a remote server, but target is 'local'. Aborting.")
    process.exit(1)
  }
  targetUrl = localDbUrl.startsWith("file:") ? localDbUrl : `file:${localDbUrl}`
  authToken = undefined
}

// Sanitized target identification (never leaks auth tokens or query secrets)
let sanitizedTarget: string
try {
  const parsed = new URL(targetUrl)
  sanitizedTarget = `${parsed.protocol}//${parsed.host}${parsed.pathname}`
} catch {
  sanitizedTarget = targetUrl.replace(/\?.*$/, "")
}

console.log(`[BOOTSTRAP] Database Target Environment : ${dbTarget.toUpperCase()}`)
console.log(`[BOOTSTRAP] Target Database Endpoint    : ${sanitizedTarget}`)
console.log(`[BOOTSTRAP] Chief Editor Account Email  : ${prodChiefEmail}`)
console.log(`[BOOTSTRAP] Chief Editor Public Name    : ${prodChiefName}`)

const client = createClient({
  url: targetUrl,
  authToken,
})

const newPasswordHash = hashPassword(prodChiefPass)
const nowIso = new Date().toISOString()
const tx = await client.transaction("write")

try {
  // 4. Pre-check: Verify exactly one Chief Editor account exists (update, do not duplicate)
  const existingChiefRes = await tx.execute({
    sql: "SELECT id, email, role, status FROM StaffUser WHERE role = 'CHIEF_EDITOR'",
    args: [],
  })

  if (existingChiefRes.rows.length === 0) {
    throw new Error("No active CHIEF_EDITOR record found in StaffUser to update.")
  }

  if (existingChiefRes.rows.length > 1) {
    throw new Error(
      `Ambiguous database state: Found ${existingChiefRes.rows.length} CHIEF_EDITOR accounts. Aborting.`
    )
  }

  const chiefUser = existingChiefRes.rows[0]
  const chiefStaffId = String(chiefUser.id)
  const oldEmail = String(chiefUser.email)

  // Verify proposed identifier is not already taken by another staff user
  const emailConflictRes = await tx.execute({
    sql: "SELECT id, role FROM StaffUser WHERE email = ? COLLATE NOCASE AND id != ?",
    args: [prodChiefEmail, chiefStaffId],
  })

  if (emailConflictRes.rows.length > 0) {
    throw new Error(
      `Identifier '${prodChiefEmail}' is already assigned to another staff user (ID: ${emailConflictRes.rows[0].id}, role: ${emailConflictRes.rows[0].role}).`
    )
  }

  // 5. Update StaffUser record while retaining canonical privileges & setting ACTIVE status
  const updateStaffRes = await tx.execute({
    sql: `UPDATE StaffUser 
          SET email = ?, name = ?, passwordHash = ?, status = 'ACTIVE', canRiskEdit = 1, canManageComplaints = 1, updatedAt = ? 
          WHERE id = ?`,
    args: [prodChiefEmail, prodChiefName, newPasswordHash, nowIso, chiefStaffId],
  })

  if (updateStaffRes.rowsAffected !== 1) {
    throw new Error(`Expected to update exactly 1 StaffUser row, but affected ${updateStaffRes.rowsAffected} rows.`)
  }

  // 6. Ensure Person relationship remains valid and consistent
  const existingPersonRes = await tx.execute({
    sql: "SELECT id FROM Person WHERE staffUserId = ?",
    args: [chiefStaffId],
  })

  let personRowsAffected = 0
  if (existingPersonRes.rows.length > 0) {
    const updatePersonRes = await tx.execute({
      sql: `UPDATE Person 
            SET publicName = ?, bio = ?, accountType = 'STAFF' 
            WHERE staffUserId = ?`,
      args: [prodChiefName, prodChiefBio, chiefStaffId],
    })
    personRowsAffected = updatePersonRes.rowsAffected
  } else {
    // Insert linked Person if missing
    const newPersonId = `person_${Date.now()}`
    const insertPersonRes = await tx.execute({
      sql: `INSERT INTO Person (id, accountType, staffUserId, publicName, anonymityMode, bio, createdAt)
            VALUES (?, 'STAFF', ?, ?, 'REAL_NAME', ?, ?)`,
      args: [newPersonId, chiefStaffId, prodChiefName, prodChiefBio, nowIso],
    })
    personRowsAffected = insertPersonRes.rowsAffected
  }

  // 7. Record administrative audit event conforming to domain AuditInput schema
  await tx.execute({
    sql: `INSERT INTO AuditEvent (id, actorType, actorId, actorLabel, action, targetType, targetId, reason, metadataJson, createdAt)
          VALUES (?, 'SYSTEM', ?, ?, 'auth.chief_bootstrapped', 'AUTH', ?, 'Production Chief Editor identity initialized', ?, ?)`,
    args: [
      `audit_bootstrap_${Date.now()}`,
      chiefStaffId,
      prodChiefEmail,
      chiefStaffId,
      JSON.stringify({ previousEmail: oldEmail, updatedEmail: prodChiefEmail, updatedName: prodChiefName }),
      nowIso,
    ],
  })

  await tx.commit()
  console.log(`[BOOTSTRAP] SUCCESS: Chief Editor (${chiefStaffId}) updated (StaffUser: ${updateStaffRes.rowsAffected}, Person: ${personRowsAffected}).`)
  console.log(`[BOOTSTRAP] Previous identity '${oldEmail}' successfully transitioned to '${prodChiefEmail}'.`)
} catch (err) {
  await tx.rollback()
  console.error("FATAL: Bootstrap aborted and write transaction rolled back.", err)
  process.exit(1)
} finally {
  client.close()
}
