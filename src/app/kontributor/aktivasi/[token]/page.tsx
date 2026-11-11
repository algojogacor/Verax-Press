// Halaman aktivasi undangan kontributor eksternal (Server Component wrapper dengan metadata noindex).
import type { Metadata } from "next";
import { ContributorActivationClient } from "@/components/contributor/contributor-activation-client";

export const metadata: Metadata = {
  title: "Aktivasi Akun Kontributor",
  description: "Aktivasi akun kontributor eksternal Verax Press.",
  robots: { index: false, follow: false },
};

export default async function ContributorActivationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ContributorActivationClient token={token} />;
}
