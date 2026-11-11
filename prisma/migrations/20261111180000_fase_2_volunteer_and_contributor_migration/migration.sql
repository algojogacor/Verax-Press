-- Migration Fase 2: Sistem Volunteer (Pengajuan, Aktivasi, dan Portal Kontributor)
-- Menambahkan ContributorInvitation, memperbarui ContributorApplication, Contributor, dan Article

PRAGMA foreign_keys = OFF;

-- 1. Perbarui tabel Article (tambahkan relasi contributorId)
ALTER TABLE "Article" ADD COLUMN "contributorId" TEXT REFERENCES "Contributor" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "Article_contributorId_idx" ON "Article"("contributorId");

-- 2. Perbarui tabel Contributor (tambahkan lastLoginAt bila belum ada)
ALTER TABLE "Contributor" ADD COLUMN "lastLoginAt" DATETIME;

-- 3. Rekonstruksi tabel ContributorApplication untuk kelayakan legal (18+, pedoman, minat, sampel, relasi kontributor)
CREATE TABLE "new_ContributorApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "bio" TEXT,
    "interests" TEXT,
    "portfolioUrl" TEXT,
    "sampleArticle" TEXT,
    "adultConfirmedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guidelinesAccepted" BOOLEAN NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decidedAt" DATETIME,
    "decisionNote" TEXT,
    "contributorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContributorApplication_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "StaffUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ContributorApplication_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "Contributor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_ContributorApplication" (
    "id", "name", "email", "bio", "portfolioUrl", "status",
    "decidedById", "decidedAt", "decisionNote", "createdAt", "updatedAt"
)
SELECT 
    "id", "name", "email", "bio", "portfolioUrl", "status",
    "decidedById", "decidedAt", "decisionNote", "createdAt", "updatedAt"
FROM "ContributorApplication";

DROP TABLE "ContributorApplication";
ALTER TABLE "new_ContributorApplication" RENAME TO "ContributorApplication";

CREATE INDEX "ContributorApplication_email_idx" ON "ContributorApplication"("email");
CREATE INDEX "ContributorApplication_status_idx" ON "ContributorApplication"("status");
CREATE UNIQUE INDEX "ContributorApplication_contributorId_key" ON "ContributorApplication"("contributorId");

-- 4. Buat tabel ContributorInvitation untuk token aktivasi sekali pakai ter-hash SHA-256
CREATE TABLE "ContributorInvitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "acceptedAt" DATETIME,
    "revokedAt" DATETIME,
    "applicationId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContributorInvitation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ContributorApplication" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContributorInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "StaffUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ContributorInvitation_tokenHash_key" ON "ContributorInvitation"("tokenHash");
CREATE UNIQUE INDEX "ContributorInvitation_applicationId_key" ON "ContributorInvitation"("applicationId");
CREATE INDEX "ContributorInvitation_tokenHash_idx" ON "ContributorInvitation"("tokenHash");
CREATE INDEX "ContributorInvitation_email_idx" ON "ContributorInvitation"("email");
CREATE INDEX "ContributorInvitation_expiresAt_idx" ON "ContributorInvitation"("expiresAt");

-- 5. Rekonstruksi tabel EditorialReview (reviewerId dijadikan NULLABLE untuk transisi oleh kontributor eksternal)
CREATE TABLE "new_EditorialReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "articleId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EditorialReview_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EditorialReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "StaffUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_EditorialReview" ("id", "articleId", "reviewerId", "fromStatus", "toStatus", "decision", "notes", "createdAt")
SELECT "id", "articleId", "reviewerId", "fromStatus", "toStatus", "decision", "notes", "createdAt" FROM "EditorialReview";

DROP TABLE "EditorialReview";
ALTER TABLE "new_EditorialReview" RENAME TO "EditorialReview";
CREATE INDEX "EditorialReview_articleId_createdAt_idx" ON "EditorialReview"("articleId", "createdAt");

PRAGMA foreign_key_check;
PRAGMA foreign_keys = ON;
