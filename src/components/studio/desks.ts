// Daftar desk aktif untuk form studio — via endpoint publik /api/public/desks
// (satu-satunya sumber resmi daftar desk untuk UI; tidak ada hardcode).
"use client";

import { useQuery } from "@tanstack/react-query";

export interface StudioDesk {
  slug: string;
  name: string;
}

export function useDesks() {
  return useQuery({
    queryKey: ["desks"],
    queryFn: async (): Promise<StudioDesk[]> => {
      const response = await fetch("/api/public/desks");
      if (!response.ok) throw new Error("Gagal memuat daftar desk.");
      const data = (await response.json()) as { desks: StudioDesk[] };
      return data.desks;
    },
    staleTime: 5 * 60 * 1000,
  });
}
