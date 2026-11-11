// Layout Portal Kontributor (Server Component): menetapkan noindex untuk seluruh /kontributor/portal/*.
import type { Metadata } from "next";
import { ContributorPortalShell } from "@/components/contributor/portal-shell";

export const metadata: Metadata = {
  title: {
    default: "Portal Kontributor",
    template: "%s | Portal Kontributor | Verax Press",
  },
  robots: { index: false, follow: false },
};

export default function ContributorPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ContributorPortalShell>{children}</ContributorPortalShell>;
}
