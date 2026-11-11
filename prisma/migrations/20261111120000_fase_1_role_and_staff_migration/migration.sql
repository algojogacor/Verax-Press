-- Verax Press: Fase 1 Role, Struktur Akun, dan Permission Matrix Migration
-- Merampingkan StaffUser ke peran kanonis: CHIEF_EDITOR dan WRITER
-- Menambahkan username, membuat email opsional, dan memisahkan Contributor
-- Menambahkan tabel StaffInvitation dan ContributorApplication

PRAGMA foreign_keys = OFF;

-- 1. Recreate StaffUser
CREATE TABLE "new_StaffUser" (
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
);

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
FROM "StaffUser";

DROP TABLE "StaffUser";
ALTER TABLE "new_StaffUser" RENAME TO "StaffUser";

CREATE UNIQUE INDEX "StaffUser_username_key" ON "StaffUser"("username");
CREATE UNIQUE INDEX "StaffUser_email_key" ON "StaffUser"("email");
CREATE UNIQUE INDEX "StaffUser_username_nocase_idx" ON "StaffUser"("username" COLLATE NOCASE);

-- 2. Recreate Contributor (Add username support)
CREATE TABLE "new_Contributor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "adultConfirmedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "new_Contributor" ("id", "username", "email", "passwordHash", "adultConfirmedAt", "status", "createdAt", "updatedAt")
SELECT "id", NULL, "email", "passwordHash", "adultConfirmedAt", "status", "createdAt", "updatedAt" FROM "Contributor";

DROP TABLE "Contributor";
ALTER TABLE "new_Contributor" RENAME TO "Contributor";

CREATE UNIQUE INDEX "Contributor_username_key" ON "Contributor"("username");
CREATE UNIQUE INDEX "Contributor_email_key" ON "Contributor"("email");

-- 3. Create StaffInvitation
CREATE TABLE "StaffInvitation" (
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
);

CREATE UNIQUE INDEX "StaffInvitation_username_key" ON "StaffInvitation"("username");
CREATE UNIQUE INDEX "StaffInvitation_tokenHash_key" ON "StaffInvitation"("tokenHash");
CREATE INDEX "StaffInvitation_tokenHash_idx" ON "StaffInvitation"("tokenHash");
CREATE INDEX "StaffInvitation_username_idx" ON "StaffInvitation"("username");
CREATE INDEX "StaffInvitation_expiresAt_idx" ON "StaffInvitation"("expiresAt");

-- 4. Create ContributorApplication
CREATE TABLE "ContributorApplication" (
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
);

CREATE INDEX "ContributorApplication_email_idx" ON "ContributorApplication"("email");
CREATE INDEX "ContributorApplication_status_idx" ON "ContributorApplication"("status");

PRAGMA foreign_keys = ON;
