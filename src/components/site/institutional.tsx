// Shared shell for institutional pages (about, standards, policies).
// Page titles share the display tier used by desk/opini fronts — one consistent
// "page event" scale across the publication reads as institutional confidence.
export function InstitutionalShell({
  kicker,
  title,
  intro,
  children,
}: {
  kicker: string
  title: string
  intro?: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-[1200px] px-4 md:px-6 pt-8 md:pt-12 pb-16">
      <header className="border-b-[3px] border-rule-strong pb-7 mb-9">
        <p className="kicker text-verity-accent">{kicker}</p>
        <h1 className="mt-2 font-serif font-semibold text-[2.2rem] leading-[1.08] tracking-[-0.01em] md:text-[3.2rem] md:tracking-[-0.015em]">
          {title}
        </h1>
        {intro && (
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-2">{intro}</p>
        )}
      </header>
      <div className="measure prose-verity">{children}</div>
    </div>
  )
}

export function InstH2({ children }: { children: React.ReactNode }) {
  return <h2 className="!mt-8">{children}</h2>
}

/** Legal aside — printed like a colophon footnote: hairlines above and below,
 *  no background box. The note stays part of the document's flow. */
export function LegalNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-10 border-y border-rule py-3.5 text-[12px] leading-relaxed text-ink-2">
      {children}
    </p>
  )
}
