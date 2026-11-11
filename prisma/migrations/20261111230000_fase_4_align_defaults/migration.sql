-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_ApiClient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerName" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'DEVELOPMENT',
    "secretHash" TEXT,
    "scopes" TEXT NOT NULL DEFAULT 'submit',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" DATETIME,
    "lastUsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ApiClient" ("clientId", "createdAt", "description", "environment", "expiresAt", "id", "lastUsedAt", "name", "ownerName", "scopes", "secretHash", "status", "updatedAt") SELECT "clientId", "createdAt", "description", "environment", "expiresAt", "id", "lastUsedAt", "name", "ownerName", "scopes", "secretHash", "status", "updatedAt" FROM "ApiClient";
DROP TABLE "ApiClient";
ALTER TABLE "new_ApiClient" RENAME TO "ApiClient";
CREATE UNIQUE INDEX "ApiClient_clientId_key" ON "ApiClient"("clientId");

CREATE TABLE "new_ApiClientCredential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apiClientId" TEXT NOT NULL,
    "name" TEXT,
    "keyPrefix" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" DATETIME,
    "gracePeriodEndsAt" DATETIME,
    "lastUsedAt" DATETIME,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ApiClientCredential_apiClientId_fkey" FOREIGN KEY ("apiClientId") REFERENCES "ApiClient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ApiClientCredential" ("apiClientId", "createdAt", "expiresAt", "gracePeriodEndsAt", "id", "keyPrefix", "lastUsedAt", "name", "revokedAt", "secretHash", "status", "updatedAt") SELECT "apiClientId", "createdAt", "expiresAt", "gracePeriodEndsAt", "id", "keyPrefix", "lastUsedAt", "name", "revokedAt", "secretHash", "status", "updatedAt" FROM "ApiClientCredential";
DROP TABLE "ApiClientCredential";
ALTER TABLE "new_ApiClientCredential" RENAME TO "ApiClientCredential";
CREATE INDEX "ApiClientCredential_apiClientId_status_idx" ON "ApiClientCredential"("apiClientId", "status");

CREATE TABLE "new_Contributor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "adultConfirmedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Contributor" ("adultConfirmedAt", "createdAt", "email", "id", "lastLoginAt", "passwordHash", "status", "updatedAt", "username") SELECT "adultConfirmedAt", "createdAt", "email", "id", "lastLoginAt", "passwordHash", "status", "updatedAt", "username" FROM "Contributor";
DROP TABLE "Contributor";
ALTER TABLE "new_Contributor" RENAME TO "Contributor";
CREATE UNIQUE INDEX "Contributor_username_key" ON "Contributor"("username");
CREATE UNIQUE INDEX "Contributor_email_key" ON "Contributor"("email");

CREATE TABLE "new_ContributorApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "bio" TEXT,
    "interests" TEXT,
    "portfolioUrl" TEXT,
    "sampleArticle" TEXT,
    "adultConfirmedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guidelinesAccepted" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decidedAt" DATETIME,
    "decisionNote" TEXT,
    "contributorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContributorApplication_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "StaffUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ContributorApplication_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "Contributor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ContributorApplication" ("adultConfirmedAt", "bio", "contributorId", "createdAt", "decidedAt", "decidedById", "decisionNote", "email", "guidelinesAccepted", "id", "interests", "name", "portfolioUrl", "sampleArticle", "status", "updatedAt") SELECT "adultConfirmedAt", "bio", "contributorId", "createdAt", "decidedAt", "decidedById", "decisionNote", "email", "guidelinesAccepted", "id", "interests", "name", "portfolioUrl", "sampleArticle", "status", "updatedAt" FROM "ContributorApplication";
DROP TABLE "ContributorApplication";
ALTER TABLE "new_ContributorApplication" RENAME TO "ContributorApplication";
CREATE UNIQUE INDEX "ContributorApplication_contributorId_key" ON "ContributorApplication"("contributorId");
CREATE INDEX "ContributorApplication_email_idx" ON "ContributorApplication"("email");
CREATE INDEX "ContributorApplication_status_idx" ON "ContributorApplication"("status");

CREATE TABLE "new_ContributorInvitation" (
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContributorInvitation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ContributorApplication" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContributorInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "StaffUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ContributorInvitation" ("acceptedAt", "applicationId", "createdAt", "email", "expiresAt", "id", "invitedById", "name", "revokedAt", "tokenHash", "updatedAt") SELECT "acceptedAt", "applicationId", "createdAt", "email", "expiresAt", "id", "invitedById", "name", "revokedAt", "tokenHash", "updatedAt" FROM "ContributorInvitation";
DROP TABLE "ContributorInvitation";
ALTER TABLE "new_ContributorInvitation" RENAME TO "ContributorInvitation";
CREATE UNIQUE INDEX "ContributorInvitation_tokenHash_key" ON "ContributorInvitation"("tokenHash");
CREATE UNIQUE INDEX "ContributorInvitation_applicationId_key" ON "ContributorInvitation"("applicationId");
CREATE INDEX "ContributorInvitation_tokenHash_idx" ON "ContributorInvitation"("tokenHash");
CREATE INDEX "ContributorInvitation_email_idx" ON "ContributorInvitation"("email");
CREATE INDEX "ContributorInvitation_expiresAt_idx" ON "ContributorInvitation"("expiresAt");

CREATE TABLE "new_StaffInvitation" (
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StaffInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "StaffUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_StaffInvitation" ("acceptedAt", "createdAt", "email", "expiresAt", "id", "invitedById", "name", "revokedAt", "role", "tokenHash", "updatedAt", "username") SELECT "acceptedAt", "createdAt", "email", "expiresAt", "id", "invitedById", "name", "revokedAt", "role", "tokenHash", "updatedAt", "username" FROM "StaffInvitation";
DROP TABLE "StaffInvitation";
ALTER TABLE "new_StaffInvitation" RENAME TO "StaffInvitation";
CREATE UNIQUE INDEX "StaffInvitation_username_key" ON "StaffInvitation"("username");
CREATE UNIQUE INDEX "StaffInvitation_tokenHash_key" ON "StaffInvitation"("tokenHash");
CREATE INDEX "StaffInvitation_tokenHash_idx" ON "StaffInvitation"("tokenHash");
CREATE INDEX "StaffInvitation_username_idx" ON "StaffInvitation"("username");
CREATE INDEX "StaffInvitation_expiresAt_idx" ON "StaffInvitation"("expiresAt");

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
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_StaffUser" ("createdAt", "email", "id", "lastLoginAt", "name", "passwordHash", "role", "status", "updatedAt", "username") SELECT "createdAt", "email", "id", "lastLoginAt", "name", "passwordHash", "role", "status", "updatedAt", "username" FROM "StaffUser";
DROP TABLE "StaffUser";
ALTER TABLE "new_StaffUser" RENAME TO "StaffUser";
CREATE UNIQUE INDEX "StaffUser_username_key" ON "StaffUser"("username");
CREATE UNIQUE INDEX "StaffUser_email_key" ON "StaffUser"("email");
CREATE UNIQUE INDEX "StaffUser_username_nocase_idx" ON "StaffUser"("username" COLLATE NOCASE);

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
