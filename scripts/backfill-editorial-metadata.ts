#!/usr/bin/env bun
/**
 * Verax Press — Skrip CLI Backfill Metadata Editorial
 *
 * Menjalankan backfill metadata (topics, entities, centralQuestion, editorialAngle)
 * untuk artikel terbit pada basis data lokal SQLite (db/custom.db dan/atau db/isolated-test.db).
 *
 * Penggunaan:
 *   bun scripts/backfill-editorial-metadata.ts [opsi]
 *
 * Opsi:
 *   --db=<path>        Target berkas basis data SQLite (default: db/custom.db)
 *   --all              Menjalankan backfill pada db/custom.db dan db/isolated-test.db
 *   --dry-run          Simulasi tanpa mengubah basis data
 *   --article-id=<id>  Menjalankan backfill hanya untuk artikel tertentu
 *   --help             Menampilkan bantuan
 */

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  runEditorialBackfill,
  type BackfillSummary,
} from "../src/lib/editorial-backfill";

interface CliArgs {
  targetDbs: string[];
  dryRun: boolean;
  articleId?: string;
  showHelp: boolean;
}

function parseCliArgs(): CliArgs {
  const rawArgs = process.argv.slice(2);
  let dbArg: string | undefined;
  let allDbs = false;
  let dryRun = false;
  let articleId: string | undefined;
  let showHelp = false;

  for (const arg of rawArgs) {
    if (arg === "--help" || arg === "-h") {
      showHelp = true;
    } else if (arg === "--all") {
      allDbs = true;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg.startsWith("--db=")) {
      dbArg = arg.slice(5).trim();
    } else if (arg.startsWith("--article-id=")) {
      articleId = arg.slice(13).trim();
    }
  }

  const targetDbs: string[] = [];
  if (allDbs) {
    targetDbs.push("db/custom.db", "db/isolated-test.db");
  } else if (dbArg) {
    targetDbs.push(dbArg);
  } else {
    targetDbs.push("db/custom.db");
  }

  return {
    targetDbs,
    dryRun,
    articleId,
    showHelp,
  };
}

function assertSafeLocalDatabase(targetPath: string): void {
  const normalized = targetPath.toLowerCase();
  if (
    normalized.includes("turso") ||
    normalized.includes("libsql://") ||
    normalized.includes(".turso.io")
  ) {
    throw new Error(
      `KEAMANAN FATAL: Menolak menjalankan backfill pada basis data produksi remote! Target: ${targetPath}`,
    );
  }
}

function createSafetyBackup(dbFilePath: string): string | null {
  const absolutePath = path.resolve(dbFilePath);
  if (!fs.existsSync(absolutePath)) return null;

  const backupDir = path.resolve("db/backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const baseName = path.basename(absolutePath, ".db");
  const timestamp = Date.now();
  const backupFile = path.join(
    backupDir,
    `${baseName}_backfill_backup_${timestamp}.bak`,
  );

  fs.copyFileSync(absolutePath, backupFile);
  return backupFile;
}

async function runBackfillOnDatabase(
  dbRelativePath: string,
  options: { dryRun: boolean; articleId?: string },
): Promise<BackfillSummary> {
  assertSafeLocalDatabase(dbRelativePath);

  const absolutePath = path.resolve(dbRelativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Berkas basis data tidak ditemukan: ${absolutePath}`);
  }

  console.log(`\n======================================================`);
  console.log(`Memproses basis data: ${dbRelativePath}`);
  console.log(`Mode simulasi (dry-run): ${options.dryRun ? "YA" : "TIDAK"}`);
  if (options.articleId) {
    console.log(`Filter artikel ID: ${options.articleId}`);
  }

  if (!options.dryRun) {
    const backup = createSafetyBackup(dbRelativePath);
    if (backup) {
      console.log(`Cadangan keselamatan dibuat di: ${backup}`);
    }
  }

  const formattedUrl = `file:${absolutePath.replace(/\\/g, "/")}`;
  const client = new PrismaClient({
    datasources: { db: { url: formattedUrl } },
    log: ["error"],
  });

  try {
    const summary = await runEditorialBackfill({
      prismaClient: client,
      dryRun: options.dryRun,
      articleId: options.articleId,
    });

    console.log(`\nHasil Ringkasan Backfill untuk ${dbRelativePath}:`);
    console.log(`- Total artikel dipindai: ${summary.totalScanned}`);
    console.log(`- Artikel berstatus terbit sah: ${summary.publishedCount}`);
    console.log(`- Berhasil diperbarui: ${summary.updatedCount}`);
    console.log(`- Dilewati (sudah terisi lengkap): ${summary.skippedAlreadyPopulated}`);
    console.log(`- Dilewati (berstatus verified): ${summary.skippedVerified}`);
    console.log(`- Dilewati (bukan artikel terbit): ${summary.skippedNotPublished}`);

    if (summary.results.length > 0) {
      console.log(`\nRincian Tindakan per Artikel:`);
      for (const item of summary.results) {
        const actionLabel =
          item.status === "updated"
            ? `DIPERBARUI (${item.fieldsUpdated.join(", ")})`
            : item.status === "skipped_already_populated"
              ? "DILEWATI (Metadata Lengkap)"
              : item.status === "skipped_verified"
                ? "DILEWATI (Status Verified)"
                : "DILEWATI (Bukan Artikel Terbit)";

        console.log(`  * [${actionLabel}] ${item.slug}`);
        if (item.status === "updated") {
          if (item.extracted.topics) {
            console.log(`    - Topik: ${JSON.stringify(item.extracted.topics)}`);
          }
          if (item.extracted.entities) {
            console.log(`    - Entitas: ${JSON.stringify(item.extracted.entities)}`);
          }
          if (item.extracted.centralQuestion) {
            console.log(`    - Pertanyaan Sentral: ${item.extracted.centralQuestion}`);
          }
          if (item.extracted.editorialAngle) {
            console.log(`    - Sudut Pandang: ${item.extracted.editorialAngle}`);
          }
        }
      }
    }

    return summary;
  } finally {
    await client.$disconnect();
  }
}

async function main(): Promise<void> {
  const args = parseCliArgs();

  if (args.showHelp) {
    console.log(`Verax Press — Skrip CLI Backfill Metadata Editorial`);
    console.log(`Penggunaan: bun scripts/backfill-editorial-metadata.ts [opsi]\n`);
    console.log(`Opsi:`);
    console.log(`  --db=<path>        Target basis data (default: db/custom.db)`);
    console.log(`  --all              Menjalankan pada db/custom.db dan db/isolated-test.db`);
    console.log(`  --dry-run          Simulasi tanpa mutasi basis data`);
    console.log(`  --article-id=<id>  Hanya memproses artikel dengan ID tersebut`);
    console.log(`  --help             Menampilkan bantuan ini`);
    process.exit(0);
  }

  console.log(`Memulai proses backfill metadata editorial Verax Press...`);

  for (const targetDb of args.targetDbs) {
    try {
      await runBackfillOnDatabase(targetDb, {
        dryRun: args.dryRun,
        articleId: args.articleId,
      });
    } catch (err) {
      console.error(`Gagal memproses basis data ${targetDb}:`, err);
      process.exit(1);
    }
  }

  console.log(`\nSeluruh proses backfill selesai dengan tertib.`);
}

if (import.meta.main) {
  main().catch((err) => {
    console.error("Terjadi galat tak terduga saat backfill:", err);
    process.exit(1);
  });
}
