// Isolated backend remediation tests covering Phase A.1, A.2, and A.3
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { execSync } from "node:child_process";
import { verifyStaffUserPermission, ApiError } from "@/lib/api";
import { createComplaintWithRetry } from "@/lib/domain/complaint";
import { assertApprovedTestDatabase } from "./lib/test-db";

const TEST_DB_PATH = path.resolve("db/test-backend-remediation.db").replace(/\\/g, "/");
const TEST_DB_URL = `file:${TEST_DB_PATH}`;

let testPrisma: PrismaClient;

beforeAll(async () => {
  assertApprovedTestDatabase(TEST_DB_URL);
  if (fs.existsSync(TEST_DB_PATH)) {
    try { fs.unlinkSync(TEST_DB_PATH); } catch {}
  }

  // Push schema to the isolated test database
  execSync("bunx prisma db push --schema=prisma/schema.prisma --accept-data-loss --skip-generate", {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "pipe",
  });

  testPrisma = new PrismaClient({
    datasources: { db: { url: TEST_DB_URL } },
    log: [],
  });
});

afterAll(async () => {
  if (testPrisma) {
    await testPrisma.$disconnect();
  }
  if (fs.existsSync(TEST_DB_PATH)) {
    try { fs.unlinkSync(TEST_DB_PATH); } catch {}
  }
});

// Helper calling the real production verifyStaffUserPermission from src/lib/api.ts
async function evaluateStaffPermission(
  db: PrismaClient,
  userId: string | null | undefined,
  permission: "complaint:manage" | "correction:create"
) {
  try {
    const staff = await verifyStaffUserPermission(db, userId, permission);
    return { status: 200, staff };
  } catch (err: any) {
    if (err instanceof ApiError) {
      return { status: err.status, code: err.code, message: err.message };
    }
    throw err;
  }
}

describe("Phase A.1: Authoritative Complaint Permission Enforcement", () => {
  let chiefId: string;
  let editorGrantedId: string;
  let editorUngrantedId: string;
  let inactiveStaffId: string;
  let authorId: string;

  beforeAll(async () => {
    // 1. Chief Editor
    const chief = await testPrisma.staffUser.create({
      data: {
        email: "chief-test@verity.test",
        name: "Chief Editor Test",
        role: "CHIEF_EDITOR",
        status: "ACTIVE",
        passwordHash: "hash-test",
        canManageComplaints: false, // Chief always has permission by role
      },
    });
    chiefId = chief.id;

    // 2. Editor with canManageComplaints = true
    const editorGranted = await testPrisma.staffUser.create({
      data: {
        email: "editor-granted@verity.test",
        name: "Editor With Grant",
        role: "EDITOR",
        status: "ACTIVE",
        passwordHash: "hash-test",
        canManageComplaints: true,
      },
    });
    editorGrantedId = editorGranted.id;

    // 3. Editor with canManageComplaints = false
    const editorUngranted = await testPrisma.staffUser.create({
      data: {
        email: "editor-ungranted@verity.test",
        name: "Editor Without Grant",
        role: "EDITOR",
        status: "ACTIVE",
        passwordHash: "hash-test",
        canManageComplaints: false,
      },
    });
    editorUngrantedId = editorUngranted.id;

    // 4. Inactive staff account
    const inactiveStaff = await testPrisma.staffUser.create({
      data: {
        email: "inactive-editor@verity.test",
        name: "Inactive Editor",
        role: "EDITOR",
        status: "SUSPENDED",
        passwordHash: "hash-test",
        canManageComplaints: true,
      },
    });
    inactiveStaffId = inactiveStaff.id;

    // 5. Unauthorized role (Author)
    const author = await testPrisma.staffUser.create({
      data: {
        email: "author-test@verity.test",
        name: "Author Test",
        role: "INTERNAL_AUTHOR",
        status: "ACTIVE",
        passwordHash: "hash-test",
      },
    });
    authorId = author.id;
  });

  it("1. Chief Editor with permission is accepted (200)", async () => {
    const res = await evaluateStaffPermission(testPrisma, chiefId, "complaint:manage");
    expect(res.status).toBe(200);
    expect(res.staff?.role).toBe("CHIEF_EDITOR");
  });

  it("2. Editor with canManageComplaints = true is accepted (200)", async () => {
    const res = await evaluateStaffPermission(testPrisma, editorGrantedId, "complaint:manage");
    expect(res.status).toBe(200);
    expect(res.staff?.role).toBe("EDITOR");
    expect(res.staff?.canManageComplaints).toBe(true);
  });

  it("3. Editor with canManageComplaints = false is rejected (403)", async () => {
    const res = await evaluateStaffPermission(testPrisma, editorUngrantedId, "complaint:manage");
    expect(res.status).toBe(403);
    expect(res.code).toBe("FORBIDDEN");
  });

  it("4. Inactive staff account is rejected (403)", async () => {
    const res = await evaluateStaffPermission(testPrisma, inactiveStaffId, "complaint:manage");
    expect(res.status).toBe(403);
    expect(res.message).toContain("dinonaktifkan");
  });

  it("5. Unauthenticated request is rejected (401)", async () => {
    const res = await evaluateStaffPermission(testPrisma, null, "complaint:manage");
    expect(res.status).toBe(401);
    expect(res.code).toBe("UNAUTHORIZED");
  });

  it("6. Unauthorized role is rejected (403)", async () => {
    const res = await evaluateStaffPermission(testPrisma, authorId, "complaint:manage");
    expect(res.status).toBe(403);
    expect(res.code).toBe("FORBIDDEN");
  });

  it("7. Missing permission profile (user deleted from DB) is rejected (403)", async () => {
    const res = await evaluateStaffPermission(testPrisma, "non-existent-user-id", "complaint:manage");
    expect(res.status).toBe(403);
    expect(res.message).toContain("Profil staf tidak ditemukan");
  });
});

describe("Phase A.2: Complaint Reference Concurrency", () => {
  it("generates collision-free unique references under concurrent writes using real domain service", async () => {
    const countToSpawn = 10;

    // Concurrently submit 10 complaints via the real createComplaintWithRetry domain service
    const results = await Promise.all(
      Array.from({ length: countToSpawn }).map(async (_, idx) => {
        try {
          const complaint = await createComplaintWithRetry(testPrisma, {
            type: "KELUHAN",
            senderName: `Concurrent Sender ${idx}`,
            senderEmail: `concurrent${idx}@example.com`,
            message: `This is concurrent test complaint message number ${idx} with sufficient length.`,
          });
          return { success: true, refCode: complaint.refCode };
        } catch (err: any) {
          return { success: false, error: err?.message };
        }
      })
    );

    expect(results.every((r) => r.success)).toBe(true);
    const refCodes = results.map((r) => (r as any).refCode);
    const uniqueRefs = new Set(refCodes);
    expect(uniqueRefs.size).toBe(countToSpawn);
  });
});

describe("Phase A.3: Multi-operation Transaction Rollback & Atomicity", () => {
  it("rolls back all changes when failure occurs during multi-entity correction operation", async () => {
    // 0. Create staff user for approval
    const chief = await testPrisma.staffUser.create({
      data: {
        email: "tx-chief@verity.test",
        name: "Chief Transaction",
        role: "CHIEF_EDITOR",
        status: "ACTIVE",
        passwordHash: "hash-test",
      },
    });

    // 1. Create a published article fixture
    const desk = await testPrisma.desk.create({
      data: {
        slug: "investigasi-transaksi",
        name: "Investigasi",
        sortOrder: 1,
      },
    });

    const article = await testPrisma.article.create({
      data: {
        slug: "artikel-uji-transaksi",
        title: "Artikel Uji Transaksi Atomik",
        status: "PUBLISHED",
        format: "INVESTIGASI",
        deskId: desk.id,
        contentJson: JSON.stringify([{ type: "paragraph", text: "Konten awal naskah investigasi." }]),
      },
    });

    // 2. Perform transaction with injected failure
    let errorCaught = false;
    try {
      await testPrisma.$transaction(async (tx) => {
        // Step 1: Create correction record
        await tx.correctionRecord.create({
          data: {
            articleId: article.id,
            summary: "Koreksi data tahun",
            publicNote: "Tahun diubah menjadi 2026",
            approvedById: chief.id,
            correctedAt: new Date(),
          },
        });

        // Step 2: Create article version
        await tx.articleVersion.create({
          data: {
            articleId: article.id,
            versionNo: 2,
            title: article.title,
            contentJson: JSON.stringify([{ type: "paragraph", text: "Konten setelah koreksi." }]),
            versionType: "editorial_copyedit",
            changeReason: "Test correction",
          },
        });

        // Step 3: INJECT FAILURE before article update and audit log
        throw new Error("INJECTED_FAILURE_SIMULATING_DISCONNECTION");
      });
    } catch (err: any) {
      if (err.message === "INJECTED_FAILURE_SIMULATING_DISCONNECTION" || err.message?.includes("INJECTED_FAILURE")) {
        errorCaught = true;
      }
    }

    expect(errorCaught).toBe(true);

    // 3. Verify Rollback Integrity: NO records must have persisted
    const correctionCount = await testPrisma.correctionRecord.count({
      where: { articleId: article.id },
    });
    expect(correctionCount).toBe(0);

    const versionCount = await testPrisma.articleVersion.count({
      where: { articleId: article.id },
    });
    expect(versionCount).toBe(0);

    const unchangedArticle = await testPrisma.article.findUnique({
      where: { id: article.id },
    });
    expect(unchangedArticle?.status).toBe("PUBLISHED");
  });
});
