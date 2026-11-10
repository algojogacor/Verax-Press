// GET /api/public/desks — daftar desk aktif (publik, tanpa data sensitif).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const desks = await db.desk.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { slug: true, name: true },
  });
  return NextResponse.json({ desks });
}
