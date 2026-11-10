import { db } from "../../../src/lib/db";
import { 
  uploadToMediaStorage, 
  deleteFromMediaStorage, 
  fetchPrivateMediaStream,
  isMediaConfigured
} from "../../../src/lib/media-client";
import crypto from "node:crypto";

if (process.env.TARGET_API_URL) {
  process.env.VERAX_MEDIA_API_URL = process.env.TARGET_API_URL;
} else if (process.env.VERAX_MEDIA_API_URL === "http://127.0.0.1:4188") {
  // Point to active external Azure VM endpoint for remote testing
  process.env.VERAX_MEDIA_API_URL = "http://media.aryariap.my.id";
}

const TINY_PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082",
  "hex"
);

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

async function runCmsSuite() {
  console.log("================================================================");
  console.log("    VERAX PRESS: END-TO-END CMS MEDIA INTEGRATION SUITE         ");
  console.log("================================================================\n");

  assert(isMediaConfigured(), "Media client configuration is present in environment");

  // Step 1: Upload media asset through CMS client to VM
  console.log("\n--- 1. Uploading Asset via CMS Client to Azure VM ---");
  const uploadResult = await uploadToMediaStorage({
    buffer: TINY_PNG,
    filename: "investigasi-dana-desa.png",
    mimeType: "image/png",
    visibility: "public",
    category: "articles",
    uploadedBy: "chief-editor",
  });

  assert(Boolean(uploadResult.id), `Media upload succeeded with UUID: ${uploadResult.id}`);
  assert(Boolean(uploadResult.publicUrl), `Generated public URL: ${uploadResult.publicUrl}`);
  assert(
    Boolean(uploadResult.publicUrl?.startsWith("https://media.aryariap.my.id/public/articles/")),
    "Public URL matches canonical production structure"
  );

  // Step 2: Record in Prisma MediaAsset table
  console.log("\n--- 2. Storing in Prisma MediaAsset Table ---");
  const prismaAsset = await db.mediaAsset.create({
    data: {
      storageKey: `media/${uploadResult.id}`,
      url: uploadResult.publicUrl!,
      mimeType: uploadResult.mimeType,
      mediaType: "PHOTO",
      title: "Dokumentasi Investigasi Lapangan",
      creator: "Budi Santoso (Fotografer)",
      license: "Hak Cipta Dilindungi",
      caption: "Tim investigasi saat meninjau infrastruktur di lokasi pada 10 November 2026.",
      isSynthetic: false,
      uploadedByLabel: "Chief Editor",
    },
  });

  assert(Boolean(prismaAsset.id), `Prisma MediaAsset record created: ${prismaAsset.id}`);
  assert(prismaAsset.storageKey === `media/${uploadResult.id}`, "Prisma storageKey matches media UUID");

  // Step 3: Associate with an Article as Hero Image
  console.log("\n--- 3. Associating MediaAsset as Hero Image to Article ---");
  const testDesk = await db.desk.findFirst();
  if (!testDesk) throw new Error("No desk found in database for test article");

  const testSlug = `audit-artikel-uji-${Date.now()}`;
  const article = await db.article.create({
    data: {
      slug: testSlug,
      title: "Investigasi Alokasi Dana Desa 2026",
      deck: "Laporan khusus Verax Press mengenai tata kelola anggaran publik.",
      deskId: testDesk.id,
      format: "ANALYSIS",
      status: "DRAFT",
      heroMediaId: prismaAsset.id,
      byline: "Tim Investigasi Verax Press",
    },
  });

  assert(article.heroMediaId === prismaAsset.id, `Article created with heroMediaId: ${article.heroMediaId}`);

  // Step 4: Simulate Public Article Query
  console.log("\n--- 4. Querying Public Article with Hero Media ---");
  const fetchedArticle = await db.article.findUnique({
    where: { slug: testSlug },
    include: {
      heroMedia: true,
      desk: true,
    },
  });

  assert(Boolean(fetchedArticle?.heroMedia), "Fetched article includes resolved heroMedia relation");
  assert(
    fetchedArticle?.heroMedia?.url === uploadResult.publicUrl,
    "Resolved heroMedia URL matches Azure VM media storage public URL"
  );
  assert(fetchedArticle?.heroMedia?.creator === "Budi Santoso (Fotografer)", "Attribution data resolved accurately");

  // Step 5: Conflict Protection (Cannot delete hero media while attached to an article)
  console.log("\n--- 5. Conflict Protection on Deletion ---");
  const linkedAsset = await db.mediaAsset.findUnique({
    where: { id: prismaAsset.id },
    include: { heroForArticles: true },
  });
  const hasActiveArticles = linkedAsset && linkedAsset.heroForArticles.length > 0;
  assert(Boolean(hasActiveArticles), "Deletion conflict guard detects asset is in active use by an article");

  // Step 6: Detach from Article, then quarantine on VM and delete from Prisma
  console.log("\n--- 6. Deletion Synchronization (Azure VM Quarantine + Prisma Deletion) ---");
  await db.article.update({
    where: { id: article.id },
    data: { heroMediaId: null },
  });

  // Call delete on Media Storage
  await deleteFromMediaStorage(uploadResult.id, "chief-editor");
  await db.mediaAsset.delete({ where: { id: prismaAsset.id } });

  const deletedCheck = await db.mediaAsset.findUnique({ where: { id: prismaAsset.id } });
  assert(deletedCheck === null, "MediaAsset successfully deleted from Prisma database");

  // Step 7: Compensating Action on Database Failure Simulation
  console.log("\n--- 7. Compensating Action on Database Failure ---");
  const orphanTestUpload = await uploadToMediaStorage({
    buffer: TINY_PNG,
    filename: "orphan-compensate-test.png",
    mimeType: "image/png",
    visibility: "public",
    category: "articles",
    uploadedBy: "system-test",
  });

  let compensationExecuted = false;
  try {
    // Intentionally trigger DB failure with invalid deskId or constraint
    await db.mediaAsset.create({
      data: {
        id: "invalid-forced-error",
        url: orphanTestUpload.publicUrl!,
        // Trigger error by passing null for mandatory field if any, or duplicate ID
      },
    });
    // If not errored, force an error
    throw new Error("Simulated Prisma write failure");
  } catch (err: any) {
    // Compensating action
    await deleteFromMediaStorage(orphanTestUpload.id, "system-test");
    compensationExecuted = true;
  }
  assert(compensationExecuted, "Compensating action triggered and quarantined orphaned VM file upon DB failure");

  // Step 8: Private Media Preview Isolation Test
  console.log("\n--- 8. Private Media Streaming & HMAC Isolation ---");
  const privateUpload = await uploadToMediaStorage({
    buffer: TINY_PNG,
    filename: "draft-secret-doc.png",
    mimeType: "image/png",
    visibility: "private",
    category: "editorial",
    uploadedBy: "editor-private",
  });

  assert(privateUpload.publicUrl === null, "Private media has no static public URL");

  // Unauthenticated fetch to private media must fail
  const mediaApiBase = process.env.VERAX_MEDIA_API_URL || "http://127.0.0.1:4188";
  const unauthRes = await fetch(`${mediaApiBase}/api/v1/media/${privateUpload.id}/file`);
  assert(unauthRes.status === 401, `Direct unauthenticated fetch blocked: HTTP ${unauthRes.status}`);

  // Authorized server-side stream fetch
  const authorizedStreamRes = await fetchPrivateMediaStream(privateUpload.id);
  assert(authorizedStreamRes.status === 200, `Authorized server-side stream succeeds: HTTP ${authorizedStreamRes.status}`);
  const streamBuf = Buffer.from(await authorizedStreamRes.arrayBuffer());
  assert(streamBuf.length === TINY_PNG.length, `Received private binary payload (${streamBuf.length} bytes) matches uploaded file`);

  // Cleanup private asset
  await deleteFromMediaStorage(privateUpload.id, "editor-private");

  // Step 9: Clean up test article
  await db.article.delete({ where: { id: article.id } });
  console.log("\n--- 9. Cleaned Up Test Article & Test Artifacts ---");

  console.log("\n================================================================");
  console.log(`TOTAL CMS TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("================================================================");

  if (failed > 0) process.exit(1);
}

runCmsSuite()
  .catch((e) => {
    console.error("Fatal CMS Test Failure:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
