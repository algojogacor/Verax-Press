// Script untuk pembersihan akun test dan data uji sesuai instruksi Bagian III Audit Pasca-Implementasi.
// Memastikan pemredVP adalah satu-satunya akun staf Chief Editor yang aktif,
// memindahkan relasi editorial penting ke pemredVP, lalu menghapus ke-4 akun seed test:
// 1. chief@verity.test (username: chief)
// 2. editor@verity.test (username: editor)
// 3. penulis@verity.test (username: penulis)
// 4. author@verity.test (username: author)

import { DatabaseSync } from "node:sqlite";
import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { hashPassword } from "../src/lib/password";

const targetDbPath = process.argv[2] || "db/custom.db";
const absolutePath = resolve(process.cwd(), targetDbPath);

if (!existsSync(absolutePath)) {
  console.error(`FATAL: File basis data tidak ditemukan pada ${absolutePath}`);
  process.exit(1);
}

// Perlindungan mutlak: script ini HANYA untuk database development lokal
if (
  absolutePath.toLowerCase().includes("turso") ||
  absolutePath.toLowerCase().includes("production")
) {
  console.error(`SAFETY FATAL: Skrip ini dilarang dijalankan pada Production Database: ${absolutePath}`);
  process.exit(1);
}

console.log(`=======================================================`);
console.log(`  PEMBERSIHAN AKUN TEST & DATA UJI VERAX PRESS         `);
console.log(`  Target: ${absolutePath}                              `);
console.log(`=======================================================`);

// 1. Buat cadangan database
const backupPath = `${absolutePath}.pre-cleanup-${Date.now()}.bak`;
copyFileSync(absolutePath, backupPath);
console.log(`[BACKUP] Cadangan sebelum pembersihan berhasil dibuat: ${backupPath}`);

const db = new DatabaseSync(absolutePath);

try {
  db.exec("PRAGMA foreign_keys = OFF;");

  // 2. Verifikasi dan pastikan keberadaan akun resmi pemredVP
  let pemred = db.prepare("SELECT * FROM StaffUser WHERE username = 'pemredVP'").get() as any;
  const nowIso = new Date().toISOString();
  const pemredPasswordHash = hashPassword("Arya260408");

  if (!pemred) {
    const pemredId = "pemredVP_official";
    db.prepare(`
      INSERT INTO StaffUser (id, username, email, name, role, status, passwordHash, createdAt, updatedAt)
      VALUES (?, 'pemredVP', 'pemred@veraxpress.org', 'Arya Rizky Ardhi Pratama', 'CHIEF_EDITOR', 'ACTIVE', ?, ?, ?)
    `).run(pemredId, pemredPasswordHash, nowIso, nowIso);

    // Pastikan relasi Person
    db.prepare(`
      INSERT OR REPLACE INTO Person (id, accountType, staffUserId, publicName, anonymityMode, bio, createdAt)
      VALUES (?, 'STAFF', ?, 'Arya Rizky Ardhi Pratama', 'REAL_NAME', 'Pemimpin Redaksi Verax Press.', ?)
    `).run(`person_pemredVP`, pemredId, nowIso);

    pemred = db.prepare("SELECT * FROM StaffUser WHERE username = 'pemredVP'").get() as any;
    console.log(`[INITIALIZE] Akun resmi pemredVP berhasil diinisialisasi (ID: ${pemred.id})`);
  } else {
    // Pastikan status tetap ACTIVE dan role CHIEF_EDITOR
    db.prepare(`
      UPDATE StaffUser 
      SET status = 'ACTIVE', role = 'CHIEF_EDITOR', updatedAt = ?
      WHERE id = ?
    `).run(nowIso, pemred.id);
    console.log(`[VERIFY] Akun pemredVP terverifikasi aktif dengan role CHIEF_EDITOR (ID: ${pemred.id})`);
  }

  const pemredPerson = db.prepare("SELECT id FROM Person WHERE staffUserId = ?").get(pemred.id) as any;
  const pemredPersonId = pemredPerson ? pemredPerson.id : null;

  // 3. Identifikasi akun-akun test yang harus dibersihkan
  const testStaffUsernames = ["chief", "editor", "penulis", "author"];
  const testStaff = db.prepare(`
    SELECT id, username, email, name, role FROM StaffUser 
    WHERE username IN ('chief', 'editor', 'penulis', 'author')
       OR email IN ('chief@verity.test', 'editor@verity.test', 'penulis@verity.test', 'author@verity.test')
  `).all() as any[];

  console.log(`\n[IDENTIFIKASI] Ditemukan ${testStaff.length} akun StaffUser test untuk dibersihkan:`);
  for (const staff of testStaff) {
    console.log(`  - [${staff.role}] ${staff.username} (${staff.name}) <${staff.email}> [ID: ${staff.id}]`);
  }

  if (testStaff.length > 0) {
    const testStaffIds = testStaff.map((s) => s.id);
    const placeholders = testStaffIds.map(() => "?").join(",");

    // 4. Alihkan relasi editorial penting ke pemredVP agar artikel contoh dan log tetap utuh
    console.log(`\n[RELASI] Mengalihkan atribusi editorial artikel contoh ke pemredVP...`);

    const updateArticles = db.prepare(`
      UPDATE Article SET createdById = ? WHERE createdById IN (${placeholders})
    `).run(pemred.id, ...testStaffIds);
    console.log(`  + Diperbarui createdById pada ${updateArticles.changes} artikel.`);

    db.prepare(`
      UPDATE Article SET disclosureDecidedById = ? WHERE disclosureDecidedById IN (${placeholders})
    `).run(pemred.id, ...testStaffIds);

    db.prepare(`
      UPDATE EditorialReview SET reviewerId = ? WHERE reviewerId IN (${placeholders})
    `).run(pemred.id, ...testStaffIds);

    db.prepare(`
      UPDATE ReviewComment SET authorId = ? WHERE authorId IN (${placeholders})
    `).run(pemred.id, ...testStaffIds);

    db.prepare(`
      UPDATE SourceReference SET verifiedById = ? WHERE verifiedById IN (${placeholders})
    `).run(pemred.id, ...testStaffIds);

    db.prepare(`
      UPDATE CorrectionRecord SET approvedById = ? WHERE approvedById IN (${placeholders})
    `).run(pemred.id, ...testStaffIds);

    db.prepare(`
      UPDATE MediaAsset SET uploadedById = ? WHERE uploadedById IN (${placeholders})
    `).run(pemred.id, ...testStaffIds);

    db.prepare(`
      UPDATE StaffInvitation SET invitedById = ? WHERE invitedById IN (${placeholders})
    `).run(pemred.id, ...testStaffIds);

    db.prepare(`
      UPDATE ContributorApplication SET decidedById = ? WHERE decidedById IN (${placeholders})
    `).run(pemred.id, ...testStaffIds);

    db.prepare(`
      UPDATE ContributorInvitation SET invitedById = ? WHERE invitedById IN (${placeholders})
    `).run(pemred.id, ...testStaffIds);

    // Perbarui kontribusi byline jika ada
    if (pemredPersonId) {
      const testPersons = db.prepare(`SELECT id FROM Person WHERE staffUserId IN (${placeholders})`).all(...testStaffIds) as any[];
      if (testPersons.length > 0) {
        const testPersonIds = testPersons.map((p) => p.id);
        const personPlaceholders = testPersonIds.map(() => "?").join(",");
        db.prepare(`
          UPDATE ArticleContribution SET personId = ? WHERE personId IN (${personPlaceholders})
        `).run(pemredPersonId, ...testPersonIds);
      }
    }

    // 5. Hapus relasi Person milik akun test
    db.prepare(`DELETE FROM Person WHERE staffUserId IN (${placeholders})`).run(...testStaffIds);

    // 6. Hapus akun StaffUser test
    const deleteStaff = db.prepare(`DELETE FROM StaffUser WHERE id IN (${placeholders})`).run(...testStaffIds);
    console.log(`[PEMBERSIHAN] Berhasil menghapus ${deleteStaff.changes} akun StaffUser test.`);
  }

  // 7. Bersihkan klien API per-run pengujian (bukan klien demo resmi)
  const testApiClients = db.prepare(`
    SELECT id, clientId, name FROM ApiClient 
    WHERE name = 'Test Agent (per-run)' OR clientId LIKE 'verity-agent-test-%'
  `).all() as any[];

  if (testApiClients.length > 0) {
    const clientIds = testApiClients.map((c) => c.id);
    const clientPlaceholders = clientIds.map(() => "?").join(",");
    db.prepare(`DELETE FROM ApiClientCredential WHERE apiClientId IN (${clientPlaceholders})`).run(...clientIds);
    db.prepare(`DELETE FROM ApiRequestLog WHERE apiClientId IN (${clientPlaceholders})`).run(...clientIds);
    db.prepare(`DELETE FROM ApiClient WHERE id IN (${clientPlaceholders})`).run(...clientIds);
    console.log(`[PEMBERSIHAN] Berhasil membersihkan ${testApiClients.length} Klien API test per-run.`);
  }

  // 8. Catat log audit pembersihan
  db.prepare(`
    INSERT INTO AuditEvent (id, actorType, actorId, actorLabel, action, targetType, targetId, reason, createdAt)
    VALUES (?, 'STAFF', ?, 'pemredVP', 'staff.test_accounts_cleaned', 'STAFF', 'SYSTEM', 'Audit remediation test accounts cleanup', ?)
  `).run(`audit_cleanup_${Date.now()}`, pemred.id, nowIso);

  db.exec("PRAGMA foreign_keys = ON;");

  // 9. Verifikasi integritas basis data pasca-pembersihan
  const integrity = db.prepare("PRAGMA integrity_check;").all();
  const fkeys = db.prepare("PRAGMA foreign_key_check;").all();
  console.log(`\n[VERIFIKASI INTEGRITAS]`);
  console.log(`  - Integrity Check :`, integrity);
  console.log(`  - Foreign Key Check:`, fkeys);

  // 10. Daftar staf akhir
  const remainingStaff = db.prepare("SELECT id, username, email, name, role, status FROM StaffUser").all();
  console.log(`\n[HASIL AKHIR] Anggota Staf Redaksi Aktif di Basis Data:`);
  console.table(remainingStaff);

  console.log(`\nProses pembersihan selesai dengan sukses 100%.`);
} catch (err) {
  console.error("FATAL: Pembersihan gagal! Memulihkan cadangan...", err);
  copyFileSync(backupPath, absolutePath);
  throw err;
}
