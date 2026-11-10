// Layout publik: masthead + konten + footer yang menempel bawah (sticky footer).
import { Masthead } from "@/components/site/masthead";
import { SiteFooter } from "@/components/site/site-footer";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-verity-paper">
      <Masthead />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
