import { describe, expect, it } from "bun:test";
import { db } from "../src/lib/db";

describe("Database & Domain Persistence", () => {
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

  it("queries seeded articles with related desk", async () => {
    const articles = await db.article.findMany({
      take: 5,
      include: { desk: true },
    });

    expect(articles.length).toBeGreaterThan(0);
    expect(articles[0].desk).toBeDefined();
    expect(articles[0].desk.name).toBeDefined();
  });
});
