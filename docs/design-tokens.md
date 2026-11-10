# Verity Design Tokens

Arah: editorial profesional ala NYT/Guardian/Reuters/BBC — **disederhanakan, tanpa dekorasi**.
Prinsip: hierarki lewat tipografi & posisi; warna hanya untuk fungsi; whitespace disengaja;
hairline rules sebagai separator; DILARANG gradient, glassmorphism, kartu membulat besar,
shadow pada kartu, dan pola dashboard generik.

## Token (terpasang di `src/app/globals.css` sebagai Tailwind 4 theme)

| Token | Nilai | Fungsi |
|---|---|---|
| `bg-verity-paper` | `#FBFAF8` | Latar halaman (kertas hangat) |
| `bg-verity-paper-soft` | `#F4F2EC` | Latar sekunder (box note, hover) |
| `text-verity-ink` | `#161310` | Teks utama |
| `text-verity-ink-soft` | `#5A554B` | Teks sekunder/deck |
| `text-verity-ink-faint` | `#8B8577` | Meta/mono faint |
| `border-verity-rule` | `#E5E1D6` | Hairline separator |
| `border-verity-rule-strong` | `#C9C4B4` | Rule lebih tegas |
| `text-verity-accent` / `bg-verity-accent` | `#9E2B25` | Aksen fungsional: link aktif, kicker opini, koreksi, DISPUTED |
| `text-verity-accent-deep` | `#7C1F1A` | Hover link |
| `text-verity-verified` | `#1E6B45` | Status VERIFIED |
| `text-verity-unverified` | `#8A6D1A` | Status UNVERIFIED |
| `text-verity-disputed` | `#9E2B25` | Status DISPUTED |

Font (via `next/font`, sudah di root layout):
- `font-serif` → **Newsreader** — headline & body artikel.
- `font-sans` → **Inter** — UI, nav, label.
- `font-mono` → **IBM Plex Mono** — tanggal, waktu, refCode, kicker teknis, meta.

Radius: maksimum `rounded-[2px]`. Border `border` default = `--verity-rule`. Shadow: tidak
ada pada kartu (hanya shadow bawaan shadcn untuk popover/menu).

## Identitas klasik Verax Press (rebrand Tahap A-2, Nov 2026)

- **Nama tampil**: "Verax Press" (dari Latin *verax* — jujur, yang berkata benar).
- **Motto**: *Ex Fontibus Veritas* ("kebenaran bersumber dari sumbernya") —
  mono caps kecil tracking 0.32em, di masthead (dengan hairline flank di ≥sm)
  dan footer. Dipakai sebagai elemen identitas, BUKAN pada tiap section heading.
- **Masthead** (urutan broadsheet klasik): baris utilitas → motto → wordmark
  "VERAX PRESS" (serif 600; mobile 1.65rem tracking 0.14em, desktop 2.6–3rem
  tracking 0.24em; `pl-[tracking]` untuk pusat optik) → baris tanggal +
  `Est. MMXXVI` → nav dengan `border-t-2 border-verity-ink`.
- **Drop cap**: paragraf pembuka artikel ≥80 karakter —
  `first-letter:float-left first-letter:text-[5rem] first-letter:leading-[0.76] first-letter:font-semibold first-letter:mr-3`
  (line-box ≈ 2 baris body agar wrap rapi). Jangan pada pembuka pendek.
- **End mark (tombstone)**: persegi `h-[9px] w-[9px] bg-verity-ink` setelah
  blok konten terakhir (`ContentRenderer endMark`).
- **Headline besar memakai `text-balance`** (lead homepage, H1 artikel) untuk
  menghindari baris widow pendek.
- Nama teknis yang TIDAK ikut rebrand: class CSS `*-verity-*`, env `VERITY_*`,
  email demo `@verity.test`, password dev, `AUTH_SECRET` fallback, clientId
  `vrtc_demo_agent`, default byline di schema (lihat worklog §13).

## Pola tipografi publik (setelah hardening Tahap-A, Nov 2026)

Kaskade skala homepage (desktop 1440px, terukur di browser):

| Tier | Pola | Ukuran aktual |
|---|---|---|
| Lead homepage | `font-serif font-semibold leading-[1.06] tracking-[-0.015em]` `text-[2.15rem] sm:text-[3.25rem] lg:text-[3.5rem]` | 56px |
| Headline artikel | `font-serif text-[2.15rem] sm:text-[2.9rem] leading-[1.08] tracking-[-0.015em]` | 46.4px |
| H1 halaman desk/opini | `font-serif text-[2.2rem] sm:text-[2.6rem] leading-[1.08]` | 41.6px |
| Featured (unggulan seksi/desk) | `font-serif text-[1.55rem] sm:text-[1.7rem]` | 27.2px |
| Standard/row card | `font-serif text-[1.3rem]` | 20.8px |
| Item opini band | `font-serif text-[1.2rem]` | 19.2px |
| Compact/rail | `font-serif text-[1.05rem] font-medium` | 16.8px |

Konvensi famili: **sans = struktur/chrome** (nav, section heading, label), **serif = konten** (headline, deck, body) — section heading kecil tidak menyaingi headline.

- Deck/standfirst: `font-serif italic text-verity-ink-soft` (lead 1.2–1.35rem; artikel 1.2/1.3rem)
- Body artikel: `font-serif text-[1.0625rem] leading-[1.78]` dalam wrapper `max-w-(--measure-article)` (66ch)
- **Kicker**: `font-mono text-[12px] font-medium uppercase tracking-[0.18em]` (desk `text-verity-ink-soft`, format `text-verity-ink-faint`, opini `text-verity-accent`). Di DALAM seksi desk kicker hanya menampilkan FORMAT (nama desk sudah diucapkan heading seksi).
- Meta/byline: `font-mono text-[11px] text-verity-ink-faint`
- **Section heading**: `font-sans text-[0.85rem] font-semibold uppercase tracking-[0.2em]` + `border-b-2 border-verity-ink` — label kecil-tapi-tegas (pola NYT), BUKAN serif besar yang menyaingi headline.
- Rail "Terbaru": item mono `formatRailTimestamp()` ("Hari ini · 08.12" / "Kemarin · 17.12" / "8 Nov") — identitas ticker.

## Pola layout

- Kontainer: `mx-auto max-w-6xl px-4 sm:px-6`.
- **Sistem bobot garis**: (1) berat `border-b-2 border-verity-ink` — section heading & anchor header halaman; (2) **rule ganda klasik** `2px ink + jeda 3px + hairline` (full-bleed) — pembuka seksi Opini; (3) sedang `border-verity-rule-strong` — pemisah zona besar (bawah paket utama, pull-quote, strip koreksi); (4) hairline `border-verity-rule` — separator item dalam seksi. Rule tebal 2px di halaman artikel HANYA untuk seksi “Sumber & Verifikasi” (bagian dari janji artikel) — seksi navigasi (“Lainnya dari desk”) memakai hairline + label small-caps sans.
- **Homepage = surat kabar terkurasi**: paket utama (lead dominan + 2 headline sekunder + rail Terbaru) → seksi desk dengan napas yang tidak seragam (72px visual setelah paket utama = membuka babak liputan; 56px antar-seksi; 64px sebelum band Opini) → seksi PERTAMA selalu **showcase** (`featured-list` + standfirst `Desk.description` — teks pengantar hanya muncul di sana) → rotasi layout anti-pengulangan-bersebelahan (`solo`/`featured-list`/`grid`/`rows`; grid hanya untuk jumlah genap) → band Opini **tanpa latar warna**: rule ganda + label serif italic “Opini” + disclaimer di baris header (pola NYT/Guardian opinion) → strip koreksi.
- **Dedup homepage**: lead & headline sekunder tidak mengulang di seksi; seksi desk hanya liputan redaksi (opini hidup di band Opini); rail Terbaru boleh tumpang-tindih (konvensi ticker koran).
- **Halaman desk: tiering 3 tingkat** — header anchor (rule 2px + standfirst italic) → featured (utuh) → 2 kartu dengan deck (hairline atas MILIK KARTU — tanpa border level grid, hindari dua hairline bertumpuk) → ekor indeks ringkas 3-kolom (compact, byline+tanggal) untuk artikel lebih lama. Halaman /opini: header anchor + unggulan + grid opini.
- Nav masthead: seksi aktif ditandai `aria-current="page"` + underline ink via `shadow-[inset_0_-2px_0_...]` (tanpa layout shift).
- Sticky footer: layout publik memakai `flex min-h-screen flex-col` + footer `mt-auto` (sudah di `(public)/layout.tsx`).

## Ritme isi artikel (ContentRenderer — Tahap 2)

Wrapper konten TIDAK memakai `space-y` seragam; margin per-blok kontekstual
(margin sibling collapse, jarak aktual = max(mb-blok-sebelumnya, mt-blok-berikutnya)):

| Blok | Margin | Rasio
|---|---|---|
| Paragraf | mt-6 (mt-0 bila blok pertama / setelah heading) | beat prosa 24px |
| H2 pertama artikel | **mt-12** + mb-3.5 | “act break” 48px — transisi prosa pembuka → tubuh |
| H2 berikutnya | mt-9 + mb-3.5 | 36px atas / 14px bawah — heading MEMELUK kontennya |
| H3 | mt-7 + mb-2.5 | sub-heading lebih ringan |
| Pull-quote | my-10, interior `mx-auto max-w-[42ch] text-center` py-8 | jeda set-piece 40px, terpusat — bukan separator body |
| List | mt-5 (mt-0 setelah heading) | menggantung pada pengantarnya |
| Note / Image | my-9 (mb-0 bila blok terakhir + end mark) | jeda 36px |
| QA | mt-8 (mt-6 bila qa berturut) + border-t | |
| End mark | `mt-3 block` — display:block agar jarak tepat 12px tanpa line-box anonim; blok berbingkai terakhir melepas mb-nya | tombstone menempel |

## Studio (CMS)

- Light/dark didukung (shadcn tokens sudah disetel); nuansa tetap kertas/tinta.
- Data tabel & form memakai komponen shadcn/ui (`src/components/ui/*` — sudah lengkap).
- Label status pakai `STATUS_LABELS` + warna titik status dari `src/lib/format.ts` (`statusDotClass`).
- Daftar panjang: `max-h-96 overflow-y-auto verity-scroll` (scrollbar custom).

## Komponen yang SUDAH ada (WAJIB dipakai, jangan duplikat)

- `src/components/site/masthead.tsx` — `<Masthead />` (async server component)
- `src/components/site/desk-nav.tsx` — `<DeskNav items />` (client; state aktif via `usePathname`)
- `src/components/site/site-footer.tsx` — `<SiteFooter />` (async)
- `src/components/site/article-card.tsx` — `LeadArticleCard`, `FeaturedArticleCard`, `StandardArticleCard`, `RowArticleCard`, `CompactArticleCard` (prop `ticker`), `OpinionArticleCard`, `SectionHeading`, type `PublicArticle`
- `src/components/content/content-renderer.tsx` — `<ContentRenderer content={blocks} />`
- `src/lib/format.ts` — `formatDate`, `formatDateTime`, `formatShortDate`, `formatMastheadDate`, `formatRailTimestamp`
- `src/lib/domain/constants.ts` — semua label + `OPINION_DISCLAIMER`, `AI_SUBSTANTIVE_NOTE_DEFAULT`

Halaman referensi yang SUDAH jadi (tiru polanya): `/` (homepage), `/artikel/[slug]`.
