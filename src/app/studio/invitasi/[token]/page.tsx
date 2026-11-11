// Halaman aktivasi undangan staf redaksi (Server Component wrapper dengan metadata noindex).
import type { Metadata } from "next";
import { StaffActivationClient } from "@/components/studio/staff-activation-client";

export const metadata: Metadata = {
  title: "Aktivasi Akun Staf",
  description: "Aktivasi akun staf redaksi Verax Press melalui tautan undangan.",
  robots: { index: false, follow: false },
};

export default async function StaffActivationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <StaffActivationClient token={token} />;
}
