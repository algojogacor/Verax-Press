// Authenticated server-side proxy for private media previews.
// Keeps the HMAC secret strictly server-side while allowing authorized staff to preview.
import { db } from "@/lib/db";
import { requireSession } from "@/lib/api";
import { fetchPrivateMediaStream } from "@/lib/media-client";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSession();
    if (user.role !== "CHIEF_EDITOR" && user.role !== "EDITOR" && user.role !== "INTERNAL_AUTHOR") {
      return new Response("Unauthorized", { status: 403 });
    }

    const { id } = await params;
    const asset = await db.mediaAsset.findUnique({ where: { id } });
    if (!asset) {
      return new Response("Not Found", { status: 404 });
    }

    if (!asset.storageKey?.startsWith("media/")) {
      // Local fallback file
      return Response.redirect(new URL(asset.url, req.url), 302);
    }

    const remoteId = asset.storageKey.replace(/^media\//, "");
    const remoteRes = await fetchPrivateMediaStream(remoteId);

    const headers = new Headers();
    headers.set("Content-Type", remoteRes.headers.get("Content-Type") || asset.mimeType || "image/jpeg");
    headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate");
    headers.set("X-Content-Type-Options", "nosniff");

    return new Response(remoteRes.body, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    return new Response(err.message || "Failed to stream private media", { status: 500 });
  }
}
