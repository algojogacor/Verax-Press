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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:border focus:border-verity-ink focus:bg-verity-paper focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:uppercase focus:tracking-[0.08em] focus:text-verity-ink"
      >
        Lewati ke konten utama
      </a>
      <Masthead />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
