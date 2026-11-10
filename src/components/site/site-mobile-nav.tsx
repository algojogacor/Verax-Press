"use client";

// Mobile navigation: accessible disclosure menu for the public masthead.
import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import type { NavItem } from "@/components/site/desk-nav";

export function SiteMobileNav({ items = [] }: { items?: NavItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Tutup menu navigasi" : "Buka menu navigasi"}
        className="p-2 -ml-2 text-verity-ink hover:text-verity-accent transition-colors"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {open && (
        <div
          id="mobile-nav"
          className="sm:hidden fixed top-[110px] inset-x-0 z-50 bg-verity-paper border-b border-verity-rule shadow-md"
        >
          <nav aria-label="Navigasi utama mobile" className="px-4 py-3">
            <ul className="divide-y divide-verity-rule">
              <li>
                <Link
                  href="/"
                  onClick={() => setOpen(false)}
                  className="block py-2.5 text-sm font-medium text-verity-ink hover:text-verity-accent"
                >
                  Beranda
                </Link>
              </li>
              {items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block py-2.5 text-sm font-medium text-verity-ink hover:text-verity-accent"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/standar-editorial"
                  onClick={() => setOpen(false)}
                  className="block py-2.5 text-sm text-verity-ink-soft hover:text-verity-accent"
                >
                  Standar Editorial
                </Link>
              </li>
              <li>
                <Link
                  href="/koreksi"
                  onClick={() => setOpen(false)}
                  className="block py-2.5 text-sm text-verity-ink-soft hover:text-verity-accent"
                >
                  Catatan Koreksi
                </Link>
              </li>
              <li>
                <Link
                  href="/keluhan"
                  onClick={() => setOpen(false)}
                  className="block py-2.5 text-sm text-verity-ink-soft hover:text-verity-accent"
                >
                  Hak Jawab &amp; Keluhan
                </Link>
              </li>
              <li>
                <Link
                  href="/kebijakan-ai"
                  onClick={() => setOpen(false)}
                  className="block py-2.5 text-sm text-verity-ink-soft hover:text-verity-accent"
                >
                  Kebijakan AI
                </Link>
              </li>
              <li>
                <Link
                  href="/pedoman-kontributor"
                  onClick={() => setOpen(false)}
                  className="block py-2.5 text-sm text-verity-ink-soft hover:text-verity-accent"
                >
                  Pedoman Kontributor
                </Link>
              </li>
              <li>
                <Link
                  href="/kontak"
                  onClick={() => setOpen(false)}
                  className="block py-2.5 text-sm text-verity-ink-soft hover:text-verity-accent"
                >
                  Kontak Redaksi
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}
