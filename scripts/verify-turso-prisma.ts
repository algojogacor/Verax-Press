import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.production" });
dotenv.config();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  throw new Error("Missing TURSO credentials in environment");
}

const adapter = new PrismaLibSQL({ url, authToken });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("1. Testing prisma.mediaAsset.findMany()...");
  const assets = await prisma.mediaAsset.findMany({
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  console.log("MediaAsset count:", assets.length);
  if (assets.length > 0) {
    console.log("First asset:", {
      id: assets[0].id,
      caption: assets[0].caption,
      isGeneric: assets[0].isGeneric,
    });
  }

  console.log("\n2. Testing prisma.apiClient.findMany()...");
  const clients = await prisma.apiClient.findMany();
  console.log("ApiClient count:", clients.length);
  for (const c of clients) {
    console.log(`- ${c.name}: publishMode = ${c.publishMode}`);
  }

  console.log("\n3. Testing prisma.article.findMany() with heroMedia inclusion...");
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    include: { heroMedia: true },
    take: 5,
  });
  console.log("Published articles with heroMedia:", articles.length);
  for (const a of articles) {
    console.log(`- [${a.slug}] heroMedia isGeneric: ${a.heroMedia?.isGeneric}`);
  }

  console.log("\nALL PRISMA QUERIES SUCCEEDED AGAINST TURSO CLOUD!");
}

main()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
