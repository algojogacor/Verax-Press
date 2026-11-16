import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  checkPublishingLimit,
  createCarouselItemContainer,
  createCarouselParentContainer,
  waitForContainer,
  publishCarousel,
  getMediaPermalink,
  InstagramError,
  IG_GRAPH_URL,
} from "@/lib/instagram";
import {
  uploadSlideImage,
  uploadSlideImages,
  executeCarouselPublish,
  publishArticleToInstagram,
  getFailedInstagramPosts,
  getInstagramPostStatus,
  getPublicBaseUrl,
} from "@/lib/instagram-service";
import { db } from "@/lib/db";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

describe("Instagram Graph API Client (src/lib/instagram.ts)", () => {
  beforeEach(() => {
    process.env.IG_ACCESS_TOKEN = "test_ig_access_token";
    process.env.IG_USER_ID = "17841400000000000";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  it("throws InstagramError when credentials are missing", async () => {
    delete process.env.IG_ACCESS_TOKEN;
    expect(checkPublishingLimit()).rejects.toThrow(InstagramError);
  });

  it("checkPublishingLimit returns quota usage and total", async () => {
    globalThis.fetch = (async (url: string | URL) => {
      expect(url.toString()).toContain("/17841400000000000/content_publishing_limit");
      return new Response(
        JSON.stringify({
          data: [
            {
              config: { quota_total: 50, quota_duration: 86400 },
              quota_usage: 12,
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const quota = await checkPublishingLimit();
    expect(quota.total).toBe(50);
    expect(quota.used).toBe(12);
    expect(quota.remaining).toBe(38);
  });

  it("createCarouselItemContainer sends correct params and returns creation id", async () => {
    globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
      expect(url.toString()).toContain("/17841400000000000/media");
      expect(init?.method).toBe("POST");
      const body = new URLSearchParams(init?.body as string);
      expect(body.get("image_url")).toBe("https://veraxpress.vercel.app/test.png");
      expect(body.get("is_carousel_item")).toBe("true");
      expect(body.get("access_token")).toBe("test_ig_access_token");
      return new Response(JSON.stringify({ id: "child_container_123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const id = await createCarouselItemContainer("https://veraxpress.vercel.app/test.png");
    expect(id).toBe("child_container_123");
  });

  it("createCarouselParentContainer sends child ids and caption", async () => {
    globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
      expect(url.toString()).toContain("/17841400000000000/media");
      const body = new URLSearchParams(init?.body as string);
      expect(body.get("media_type")).toBe("CAROUSEL");
      expect(body.get("children")).toBe("child_1,child_2,child_3");
      expect(body.get("caption")).toBe("Investigasi terbaru Verax Press");
      return new Response(JSON.stringify({ id: "parent_container_456" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const id = await createCarouselParentContainer(
      ["child_1", "child_2", "child_3"],
      "Investigasi terbaru Verax Press"
    );
    expect(id).toBe("parent_container_456");
  });

  it("createCarouselParentContainer rejects less than 2 slides or more than 10 slides", async () => {
    expect(createCarouselParentContainer(["only_one"], "caption")).rejects.toThrow(InstagramError);
    const elevenSlides = Array(11).fill("child_id");
    expect(createCarouselParentContainer(elevenSlides, "caption")).rejects.toThrow(InstagramError);
  });

  it("waitForContainer polls until FINISHED", async () => {
    let callCount = 0;
    globalThis.fetch = (async () => {
      callCount++;
      if (callCount === 1) {
        return new Response(
          JSON.stringify({ id: "c1", status_code: "IN_PROGRESS" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ id: "c1", status_code: "FINISHED" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    await waitForContainer("c1", 5, 10);
    expect(callCount).toBe(2);
  });

  it("waitForContainer throws InstagramError on ERROR or EXPIRED status", async () => {
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({ id: "c1", status_code: "ERROR", status: "Transcode failed" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    expect(waitForContainer("c1", 3, 10)).rejects.toThrow(InstagramError);
  });

  it("publishCarousel posts creation_id and returns published media id", async () => {
    globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
      expect(url.toString()).toContain("/17841400000000000/media_publish");
      const body = new URLSearchParams(init?.body as string);
      expect(body.get("creation_id")).toBe("parent_container_456");
      return new Response(JSON.stringify({ id: "published_media_789" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const mediaId = await publishCarousel("parent_container_456");
    expect(mediaId).toBe("published_media_789");
  });

  it("getMediaPermalink retrieves permalink", async () => {
    globalThis.fetch = (async (url: string | URL) => {
      expect(url.toString()).toContain("/published_media_789");
      return new Response(
        JSON.stringify({ permalink: "https://www.instagram.com/p/ABC123xyz/" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const permalink = await getMediaPermalink("published_media_789");
    expect(permalink).toBe("https://www.instagram.com/p/ABC123xyz/");
  });

  it("InstagramError detects transient and media fetch failures", () => {
    const mediaFetchErr = new InstagramError("Error 9004", { fbCode: 9004 });
    expect(mediaFetchErr.isMediaFetchFailure).toBe(true);
    expect(mediaFetchErr.isTransient).toBe(true);

    const rateLimitErr = new InstagramError("User request limit", { fbCode: 17 });
    expect(rateLimitErr.isTransient).toBe(true);

    const serverErr = new InstagramError("Server error", { statusCode: 503 });
    expect(serverErr.isTransient).toBe(true);
  });
});

describe("Instagram Publishing Service (src/lib/instagram-service.ts)", () => {
  let testArticleId: string;

  beforeEach(async () => {
    process.env.IG_ACCESS_TOKEN = "test_ig_access_token";
    process.env.IG_USER_ID = "17841400000000000";
    delete process.env.VERAX_MEDIA_API_URL;
    delete process.env.VERAX_MEDIA_SECRET;

    // Create a published article in isolated test db
    const desk = await db.desk.findFirst() || await db.desk.create({
      data: { name: "Investigasi", slug: "investigasi" },
    });

    const article = await db.article.create({
      data: {
        title: "Investigasi Aliran Dana Proyek X",
        slug: `investigasi-aliran-dana-${Date.now()}`,
        status: "PUBLISHED",
        format: "NEWS",
        deskId: desk.id,
        publishedAt: new Date(),
      },
    });
    testArticleId = article.id;
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
    if (testArticleId) {
      await db.instagramPost.deleteMany({ where: { articleId: testArticleId } });
      await db.article.delete({ where: { id: testArticleId } }).catch(() => {});
    }
  });

  it("uploadSlideImage falls back to local storage when remote media is unconfigured", async () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const filename = `test_slide_${Date.now()}.png`;
    const publicUrl = await uploadSlideImage(pngBuffer, filename, testArticleId);

    expect(publicUrl).toContain(`/uploads/instagram/${filename}`);
    const localPath = path.join(process.cwd(), "public", "uploads", "instagram", filename);
    expect(existsSync(localPath)).toBe(true);
    unlinkSync(localPath);
  });

  it("executeCarouselPublish completes full 6-step Instagram carousel publish", async () => {
    const mockSteps: string[] = [];

    globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
      const urlStr = url.toString();
      if (urlStr.includes("/media_publish")) {
        mockSteps.push("publish");
        return new Response(JSON.stringify({ id: "media_inst_999" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (urlStr.includes("/media_inst_999")) {
        mockSteps.push("permalink");
        return new Response(
          JSON.stringify({ permalink: "https://www.instagram.com/p/INSTA_999/" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (init?.method === "POST" && urlStr.includes("/17841400000000000/media")) {
        const body = new URLSearchParams(init.body as string);
        if (body.get("media_type") === "CAROUSEL") {
          mockSteps.push("create_parent");
          return new Response(JSON.stringify({ id: "parent_100" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } else {
          mockSteps.push("create_child");
          return new Response(JSON.stringify({ id: `child_${mockSteps.length}` }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      }
      // Status check
      mockSteps.push("status_check");
      return new Response(JSON.stringify({ status_code: "FINISHED" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const res = await executeCarouselPublish(
      ["https://veraxpress.vercel.app/slide1.png", "https://veraxpress.vercel.app/slide2.png"],
      "Uji coba karosel"
    );

    expect(res.instagramMediaId).toBe("media_inst_999");
    expect(res.postUrl).toBe("https://www.instagram.com/p/INSTA_999/");
    expect(mockSteps).toContain("create_child");
    expect(mockSteps).toContain("create_parent");
    expect(mockSteps).toContain("publish");
    expect(mockSteps).toContain("permalink");
  });

  it("publishArticleToInstagram successfully records POSTED on success", async () => {
    globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
      const urlStr = url.toString();
      if (urlStr.includes("/media_publish")) {
        return new Response(JSON.stringify({ id: "media_inst_success" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (urlStr.includes("/media_inst_success")) {
        return new Response(
          JSON.stringify({ permalink: "https://www.instagram.com/p/SUCCESS/" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (init?.method === "POST" && urlStr.includes("/17841400000000000/media")) {
        return new Response(JSON.stringify({ id: `container_${Date.now()}` }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ status_code: "FINISHED" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const result = await publishArticleToInstagram({
      articleId: testArticleId,
      caption: "Caption berhasil",
      imageUrls: [
        "https://veraxpress.vercel.app/slide1.png",
        "https://veraxpress.vercel.app/slide2.png",
      ],
      maxRetries: 3,
      retryDelayMs: 0,
    });

    expect(result.status).toBe("POSTED");
    expect(result.postUrl).toBe("https://www.instagram.com/p/SUCCESS/");
    expect(result.attempts).toBe(1);

    // Verify database record
    const postInDb = await db.instagramPost.findUnique({
      where: { id: result.instagramPostId },
    });
    expect(postInDb?.status).toBe("POSTED");
    expect(postInDb?.attempts).toBe(1);
    expect(postInDb?.postUrl).toBe("https://www.instagram.com/p/SUCCESS/");
    expect(postInDb?.instagramMediaId).toBe("media_inst_success");
  });

  it("publishArticleToInstagram enforces idempotency (rejects if already POSTED with 409)", async () => {
    await db.instagramPost.create({
      data: {
        articleId: testArticleId,
        status: "POSTED",
        postUrl: "https://www.instagram.com/p/EXISTING/",
      },
    });

    expect(
      publishArticleToInstagram({
        articleId: testArticleId,
        caption: "Duplikasi postingan",
        imageUrls: [
          "https://veraxpress.vercel.app/slide1.png",
          "https://veraxpress.vercel.app/slide2.png",
        ],
      })
    ).rejects.toThrow("Artikel ini sudah berhasil dipublikasikan ke Instagram sebelumnya.");
  });

  it("publishArticleToInstagram auto-retries up to 3 times on transient errors and marks FAILED on 3rd failure", async () => {
    let callAttempts = 0;
    globalThis.fetch = (async () => {
      callAttempts++;
      return new Response(
        JSON.stringify({
          error: {
            message: "Temporary Meta server error",
            code: 2,
            type: "OAuthException",
          },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const result = await publishArticleToInstagram({
      articleId: testArticleId,
      caption: "Caption gagal",
      imageUrls: [
        "https://veraxpress.vercel.app/slide1.png",
        "https://veraxpress.vercel.app/slide2.png",
      ],
      maxRetries: 3,
      retryDelayMs: 1,
    });

    expect(result.status).toBe("FAILED");
    expect(result.attempts).toBe(3);
    expect(result.lastError).toContain("Temporary Meta server error");

    // Verify database record
    const postInDb = await db.instagramPost.findUnique({
      where: { id: result.instagramPostId },
    });
    expect(postInDb?.status).toBe("FAILED");
    expect(postInDb?.attempts).toBe(3);
    expect(postInDb?.lastError).toContain("Temporary Meta server error");

    // Verify alert query detects failed post
    const failedPosts = await getFailedInstagramPosts(5);
    expect(failedPosts.some((p) => p.id === result.instagramPostId)).toBe(true);
  });
});
