// Halaman masuk Portal Kontributor (Server Component wrapper dengan metadata noindex).
import type { Metadata } from "next";
import { ContributorLoginClient } from "@/components/contributor/contributor-login-client";

export const metadata: Metadata = {
  title: "Masuk Portal Kontributor",
  description: "Halaman masuk Portal Penulis Kontributor Eksternal Verax Press.",
  robots: { index: false, follow: false },
};

export default function ContributorLoginPage() {
  return <ContributorLoginClient />;
}
