import fs from "node:fs";
import path from "node:path";
import { Database } from "bun:sqlite";

function runMigration(targetDbPath: string) {
  const resolved = path.resolve(targetDbPath);
  console.log(`\n=== Migrasi Fase 2 untuk: ${resolved} ===`);

  if (!fs.existsSync(resolved)) {
    console.log(`Database ${resolved} belum ada. Lewati.`);
    return;
  }

  // Backup target
  const backupDir = path.resolve("db/backups");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(
    backupDir,
    `${path.basename(resolved, ".db")}_pre_phase2_${Date.now()}.db`
  );
  fs.copyFileSync(resolved, backupPath);
  console.log(`Backup dibuat di: ${backupPath}`);

  const db = new Database(resolved);

  try {
    db.run("PRAGMA foreign_keys = OFF;");

    // 1. Article: contributorId
    try {
      db.run("ALTER TABLE Article ADD COLUMN contributorId TEXT;");
      console.log("Ditambahkan kolom Article.contributorId");
    } catch {
      console.log("Kolom Article.contributorId sudah ada");
    }
    db.run("CREATE INDEX IF NOT EXISTS Article_contributorId_idx ON Article(contributorId);");

    // 2. Contributor: lastLoginAt
    try {
      db.run("ALTER TABLE Contributor ADD COLUMN lastLoginAt DATETIME;");
      console.log("Ditambahkan kolom Contributor.lastLoginAt");
    } catch {
      console.log("Kolom Contributor.lastLoginAt sudah ada");
    }

    // 3. ContributorApplication table migration
    db.run(`
      CREATE TABLE IF NOT EXISTS new_ContributorApplication (
        id TEXT NOT NULL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        bio TEXT,
        interests TEXT,
        portfolioUrl TEXT,
        sampleArticle TEXT,
        adultConfirmedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        guidelinesAccepted BOOLEAN NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'PENDING',
        decidedById TEXT,
        decidedAt DATETIME,
        decisionNote TEXT,
        contributorId TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT ContributorApplication_decidedById_fkey FOREIGN KEY (decidedById) REFERENCES StaffUser (id) ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT ContributorApplication_contributorId_fkey FOREIGN KEY (contributorId) REFERENCES Contributor (id) ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // Copy existing data if ContributorApplication existed
    try {
      db.run(`
        INSERT OR IGNORE INTO new_ContributorApplication (
          id, name, email, bio, portfolioUrl, status, decidedById, decidedAt, decisionNote, createdAt, updatedAt
        )
        SELECT id, name, email, bio, portfolioUrl, status, decidedById, decidedAt, decisionNote, createdAt, updatedAt
        FROM ContributorApplication;
      `);
      db.run("DROP TABLE ContributorApplication;");
    } catch {}

    db.run("ALTER TABLE new_ContributorApplication RENAME TO ContributorApplication;");
    db.run("CREATE INDEX IF NOT EXISTS ContributorApplication_email_idx ON ContributorApplication(email);");
    db.run("CREATE INDEX IF NOT EXISTS ContributorApplication_status_idx ON ContributorApplication(status);");
    db.run("CREATE UNIQUE INDEX IF NOT EXISTS ContributorApplication_contributorId_key ON ContributorApplication(contributorId);");
    console.log("Tabel ContributorApplication berhasil direkonstruksi.");

    // 4. ContributorInvitation table
    db.run(`
      CREATE TABLE IF NOT EXISTS ContributorInvitation (
        id TEXT NOT NULL PRIMARY KEY,
        tokenHash TEXT NOT NULL,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        expiresAt DATETIME NOT NULL,
        acceptedAt DATETIME,
        revokedAt DATETIME,
        applicationId TEXT NOT NULL,
        invitedById TEXT NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT ContributorInvitation_applicationId_fkey FOREIGN KEY (applicationId) REFERENCES ContributorApplication (id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT ContributorInvitation_invitedById_fkey FOREIGN KEY (invitedById) REFERENCES StaffUser (id) ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);
    db.run("CREATE UNIQUE INDEX IF NOT EXISTS ContributorInvitation_tokenHash_key ON ContributorInvitation(tokenHash);");
    db.run("CREATE UNIQUE INDEX IF NOT EXISTS ContributorInvitation_applicationId_key ON ContributorInvitation(applicationId);");
    db.run("CREATE INDEX IF NOT EXISTS ContributorInvitation_tokenHash_idx ON ContributorInvitation(tokenHash);");
    db.run("CREATE INDEX IF NOT EXISTS ContributorInvitation_email_idx ON ContributorInvitation(email);");
    db.run("CREATE INDEX IF NOT EXISTS ContributorInvitation_expiresAt_idx ON ContributorInvitation(expiresAt);");
    console.log("Tabel ContributorInvitation berhasil dibuat.");

    // Integrity checks
    const integrity = db.query("PRAGMA integrity_check;").get() as any;
    console.log("PRAGMA integrity_check:", integrity);
    const fkCheck = db.query("PRAGMA foreign_key_check;").all();
    console.log("PRAGMA foreign_key_check:", fkCheck.length === 0 ? "0 violations (clean)" : fkCheck);

    db.run("PRAGMA foreign_keys = ON;");
    console.log(`Migrasi sukses untuk ${resolved}!`);
  } finally {
    db.close();
  }
}

runMigration("db/custom.db");
runMigration("db/isolated-test.db");
