import { afterEach, describe, expect, it } from "bun:test";
import crypto from "node:crypto";
import { generateMediaAuthHeaders, isMediaConfigured, uploadToMediaStorage } from "../src/lib/media-client";

const ORIGINAL_URL = process.env.VERAX_MEDIA_API_URL;
const ORIGINAL_SECRET = process.env.VERAX_MEDIA_SECRET;
const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  if (ORIGINAL_URL === undefined) delete process.env.VERAX_MEDIA_API_URL;
  else process.env.VERAX_MEDIA_API_URL = ORIGINAL_URL;

  if (ORIGINAL_SECRET === undefined) delete process.env.VERAX_MEDIA_SECRET;
  else process.env.VERAX_MEDIA_SECRET = ORIGINAL_SECRET;

  globalThis.fetch = ORIGINAL_FETCH;
});

describe("Verax Media Client", () => {
  it("strips hidden BOM, zero-width chars, and whitespace from VERAX_MEDIA_API_URL and VERAX_MEDIA_SECRET", async () => {
    const cleanSecret = "a".repeat(64);
    process.env.VERAX_MEDIA_API_URL = "\uFEFFhttps://media.example.test/\r\n";
    process.env.VERAX_MEDIA_SECRET = `\uFEFF${cleanSecret} `;

    expect(isMediaConfigured()).toBe(true);

    const headers = generateMediaAuthHeaders({
      method: "POST",
      path: "/api/v1/media/upload",
      action: "upload",
      uploadedBy: "staff-1",
    });

    const expectedSig = crypto
      .createHmac("sha256", cleanSecret)
      .update(headers["X-Media-Auth-Payload"])
      .digest("hex");
    expect(headers["X-Media-Auth-Signature"]).toBe(expectedSig);

    let capturedUrl = "";
    let capturedBody = "";
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedBody = Buffer.isBuffer(init?.body) ? init.body.toString("utf8") : "";
      return new Response(
        JSON.stringify({
          id: "m1",
          storedFilename: "abc.png",
          originalFilename: "test.png",
          visibility: "public",
          category: "articles",
          mimeType: "image/png",
          fileExtension: "png",
          fileSize: 4,
          sha256: "deadbeef",
          width: 10,
          height: 10,
          publicUrl: "https://media.example.test/uploads/abc.png",
          createdAt: "2026-11-12T00:00:00Z",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const result = await uploadToMediaStorage({
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      filename: 'bad"\r\nname.png',
      mimeType: "image/png",
      uploadedBy: "staff-1",
    });

    expect(capturedUrl).toBe("https://media.example.test/api/v1/media/upload");
    expect(capturedBody).toContain('filename="bad___name.png"');
    expect(result.publicUrl).toBe("https://media.example.test/uploads/abc.png");
  });
});
