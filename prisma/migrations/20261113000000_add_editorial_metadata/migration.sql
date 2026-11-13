-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Article" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "deck" TEXT,
    "deskId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "contentJson" TEXT NOT NULL DEFAULT '"[]"',
    "byline" TEXT NOT NULL DEFAULT 'Redaksi Verax Press',
    "origin" TEXT NOT NULL DEFAULT 'NEWSROOM',
    "aiInvolvement" TEXT NOT NULL DEFAULT 'none',
    "aiDisclosurePublic" BOOLEAN NOT NULL DEFAULT false,
    "aiDisclosureNote" TEXT,
    "disclosureDecidedById" TEXT,
    "disclosureDecidedAt" DATETIME,
    "createdById" TEXT,
    "contributorId" TEXT,
    "heroMediaId" TEXT,
    "firstPublishedAt" DATETIME,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "topics" TEXT NOT NULL DEFAULT '[]',
    "entities" TEXT NOT NULL DEFAULT '[]',
    "centralQuestion" TEXT,
    "editorialAngle" TEXT,
    "metadataStatus" TEXT NOT NULL DEFAULT 'unverified',
    CONSTRAINT "Article_deskId_fkey" FOREIGN KEY ("deskId") REFERENCES "Desk" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Article_disclosureDecidedById_fkey" FOREIGN KEY ("disclosureDecidedById") REFERENCES "StaffUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Article_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "StaffUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Article_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "Contributor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Article_heroMediaId_fkey" FOREIGN KEY ("heroMediaId") REFERENCES "MediaAsset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Article" ("aiDisclosureNote", "aiDisclosurePublic", "aiInvolvement", "byline", "contentJson", "contributorId", "createdAt", "createdById", "deck", "deskId", "disclosureDecidedAt", "disclosureDecidedById", "firstPublishedAt", "format", "heroMediaId", "id", "origin", "publishedAt", "slug", "status", "title", "updatedAt") SELECT "aiDisclosureNote", "aiDisclosurePublic", "aiInvolvement", "byline", "contentJson", "contributorId", "createdAt", "createdById", "deck", "deskId", "disclosureDecidedAt", "disclosureDecidedById", "firstPublishedAt", "format", "heroMediaId", "id", "origin", "publishedAt", "slug", "status", "title", "updatedAt" FROM "Article";
DROP TABLE "Article";
ALTER TABLE "new_Article" RENAME TO "Article";
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");
CREATE INDEX "Article_status_publishedAt_idx" ON "Article"("status", "publishedAt");
CREATE INDEX "Article_deskId_status_idx" ON "Article"("deskId", "status");
CREATE INDEX "Article_format_status_idx" ON "Article"("format", "status");
CREATE INDEX "Article_contributorId_idx" ON "Article"("contributorId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
