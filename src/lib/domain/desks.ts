// Kueri terdeduplikasi per-request untuk daftar desk aktif.
import { cache } from "react";
import { db } from "@/lib/db";

export const getActiveDesks = cache(async () => {
  return db.desk.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
    },
  });
});
