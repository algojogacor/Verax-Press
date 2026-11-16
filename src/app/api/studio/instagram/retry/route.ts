// POST /api/studio/instagram/retry: Mencoba ulang publikasi postingan Instagram yang gagal (Khusus Pemimpin Redaksi).
// Sesuai dengan pedoman docs/editorial/VERAX_WRITING_STANDARDS.md.

import { z } from "zod";
import { jsonError, ok, parseJsonBody, requireRole } from "@/lib/api";
import { retryFailedInstagramPost } from "@/lib/instagram-service";

export async function POST(request: Request) {
  try {
    await requireRole("CHIEF_EDITOR");
    const body = await parseJsonBody(
      request,
      z.object({
        postId: z.string().min(1, "ID postingan wajib disertakan."),
      })
    );

    const result = await retryFailedInstagramPost(body.postId);

    return ok(result);
  } catch (error) {
    return jsonError(error);
  }
}
