// Isolated backend remediation tests covering Phase A.1, A.2, and A.3
// Updated for Phase 1: Two-role staff model (CHIEF_EDITOR, WRITER) and username requirements.
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
  let writerId: string;
  let inactiveStaffId: string;

  beforeAll(async () => {
    // 1. Chief Editor (has all permissions)
    const chief = await testPrisma.staffUser.create({
      data: {
        username: "chief-test",
        email: "chief-test@verity.test",
        name: "Chief Editor Test",
        role: "CHIEF_EDITOR",
        status: "ACTIVE",
        passwordHash: "hash-test",
      },
    });
    chiefId = chief.id;

    // 2. Writer (restricted author role, cannot manage complaints)
    const writer = await testPrisma.staffUser.create({
      data: {
        username: "writer-test",
        email: "writer-test@verity.test",
        name: "Writer Test",
        role: "WRITER",
        status: "ACTIVE",
        passwordHash: "hash-test",
      },
    });
    writerId = writer.id;

    // 3. Inactive staff account
    const inactiveStaff = await testPrisma.staffUser.create({
      data: {
        username: "inactive-staff",
        email: "inactive-staff@verity.test",
        name: "Inactive Staff",
        role: "CHIEF_EDITOR",
        status: "SUSPENDED",
        passwordHash: "hash-test",
      },
    });
    inactiveStaffId = inactiveStaff.id;
  });

  it("1. Chief Editor with permission is accepted (200)", async () => {
    const res = await evaluateStaffPermission(testPrisma, chiefId, "complaint:manage");
    expect(res.status).toBe(200);
    expect(res.staff?.role).toBe("CHIEF_EDITOR");
  });

  it("2. Writer attempting restricted permission is rejected (403)", async () => {
    const res = await evaluateStaffPermission(testPrisma, writerId, "complaint:manage");
    expect(res.status).toBe(403);
    expect(res.code).toBe("FORBIDDEN");
  });

  it("3. Inactive staff account is rejected (403)", async () => {
    const res = await evaluateStaffPermission(testPrisma, inactiveStaffId, "complaint:manage");
    expect(res.status).toBe(403);
    expect(res.message).toContain("dinonaktifkan");
  });

  it("4. Unauthenticated request is rejected (401)", async () => {
    const res = await evaluateStaffPermission(testPrisma, null, "complaint:manage");
    expect(res.status).toBe(401);
    expect(res.code).toBe("UNAUTHORIZED");
  });

  it("5. Missing permission profile (user deleted from DB) is rejected (403)", async () => {
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
        username: "tx-chief",
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
