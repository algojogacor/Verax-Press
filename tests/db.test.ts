import { beforeAll, describe, expect, it } from "bun:test";
import { db } from "../src/lib/db";
import { seedTestFixtures } from "./lib/test-db";

describe("Database & Domain Persistence", () => {
  beforeAll(async () => {
    await seedTestFixtures();
  });
  it("queries active editorial desks", async () => {
    const desks = await db.desk.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    expect(desks.length).toBeGreaterThanOrEqual(3);
    const slugs = desks.map((d) => d.slug);
    expect(slugs).toContain("hukum-keadilan");
    expect(slugs).toContain("teknologi-kebijakan");
    expect(slugs).toContain("nasional-publik");
  });

  it("persists and queries articles with related desk", async () => {
    const desk = await db.desk.findFirstOrThrow({ where: { slug: "hukum-keadilan" } });
    const testArticle = await db.article.create({
      data: {
        slug: `test-db-persistence-${Date.now()}`,
        title: "Test Article Persistence",
        deskId: desk.id,
        format: "NEWS",
        contentJson: JSON.stringify([{ type: "paragraph", text: "Test content." }]),
      },
    });

    try {
      const articles = await db.article.findMany({
        where: { id: testArticle.id },
        include: { desk: true },
      });

      expect(articles.length).toBeGreaterThan(0);
      expect(articles[0].desk).toBeDefined();
      expect(articles[0].desk.name).toBe(desk.name);
    } finally {
      await db.article.delete({ where: { id: testArticle.id } });
    }
  });
});
