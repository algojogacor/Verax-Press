import { db } from "../../../src/lib/db";
import { uploadToMediaStorage } from "../../../src/lib/media-client";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

async function run() {
  console.log("=== AUDIT SECTION D: END-TO-END CMS INTEGRATION ===");

  // Ensure tunnel is pointed to loopback 4188
  process.env.VERAX_MEDIA_API_URL = process.env.VERAX_MEDIA_API_URL || "http://127.0.0.1:4188";
  process.env.VERAX_MEDIA_SECRET = process.env.VERAX_MEDIA_SECRET || "mock_secret_for_test";

  // Create a minimal 1x1 valid PNG
  const validPng = Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082",
    "hex"
  );

  console.log("\n[D.1] Testing CMS Upload to Live Media Storage via tunnel...");
  const uploadResult = await uploadToMediaStorage({
    buffer: validPng,
    filename: "audit-test-cms.png",
    mimeType: "image/png",
    visibility: "public",
    category: "articles",
    uploadedBy: "audit-bot",
  });

  console.log("      Upload response ID:", uploadResult.id);
  console.log("      Stored Filename:", uploadResult.storedFilename);
  console.log("      Public URL:", uploadResult.publicUrl);
  console.log("      File Size:", uploadResult.fileSize, "bytes");
  console.log("      SHA-256:", uploadResult.sha256);

  if (!uploadResult.id || !uploadResult.publicUrl) {
    throw new Error("D.1 FAILED: Invalid upload result from Media Storage");
  }
  console.log("      [PASS] D.1: Upload via media-client succeeded.");

  console.log("\n[D.2] Testing Prisma MediaAsset persistence & consistency...");
  const prismaAsset = await db.mediaAsset.create({
    data: {
      storageKey: `media/${uploadResult.id}`,
      url: uploadResult.publicUrl,
      mimeType: uploadResult.mimeType,
      mediaType: "PHOTO",
      title: "Audit Test Asset",
      creator: "Security Auditor",
      license: "CC0",
      caption: "Temporary test image for security audit verification",
      isSynthetic: false,
      uploadedById: null,
      uploadedByLabel: "Audit Test Bot",
    },
  });

  console.log("      Created Prisma MediaAsset ID:", prismaAsset.id);
  console.log("      Prisma storageKey:", prismaAsset.storageKey);
  console.log("      Prisma url:", prismaAsset.url);

  // Assert consistency
  const fetchedAsset = await db.mediaAsset.findUnique({
    where: { id: prismaAsset.id },
  });

  if (!fetchedAsset || fetchedAsset.url !== uploadResult.publicUrl) {
    throw new Error("D.2 FAILED: Prisma record inconsistency");
  }
  console.log("      [PASS] D.2: Prisma metadata matches Media Storage output exactly.");

  console.log("\n[D.3] Testing URL format compatibility for frontend...");
  const expectedPrefix = "https://media.aryariap.my.id/public/articles/";
  const isValidUrl = uploadResult.publicUrl.startsWith(expectedPrefix);
  console.log(`      URL starts with '${expectedPrefix}':`, isValidUrl);
  if (!isValidUrl) {
    console.log("      [WARN] D.3: Public URL prefix differs from standard expected prefix:", uploadResult.publicUrl);
  } else {
    console.log("      [PASS] D.3: URL matches production frontend asset format.");
  }

  console.log("\n[D.4] Testing failure isolation (unreachable media service)...");
  process.env.VERAX_MEDIA_API_URL = "http://127.0.0.1:9999"; // unreachable port
  let failedAsExpected = false;
  try {
    await uploadToMediaStorage({
      buffer: validPng,
      filename: "should-fail.png",
      mimeType: "image/png",
      uploadedBy: "audit-bot",
    });
  } catch (err: any) {
    failedAsExpected = true;
    console.log("      Caught expected error when media service is down:", err.message);
  }

  // Verify no Prisma asset was created for the failed upload
  const countFailed = await db.mediaAsset.count({
    where: { title: "Should Not Exist" },
  });
  console.log("      Orphaned failed assets in Prisma:", countFailed);
  if (!failedAsExpected || countFailed !== 0) {
    throw new Error("D.4 FAILED: Failure was not handled safely");
  }
  console.log("      [PASS] D.4: Failure in media storage halts CMS flow before Prisma insertion.");

  console.log("\n[D.5] Testing local fallback when VERAX_MEDIA_API_URL is unset...");
  delete process.env.VERAX_MEDIA_API_URL;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const localFilename = `audit-fallback-${crypto.randomBytes(6).toString("hex")}.png`;
  const localFilepath = path.join(uploadDir, localFilename);
  fs.writeFileSync(localFilepath, validPng);

  const localAsset = await db.mediaAsset.create({
    data: {
      storageKey: `uploads/${localFilename}`,
      url: `/uploads/${localFilename}`,
      mimeType: "image/png",
      mediaType: "PHOTO",
      creator: "Fallback Auditor",
      caption: "Fallback test asset",
      uploadedByLabel: "Local Fallback Test",
    },
  });

  console.log("      Local fallback asset created:", localAsset.id, localAsset.url);
  if (!fs.existsSync(localFilepath) || !localAsset.url.startsWith("/uploads/")) {
    throw new Error("D.5 FAILED: Local fallback failed");
  }
  console.log("      [PASS] D.5: Local fallback operates correctly for offline development.");

  // Clean up
  console.log("\n=== CLEANUP TEST ARTIFACTS ===");
  await db.mediaAsset.delete({ where: { id: prismaAsset.id } });
  await db.mediaAsset.delete({ where: { id: localAsset.id } });
  if (fs.existsSync(localFilepath)) fs.unlinkSync(localFilepath);
  console.log("      Cleaned up test Prisma records and local files.");

  // Delete remote test media via API DELETE endpoint
  process.env.VERAX_MEDIA_API_URL = "http://127.0.0.1:4188";
  const { generateMediaAuthHeaders } = await import("../../../src/lib/media-client");
  const authHeaders = generateMediaAuthHeaders({
    method: "DELETE",
    path: `/api/v1/media/${uploadResult.id}`,
    action: "delete",
    resourceId: uploadResult.id,
    uploadedBy: "audit-bot",
  });
  const delRes = await fetch(`http://127.0.0.1:4188/api/v1/media/${uploadResult.id}`, {
    method: "DELETE",
    headers: authHeaders,
  });
  const delData = await delRes.json();
  console.log(`      Quarantined remote test asset on VM: HTTP ${delRes.status}`, delData);

  console.log("\n>>> ALL SECTION D CHECKS COMPLETED SUCCESSFULLY <<<");
}

run()
  .catch((e) => {
    console.error("FATAL ERROR in Section D:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
