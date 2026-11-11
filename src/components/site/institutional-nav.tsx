"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { INSTITUTIONAL_LINKS } from "@/components/site/institutional-links";

export function InstitutionalNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Menu navigasi lembaga" className="mt-4">
      <ul className="space-y-2.5 border-l border-verity-rule pl-3">
        {INSTITUTIONAL_LINKS.map((link) => {
          const isCurrent = pathname === link.href;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={isCurrent ? "page" : undefined}
                className={
                  isCurrent
                    ? "block font-serif text-[0.95rem] font-semibold text-verity-ink underline underline-offset-4 decoration-verity-accent"
                    : "block font-serif text-[0.95rem] text-verity-ink-soft hover:text-verity-accent hover:underline underline-offset-4"
                }
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
