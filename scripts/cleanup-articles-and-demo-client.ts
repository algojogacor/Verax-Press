// Script putaran kedua pembersihan data uji:
// Menghapus API Client vrtc_demo_agent dan seluruh artikel contoh/dummy dari basis data development (db/custom.db).
// Memastikan status clean slate otentik: 0 artikel, 0 klien API, 1 akun staf resmi (pemredVP).

import { DatabaseSync } from "node:sqlite";
import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const targetDbPath = process.argv[2] || "db/custom.db";
const absolutePath = resolve(process.cwd(), targetDbPath);

if (!existsSync(absolutePath)) {
  console.error(`FATAL: File basis data tidak ditemukan pada ${absolutePath}`);
  process.exit(1);
}

// Perlindungan mutlak: dilarang dijalankan pada database produksi
if (
  absolutePath.toLowerCase().includes("turso") ||
  absolutePath.toLowerCase().includes("production")
) {
  console.error(`SAFETY FATAL: Skrip ini dilarang dijalankan pada Production Database: ${absolutePath}`);
  process.exit(1);
}

console.log(`=======================================================`);
console.log(`  PEMBERSIHAN PUTARAN 2: ARTIKEL DUMMY & DEMO AGENT   `);
console.log(`  Target: ${absolutePath}                              `);
console.log(`=======================================================`);

// 1. Buat cadangan
const backupPath = `${absolutePath}.pre-round2-cleanup-${Date.now()}.bak`;
copyFileSync(absolutePath, backupPath);
console.log(`[BACKUP] Cadangan putaran 2 dibuat: ${backupPath}`);

const db = new DatabaseSync(absolutePath);

try {
  db.exec("PRAGMA foreign_keys = OFF;");

  // 2. Verifikasi pemredVP tetap ada dan aktif
  const pemred = db.prepare("SELECT * FROM StaffUser WHERE username = 'pemredVP'").get() as any;
  if (!pemred || pemred.role !== "CHIEF_EDITOR") {
    throw new Error("SAFETY FATAL: Akun pemredVP tidak ditemukan atau bukan CHIEF_EDITOR. Pembersihan dibatalkan.");
  }
  console.log(`[VERIFIKASI] Akun resmi pemredVP aman: ${pemred.username} (${pemred.name})`);

  // 3. Hapus seluruh API Client (termasuk vrtc_demo_agent dan kredensial/log-nya)
  const apiClients = db.prepare("SELECT id, clientId, name FROM ApiClient").all() as any[];
  console.log(`\n[PEMBERSIHAN API CLIENT] Ditemukan ${apiClients.length} Klien API:`);
  for (const c of apiClients) {
    console.log(`  - [${c.clientId}] ${c.name}`);
  }

  if (apiClients.length > 0) {
    const clientIds = apiClients.map((c) => c.id);
    const placeholders = clientIds.map(() => "?").join(",");
    const delCred = db.prepare(`DELETE FROM ApiClientCredential WHERE apiClientId IN (${placeholders})`).run(...clientIds);
    const delLogs = db.prepare(`DELETE FROM ApiRequestLog WHERE apiClientId IN (${placeholders})`).run(...clientIds);
    const delClients = db.prepare(`DELETE FROM ApiClient WHERE id IN (${placeholders})`).run(...clientIds);
    console.log(`  + Dihapus: ${delCred.changes} kredensial, ${delLogs.changes} log permintaan, ${delClients.changes} klien API.`);
  }

  // 4. Hapus seluruh artikel contoh/dummy beserta relasi turunannya
  const articles = db.prepare("SELECT id, slug, title, status FROM Article").all() as any[];
  console.log(`\n[PEMBERSIHAN ARTIKEL] Ditemukan ${articles.length} artikel:`);
  for (const a of articles) {
    console.log(`  - [${a.status}] ${a.title} (${a.slug})`);
  }

  if (articles.length > 0) {
    const articleIds = articles.map((a) => a.id);
    const placeholders = articleIds.map(() => "?").join(",");

    const delVersions = db.prepare(`DELETE FROM ArticleVersion WHERE articleId IN (${placeholders})`).run(...articleIds);
    const delSources = db.prepare(`DELETE FROM SourceReference WHERE articleId IN (${placeholders})`).run(...articleIds);
    const delReviews = db.prepare(`DELETE FROM EditorialReview WHERE articleId IN (${placeholders})`).run(...articleIds);
    const delComments = db.prepare(`DELETE FROM ReviewComment WHERE articleId IN (${placeholders})`).run(...articleIds);
    const delContrib = db.prepare(`DELETE FROM ArticleContribution WHERE articleId IN (${placeholders})`).run(...articleIds);
    const delCorrections = db.prepare(`DELETE FROM CorrectionRecord WHERE articleId IN (${placeholders})`).run(...articleIds);
    const delSubmissions = db.prepare(`DELETE FROM Submission WHERE articleId IN (${placeholders})`).run(...articleIds);
    
    // Putuskan relasi keluhan ke artikel bila ada
    db.prepare(`UPDATE Complaint SET articleId = NULL WHERE articleId IN (${placeholders})`).run(...articleIds);

    const delArticles = db.prepare(`DELETE FROM Article WHERE id IN (${placeholders})`).run(...articleIds);
    console.log(`  + Dihapus: ${delArticles.changes} artikel beserta relasi turunannya.`);
  }

  // 5. Catat log audit pembersihan putaran 2
  const nowIso = new Date().toISOString();
  db.prepare(`
    INSERT INTO AuditEvent (id, actorType, actorId, actorLabel, action, targetType, targetId, reason, createdAt)
    VALUES (?, 'STAFF', ?, 'pemredVP', 'editorial.clean_slate_executed', 'ARTICLE', 'ALL', 'Round 2 cleanup: removed all dummy articles and demo API client', ?)
  `).run(`audit_cleanup_round2_${Date.now()}`, pemred.id, nowIso);

  db.exec("PRAGMA foreign_keys = ON;");

  // 6. Verifikasi integritas
  const integrity = db.prepare("PRAGMA integrity_check;").all();
  const fkeys = db.prepare("PRAGMA foreign_key_check;").all();
  console.log(`\n[VERIFIKASI INTEGRITAS]`);
  console.log(`  - Integrity Check :`, integrity);
  console.log(`  - Foreign Key Check:`, fkeys);

  // 7. Hitung rekaman akhir
  const finalStaff = db.prepare("SELECT count(*) as count FROM StaffUser").get() as any;
  const finalArticles = db.prepare("SELECT count(*) as count FROM Article").get() as any;
  const finalClients = db.prepare("SELECT count(*) as count FROM ApiClient").get() as any;

  console.log(`\n[STATUS AKHIR BASIS DATA DEVELOPMENT]`);
  console.log(`  - StaffUser : ${finalStaff.count} (khusus pemredVP)`);
  console.log(`  - Article   : ${finalArticles.count}`);
  console.log(`  - ApiClient : ${finalClients.count}`);

  if (finalArticles.count !== 0 || finalClients.count !== 0 || finalStaff.count !== 1) {
    throw new Error("Kondisi akhir basis data tidak sesuai spesifikasi clean slate!");
  }

  console.log(`\nPembersihan putaran kedua selesai dengan sukses 100%.`);
} catch (err) {
  console.error("FATAL: Pembersihan gagal! Memulihkan cadangan...", err);
  copyFileSync(backupPath, absolutePath);
  throw err;
}
