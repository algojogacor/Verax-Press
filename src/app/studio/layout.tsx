// Layout root studio (Server Component): memblokir pengindeksan mesin pencari di seluruh rute /studio/*.
import type { Metadata } from "next";
import { StudioProviders } from "@/components/studio/studio-providers";

export const metadata: Metadata = {
  title: {
    default: "Studio Redaksi",
    template: "%s | Studio Redaksi | Verax Press",
  },
  robots: { index: false, follow: false },
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <StudioProviders>{children}</StudioProviders>;
}
