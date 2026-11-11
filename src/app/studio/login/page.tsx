// Halaman masuk studio (Server Component wrapper dengan metadata noindex).
import type { Metadata } from "next";
import { StudioLoginClient } from "@/components/studio/studio-login-client";

export const metadata: Metadata = {
  title: "Masuk Studio Redaksi",
  description: "Halaman masuk internal khusus staf redaksi Verax Press.",
  robots: { index: false, follow: false },
};

export default function StudioLoginPage() {
  return <StudioLoginClient />;
}
