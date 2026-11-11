// Dedicated test suite for Phase 1: Staff Management, Role Migration, and Permissions Matrix.
// Covers all 13 canonical requirements from Phase 1 specification.
import { test, describe, beforeAll, afterAll, expect } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, execSync, type ChildProcess } from "node:child_process";
import {
  seedTestFixtures,
  cleanupTestData,
  getTestDb,
  BASE,
  DB_URL,
  CHIEF_PW,
  EDITOR_PW,
  AUTHOR_PW,
  assertApprovedTestDatabase,
} from "./lib/test-db";
import {
  loginAs,
  loginWithCredentials,
  get,
  postJson,
  patchJson,
  createArticle,
  transition,
  type TestClient,
} from "./lib/http";
import { hashPassword } from "@/lib/password";

let chief: TestClient;
let editor: TestClient;
let author: TestClient;
let testServerProcess: ChildProcess | null = null;

beforeAll(async () => {
  assertApprovedTestDatabase(DB_URL);

  let isServerRunning = await fetch(`${BASE}/api/auth/csrf`, { signal: AbortSignal.timeout(600) })
    .then((r) => r.ok)
    .catch(() => false);

  if (!isServerRunning) {
    const serverScript = path.resolve(".next/standalone/server.js");
    if (!fs.existsSync(serverScript)) {
      execSync("bun run build", { stdio: "pipe" });
    }

    const childEnv = { ...process.env };
    delete childEnv.TURSO_DATABASE_URL;
    delete childEnv.TURSO_AUTH_TOKEN;
    childEnv.PORT = "3088";
    childEnv.DATABASE_URL = DB_URL;
    childEnv.AUTH_SECRET = "verax-dev-secret-change-me-in-production";
    childEnv.NEXTAUTH_URL = BASE;

    testServerProcess = spawn("node", [serverScript], {
      env: childEnv,
      stdio: "pipe",
    });

    const start = Date.now();
    while (Date.now() - start < 15000) {
      try {
        const res = await fetch(`${BASE}/api/auth/csrf`, { signal: AbortSignal.timeout(600) });
        if (res.ok) {
          isServerRunning = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 250));
    }

    if (!isServerRunning) {
      if (testServerProcess) testServerProcess.kill();
      throw new Error(`CRITICAL: Failed to launch isolated test server on ${BASE} within 15s`);
    }
  }

  await cleanupTestData();
  await seedTestFixtures();
  chief = await loginAs("chief");
  editor = await loginAs("editor");
  author = await loginAs("author");
});

afterAll(async () => {
  if (testServerProcess) {
    testServerProcess.kill();
  }
  await cleanupTestData();
});

describe("Phase 1: Staff Management & Permissions Matrix", () => {
  const db = getTestDb();

  // ---------------------------------------------------------------------------
  // 1. Chief Editor can invite new Writer
  // ---------------------------------------------------------------------------
  test("1. Chief Editor can invite a new Writer (POST /api/studio/staff/invitations)", async () => {
    const testUsername = `writer_${Date.now().toString(36)}`;
    const testEmail = `${testUsername}@verity.test`;

    const res = await postJson(
      "/api/studio/staff/invitations",
      {
        username: testUsername,
        name: "Penulis Baru Uji",
        email: testEmail,
        role: "WRITER",
      },
      chief
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.invitation).toBeTruthy();
    expect(body.invitation.username).toBe(testUsername);
    expect(body.activationToken).toBeTruthy();
    expect(body.activationUrl).toContain(`/studio/invitasi/${body.activationToken}`);

    // Verify database stores SHA-256 hashed token, NOT raw token
    const rawToken = body.activationToken;
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const invInDb = await db.staffInvitation.findUnique({
      where: { tokenHash },
    });
    expect(invInDb).toBeTruthy();
    expect(invInDb?.tokenHash).toBe(tokenHash);
    expect(invInDb?.acceptedAt).toBeNull();
    expect(invInDb?.revokedAt).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // 2. Writer cannot invite Writer (403 Forbidden)
  // ---------------------------------------------------------------------------
  test("2. Writer cannot invite another Writer (403 Forbidden)", async () => {
    const res = await postJson(
      "/api/studio/staff/invitations",
      {
        username: `writer_illegal_${Date.now()}`,
        name: "Ilegal Writer",
        role: "WRITER",
      },
      author // Writer role
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as any;
    expect(body.code).toBe("FORBIDDEN");
  });

  // ---------------------------------------------------------------------------
  // 3. Writer cannot create or invite Chief Editor (role is automatically WRITER)
  // ---------------------------------------------------------------------------
  test("3. Invitation schema rejects any role other than WRITER (422)", async () => {
    const res = await postJson(
      "/api/studio/staff/invitations",
      {
        username: `fake_chief_${Date.now()}`,
        name: "Fake Chief",
        role: "CHIEF_EDITOR",
      },
      chief
    );
    // Schema enforces role: z.literal("WRITER")
    expect([400, 422]).toContain(res.status);
  });

  // ---------------------------------------------------------------------------
  // 4. Expired invitation token is rejected (410 INVITATION_EXPIRED)
  // ---------------------------------------------------------------------------
  test("4. Expired invitation token is rejected when verified or claimed (410)", async () => {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const chiefUser = await db.staffUser.findUniqueOrThrow({ where: { email: "chief@verity.test" } });

    await db.staffInvitation.create({
      data: {
        tokenHash,
        username: `expired_user_${Date.now()}`,
        name: "Expired User",
        role: "WRITER",
        expiresAt: new Date(Date.now() - 60000), // Expired 1 minute ago
        invitedById: chiefUser.id,
      },
    });

    // Public verification endpoint
    const checkRes = await fetch(`${BASE}/api/public/invitations/${rawToken}`);
    expect(checkRes.status).toBe(410);
    const checkBody = (await checkRes.json()) as any;
    expect(checkBody.code).toBe("INVITATION_EXPIRED");

    // Public accept endpoint
    const acceptRes = await fetch(`${BASE}/api/public/invitations/${rawToken}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "ValidPassword123" }),
    });
    expect(acceptRes.status).toBe(410);
    const acceptBody = (await acceptRes.json()) as any;
    expect(acceptBody.code).toBe("INVITATION_EXPIRED");
  });

  // ---------------------------------------------------------------------------
  // 5. Invitation token is one-time use (second claim rejected 410)
  // ---------------------------------------------------------------------------
  test("5. Invitation token is one-time use; second claim is rejected (410 ALREADY_ACCEPTED)", async () => {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const targetUsername = `single_use_${Date.now().toString(36)}`;

    const chiefUser = await db.staffUser.findUniqueOrThrow({ where: { email: "chief@verity.test" } });

    await db.staffInvitation.create({
      data: {
        tokenHash,
        username: targetUsername,
        name: "Single Use User",
        role: "WRITER",
        expiresAt: new Date(Date.now() + 86400000), // Valid for 24h
        invitedById: chiefUser.id,
      },
    });

    // First claim: successful activation
    const acceptRes = await fetch(`${BASE}/api/public/invitations/${rawToken}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "SecretPassword123" }),
    });
    expect(acceptRes.status).toBe(200);
    const acceptBody = (await acceptRes.json()) as any;
    expect(acceptBody.success).toBe(true);
    expect(acceptBody.username).toBe(targetUsername);

    // Verify user and person were created in DB
    const createdUser = await db.staffUser.findUnique({
      where: { username: targetUsername },
      include: { person: true },
    });
    expect(createdUser).toBeTruthy();
    expect(createdUser?.role).toBe("WRITER");
    expect(createdUser?.status).toBe("ACTIVE");
    expect(createdUser?.person).toBeTruthy();

    // Second claim: MUST be rejected with 410 ALREADY_ACCEPTED
    const repeatRes = await fetch(`${BASE}/api/public/invitations/${rawToken}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "AnotherPassword123" }),
    });
    expect(repeatRes.status).toBe(410);
    const repeatBody = (await repeatRes.json()) as any;
    expect(repeatBody.code).toBe("ALREADY_ACCEPTED");

    // Public status check also returns 410
    const checkRes = await fetch(`${BASE}/api/public/invitations/${rawToken}`);
    expect(checkRes.status).toBe(410);
    const checkBody = (await checkRes.json()) as any;
    expect(checkBody.code).toBe("ALREADY_ACCEPTED");
  });

  // ---------------------------------------------------------------------------
  // 6. Suspended user cannot login
  // ---------------------------------------------------------------------------
  test("6. Suspended user cannot login (authorize returns null / no session)", async () => {
    const loginResult = await loginWithCredentials("editor-inactive", EDITOR_PW);
    expect(loginResult.success).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 7. Last active Chief Editor cannot be suspended (422)
  // ---------------------------------------------------------------------------
  test("7. Last active Chief Editor cannot be suspended or deactivated (422)", async () => {
    const chiefUser = await db.staffUser.findUniqueOrThrow({ where: { email: "chief@verity.test" } });

    // Attempt to suspend the only active chief
    const res = await patchJson(
      `/api/studio/staff/${chiefUser.id}`,
      {
        status: "SUSPENDED",
      },
      chief
    );

    expect(res.status).toBe(422);
    const body = (await res.json()) as any;
    expect(body.code).toBe("LAST_CHIEF_CANNOT_BE_SUSPENDED");

    // Verify still ACTIVE in DB
    const after = await db.staffUser.findUniqueOrThrow({ where: { id: chiefUser.id } });
    expect(after.status).toBe("ACTIVE");
  });

  // ---------------------------------------------------------------------------
  // 8. Username and email login case-insensitivity without conflict
  // ---------------------------------------------------------------------------
  test("8. Login identifier matches case-insensitively for both username and email", async () => {
    // Exact username
    const res1 = await loginWithCredentials("chief", CHIEF_PW);
    expect(res1.success).toBe(true);

    // Uppercase username
    const res2 = await loginWithCredentials("CHIEF", CHIEF_PW);
    expect(res2.success).toBe(true);

    // Exact email
    const res3 = await loginWithCredentials("chief@verity.test", CHIEF_PW);
    expect(res3.success).toBe(true);

    // Uppercase email
    const res4 = await loginWithCredentials("CHIEF@VERITY.TEST", CHIEF_PW);
    expect(res4.success).toBe(true);

    // Mixed-case email
    const res5 = await loginWithCredentials("Chief@Verity.Test", CHIEF_PW);
    expect(res5.success).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 9. Writer can only edit own articles according to status (DRAFT, REVISION_NEEDED)
  // ---------------------------------------------------------------------------
  test("9. Writer can only edit own articles on allowed statuses (DRAFT, REVISION_NEEDED)", async () => {
    // 9a. Writer creates article in DRAFT -> can edit
    const art = await createArticle(author, {
      title: "Author Draft Article for Status Test",
    });

    const editDraftRes = await patchJson(
      `/api/studio/articles/${art.id}`,
      {
        title: "Author Draft Article Updated",
        content: [{ type: "paragraph", text: "Konten yang diperbarui saat draft." }],
      },
      author
    );
    expect(editDraftRes.status).toBe(200);

    // 9b. Submit to review -> PENDING_REVIEW
    await transition(author, art.id, "SUBMIT_REVIEW");

    // Writer cannot edit while in review
    const editReviewRes = await patchJson(
      `/api/studio/articles/${art.id}`,
      {
        title: "Illegal Update in Review",
      },
      author
    );
    expect(editReviewRes.status).toBe(403);

    // 9c. Chief requests revision -> REVISION_NEEDED
    const revRes = await transition(chief, art.id, "REQUEST_REVISION", "Perbaiki argumen pada paragraf 2.");
    expect(revRes.status).toBe(200);

    // Writer can edit again during REVISION_NEEDED
    const editRevRes = await patchJson(
      `/api/studio/articles/${art.id}`,
      {
        title: "Author Article After Revision Request",
        content: [{ type: "paragraph", text: "Konten diperbaiki sesuai masukan Pemred." }],
      },
      author
    );
    expect(editRevRes.status).toBe(200);
  });

  // ---------------------------------------------------------------------------
  // 10. Writer cannot read other people's articles
  // ---------------------------------------------------------------------------
  test("10. Writer cannot read other people's articles via list or detail", async () => {
    // Chief creates an article
    const chiefArt = await createArticle(chief, {
      title: "Private Chief Article " + Date.now(),
    });

    // Author creates an article
    const authorArt = await createArticle(author, {
      title: "Author Own Article " + Date.now(),
    });

    // Author lists articles -> must see own article, must NOT see chief's article
    const listRes = await get("/api/studio/articles", author);
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as any;
    const ids = listBody.articles.map((a: any) => a.id);
    expect(ids).toContain(authorArt.id);
    expect(ids).not.toContain(chiefArt.id);

    // Author tries to fetch chief's article directly -> 403 Forbidden
    const detailRes = await get(`/api/studio/articles/${chiefArt.id}`, author);
    expect(detailRes.status).toBe(403);
    const detailBody = (await detailRes.json()) as any;
    expect(detailBody.code).toBe("FORBIDDEN");
  });

  // ---------------------------------------------------------------------------
  // 11. Writer cannot publish articles (403 Forbidden)
  // ---------------------------------------------------------------------------
  test("11. Writer cannot publish articles (403 Forbidden)", async () => {
    const art = await createArticle(author);
    const { status, body } = await transition(author, art.id, "PUBLISH");
    expect([403, 422]).toContain(status);
  });

  // ---------------------------------------------------------------------------
  // 12. Only Chief Editor can approve and publish articles
  // ---------------------------------------------------------------------------
  test("12. Only Chief Editor can approve and publish articles", async () => {
    const art = await createArticle(chief, {
      sources: [
        {
          title: "Sumber Primer Sah",
          url: "https://example.com/sah",
          sourceType: "PRIMARY",
          isKeySource: true,
        },
      ],
    });

    // Submit and start fact check
    await transition(chief, art.id, "SUBMIT_REVIEW");
    await transition(chief, art.id, "START_FACT_CHECK");

    // Verify key source as chief
    const detailRes = await get(`/api/studio/articles/${art.id}`, chief);
    const detail = (await detailRes.json()) as any;
    const srcId = detail.sources[0].id;
    await patchJson(
      `/api/studio/articles/${art.id}/sources/${srcId}`,
      {
        verificationStatus: "VERIFIED",
        verificationNote: "Terverifikasi oleh Chief Editor",
      },
      chief
    );

    // Advance to approval
    const apprRes = await transition(chief, art.id, "SUBMIT_FOR_APPROVAL");
    expect(apprRes.status).toBe(200);

    // Writer attempts to publish -> 403
    const writerPub = await transition(author, art.id, "PUBLISH");
    expect(writerPub.status).toBe(403);

    // Chief publishes -> 200
    const chiefPub = await transition(chief, art.id, "PUBLISH");
    expect(chiefPub.status).toBe(200);

    // Verify article is PUBLISHED
    const finalDetail = await db.article.findUniqueOrThrow({ where: { id: art.id } });
    expect(finalDetail.status).toBe("PUBLISHED");
  });

  // ---------------------------------------------------------------------------
  // 13. Server-side verification on all endpoints
  // ---------------------------------------------------------------------------
  test("13. Server-side authorization blocks unauthenticated or unauthorized access", async () => {
    // Unauthenticated access to staff list
    const unauthStaff = await fetch(`${BASE}/api/studio/staff`);
    expect(unauthStaff.status).toBe(401);

    // Writer access to staff list -> 403
    const writerStaff = await get("/api/studio/staff", author);
    expect(writerStaff.status).toBe(403);

    // Writer access to audit logs -> 403
    const writerAudit = await get("/api/studio/audit", author);
    expect(writerAudit.status).toBe(403);

    // Writer access to API clients -> 403
    const writerClients = await get("/api/studio/api-clients", author);
    expect(writerClients.status).toBe(403);
  });
});
