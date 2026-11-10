/**
 * Reset data demo Verity ke kondisi seed awal — TANPA menghapus file DB
 * (aman untuk dev server yang sedang berjalan; koneksi SQLite tetap valid).
 * Setelah reset, jalankan: bun run db:seed
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const db = new PrismaClient();

async function main() {
  console.log("→ Menghapus seluruh data transaksional…");
  // Urutan penting (FK): anak dulu.
  await db.auditEvent.deleteMany();
  await db.correctionRecord.deleteMany();
  await db.complaint.deleteMany();
  await db.submission.deleteMany();
  await db.mediaAsset.deleteMany();
  await db.sourceReference.deleteMany();
  await db.editorialReview.deleteMany();
  await db.reviewComment.deleteMany();
  await db.articleContribution.deleteMany();
  await db.articleVersion.deleteMany();
  await db.article.deleteMany();
  await db.apiClient.deleteMany();
  await db.person.deleteMany();
  await db.staffUser.deleteMany();
  await db.contributor.deleteMany();
  await db.desk.deleteMany();

  // Hapus secret demo lama dari .env.local agar seed menulis yang baru.
  const envPath = join(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, "utf8")
      .split("\n")
      .filter((line) => !line.startsWith("VERITY_INGESTION_DEMO_CLIENT"));
    writeFileSync(envPath, lines.join("\n").replace(/\n+$/, "\n"));
  }

  console.log("✓ Reset selesai. Jalankan: bun run db:seed");
}

main()
  .catch((error) => {
    console.error("Reset gagal:", error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
