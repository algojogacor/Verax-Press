// Nav seksi publik: client component agar bisa menandai seksi aktif
// (underline ink via inset shadow, tanpa layout shift). Pola Guardian:
// halaman seksi menandai posisinya di navigasi.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string };

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  // /tentang juga mencakup sub-halaman kebijakan yang berada di bawahnya
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DeskNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <div className="relative w-full border-x border-verity-rule after:pointer-events-none after:absolute after:right-0 after:top-0 after:bottom-0 after:w-8 after:bg-gradient-to-l after:from-verity-paper after:to-transparent md:after:hidden">
      {/* Container navigasi: scroll horizontal di layar kecil dengan isyarat visual overflow dan distribusi proporsional di md ke atas */}
      <ul className="flex w-full items-stretch overflow-x-auto whitespace-nowrap divide-x divide-verity-rule md:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overscroll-x-contain">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="shrink-0 md:flex-1 md:shrink">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  "flex h-full items-center justify-center px-4 py-2.5 text-center text-[11px] font-medium uppercase tracking-[0.12em] transition-colors hover:bg-verity-paper-soft hover:text-verity-ink lg:px-5 lg:text-[12px] " +
                  (active
                    ? "bg-verity-paper-soft font-semibold text-verity-ink shadow-[inset_0_-2px_0_var(--color-verity-ink)]"
                    : "text-verity-ink-soft")
                }
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
