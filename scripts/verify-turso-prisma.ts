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
  console.log("======================================================================");
  console.log("     VERAX PRESS — PRISMA CLIENT TURSO CLOUD VERIFICATION             ");
  console.log("======================================================================");

  console.log("\n1. Testing prisma.instagramPost.findMany()...");
  const posts = await prisma.instagramPost.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: { article: { select: { id: true, title: true, slug: true } } },
  });
  console.log("InstagramPost count in Turso Cloud:", posts.length);

  console.log("\n2. Testing prisma.apiClient.findMany()...");
  const clients = await prisma.apiClient.findMany({
    orderBy: { createdAt: "asc" },
  });
  console.log("ApiClient count in Turso Cloud:", clients.length);
  for (const c of clients) {
    console.log(`- [${c.name}] clientType: ${c.clientType}, publishMode: ${c.publishMode}, clientId: ${c.clientId}`);
  }

  console.log("\n3. Testing prisma.article.findMany() with relation to instagramPosts...");
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    include: {
      heroMedia: true,
      instagramPosts: true,
    },
    take: 5,
  });
  console.log("Published articles with relations:", articles.length);
  for (const a of articles) {
    console.log(`- [${a.slug}] "${a.title}" -> instagramPosts: ${a.instagramPosts.length}, heroMedia isGeneric: ${a.heroMedia?.isGeneric}`);
  }

  console.log("\n4. Testing prisma.mediaAsset.findMany()...");
  const assets = await prisma.mediaAsset.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  console.log("MediaAsset count:", assets.length);
  if (assets.length > 0) {
    console.log("Latest asset:", {
      id: assets[0].id,
      caption: assets[0].caption,
      isGeneric: assets[0].isGeneric,
    });
  }

  console.log("\n======================================================================");
  console.log("ALL PRISMA QUERIES SUCCEEDED AGAINST TURSO CLOUD!");
  console.log("======================================================================");
}

main()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
