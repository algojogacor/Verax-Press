// Nav seksi publik — client component agar bisa menandai seksi aktif
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
    <ul className="verity-scroll flex items-stretch gap-0 overflow-x-auto whitespace-nowrap [&>li:last-child>a]:border-r-0">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={
                "block border-r border-verity-rule px-5 py-2.5 text-[12px] font-medium uppercase tracking-[0.12em] transition-colors first:pl-0 hover:bg-verity-paper-soft hover:text-verity-ink " +
                (active
                  ? "text-verity-ink shadow-[inset_0_-2px_0_var(--color-verity-ink)]"
                  : "text-verity-ink-soft")
              }
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
