"use client";

// Mobile navigation: accessible disclosure menu for the public masthead.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import type { NavItem } from "@/components/site/desk-nav";

export function SiteMobileNav({ items = [] }: { items?: NavItem[] }) {
  const [open, setOpen] = useState(false);

  // Keyboard accessibility: close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Prevent background scroll when mobile nav is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Tutup menu navigasi" : "Buka menu navigasi"}
        className="flex size-9 items-center justify-center rounded-xs text-verity-ink transition-colors hover:bg-verity-paper-soft hover:text-verity-accent focus-visible:outline-2 focus-visible:outline-verity-accent"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {open && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity sm:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Navigation drawer modal */}
          <div
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigasi utama"
            className="fixed inset-x-0 top-0 z-50 max-h-[85vh] overflow-y-auto border-b-2 border-verity-ink bg-verity-paper shadow-xl sm:hidden"
          >
            <div className="flex items-center justify-between border-b border-verity-rule px-4 py-3">
              <span className="font-serif text-sm font-semibold tracking-[0.2em] text-verity-ink">
                VERAX PRESS
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-8 items-center justify-center rounded-xs text-verity-ink transition-colors hover:text-verity-accent focus-visible:outline-2 focus-visible:outline-verity-accent"
                aria-label="Tutup menu"
              >
                <X className="size-5" />
              </button>
            </div>

            <nav aria-label="Navigasi utama mobile" className="px-5 py-4">
              <ul className="divide-y divide-verity-rule">
                <li>
                  <Link
                    href="/"
                    onClick={() => setOpen(false)}
                    className="block py-2.5 font-serif text-[1rem] font-medium text-verity-ink hover:text-verity-accent"
                  >
                    Beranda
                  </Link>
                </li>
                {items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block py-2.5 font-serif text-[1rem] font-medium text-verity-ink hover:text-verity-accent"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/standar-editorial"
                    onClick={() => setOpen(false)}
                    className="block py-2.5 font-mono text-[12px] uppercase tracking-[0.1em] text-verity-ink-soft hover:text-verity-accent"
                  >
                    Standar Editorial
                  </Link>
                </li>
                <li>
                  <Link
                    href="/koreksi"
                    onClick={() => setOpen(false)}
                    className="block py-2.5 font-mono text-[12px] uppercase tracking-[0.1em] text-verity-ink-soft hover:text-verity-accent"
                  >
                    Catatan Koreksi
                  </Link>
                </li>
                <li>
                  <Link
                    href="/keluhan"
                    onClick={() => setOpen(false)}
                    className="block py-2.5 font-mono text-[12px] uppercase tracking-[0.1em] text-verity-ink-soft hover:text-verity-accent"
                  >
                    Hak Jawab &amp; Keluhan
                  </Link>
                </li>
                <li>
                  <Link
                    href="/kebijakan-ai"
                    onClick={() => setOpen(false)}
                    className="block py-2.5 font-mono text-[12px] uppercase tracking-[0.1em] text-verity-ink-soft hover:text-verity-accent"
                  >
                    Kebijakan AI
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pedoman-kontributor"
                    onClick={() => setOpen(false)}
                    className="block py-2.5 font-mono text-[12px] uppercase tracking-[0.1em] text-verity-ink-soft hover:text-verity-accent"
                  >
                    Pedoman Kontributor
                  </Link>
                </li>
                <li>
                  <Link
                    href="/kontak"
                    onClick={() => setOpen(false)}
                    className="block py-2.5 font-mono text-[12px] uppercase tracking-[0.1em] text-verity-ink-soft hover:text-verity-accent"
                  >
                    Kontak Redaksi
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </>
      )}
    </>
  );
}
