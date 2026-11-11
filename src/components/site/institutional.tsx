import { InstitutionalNav } from "@/components/site/institutional-nav";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { canonicalUrl } from "@/lib/seo/constants";
import { buildBreadcrumbJsonLd } from "@/lib/seo/structured-data";

export { INSTITUTIONAL_LINKS } from "@/components/site/institutional-links";

// Shared shell for institutional pages (about, standards, policies).
// Balanced two-column editorial layout: reading content on the left,
// institutional navigation directory and motto on the right.
export function InstitutionalShell({
  kicker,
  title,
  intro,
  canonicalPath,
  breadcrumbLabel,
  children,
}: {
  kicker: string;
  title: string;
  intro?: string;
  canonicalPath?: string;
  breadcrumbLabel?: string;
  children: React.ReactNode;
}) {
  const crumbTitle = breadcrumbLabel ?? title;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {canonicalPath ? (
        <JsonLd
          data={buildBreadcrumbJsonLd([
            { name: "Beranda", url: canonicalUrl("/") },
            { name: crumbTitle, url: canonicalUrl(canonicalPath) },
          ])}
        />
      ) : null}
      <Breadcrumbs items={[{ label: "Beranda", href: "/" }, { label: crumbTitle }]} />
      <header className="border-b-2 border-verity-ink pb-8 mb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-verity-accent">{kicker}</p>
        <h1 className="mt-3 font-serif font-semibold text-[2.2rem] leading-[1.08] tracking-[-0.012em] sm:text-[2.8rem]">
          {title}
        </h1>
        {intro && (
          <p className="mt-4 max-w-3xl font-serif text-[1.1rem] leading-[1.7] text-verity-ink-soft">{intro}</p>
        )}
      </header>

      {/* Grid 2 Kolom di Desktop (lg:) */}
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-14">
        {/* Kolom Isi Utama */}
        <div className="min-w-0 prose-verity">{children}</div>

        {/* Sidebar Navigasi Lembaga */}
        <aside aria-label="Direktori kebijakan" className="hidden lg:block lg:border-l lg:border-verity-rule lg:pl-8">
          <div className="sticky top-6 space-y-8">
            <div>
              <p className="font-sans text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-verity-ink-soft">
                Direktori Lembaga
              </p>
              <InstitutionalNav />
            </div>

            <div className="border border-verity-rule bg-verity-paper-soft p-5">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-verity-ink">
                Ex Fontibus Veritas
              </p>
              <p className="mt-2 font-serif text-[0.88rem] leading-relaxed text-verity-ink-soft">
                Verax Press berpegang pada disiplin verifikasi sumber primer dan transparansi redaksional.
                Seluruh kebijakan terikat pada komitmen jurnalisme independen.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function InstH2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8">{children}</h2>;
}

/** Legal aside: printed like a colophon footnote: hairlines above and below,
 *  no background box. The note stays part of the document's flow. */
export function LegalNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-10 border-y border-verity-rule py-3.5 text-[12px] leading-relaxed text-verity-ink-soft">
      {children}
    </p>
  );
}
