// Formulir pengajuan kontributor eksternal (noindex, follow; kanonik diarahkan ke halaman formulir ini,
// sementara halaman indeksabilitas informasi kontributor berada di /kirim-tulisan).
import type { Metadata } from "next";
import { ContributorApplicationClient } from "@/components/contributor/contributor-application-client";

export const metadata: Metadata = {
  title: "Pendaftaran Kontributor Eksternal",
  description:
    "Formulir permohonan bergabung sebagai kontributor eksternal di Verax Press. Panduan lengkap tersedia pada halaman Kirim Tulisan.",
  alternates: { canonical: "/kontributor/daftar" },
  robots: { index: false, follow: true },
};

export default function ContributorApplicationPage() {
  return <ContributorApplicationClient />;
}
