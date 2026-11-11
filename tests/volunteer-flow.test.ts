// Dedicated test suite for Phase 2: Volunteer Application, Activation, and Contributor Portal.
// Covers all canonical requirements from Phase 2 specification.
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
  assertApprovedTestDatabase,
} from "./lib/test-db";
import {
  loginAs,
  loginWithCredentials,
  get,
  postJson,
  patchJson,
  deleteReq,
  type TestClient,
} from "./lib/http";
import { hashPassword } from "@/lib/password";

let chief: TestClient;
let writer: TestClient;
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
  writer = await loginAs("author");
});

afterAll(async () => {
  if (testServerProcess) {
    testServerProcess.kill();
  }
  await cleanupTestData();
});

describe("Phase 2: Volunteer Application, Activation, and Contributor Portal Flow", () => {
  const db = getTestDb();

  let applicantEmail = "volunteer.applicant@example.test";
  let applicationId: string;
  let activationToken: string;
  let contributorClient: TestClient;
  let contributorUsername = "test_volunteer";
  let contributorPassword = "Password123#Secure";
  let createdArticleId: string;
  let createdSourceId: string;

  // ---------------------------------------------------------------------------
  // 1. Volunteer Application Submission (Public)
  // ---------------------------------------------------------------------------
  test("1. Public user can submit a volunteer application with 18+ declaration (201)", async () => {
    const res = await postJson("/api/public/contributor/apply", {
      name: "Budi Sukmawan",
      email: applicantEmail,
      bio: "Peneliti kebijakan data dan privasi digital.",
      interests: "Kebijakan Publik, Tata Kelola AI",
      portfolioUrl: "https://sukmawan.id/tulisan",
      sampleArticle: "Ulasan implikasi regulasi perlindungan data pribadi terhadap riset publik.",
      adultConfirmed: true,
      guidelinesAccepted: true,
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.applicationId).toBeDefined();
    applicationId = body.applicationId;

    // Verify database record
    const row = await db.contributorApplication.findUnique({ where: { id: applicationId } });
    expect(row).toBeDefined();
    expect(row?.email).toBe(applicantEmail);
    expect(row?.adultConfirmedAt).not.toBeNull();
  });

  test("2. Duplicate application with PENDING status is rejected (409 APPLICATION_PENDING)", async () => {
    const res = await postJson("/api/public/contributor/apply", {
      name: "Budi Sukmawan",
      email: applicantEmail,
      adultConfirmed: true,
      guidelinesAccepted: true,
    });

    expect(res.status).toBe(409);
    const body = (await res.json()) as any;
    expect(body.code).toBe("APPLICATION_PENDING");
  });

  test("3. Application without 18+ declaration is rejected (422)", async () => {
    const res = await postJson("/api/public/contributor/apply", {
      name: "Di Bawah Umur",
      email: "minor@example.test",
      adultConfirmed: false,
      guidelinesAccepted: true,
    });

    expect(res.status).toBe(422);
  });

  test("4. Pending applicant cannot log in", async () => {
    const login = await loginWithCredentials(applicantEmail, "RandomPassword123!");
    expect(login.success).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 2. Editorial Review & Chief Approval Flow (Studio)
  // ---------------------------------------------------------------------------
  test("5. Non-Chief Editor (Writer) cannot access applications list (403)", async () => {
    const res = await get("/api/studio/applications", writer);
    expect(res.status).toBe(403);
  });

  test("6. Chief Editor can view applications list and overview stats (200)", async () => {
    const res = await get("/api/studio/applications", chief);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.overview.pending).toBeGreaterThanOrEqual(1);
    expect(body.applications.some((a: any) => a.id === applicationId)).toBe(true);
  });

  test("7. Chief Editor can view detailed application info (200)", async () => {
    const res = await get(`/api/studio/applications/${applicationId}`, chief);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.application.email).toBe(applicantEmail);
    expect(body.application.interests).toContain("Kebijakan");
    expect(body.application.sampleArticle).toBeDefined();
  });

  test("8. Chief Editor can reject an application with reason note", async () => {
    // Buat permohonan lain untuk diuji penolakannya
    const applyRes = await postJson("/api/public/contributor/apply", {
      name: "Calon Ditolak",
      email: "rejected.volunteer@example.test",
      adultConfirmed: true,
      guidelinesAccepted: true,
    });
    expect(applyRes.status).toBe(201);
    const toRejectId = ((await applyRes.json()) as any).applicationId;

    const rejectRes = await postJson(`/api/studio/applications/${toRejectId}/decide`, {
      decision: "REJECT",
      note: "Portofolio belum memenuhi standar riset primer redaksi.",
    }, chief);

    expect(rejectRes.status).toBe(200);
    const body = (await rejectRes.json()) as any;
    expect(body.application.status).toBe("REJECTED");
    expect(body.application.decisionNote).toContain("Portofolio");

    // Verify DB
    const row = await db.contributorApplication.findUnique({ where: { id: toRejectId } });
    expect(row?.status).toBe("REJECTED");
    expect(row?.decisionNote).toContain("Portofolio");
  });

  test("9. Chief Editor can approve application and generate activation token (200)", async () => {
    const res = await postJson(`/api/studio/applications/${applicationId}/decide`, {
      decision: "APPROVE",
      note: "Disetujui untuk jalur opini dan analisis kebijakan.",
    }, chief);

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.application.status).toBe("APPROVED");
    expect(body.activationToken).toBeDefined();
    expect(body.activationUrl).toBeDefined();

    activationToken = body.activationToken;

    // Verify database token hash
    const tokenHash = crypto.createHash("sha256").update(activationToken).digest("hex");
    const inv = await db.contributorInvitation.findUnique({ where: { tokenHash } });
    expect(inv).toBeDefined();
    expect(inv?.email).toBe(applicantEmail);
  });

  // ---------------------------------------------------------------------------
  // 3. Activation Flow (Public Token Claim)
  // ---------------------------------------------------------------------------
  test("10. Public can verify valid activation token (200)", async () => {
    const res = await get(`/api/public/contributor/invitations/${activationToken}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.valid).toBe(true);
    expect(body.invitation.email).toBe(applicantEmail);
  });

  test("11. Activation fails if password is shorter than 8 characters (422)", async () => {
    const res = await postJson(`/api/public/contributor/invitations/${activationToken}/accept`, {
      username: contributorUsername,
      password: "123",
    });
    expect(res.status).toBe(422);
  });

  test("12. Contributor activates account with username and password (200)", async () => {
    const res = await postJson(`/api/public/contributor/invitations/${activationToken}/accept`, {
      username: contributorUsername,
      password: contributorPassword,
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.username).toBe(contributorUsername);

    // Verify Contributor & Person created in database
    const contrib = await db.contributor.findUnique({
      where: { username: contributorUsername },
      include: { person: true },
    });
    expect(contrib).toBeDefined();
    expect(contrib?.status).toBe("ACTIVE");
    expect(contrib?.adultConfirmedAt).not.toBeNull();
    expect(contrib?.person).toBeDefined();
    expect(contrib?.person?.accountType).toBe("EXTERNAL");
    expect(contrib?.person?.publicName).toBe("Budi Sukmawan");
  });

  test("13. Activation token cannot be reused (410 ALREADY_ACCEPTED)", async () => {
    const res = await postJson(`/api/public/contributor/invitations/${activationToken}/accept`, {
      username: contributorUsername,
      password: contributorPassword,
    });
    expect(res.status).toBe(410);
    const body = (await res.json()) as any;
    expect(body.code).toBe("ALREADY_ACCEPTED");
  });

  test("14. Expired activation token is rejected (410 INVITATION_EXPIRED)", async () => {
    // Generate an expired invitation manually for testing
    const fakeToken = "expired_token_" + crypto.randomBytes(16).toString("hex");
    const fakeHash = crypto.createHash("sha256").update(fakeToken).digest("hex");
    const pastDate = new Date(Date.now() - 86400000);
    const chiefUser = await db.staffUser.findFirst({ where: { role: "CHIEF_EDITOR" } });

    await db.contributorApplication.create({
      data: {
        id: "app_expired_test",
        name: "Expired User",
        email: "expired@example.test",
        adultConfirmedAt: new Date(),
        status: "APPROVED",
      },
    });

    await db.contributorInvitation.create({
      data: {
        id: "inv_expired_test",
        tokenHash: fakeHash,
        email: "expired@example.test",
        name: "Expired User",
        expiresAt: pastDate,
        applicationId: "app_expired_test",
        invitedById: chiefUser!.id,
      },
    });

    const checkRes = await get(`/api/public/contributor/invitations/${fakeToken}`);
    expect(checkRes.status).toBe(410);

    const acceptRes = await postJson(`/api/public/contributor/invitations/${fakeToken}/accept`, {
      username: "expired_usr",
      password: "Password123#",
    });
    expect(acceptRes.status).toBe(410);
  });

  // ---------------------------------------------------------------------------
  // 4. Contributor Authentication & Boundary Protection
  // ---------------------------------------------------------------------------
  test("15. Activated Contributor can log in and access Contributor Dashboard (200)", async () => {
    const login = await loginWithCredentials(contributorUsername, contributorPassword);
    expect(login.success).toBe(true);
    contributorClient = login.client;

    const res = await get("/api/contributor/dashboard", contributorClient);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.totalArticles).toBe(0);
    expect(body.draftCount).toBe(0);
  });

  test("16. Contributor is strictly forbidden from accessing Studio CMS endpoints (403)", async () => {
    const res1 = await get("/api/studio/dashboard", contributorClient);
    expect(res1.status).toBe(403);

    const res2 = await get("/api/studio/articles", contributorClient);
    expect(res2.status).toBe(403);

    const res3 = await get("/api/studio/staff", contributorClient);
    expect(res3.status).toBe(403);
  });

  // ---------------------------------------------------------------------------
  // 5. Contributor Article Lifecycle & Restrictions
  // ---------------------------------------------------------------------------
  test("17. Contributor is forbidden from creating NEWS articles (422 format rejected)", async () => {
    const res = await postJson("/api/contributor/articles", {
      title: "Berita Kilat: Pembaruan Kebijakan Regulasi",
      deskSlug: "hukum-keadilan",
      format: "NEWS",
    }, contributorClient);

    expect(res.status).toBe(422);
  });

  test("18. Contributor can create OPINION / ANALYSIS article as DRAFT (201)", async () => {
    const res = await postJson("/api/contributor/articles", {
      title: "Telaah Kritis Transparansi Algoritma Sektor Publik",
      deck: "Analisis terhadap akuntabilitas model otomatisasi pada layanan perizinan.",
      deskSlug: "teknologi-kebijakan",
      format: "ANALYSIS",
      content: [
        { type: "paragraph", text: "Paragraf pembuka analisis kebijakan keterbukaan kode dan model." },
      ],
    }, contributorClient);

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.id).toBeDefined();
    createdArticleId = body.id;

    // Verify DB
    const art = await db.article.findUnique({ where: { id: createdArticleId } });
    expect(art).toBeDefined();
    expect(art?.origin).toBe("CONTRIBUTOR");
    expect(art?.status).toBe("DRAFT");
    expect(art?.format).toBe("ANALYSIS");
    expect(art?.contributorId).not.toBeNull();
  });

  test("19. Contributor can read and edit own DRAFT article (200)", async () => {
    const getRes = await get(`/api/contributor/articles/${createdArticleId}`, contributorClient);
    expect(getRes.status).toBe(200);
    const artData = (await getRes.json()) as any;
    expect(artData.article.title).toContain("Telaah Kritis");
    expect(artData.article.allowedTransitions.some((t: any) => t.action === "SUBMIT_REVIEW")).toBe(true);

    const patchRes = await patchJson(`/api/contributor/articles/${createdArticleId}`, {
      title: "Telaah Kritis Transparansi Algoritma Sektor Publik di Indonesia",
      deck: "Analisis komparatif regulasi perlindungan data pribadi dan keterbukaan informasi publik.",
      content: [
        { type: "paragraph", text: "Paragraf pembuka analisis kebijakan keterbukaan kode dan model revisi." },
      ],
    }, contributorClient);

    expect(patchRes.status).toBe(200);
    const updated = (await patchRes.json()) as any;
    expect(updated.title).toContain("di Indonesia");
  });

  test("20. Contributor can add and delete reference source on DRAFT article (201 & 200)", async () => {
    // Add source
    const addRes = await postJson(`/api/contributor/articles/${createdArticleId}/sources`, {
      title: "Naskah Akademik RUU Privasi dan Akuntabilitas",
      publisher: "Kementerian Hukum",
      url: "https://kemenkum.go.id/dokumen/ruu-akuntabilitas.pdf",
      sourceType: "PRIMARY",
      supports: "Klaim pasal transparansi algoritma",
    }, contributorClient);

    expect(addRes.status).toBe(201);
    const body = (await addRes.json()) as any;
    expect(body.id).toBeDefined();
    expect(body.isKeySource).toBe(false); // Selalu false untuk kontributor
    expect(body.verificationStatus).toBe("UNVERIFIED"); // Selalu unverified
    createdSourceId = body.id;

    // Add another source to delete
    const delTarget = await postJson(`/api/contributor/articles/${createdArticleId}/sources`, {
      title: "Sumber Sementara yang akan Dihapus",
      url: "https://example.test/draft",
      sourceType: "SECONDARY",
    }, contributorClient);
    const toDeleteId = ((await delTarget.json()) as any).id;

    const delRes = await deleteReq(`/api/contributor/articles/${createdArticleId}/sources/${toDeleteId}`, contributorClient);
    expect(delRes.status).toBe(200);
  });

  test("21. Contributor cannot access other contributor's article (403)", async () => {
    // Buat kontributor kedua
    await db.contributor.upsert({
      where: { email: "other@example.test" },
      update: {
        username: "other_contrib",
        passwordHash: await hashPassword("OtherPw123#"),
        status: "ACTIVE",
      },
      create: {
        id: "contrib_other_id",
        username: "other_contrib",
        email: "other@example.test",
        passwordHash: await hashPassword("OtherPw123#"),
        status: "ACTIVE",
      },
    });

    const otherLogin = await loginWithCredentials("other_contrib", "OtherPw123#");
    expect(otherLogin.success).toBe(true);

    const res = await get(`/api/contributor/articles/${createdArticleId}`, otherLogin.client);
    expect(res.status).toBe(403);
  });

  test("22. Contributor cannot PUBLISH directly (403 FORBIDDEN)", async () => {
    const res = await postJson(`/api/contributor/articles/${createdArticleId}/transition`, {
      action: "PUBLISH",
    }, contributorClient);

    expect(res.status).toBe(403);
  });

  test("23. Contributor can submit article for editorial review (SUBMIT_REVIEW -> PENDING_REVIEW)", async () => {
    const res = await postJson(`/api/contributor/articles/${createdArticleId}/transition`, {
      action: "SUBMIT_REVIEW",
    }, contributorClient);

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe("PENDING_REVIEW");

    // While in PENDING_REVIEW, editing content is locked (403)
    const patchRes = await patchJson(`/api/contributor/articles/${createdArticleId}`, {
      title: "Mencoba Mengedit Saat Ditelaah",
    }, contributorClient);
    expect(patchRes.status).toBe(403);
  });

  test("24. Contributor can withdraw article from review (WITHDRAW -> WITHDRAWN)", async () => {
    const res = await postJson(`/api/contributor/articles/${createdArticleId}/transition`, {
      action: "WITHDRAW",
      reason: "Penulis menarik naskah untuk menambahkan data baru.",
    }, contributorClient);

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe("WITHDRAWN");

    // Withdraw transition allows resubmitting back to draft or editorial cycle
    await db.article.update({
      where: { id: createdArticleId },
      data: { status: "DRAFT" },
    });
  });

  test("25. Chief Editor can request revision and contributor can resubmit revision", async () => {
    // 1. Submit to review
    await postJson(`/api/contributor/articles/${createdArticleId}/transition`, {
      action: "SUBMIT_REVIEW",
    }, contributorClient);

    // 2. Chief Editor requests revision via studio transition
    const revRes = await postJson(`/api/studio/articles/${createdArticleId}/transition`, {
      action: "REQUEST_REVISION",
      reason: "Mohon sertakan konteks perbandingan dengan undang-undang sebelumnya pada paragraf 2.",
    }, chief);
    expect(revRes.status).toBe(200);

    // 3. Contributor fetches article and sees revision request
    const artRes = await get(`/api/contributor/articles/${createdArticleId}`, contributorClient);
    expect(artRes.status).toBe(200);
    const artBody = (await artRes.json()) as any;
    expect(artBody.article.status).toBe("REVISION_NEEDED");
    expect(artBody.article.reviews.length).toBeGreaterThanOrEqual(1);
    expect(artBody.article.reviews[0].notes).toContain("perbandingan dengan undang-undang");

    // 4. Contributor edits the article
    const editRes = await patchJson(`/api/contributor/articles/${createdArticleId}`, {
      deck: "Analisis komparatif lengkap dengan konteks undang-undang sebelumnya.",
    }, contributorClient);
    expect(editRes.status).toBe(200);

    // 5. Contributor resubmits revision
    const resubmitRes = await postJson(`/api/contributor/articles/${createdArticleId}/transition`, {
      action: "RESUBMIT_REVIEW",
    }, contributorClient);
    expect(resubmitRes.status).toBe(200);
    const resubmitBody = (await resubmitRes.json()) as any;
    expect(resubmitBody.status).toBe("PENDING_REVIEW");
  });

  // ---------------------------------------------------------------------------
  // 6. Profile & Volunteer Status Administration
  // ---------------------------------------------------------------------------
  test("26. Contributor can update public name and bio (200)", async () => {
    const res = await patchJson("/api/contributor/profile", {
      name: "Budi Sukmawan, M.P.P.",
      bio: "Peneliti senior kebijakan data dan kecerdasan buatan.",
    }, contributorClient);

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.name).toBe("Budi Sukmawan, M.P.P.");
    expect(body.bio).toContain("Peneliti senior");

    // Verify Person record updated
    const contrib = await db.contributor.findUnique({
      where: { username: contributorUsername },
      include: { person: true },
    });
    expect(contrib?.person?.publicName).toBe("Budi Sukmawan, M.P.P.");
    expect(contrib?.person?.bio).toContain("Peneliti senior");
  });

  test("27. Chief Editor can suspend contributor and suspended contributor cannot login", async () => {
    const contrib = await db.contributor.findUnique({ where: { username: contributorUsername } });
    expect(contrib).toBeDefined();

    // Suspend
    const susRes = await patchJson(`/api/studio/volunteers/${contrib!.id}`, {
      status: "SUSPENDED",
    }, chief);
    expect(susRes.status).toBe(200);

    // Attempt login should fail
    const susLogin = await loginWithCredentials(contributorUsername, contributorPassword);
    expect(susLogin.success).toBe(false);

    // Reactivate
    const actRes = await patchJson(`/api/studio/volunteers/${contrib!.id}`, {
      status: "ACTIVE",
    }, chief);
    expect(actRes.status).toBe(200);

    // Login succeeds again
    const actLogin = await loginWithCredentials(contributorUsername, contributorPassword);
    expect(actLogin.success).toBe(true);
  });
});
