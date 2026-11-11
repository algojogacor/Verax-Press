# Verity — Worklog (Continuity Antar-Sesi)

> **REBRAND (10 Nov 2026): produk kini bernama "Verax Press"** (sebelumnya "Verity"). Semua teks yang terlihat pembaca sudah diganti; nama teknis (class CSS `*-verity-*`, env `VERITY_*`, email demo `@verity.test`, password dev, clientId `vrtc_demo_agent`, default byline schema) sengaja DIPERTAHANKAN — lihat §13. Agent penerus: gunakan nama "Verax Press" untuk semua copy baru.

> **Dokumen ini adalah jembatan antar-sesi.** Agent/AI penerus tanpa ingatan sesi sebelumnya harus membaca file ini dahulu, lalu `docs/baseline/` (salinan dokumen proyek), sebelum menyentuh kode.
> Sumber kebenaran tunggal kebijakan: `docs/baseline/01..06` (Editorial Charter, Contributor Policy, Technical Architecture, dst). Worklog ini TIDAK menggantikan baseline; ia mencatat keputusan implementasi dan status.

---

## 0. Cara kerja repo ini (baca dulu)

- **Framework (wajib environment)**: Next.js 16.1.3 App Router + TypeScript 5, Tailwind CSS 4, shadcn/ui (set lengkap di `src/components/ui`), Prisma 6 + **SQLite** (`db/custom.db`, via `src/lib/db.ts`), NextAuth v4, bun sebagai runner.
- Dev server: `bun run dev` (port 3000, JANGAN dijalankan ganda; log di `dev.log`). Lint: `bun run lint`. Schema DB: edit `prisma/schema.prisma` → `bun run db:push` → `bun run db:generate` → `bun run db:seed` (idempotent).
- **PENTING (SQLite)**: jika file `db/custom.db` dihapus/di-replace, dev server HARUS direstart (koneksi Prisma menempel ke inode lama → semua query gagal 401/500). Untuk reset data TANPA restart: `bun scripts/reset-demo.ts && bun run db:seed`.
- Uji acceptance: `bash scripts/acceptance-test.sh` (MEMUTASI data — reset+seed setelahnya). Laporan subagent terdahulu: `agent-ctx/2-a-*.md` & `agent-ctx/2-b-*.md`.
- **Jangan `bun run build`** di environment ini (aturan sandbox). Verifikasi via dev server + browser + curl.
- Prisma + SQLite: **tidak ada enum & tidak ada list primitif** → semua enum jadi `String` + validasi Zod di `src/lib/domain/*` (satu-satunya tempat definisi literal union). JSON disimpan sebagai `String` (serialize/parse via helper).
- Frontend publik & studio = client of API routes (`/api/...`), BUKAN server actions (aturan environment).
- CMS internal ada di route `/studio/*`; website publik di route root. Bahasa produk: Indonesia (`lang="id"`), timezone operasional: Asia/Jakarta.

## 1. Status build kedua — assessment awal (9 Nov 2026, sesi build-2)

Repo saat diterima = **scaffold Z.ai standar yang bersih** (bukan sisa build pertama): `page.tsx` masih logo scaffold, schema Prisma hanya demo `User`/`Post`, tidak ada kode Verity. **Keputusan: TIDAK ada yang perlu diselamatkan dari build pertama — bangun fresh di atas infra scaffold** (shadcn/ui, db.ts, eslint, Caddyfile dipertahankan). Hal yang dihapus/diganti: `prisma/schema.prisma` (demo), `src/app/page.tsx`, `src/app/api/route.ts`, `src/app/layout.tsx` (font/metadata Verity).

## 2. Keputusan teknologi

### ADR-001: CMS — Payload vs Ghost vs Custom Editorial Module → **CUSTOM** (LOCKED untuk MVP)

PoC terukur (bukti nyata, bukan opini):

| Kandidat | Bukti kompatibilitas | Bukti fungsional vs kebutuhan P0 | Kesimpulan |
|---|---|---|---|
| **Payload CMS 3.93** | `@payloadcms/next@3.93` peerDeps: `next >=16.3.3 <17` (rentang resmi). Environment memasang **next 16.1.3** → di luar rentang dukungan; upgrade versi framework di sandbox ini berisiko tinggi terhadap dev server/gateway yang sudah terpasang. Payload juga membawa prisma versi pin sendiri → bentrok dengan setup Prisma scaffold. | Access control & versions berbasis kode sesuai arah blueprint, TAPI workflow verity (state FACT_CHECK, source-verification gate di approve, risk-edit versioning, publish chief-only) tetap harus ditulis custom di atas collection hooks; admin panel perlu dikustom besar-besaran. | Tidak feasible di environment ini. |
| **Ghost 5.x** | `ghost@latest` engines: `node ^22.23.1 \|\| ^24.20.0` + ghost-cli, standalone app dengan admin sendiri; produksi resmi MySQL. Tidak bisa diembed sebagai modul Next.js; di sandbox hanya boleh satu app Next di port utama. | Workflow Ghost (draft/published/scheduled; role author/editor) tidak punya state fact-check, source verification gate, risk-edit, atau publish chief-only → semua kebutuhan inti P0 blueprint hilang. Kustomisasi = fork Ghost. | Tidak feasible & tidak fit. |
| **Custom editorial module di stack wajib** | 100% kompatibel (Next 16 + Prisma + SQLite + NextAuth yang sudah terpasang). | Permission matrix, state machine, versi, audit, gate — diimplementasikan eksplisit di kode (`src/lib/domain/*`), tervalidasi Zod, teruji per-endpoint. Ini "cara Payload" (schema & access control dalam kode) tanpa dependensi vendor. | **DIPILIH.** |

Trade-off yang disadari: kita menulis sendiri editor & workflow UI (biaya), tapi mendapatkan kontrol penuh atas gerbang editorial (inti produk). Kondisi review ulang ADR: jika suatu saat environment berpindah ke Next yang didukung Payload dan tim ingin admin panel berconfig, evaluasi ulang.

### ADR-002: Database — PostgreSQL vs Turso vs SQLite → **SQLite (dev/MVP), schema portabel** 

Blueprint merekomendasikan PostgreSQL. Environment sandbox hanya menyediakan SQLite via Prisma (konstrain keras environment). Keputusan: SQLite untuk dev/MVP; schema ditulis portabel (tanpa tipe spesifik-SQLite, tanpa enum — supaya migrasi ke PostgreSQL mulus saat keluar sandbox). Turso tidak dievaluasi lebih jauh: tidak tersedia di sandbox, dan libSQL tetap SQLite — tidak mengubah desain. **Item ini perlu keputusan founder saat deployment produksi** (bukan penghalang MVP).

### ADR-003: Editor konten — Tiptap/ProseMirror vs block-JSON custom → **BLOCK-JSON CUSTOM**

Blueprint menyarankan Tiptap/ProseMirror JSON. Keputusan MVP: model dokumen **block-based JSON** sendiri (`paragraph | heading | quote | list | image | note | qalist`) divalidasi ketat Zod (`src/lib/domain/content.ts`). Alasan: (1) tetap 100% "JSON terstruktur yang divalidasi" tanpa HTML bebas — memenuhi prinsip arsitektur; (2) menghindarat ~10 dependensi Tiptap + kustom sanitasi mark/node; (3) ingestion API agent memakai skema yang sama. Renderer & editor UI ada di `src/components/content/*`. Tiptap bisa dipertimbangkan P1 jika newsroom butuh rich text WYSIWYG — konversi block-JSON → ProseMirror doc tetap mungkin.

## 3. Keputusan atas item OPEN/PROPOSED/LEGAL REVIEW (diambil agar build tidak menunggu)

| Item di dokumen | Keputusan build-2 | Alasan / status |
|---|---|---|
| Tenggat tanggapan keluhan (§7.2 Charter: LEGAL REVIEW) | Field `deadline` di schema **nullable**, UI menampilkan "—", TIDAK ada angka tenggat apa pun di UI/copy publik. | Sesuai instruksi dokumen: jangan menetapkan angka sebelum kajian. Tetap **LEGAL REVIEW REQUIRED**. |
| Lisensi kontributor (§9 Contributor Policy) | Belum diimplementasikan (Tahap B; gate belum terpenuhi). Model `Contributor` disiapkan tapi tidak aktif. | LEGAL REVIEW REQUIRED — tidak memblokir Tahap A. |
| Hak jawab: kanal & register | Form publik `/keluhan` + complaints register di studio; `refCode` format `KEL-{tahun}-{urut}`. | Memenuhi P0 "complaints form + register tercatat". |
| Byline "Redaksi Verity" | Default byline string di artikel newsroom; kredit terstruktur via `ArticleContribution` (role AUTHOR/EDITOR/REPORTER/REVIEWER/VISUAL, `publicCredit`). | Sesuai Charter §5. |
| Scheduled publishing | TIDAK diimplementasikan (D3 LOCKED). Tidak ada state SCHEDULED di state machine. | LOCKED di baseline. |
| Volunteer | Role ada di RBAC, default tanpa permission tulis. Tidak ada UI penugasan (P1). | Least privilege. |
| Complaint:manage & risk_edit "by explicit grant" untuk Editor | Kolom boolean eksplisit di `StaffUser`: `canManageComplaints`, `canRiskEdit` (default false; Chief Editor selalu true via role). | Mewujudkan "explicit grant" tanpa sistem permission-grant penuh. |
| Status verifikasi sumber | `UNVERIFIED | VERIFIED | DISPUTED`; hanya EDITOR/CHIEF yang boleh mengubah (`source:verify`); gate approve/publish: semua sumber kunci harus VERIFIED. | Sesuai TA §10 & acceptance criteria. |
| Kata sambutan/publikasi konten awal | Seed berisi artikel tentang kebijakan platform sendiri (proses editorial, verifikasi sumber, kebijakan AI, koreksi) — faktual, sumber nyata dari baseline docs, dan 1 opini. Konten berstatus PUBLISHED di-seed melalui jalur yang merepresentasikan persetujuan Chief Editor (seed = tindakan chief editor demo). | Hard rule #5 tetap dihormati: tidak ada konten "berita nyata" pihak ketiga; semua konten adalah dokumen kebijakan Verity sendiri. Ganti sebelum go-live publik. |
| Password akun seed | Dari env (`VERITY_SEED_*_PASSWORD`) dengan fallback default dev yang DIDOKUMENTASI. **Wajib diganti/env-driven di produksi.** | Hard rule #4: tidak ada kredensial produksi di source. |
| API client secret | Dibuat seed, ditulis ke `.env.local` (bukan source code, bukan log). Secret hanya ditampilkan sekali saat dibuat di UI. | TA §9.2. |

Daftar lengkap item **LEGAL REVIEW REQUIRED yang masih menunggu keputusan founder** ada di §8 bawah.

## 4. Design direction (diterapkan, bukan hanya laporan)

Prinsip (dipelajari dari praktik NYT/Guardian/Reuters/BBC, diwujudkan sebagai identitas orisinal Verity): hierarki tipografi tegas, warna hanya untuk fungsi, whitespace disengaja, hairline rules sebagai separator, TANPA gradient/glassmorphism/kartu membulat besar.

**HARDENING UI/UX TAHAP-A (10 Nov 2026) SUDAH SELESAI** — audit & keputusan lengkap di `docs/design-hardening-audit.md`; skala tipografi terbaru + sistem 3 bobot garis + pola layout homepage terdokumentasi di `docs/design-tokens.md`. Inti perubahan: kaskade skala agresif (lead 56px → featured 27.2 → standard 20.8 → rail 16.8; section heading jadi small-caps sans 13.6px + rule 2px), homepage jadi paket utama (lead + 2 sekunder + rail ticker) + seksi desk 3 layout berganti + band Opini paper-soft, kicker 12px/0.18em/medium (format-only di dalam seksi desk), nav seksi aktif (`DeskNav` client), aside artikel segaris kolom body, halaman desk/opini pakai header anchor + featured. Konvensi yang DITERIMA (bukan bug): kolom kanan artikel kosong (measure 66ch), repetisi rail Terbaru (konvensi ticker), tanggal relatif campuran di rail, kicker Opini merah di halaman desk.

**HARDENING TAHAP 2 — RITME & KOMPOSISI (10 Nov 2026) SUDAH SELESAI** — fokus transisi antar-elemen; identitas Tahap A/A-2 (masthead, motto, drop cap, end mark, wordmark) TIDAK disentuh. Audit + keputusan di `docs/design-hardening-audit.md` bagian “Tahap 2”; sistem ritme terdokumentasi di `docs/design-tokens.md` bagian “Ritme isi artikel”. Inti: (1) ContentRenderer buang `space-y-6` seragam → margin per-blok kontekstual (H2 pertama = act break 48px; H2 lain 36px atas / 14px bawah — heading memeluk kontennya; pull-quote jadi set-piece terpusat dengan napas 40px; end mark `display:block mt-3` menempel 12px, blok berbingkai terakhir melepas mb); (2) akhir artikel: “Sumber & Verifikasi” = babak baru (napas 64px + rule 2px tunggal), “Lainnya dari desk” diturunkan jadi navigasi tenang (hairline + small-caps sans) — dua modul akhir tak lagi kembar; (3) homepage: napas antar-seksi disengaja & tidak seragam (72/56/56/64px), seksi pertama = showcase (featured-list + standfirst `Desk.description`), rotasi layout anti-bersebelahan-sama, band Opini tanpa bg → rule ganda klasik (2px ink + 3px + hairline) + label serif italic; (4) halaman desk: tiering 3 tingkat (featured → 2 kartu → ekor indeks 3-kolom). Pratinjau studio ikut merasakan manfaat (renderer sama).

**Token desain** (didefinisikan di `src/app/globals.css` + `docs/design-tokens.md`):

- **Font**: `Newsreader` (serif display + body artikel, optical sizing) untuk headline & body; `Inter` (sans) untuk UI/nav/label; `IBM Plex Mono` untuk tanggal/waktu/meta/kicker teknis. Semua via `next/font/google` (CSS vars `--font-serif/--font-sans-ui/--font-mono-meta`).
- **Warna**: paper `#FBFAF8`; ink `#161310`; ink-soft `#5A554B`; rule `#E5E1D6`; accent (fungsi: link, kicker, koreksi, disputed) `#9E2B25`; accent-ink hover `#7C1F1A`; status VERIFIED `#1E6B45`, UNVERIFIED `#8A6D1A`, DISPUTED `#9E2B25`; warna hanya untuk fungsi editorial — tidak ada warna dekoratif.
- **Skala tipografi**: headline artikel `clamp(1.9rem, 4vw, 2.75rem)` serif 600; deck `1.125–1.25rem` serif italic soft; body artikel `1.0625rem/1.75` serif; UI label `0.75rem` sans tracking-wide uppercase; meta mono `0.75rem`.
- **Spacing & layout**: kontainer max-w `72rem` (halaman indeks) / measure artikel **max-w 66ch**; section `py-10/14`; separator hairline `border-t border-[--verity-rule]`; radius maksimum `2px` (rounded-[2px]); tidak ada shadow pada kartu (hanya menu/popover).
- **Halaman publik light-only** (keputusan editorial: kertas); **studio mendukung light/dark** via next-themes (alat kerja redaksi).
- Footer publik sticky-bottom (`min-h-screen flex flex-col` + `mt-auto`).

## 5. Arsitektur implementasi (peta untuk agent penerus)

```
prisma/schema.prisma              # 14 model (lihat §6)
prisma/seed.ts                    # idempotent; env-driven password; API secret → .env.local
src/lib/db.ts                     # Prisma client (scaffold)
src/lib/domain/content.ts         # Zod: block-JSON dokumen artikel (satu-satunya skema konten)
src/lib/domain/workflow.ts        # State machine artikel + izin transisi + gate (sumber kunci, publish chief-only)
src/lib/domain/permissions.ts     # Permission matrix per role (server-side ALWAYS)
src/lib/domain/audit.ts           # writeAudit() append-only + helper
src/lib/domain/slug.ts            # slugify Indonesia + uniquifier
src/lib/domain/ids.ts             # refCode complaint dsb.
src/lib/auth.ts                   # NextAuth options (credentials, scrypt hash via node:crypto)
src/lib/password.ts               # scrypt hash/verify (tanpa dependensi baru)
src/lib/api-key.ts                # API client auth (clientId + secret hash, timingSafe)
src/lib/rate-limit.ts             # in-memory window limiter (ingat: single-instance)
src/lib/api.ts                    # helper respons & session guard untuk route handlers
src/lib/format.ts                 # tanggal Indonesia, label status, dsb.
src/types/verity.ts               # tipe publik DTO (kontrak API untuk UI)
src/app/api/...                   # REST route handlers (lihat §7 kontrak API)
src/app/(public)/...              # website publik (server components + Prisma read-only)
src/app/studio/...                # CMS (client components + API routes; dilindungi middleware+API)
src/components/site/...           # chrome & komponen publik
src/components/content/...        # renderer + editor block-JSON
src/components/studio/...         # komponen CMS
docs/baseline/                    # salinan dokumen proyek (sumber kebenaran kebijakan)
docs/design-tokens.md             # token desain
docs/api-contract.md              # kontrak endpoint untuk UI (dipakai subagent)
```

**State machine artikel (TA §7.1 Tahap A)** — dijalankan HANYA via `POST /api/studio/articles/[id]/transition`:

| Dari | Ke | Aktor yang diizinkan |
|---|---|---|
| DRAFT | PENDING_REVIEW, WITHDRAWN | Author-pemilik (INTERNAL_AUTHOR) / EDITOR / CHIEF |
| PENDING_REVIEW | FACT_CHECK, REVISION_NEEDED, REJECTED | EDITOR / CHIEF (article:review) |
| FACT_CHECK | PENDING_APPROVAL, REVISION_NEEDED, REJECTED | EDITOR / CHIEF |
| REVISION_NEEDED | PENDING_REVIEW | Author-pemilik / EDITOR / CHIEF |
| PENDING_APPROVAL | PUBLISHED, REJECTED | **CHIEF EDITOR SAJA** + gate: semua sumber kunci VERIFIED, konten non-kosong |
| PUBLISHED | CORRECTED, RETRACTED, ARCHIVED | CHIEF (CORRECTED juga oleh Editor dengan canManageComplaints via jalur koreksi) |
| CORRECTED | RETRACTED, ARCHIVED | CHIEF |
| RETRACTED/ARCHIVED/REJECTED/WITHDRAWN | terminal | — |

Setiap transisi → `AuditEvent` + `EditorialReview` record. Versi baru dibuat pada setiap save konten (type `author`) dan pada aksi editorial (copyedit/risk_edit dengan `changeReason` wajib).

## 6. Model data (Prisma — ringkasan; detail di schema)

`StaffUser` (role CHIEF_EDITOR|EDITOR|INTERNAL_AUTHOR|VOLUNTEER; grant eksplisit canRiskEdit/canManageComplaints), `Contributor` (Tahap B, tidak aktif), `Person` (identitas publik: publicName/anonymityMode), `Desk` (3 desk awal), `Article` (+contentJson, aiInvolvement/aiDisclosure*, origin NEWSROOM|INGESTION_API|CONTRIBUTOR), `ArticleVersion` (versionNo unik per artikel; versionType author|editorial_copyedit|risk_edit|ingestion; notifiedAuthorAt/authorResponse), `ArticleContribution`, `SourceReference` (isKeySource, verificationStatus, verifiedBy/At), `EditorialReview`, `ReviewComment` (authorVisible=false default), `Submission` (origin, agentId, idempotencyKey unique, aiInvolvementDeclared), `ApiClient` (secretHash, scopes="submit", expiresAt, lastUsedAt), `Complaint` (refCode, type, deadline nullable), `CorrectionRecord`, `AuditEvent` (append-only).

## 7. Kontrak API (ringkas; detail `docs/api-contract.md`)

Publik (tanpa auth): `POST /api/public/complaints` (rate-limited, Zod).
Ingestion (API key `Authorization: Bearer <clientId>.<secret>`): `POST /api/internal/v1/ai-submissions` — submit-only; wajib `aiInvolvement`, `idempotencyKey`, desk/format valid, sumber ber-URL; idempotent-by-key; TIDAK ADA endpoint publish untuk API client.
Studio (session NextAuth; role dicek per-endpoint): `GET/POST /api/studio/articles`, `GET/PATCH /api/studio/articles/[id]`, `POST /api/studio/articles/[id]/transition`, `POST/DELETE /api/studio/articles/[id]/sources`, `PATCH /api/studio/sources/[sourceId]`, `GET/POST /api/studio/articles/[id]/comments`, `GET /api/studio/articles/[id]/audit`, `GET/PATCH /api/studio/complaints*`, `POST /api/studio/corrections`, `GET /api/studio/audit`, `GET/POST/PATCH /api/studio/api-clients*`, `GET /api/studio/dashboard`.

## 8. LEGAL REVIEW REQUIRED — menunggu founder (jangan dianggap selesai)

1. Status operator/badan hukum + penanggung jawab (UU Pers) — semua copy publik sengaja TIDAK mengklaim status badan hukum/PSE/verifikasi Dewan Pers.
2. Tenggat respons hak jawab/koreksi (field `deadline` sengaja null).
3. Penerapan PSE (Permenkominfo 5/2020 jo 10/2021, PP 28/2025, Permenkomdigi 15/2025).
4. UU PDP: privacy notice, retensi, hak subjek data (belum dibuat — butuh keputusan pengelola).
5. Lisensi kontributor final (Tahap B) & status volunteer/honorarium/pajak.
6. Trademark "VERITY" & domain (masih working name).
7. Kebijakan retensi backup/deployment (Vercel Hobby ToS: non-komersial).

## 9. Progress log slice

| Slice | Status | Catatan |
|---|---|---|
| S0 — Baseline & assessment | ✅ Selesai | Repo bersih; build fresh. |
| S1 — ADR + design tokens + worklog | ✅ Selesai | ADR-001/002/003 di §2; token di §4 + `docs/design-tokens.md`. |
| S2 — Prisma schema + push + seed | ✅ Selesai | 14 model + MediaAsset; seed idempotent; kredensial env-driven; API secret → `.env.local`. |
| S3 — Core libs (auth, RBAC, workflow, content, audit, rate-limit, api-key) | ✅ Selesai | Semua di `src/lib/domain/*`; permission dicek server-side selalu. |
| S4 — API routes (studio, ingestion, public) | ✅ Selesai | Kontrak di `docs/api-contract.md`; hasil uji di §10. |
| S5 — Foundation UI publik (layout, tokens, homepage, artikel) | ✅ Selesai | Desain editorial diterapkan. |
| S6 — Halaman publik lengkap (Task 2-a, subagent full-stack-developer) | ✅ Selesai | desk/opini/tentang/standar/koreksi/keluhan/sitemap; semua 200; draft tidak bocor (404). |
| S7 — Studio CMS UI (Task 2-b, subagent full-stack-developer) | ✅ Selesai | login/dashboard/artikel/editor 5-tab/sources/complaints/audit/api-clients; direview+difix integrator (bug grants dashboard & query audit artikel). |
| S8 — Integrasi, lint, verifikasi acceptance | ✅ Selesai | Lint/typecheck 0 error; acceptance 25/26 → fix audit → terverifikasi ulang; browser E2E ok (§10). |
| S9 — Hardening UI/UX editorial (Tahap A) | ✅ Selesai | Audit visual (VLM 3 putaran) → skala tipografi agresif + paket utama homepage + seksi multi-layout + band opini + nav aktif; acceptance 26/26; lihat §10c & `docs/design-hardening-audit.md`. |
| S10 — Rebrand Verax Press + pass elegan/kelas atas (Tahap A-2) | ✅ Selesai | Masthead institusional (motto Latin "Ex Fontibus Veritas" + Est. MMXXVI + rule 2px), drop cap 2 baris, end mark, text-balance, etimologi di /tentang, rebrand menyeluruh (metadata/UI/studio/seed 51 prosa + 9 slug); 21 URL publik 0 sisa "Verity"; acceptance 26/26; lihat §10f & audit doc bagian Tahap A-2. |
| S11 — Hardening ritme & komposisi (Tahap 2) | ✅ Selesai | Ritme per-blok renderer (act break H2 + heading memeluk konten + pull-quote set-piece + end mark menempel), akhir artikel dibedakan (sumber = babak baru, terkait = navigasi tenang), homepage napas 72/56/56/64 + seksi showcase standfirst + band Opini rule ganda tanpa bg, desk tiering 3 tingkat; lihat §10g & audit doc bagian Tahap 2. |

## 10. Hasil verifikasi (evidence, bukan klaim)

Dijalankan 9 Nov 2026 (sesi build-2). Transkrip lengkap: `scripts/acceptance-test.sh` output.

**a) `bun run lint` → 0 error; `bunx tsc --noEmit` → bersih; `dev.log` tanpa error runtime.**

**b) Acceptance criteria TA §12.1 via curl — 25 PASS / 1 FAIL → diperbaiki → diverifikasi ulang:**
1. Ingestion tanpa auth → 401 ✓; tanpa ai_involvement/idempotency_key → 422 ✓.
2. Ingestion valid → 201 receipt (hanya submissionId/articleId/status) ✓; replay key sama → 200 `idempotentReplay:true` ✓; key sama + payload beda → 409 ✓.
3. Format NEWS dari agent → 422 ✓ (D2 LOCKED); desk invalid → 422 ✓; TIDAK ADA endpoint publish agent (404) ✓.
4. Studio tanpa sesi → 401 ✓; api-clients & audit global oleh Editor → 403 ✓; complaints oleh Internal Author → 403 ✓; isolasi ownership: author melihat 6 naskah miliknya vs chief 9 ✓.
5. **Gate verifikasi sumber**: PUBLISH oleh Editor → 403 ✓; PUBLISH oleh Chief dengan sumber kunci UNVERIFIED → 422 `GATE_SOURCE_VERIFICATION` (pesan lengkap menyebut sumber pemblokir) ✓; verifikasi sumber oleh Author → 403 ✓; oleh Editor → 200 ✓; setelah itu PUBLISH oleh Chief → 200 ✓.
6. Transisi invalid dari PUBLISHED → 422 ✓.
7. Complaint publik valid → 201 + refCode ✓; invalid → 422 ✓.
8. Satu-satunya FAIL awal: route audit artikel tidak menampilkan event `source.verified` (targetId memakai id sumber, bukan id artikel) → **fixed** (query include source ids) → diverifikasi ulang: `source.verified` + `article.publish` keduanya muncul di jejak audit artikel.

**c) Browser E2E (agent-browser, viewport desktop & mobile 390×844):**
- Publik: homepage (masthead, lead, Terbaru, seksi desk, opini, strip koreksi) ✓; artikel (kicker, disclaimer opini, box koreksi, seksi “Sumber & Verifikasi” dengan status, terkait) ✓; desk/opini/tentang/standar/koreksi/keluhan/sitemap.xml semua 200 ✓; artikel internal (PENDING_APPROVAL) → 404 ✓; console 0 error ✓.
- Studio: login chief → dashboard (nav role-scoped, kartu status, “Perlu perhatian”, keluhan terbuka, aktivitas) ✓; daftar artikel + filter ✓; editor 5 tab (Konten block editor, Sumber dengan tombol verifikasi per sumber, Alur & Versi, Catatan, Audit) ✓; **uji gate di UI**: klik “Setujui & Terbitkan” pada artikel dengan sumber kunci belum diverifikasi → toast “Publikasi diblokir: 1 sumber kunci belum diverifikasi…: PP No. 28 Tahun 2025…” ✓ tanpa mutasi state.
- Responsive: mobile homepage render baik, footer menempel bawah via flex+mt-auto (footerBottom ≥ viewport pada halaman panjang; mekanisme sticky terpasang di semua layout) ✓.

**d) State demo saat sesi berakhir (setelah rebrand S10)**: 16 artikel total — 12 terbit dengan slug & judul baru (mis. `lima-tahap-sebelum-terbit-alur-editorial-verax-press` [LEAD], `cara-verax-press-memverifikasi-sumber`, `anatomi-koreksi-terbuka-verax-press`), 1 PENDING_APPROVAL (demo gate), 1 FACT_CHECK, 2 DRAFT, 1 koreksi, 2 keluhan, 1 API client aktif. Reset ulang kapan saja: `bun scripts/reset-demo.ts && bun run db:seed` (HAPUS `.env.local` dulu bila ingin secret API client baru tertulis — writeEnvLocal tidak menimpa key lama).

**e) Verifikasi hardening S9 (10 Nov 2026)**: `bun run lint` 0 error; `bunx tsc --noEmit` bersih; 14 URL publik 200 + artikel internal 404; browser (agent-browser): kaskade terukur (lead 56px vs rail 16.8px), dead zone bawah lead 247px → 21px, duplikasi headline sama-bobot hilang (sisa repetisi rail = konvensi ticker), 3 layout seksi berbeda terkonfirmasi visual, nav aktif `aria-current="page"` di /desk, mobile 390px tanpa overflow horizontal + nav scrollable + footer sticky; interaksi klik teruji end-to-end (lead → artikel, nav → desk, featured → artikel); evaluasi visual model putaran akhir 9/10. **Acceptance test 26 PASS / 0 FAIL** (setelah reset+seed). Tiga perbaikan ikutan: (1) asersi audit di `scripts/acceptance-test.sh` `grep -c` → `grep -o|wc -l` (respons JSON satu baris membuat hitungan baris selalu 1; perilaku sistemnya sendiri benar); (2) **API client demo `vrtc_demo_agent` dibuat ulang** karena `.env.local` hilang antar-sesi (client lama di-DB tapi secret-nya tak tersimpan) — kredensial baru sudah ditulis ke `.env.local`; (3) **semua anchor headline kini `block` link** (target klik selebar kolom) — link inline multi-baris memiliki "celah tangga" di tengah bounding box yang membuat klik otomatis (Playwright/agent-browser klik titik tengah) meleset; block link juga memperbesar area sentuh di mobile.

**f) Rebrand + elegan S10 (10 Nov 2026)**: `bun run lint` 0 error; `bunx tsc --noEmit` bersih; sweep **21 URL publik** (homepage, opini, tentang, standar, koreksi, keluhan, 3 desk, 12 artikel, sitemap) semuanya 200 dan **0 kemunculan "Verity" pada prosa yang terlihat pembaca** (sisa hit hanya class CSS teknis); URL slug lama → 404; sitemap memuat slug baru; mobile 390px tanpa overflow (wordmark 238px, tracking dikendurkan, hairline motto disembunyikan); drop cap terukur benar (80px, float left, wrap 2 baris); end mark menempel blok terakhir; acceptance test **26 PASS / 0 FAIL**; evaluasi visual model: "Ship-ready" (masthead institusional CONFIRM, mobile CONFIRM, 0 sisa Verity). Catatan proses: `.env.local` dihapus sebelum reset+reseed supaya seed menulis secret API client yang baru (writeEnvLocal tidak menimpa key lama); password dev fallback `VerityChief!2026` dst TIDAK ikut direplace (kredensial teknis yang dipakai acceptance test — sempat tertimpa replace generik, langsung dipulihkan).

**g) Ritme & komposisi S11 (10 Nov 2026)**: `bun run lint` 0 error; `bunx tsc --noEmit` bersih; dev.log bersih (sisa EADDRINUSE di byte awal log = percobaan start ganda lama; 0 kemunculan di 200KB terakhir). **Ritme terukur di browser** (eval computed style): artikel multi-H2 `tiga-dokumen-fondasi` gap blok = 48 (act break H2 pertama) / 14 (heading→konten; sebelumnya 24 simetris) / 36 (H2 berikutnya) / 40 (pull-quote, mb dilepas karena blok terakhir) / 12 (end mark menempel — sebelumnya mengambang); artikel `isi-artikel-terstruktur` = paragraf beruntun 24, list menempel heading 14; lead artikel `lima-tahap` mobile = 48/14/24/40/40/12. Homepage gap seksi terukur 72px visual (setelah paket utama) / 56 / 56 / 64 (sebelum Opini); rule ganda Opini terukur (2px y=2115, 1px y=2120 → jeda tepat 3px); label Opini italic 24px serif 600; showcase standfirst tampil (italic 16.8px); 3 layout seksi berbeda terkonfirmasi (featured-list+standfirst → grid → rows). Desk `nasional-publik`: 3 tier terukur (featured → 2 kartu dengan border-t miliknya sendiri sejajar → ekor 3-kolom top sejajar), hairline dobel hilang. Mobile 390px: homepage/artikel/desk semua scrollWidth=390 (tanpa overflow), header Opini wrap 3 baris, rule full-bleed 390px, footer terdorong natural. Evaluasi visual model putaran akhir: **kedua halaman PASS / "ship-ready"**; 3 masukan ikutan diterapkan (hairline dobel desk dihapus, ekor desk jadi 3-kolom agar tanpa ruang mati, gap lead 80→72px).

**Verifikasi ulang independen (sesi lanjutan, setelah konteks sesi sebelumnya habis):** seluruh pengukuran diulang dari nol dan hasilnya identik — artikel multi-H2 gap blok 48/14/36/40/12px; Sumber & Verifikasi mt-64 + rule 2px + serif, Lainnya mt-56 + hairline + Inter uppercase 12.8px (dua modul akhir tak lagi kembar); homepage gap 72/56/56/64 + rule ganda Opini (2px ink di y=2107, hairline di y=2112) + standfirst showcase italic 16.8px; desk 3-tier (featured 27.2px → 2 kartu → ekor 3-kolom) + header rule 2px ink; mobile 390px 3 halaman tanpa overflow, rule full-bleed 390px, footer terdorong natural; klik block link lead→artikel end-to-end OK; 0 error konsol; lint 0 error; tsc bersih. Tidak ada perubahan kode yang diperlukan — sesi sebelumnya memang sudah selesai; yang tersisa hanya laporan akhir ke founder.

## 11. Known gaps & next steps (untuk sesi berikutnya)

1. **Ganti semua konten seed sebelum go-live publik** — konten saat ini adalah kebijakan platform sendiri (aman & faktual, kini 12 artikel terbit), bukan liputan berita.
2. **Ganti semua kredensial dev** sebelum produksi: password seed via env `VERITY_SEED_PASSWORD_*` (fallback dev-only ada di `prisma/seed.ts`), `AUTH_SECRET` (saat ini fallback dev karena `.env.local` pernah hilang — set eksplisit!), dan API client demo (revoke + buat baru).
3. **Treatment foto artikel** — belum ada foto di artikel seed (disengaja: tanpa storage media, foto stok merusak kredibilitas). Setelah keputusan storage/upload (P1), tambahkan: framing/crop konsisten, caption+ kredit wajib, aspect ratio tetap, dan TANDAI placeholder demo dengan jelas. Renderer image-block sudah disiapkan (border + caption mono).
4. **Pencarian & menu mobile** — nav mobile scrollable tapi tanpa toggle menu/search; tanggal di bar utilitas disembunyikan di layar kecil. Kandidat P1.
5. **Kedalaman homepage saat artikel sedikit** — aturan layout adaptif (`pickSectionLayout`) sudah menangani 1–4 artikel per seksi; bila pool artikel membengkak, pertimbangkan kurasi manual (flag "unggulan") daripada murni publishedAt-desc.
6. Deployment nyata: SQLite → PostgreSQL (schema portabel; ganti `provider` + `db:push`/migrate), secret management, backup, error monitoring, HTTPS, domain. Set `NEXT_PUBLIC_SITE_URL` untuk sitemap.
7. Tahap B (contributor portal) — JANGAN dibuka sebelum gerbang legal (§8) terpenuhi; model `Contributor`/`Person` siap tapi tidak aktif; alur Tahap B (§7.2 TA) belum diimplement di state machine.
8. Rate limiter in-memory (single instance) — ganti ke store terdistribusi saat scale-out.
9. Belum ada: visual diff antar versi, media library upload (saat ini URL + metadata), scheduled publishing (D3: ditunda ke P1), newsletter, analytics — P1/P2.
10. Risk-edit versi “per-bagian” saat ini disederhanakan: editor menyimpan versi `editorial_copyedit`/`risk_edit` dengan changeReason; notified_author_at/author_response tersedia di model tapi UI respons penulis baru lengkap di Tahap B.
11. Review komentar `authorVisible` tersimpan & tidak pernah dirender publik (hanya studio); saat Tahap B, pastikan respons API kontributor hanya menyertakan komentar visible.
12. `next.config.ts` mematikan `devIndicators` (tombol "N" dev overlay) — hanya efek development, produksi tidak terpengaruh.
13. Default `byline` di `prisma/schema.prisma` masih `"Redaksi Verity"` (peninggalan rebrand) — sengaja tidak diubah demi aturan "jangan ubah schema"; praktis tidak pernah terpakai karena studio (`Oleh ${user.name}`) dan ingestion API selalu set byline eksplisit. Kalau suatu saat schema diedit untuk alasan lain, sekalian ganti ke "Redaksi Verax Press".

## 12. Panduan demo cepat (untuk founder/agent berikutnya)

- Situs publik: `/` — homepage (masthead Verax Press dengan motto Latin, paket utama lead "Lima Tahap Sebelum Terbit", seksi desk multi-layout, band Opini, strip koreksi); `/artikel/cara-verax-press-memverifikasi-sumber` — artikel dengan koreksi + daftar sumber + drop cap; `/tentang` — etimologi nama & motto; `/keluhan` — form; `/koreksi` — log; `/desk/hukum-keadilan` — contoh halaman desk dengan nav aktif.
- Studio: `/studio/login` — akun demo (password via env, fallback dev ada di `prisma/seed.ts`): `chief@verity.test` (Chief Editor), `editor@verity.test` (Editor, grant risk-edit), `penulis@verity.test` (Internal Author).
- Demo gate: login chief → buka artikel “Analisis: Peta Regulasi AI…” (PENDING_APPROVAL) → klik “Setujui & Terbitkan” → ditolak (1 sumber kunci belum diverifikasi) → login editor → tab Sumber → “Tandai Terverifikasi” → kembali chief → terbitkan.
- Demo ingestion: credential di `.env.local` (`VERITY_INGESTION_DEMO_CLIENT_ID/SECRET`), contoh panggilan di `scripts/acceptance-test.sh`.

## 13. Verax Media Storage Service (10 Nov 2026 - Azure VM forfh-korea-vm)

- **Objektif:** Menyediakan persistent image & media storage untuk Verax Press (di Vercel) memanfaatkan VM Azure yang ada (`forfh-korea-vm`) tanpa menambah biaya langganan cloud storage eksternal.
- **Arsitektur:**
  - Microservice Node.js v22 (`node:http`, `node:crypto`, `node:sqlite` DatabaseSync, `busboy`) berjalan di port loopback `127.0.0.1:4188`.
  - Dikelola oleh PM2 sebagai proses `verax-media` (PID 1916030, RSS ~54MB, max-memory-restart 150MB, --max-old-space-size=96).
  - Database metadata SQLite di `/database/media.sqlite` (WAL mode, foreign keys ON, VACUUM INTO online backup).
  - Direktori penyimpanan: `/var/lib/verax/media/` (fallback `/home/azureuser/verax-media-data/`) berstruktur `public/` (articles, thumbnails, infographics) dan `private/` (drafts, editorial, documents).
  - Quota penyimpanan 10 GB (disk VM sisa 43 GB). Validasi magic-bytes sejati (JPEG, PNG, WebP), SVG ditolak untuk proteksi stored XSS.
  - Keamanan: Otentikasi server-to-server berbasis HMAC-SHA256 (`X-Media-Auth-Signature` & `X-Media-Auth-Payload`) dengan sliding window 5 menit dan `timingSafeEqual`.
  - Penghapusan data: soft-delete dengan memindahkan file ke direktori `quarantine/` bertimestamp (mencegah kehilangan data permanen akibat ketidaksengajaan).
  - Backup/Restore: script online snapshot WAL `scripts/backup.mjs` (retensi 7 arsip) dan `scripts/restore.mjs` (dengan `PRAGMA integrity_check`).
- **Integrasi Verax Press:**
  - Dibuat `src/lib/media-client.ts` untuk upload dan soft-delete dari Vercel ke media storage service dengan HMAC signature.
  - Diperbarui `src/app/api/studio/media/route.ts` agar otomatis mengalirkan berkas ke VM jika `VERAX_MEDIA_API_URL` diset, dengan fallback lokal untuk development.
  - `bun run typecheck` dan `bun run lint` lolos 0 error.
- **Verifikasi:**
  - Test suite 20-point di VM lulus 20 PASS / 0 FAIL (`node ~/verax-media-service/tests/test-suite.mjs`).
  - Seluruh 5 service VM eksisting (`forfh` 3000, `kontrakpaham` 3001, `webhook` 9000, `rivals-evidence` 4190, `vpn-api` 9001) terbukti tetap online dan tidak terganggu.
- **Langkah Pengguna yang Tersisa (User-side Actions):**
  - Konfigurasi DNS A Record: Arahkan `media.aryariap.my.id` ke IP publik VM (`20.214.143.187`).
  - Aktivasi Nginx & Certbot: Jalankan `sudo bash /home/azureuser/verax-media-service/install-media-nginx.sh` untuk menerapkan reverse proxy dan menerbitkan sertifikat Let's Encrypt.


## 22. Verax Press — Perombakan Penulisan Sistemik Berbasis Standar Anti-AI-Writing (10 Nov 2026)

- **Laporan Audit Lengkap:** `docs/superpowers/audits/2026-11-10-verax-system-writing-revision.md`
- **Pedoman Baku Baru:** `docs/editorial/VERAX_WRITING_STANDARDS.md` dan aturan agen di `AGENTS.md`.
- **Tujuan & Batasan:**
  - Menerapkan keahlian `anti-ai-writing` untuk merombak total teks milik sistem, pengembang, dan institusi di seluruh proyek Verax Press.
  - Memisahkan secara ketat teks sistem dari naskah berita: **isi artikel berita, draf editorial, kutipan narasumber, dan rekaman data di basis data tidak disentuh sama sekali**.
- **Hasil Remediasi Utama:**
  - **Pemberantasan Tanda Pisah Em Dash (—):** 167 kemunculan tanda pisah em dash pada direktori kode sumber (`src/`) dan dokumentasi telah dieliminasi 100%. Ditulis ulang dengan sintaksis bahasa Indonesia yang teratur, titik tengah (`·`), atau tanda kurung.
  - **Pembersihan Kosakata Klise AI:** Membasmi kata-kata seperti *delve*, *elevate*, *seamless*, *robust*, *tapestry*, *testament*, *foster*, *revolutionize*, dan klaim bombastis lainnya.
  - **Penyelarasan Bahasa Editorial:** Membakukan istilah antarmuka ke bahasa Indonesia jurnalistik (*review* → *penelaahan*, *fact-check* → *uji fakta*, *news* → *berita*, *editor* → *redaktur*).
  - **Penghapusan Metrik Fiktif:** Mengganti skor persentase rekaan (*94.60%*) dengan pelaporan verifikasi nyata.
  - **Transparansi Legalitas:** Menegaskan keterbukaan status Verax Press sebagai media percontohan independen tanpa memalsukan izin pers atau sertifikasi dewan pers.
  - **Perombakan Dokumentasi `README.md`:** Menghilangkan seluruh emoji dekoratif pada heading, memperbarui acuan teknologi (Next.js 16, Turso Cloud, Verax Media Storage Azure VM), dan merapikan panduan pengujian.
- **Verifikasi Kualitas Kode (100% Lulus):**
  - `bun run typecheck`: 0 kesalahan TypeScript.
  - `bun run lint`: Bersih tanpa peringatan.
  - `bun test`: 16 passed, 35 skipped (regresi HTTP diskip secara benar), 0 failed.
  - `bun run build`: 26/26 rute statis/dinamis terkompilasi sukses melalui Next.js Turbopack.

## 23. Verax Press — Full-System Quality Remediation (10 Nov 2026)

- **Cabang Git:** `remediation/comprehensive-qa-fix`
- **Laporan Remediasi:** `docs/superpowers/audits/2026-11-10-verax-full-system-remediation-report.md`
- **Bukti Visual (19 Resolusi Layar):** `docs/superpowers/audits/remediation-evidence/`
- **Ringkasan Implementasi dan Remediasi:**
  - **Fase A (Backend Security, Concurrency & Transactions):**
    - Memperbaiki celah otorisasi keluhan dengan `requireStaffPermission("complaint:manage")` di `src/lib/api.ts` yang mengambil profil staf langsung dari basis data dan memeriksa status `ACTIVE`.
    - Mengganti `count() + 1` pada pembuatan kode referensi keluhan di `src/app/api/public/complaints/route.ts` dengan bounded-retry loop (hingga 5 kali), penanganan error Prisma P2002, jitter backoff, dan HTTP 409 conflict terkendali.
    - Menyatukan operasi multi-entitas pada `POST /api/studio/corrections` dan `POST /api/internal/v1/ai-submissions` ke dalam `db.$transaction` interaktif.
  - **Fase B & H (Database Inventory Reconciliation):**
    - Menelusuri perbedaan 97 vs 100 vs 195 baris: SQLite lokal memiliki 100 baris (97 baseline + 3 baris uji audit sebelumnya), sedangkan Turso Cloud memiliki 195 baris utuh dengan `PRAGMA integrity_check` ok dan 0 pelanggaran foreign key.
    - Menyusun rencana rekonsiliasi non-destruktif untuk memulihkan `SourceReference` dan `CorrectionRecord` tanpa menghapus atau memutasi data produksi eksisting.
  - **Fase D (Test Isolation & Safety Guard):**
    - Menambahkan `assertApprovedTestDatabase` pada `tests/lib/test-db.ts` yang secara mutlak menolak koneksi ke `*.turso.io`, `libsql://`, atau `custom.db`.
    - Menambahkan 4 pengujian unit pada `tests/isolation-guard.test.ts` dan 9 pengujian backend pada `tests/backend-remediation.test.ts`.
  - **Fase E (Azure Media Storage TLS Diagnostics):**
    - Mengonfirmasi endpoint HTTP port 80 `/health` menghasilkan status OK 200.
    - Mendiagnosis sertifikat TLS port 443 yang saat ini menyajikan `efimg.aryariap.my.id` dan menyiapkan skrip `services/media-storage/activate-ssl.sh` untuk aktivasi resmi Let's Encrypt oleh operator.
  - **Fase F & G (Visual Redesign & Responsive Layout):**
    - Menerapkan tata letak 2 kolom broadsheet pada halaman artikel (`/artikel/[slug]`) dengan sidebar profil desk liputan, artikel terkait, dan kartu transparansi hak jawab (mengatasi 50% ruang kosong desktop).
    - Menerapkan tata letak 2 kolom pada halaman `/keluhan` dengan panduan prosedur editorial dan penggantian placeholder `slug-artikel`.
    - Mendesain ulang gerbang studio CMS (`/studio/login`) menjadi portal meja redaksi yang berwibawa dengan motto Latin dan konteks integritas editorial.
    - Memperbaiki penskalaan headline mobile (`text-[1.45rem]`) dan kalibrasi drop cap (minimal 200 karakter, 2 baris seimbang).
    - Memastikan navigasi mobile (`SiteMobileNav`) memiliki focus trap, penanganan tombol Escape, dan penonaktifan gulir latar belakang.
  - **Fase I (Anti-AI Writing Compliance):**
    - Memastikan 0 tanda pisah em dash (`—`) pada seluruh teks antarmuka publik dan panel studio.
    - Menghilangkan kosakata klise AI dan menjaga kejujuran faktual.
- **Hasil Verifikasi Teknis Akhir:**
  - `bun run typecheck`: 0 error.
  - `bun run lint`: 0 error / 0 warning.
  - `bun test`: 29 passed, 35 skipped, 0 failed (77 assertions passed).

## 24. Verax Press — Comprehensive UI/UX Refinement and Visual Redesign (10 Nov 2026)

- **Cabang Git:** `chore/ui-ux-refinement` / `remediation/comprehensive-qa-fix`
- **Laporan Komprehensif:** `docs/superpowers/audits/2026-11-10-verax-ui-ux-refinement-report.md`
- **Arsip Bukti Tangkapan Layar (24 File):** `docs/superpowers/audits/refinement-evidence/`
- **Ringkasan Perubahan UI/UX Utama:**
  1. **Navigasi Desktop (`src/components/site/desk-nav.tsx`):**
     - Mengubah distribusi menu desk dari `flex shrink-0` menjadi `md:flex [&>li]:flex-1` dengan `divide-x` dan `border-x`. Seluruh ruang kontainer (1152px) kini terisi merata dan simetris, menuntaskan pemotongan 45% ruang kosong yang sebelumnya terjadi pada resolusi 1440px dan 1920px.
     - Mengganti indikator aktif menjadi garis bawah tinta 2px (*understated ink underline*).
     - Menghilangkan scrollbar bawaan seluler dengan utilitas `[scrollbar-width:none] [&::-webkit-scrollbar]:hidden`.
     - Menambahkan masker gradasi pudar di tepi kanan pada seluler (`after:bg-gradient-to-l after:from-verity-paper`) sebagai isyarat visual halus keterguliran horizontal rubrik.
  2. **Bilah Utilitas & Masthead Ponsel (`src/components/site/masthead.tsx`):**
     - Membagi baris utilitas seluler menjadi dua baris terpusat tanpa tubrukan teks (`MEDIA INDEPENDEN · EDISI INDONESIA` pada baris pertama, `LOG KOREKSI · HAK JAWAB & KELUHAN` pada baris kedua).
     - Pada layar sempit 360px, kalibrasi ukuran teks utilitas ke `text-[9.5px]` dan `tracking-[0.08em]` untuk mencegah pemotongan huruf "A" di tepi kanan.
     - Menyusun masthead ponsel dalam kisi 3 kolom simetris (`w-10` menu, `flex-1` logo di tengah, `w-10` penyeimbang visual).
  3. **Laci Navigasi Seluler (`src/components/site/site-mobile-nav.tsx`):**
     - Menambahkan backdrop transparan `bg-black/40 backdrop-blur-xs`, listener tombol `Escape`, penguncian gulir dokumen `overflow: hidden`, dan cincin fokus keyboard aksesibel.
  4. **Penskalaan Tipografi Judul (`src/components/site/article-card.tsx`):**
     - Menetapkan headline seluler `LeadArticleCard` pada `text-[1.45rem] leading-[1.16]` dan bertransisi fluida ke ukuran desktop, mencegah judul berita utama memenuhi 5 baris layar ponsel.
  5. **Tata Letak Dua Kolom Tablet (`src/app/(public)/page.tsx`):**
     - Menambahkan `md:grid-cols-[minmax(0,1.35fr)_16rem]` agar tata letak surat kabar broadsheet tetap utuh pada orientasi potret iPad (768px-1023px) tanpa membuang kolom "Terbaru" ke dasar halaman.
  6. **Kalibrasi Drop Cap (`src/components/content/content-renderer.tsx`):**
     - Memperbaiki logika penempatan drop cap agar hanya aktif pada paragraf pembuka (`blocks[0]`), meniadakan bug di mana paragraf tengah yang panjang mendapatkan drop cap liar.
     - Mengurangi ambang panjang paragraf pembuka dari 200 ke 120 karakter, memungkinkan berita utama dengan paragraf pembuka ~192 karakter menampilkan drop cap berwibawa (`text-[3.25rem] leading-[0.82]`) secara presisi.
  7. **Tata Letak Dua Kolom Broadsheet Artikel Detail (`src/app/(public)/artikel/[slug]/page.tsx`):**
     - Mengimplementasikan grid `lg:grid-cols-[minmax(0,1fr)_19rem]` dengan kolom baca 65-75ch dan kolom samping editorial (konteks rubrik desk, artikel terkait, dan kartu hak jawab), menghapus ruang kosong >700px di sisi kanan desktop.
  8. **Tata Letak Halaman Rubrik Desk (`src/app/(public)/desk/[slug]/page.tsx`):**
     - Mengganti pembungkus kaku `max-w-3xl` dengan grid broadsheet 2 kolom pada paket berita pembuka (`FeaturedArticleCard` di kiri dan kolom "Liputan Terkini" di kanan dipisahkan oleh garis hairline vertikal), diikuti oleh kisi 3 kolom untuk arsip berita lainnya, menuntaskan ruang putih 50% di resolusi 1440px dan 1920px.
  9. **Formulir Keluhan Publik (`src/app/(public)/keluhan/page.tsx`, `src/components/site/complaint-form.tsx`):**
     - Mengubah halaman keluhan menjadi tata letak 2 kolom (formulir di kiri, klasifikasi 4 pilar hak jawab dan prosedur editorial di kanan).
     - Mengeliminasi teks placeholder teknis `slug-artikel` menjadi "Tautan atau judul artikel terkait (opsional)".
  10. **Portal Meja Redaksi Studio CMS (`src/app/studio/login/page.tsx`):**
      - Merombak gerbang login CMS menjadi portal meja redaksi dua panel: panel kiri memuat manifesto integritas jurnalisme dan verifikasi sumber, panel kanan memuat formulir autentikasi yang aman.
  11. **Dashboard Studio CMS (`src/app/studio/(cms)/page.tsx`):**
      - Menata ulang grid metrik artikel ke format 6 kolom seimbang (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`), memastikan seluruh 6 status artikel tersusun simetris dalam satu baris di desktop tanpa kartu terisolasi di baris kedua.
      - Memisahkan peringatan gerbang verifikasi sumber kunci dari peringatan artikel siap terbit Chief Editor dengan kartu penanda editorial yang jelas.
  12. **Studio Media Library & Uploader (`src/app/studio/(cms)/media/page.tsx`, `src/components/studio/media-asset-card.tsx`, `src/components/studio/media-uploader.tsx`):**
      - Mengembangkan komponen mandiri `MediaAssetCard` dengan fallback penanganan kesalahan pemuatan gambar (`onError`) yang menampilkan placeholder editorial berwibawa saat URL gambar pihak ketiga tidak dapat dijangkau.
      - Mempercantik form pengunggahan berkas media dengan penataan ruang redaksi, tombol aksi bertema tinta, dan metadata lisensi serta pengungkapan AI.
  13. **Kepatuhan Penulisan Jurnalistik (`anti-ai-writing`):**
      - 0 tanda pisah em dash (`—`) pada seluruh teks antarmuka dan panel sistem.
      - 0 kata klise AI, bahasa baku bahasa Indonesia jurnalistik, dan pelaporan faktual tanpa metrik rekaan.
- **Hasil Verifikasi Teknis:**
  - `bun run typecheck`: 0 kesalahan TypeScript (`tsc --noEmit`).
  - `bun run lint`: 0 error, 0 warning (`eslint .`).
  - `bun test`: 71 passed, 0 failed, 0 skipped (145 assertions passed across 8 test suites).
  - `bun run build`: 26/26 rute statis/dinamis terkompilasi sukses dalam 5.3 detik.
  - Server produksi terverifikasi melayani HTTP 200 OK di `http://localhost:3000`.
  - 24 tangkapan layar responsif lengkap tersimpan di `docs/superpowers/audits/refinement-evidence/` yang mencakup 8 rute pada 8 ukuran layar (360px hingga 1920px).

## 24. Verax Press: Final Release Gate & Independent Verification (10 Nov 2026)

- **Auditor Independen:** Antigravity QA & Independent Verification
- **Keputusan Gerbang Rilis:** **NOT READY FOR DEPLOYMENT**
- **Dokumen Laporan Lengkap:** `docs/superpowers/audits/2026-11-10-verax-final-release-gate.md`
- **Ringkasan Hasil Audit 8 Dimensi:**
  1. **Status Git & Deployment (FAIL):** 39 berkas termodifikasi dan 14 entri untracked berada di branch lokal `remediation/comprehensive-qa-fix`. Produksi Vercel (`https://verax-press.vercel.app`) masih menjalankan commit baseline `0f0df93` tanpa kode remediasi.
  2. **Provenans Data Turso (PASS dengan catatan):** Total 729 baris di Turso Cloud berhasil direkonsiliasi secara forensik (100 baris seed baseline + 629 baris dari eksekusi uji lampau). Integritas relasional bersih (0 pelanggaran foreign key). Namun, terdapat 18 artikel uji yang berstatus publik (14 PUBLISHED, 4 CORRECTED) di Turso Cloud yang perlu dibersihkan sebelum rilis.
  3. **Remediasi Backend (PASS):** `verifyStaffUserPermission`, otorisasi keluhan (`requireStaffPermission`), `createComplaintWithRetry` berpenjaga P2002, transaksi interaktif `$transaction` (koreksi dan AI submission), serta isolasi pengujian database (`assertApprovedTestDatabase`) 100% terverifikasi menggunakan fungsi produksi nyata.
  4. **Hasil Pengujian Otomatis (PASS):** `bun run typecheck` (0 error), `bun run lint` (0 warning/error), `bun test` (71 passed, 0 failed, 0 skipped, 145 assertions, 0 penulisan ke Turso), `bun run build` (26/26 rute Next.js 16.1.3 Turbopack terkompilasi bersih).
  5. **Tinjauan Visual (PASS):** Seluruh 43 tangkapan layar di 8 resolusi terbukti memenuhi hierarki editorial broadsheet, navigasi desk seimbang, drop cap terkalibrasi proporsional (maks 2 baris), dan portal CMS meja redaksi yang estetis.
  6. **Azure Media HTTPS (FAIL):** Port 80 sehat, rute publik dan isolasi direktori privat aman, namun port 443 menyajikan sertifikat TLS untuk `efimg.aryariap.my.id` (SAN tidak memuat `media.aryariap.my.id`), menyebabkan handshake TLS gagal (`ERR_TLS_CERT_ALTNAME_INVALID`).
  7. **Integrasi Lintas Sistem (SEBAGIAN):** Komunikasi Vercel ke Turso Cloud normal, namun komunikasi Vercel ke Azure Media Service via HTTPS terblokir oleh kegagalan sertifikat TLS port 443.
- **Rekomendasi Tindakan Pra-Rilis:**
  1. Operator VM menjalankan `sudo bash /home/azureuser/verax-media-service/activate-ssl.sh` di `forfh-korea-vm`.
  2. Pembersihan non-destruktif atas artikel uji di Turso Cloud (`test-article-*`).
  3. Commit dan merge branch `remediation/comprehensive-qa-fix` ke `main`, lalu push untuk memicu deployment Vercel produksi.

## 25. Verax Press: Complete Clean-Slate Reset (11 Nov 2026)

- **Status Operasi:** Selesai dan terverifikasi penuh (100% Lulus).
- **Dokumen Laporan Lengkap:** `docs/superpowers/audits/2026-11-10-verax-clean-slate-reset-report.md`
- **Tujuan Operasi:** Melaksanakan reset data bersih menyeluruh atas otoritas pemilik platform sebelum peluncuran resmi ke publik. Menghapus seluruh rekaman uji coba, data pengembangan, artikel sementara/placeholder, serta berkas media usang.
- **Cadangan Pra-Reset (Tersimpan di Luar Direktori Proyek):**
  - **Local SQLite:** `D:\Backup\verax-clean-slate-20261111\local-sqlite\custom-backup.db` (SHA-256: `5f7a9cc6ad30d2159cc7bc1d44904964b703a6ec59e129449dc3dc2d555b7a67`).
  - **Turso Cloud DB:** `D:\Backup\verax-clean-slate-20261111\turso\turso-backup.db` (SHA-256: `eea3f4ff45718357af2a63919e21869f6c81ea049335c6b639c430f0e3dd2bfe`), SQL dump: `turso-backup.sql` (SHA-256: `022508c3f8635a23a898c65e49279a6eeff5e5c89acc64e13aebaa7f9103ade1`). Teruji pulih sempurna 729/729 baris di database uji terisolasi.
  - **Azure Media Storage:** `/home/azureuser/verax-media-backup-clean-slate-20261111/media-backup-clean-slate-20261111.tar.gz` (SHA-256: `2429f9c2ca8fe10806b1725b881dc6cfc4068ff46119f8535a9cd285e4746055`) dan snapshot `media.sqlite` (SHA-256: `791f77d7f63edd6f22f0127371ea565981862856299181a664151c7720210ba0`), diunduh pula secara lokal ke `D:\Backup\verax-clean-slate-20261111\azure-media\`.
- **Hasil Eksekusi Reset:**
  - **Turso Cloud:** Seluruh tabel editorial dikosongkan (`Article`: 0, `ArticleVersion`: 0, `ArticleContribution`: 0, `SourceReference`: 0, `EditorialReview`: 0, `ReviewComment`: 0, `Submission`: 0, `MediaAsset`: 0, `Complaint`: 0, `CorrectionRecord`: 0). Akun Chief Editor (`chief@verity.test`, ACTIVE), 3 desk editorial kanonis (`hukum-keadilan`, `teknologi-kebijakan`, `nasional-publik`), serta API client internal (`vrtc_demo_agent`) dipertahankan utuh. Catatan audit administratif reset dibukukan ke `AuditEvent`. `PRAGMA integrity_check` ok, 0 pelanggaran foreign key.
  - **Local SQLite (`custom.db`):** Mengikuti kondisi identik Turso (0 artikel, 0 keluhan, 0 koreksi, akun Chief Editor dan 3 desk dipertahankan). `PRAGMA integrity_check` ok, 0 pelanggaran foreign key.
  - **Azure Media Storage (`forfh-korea-vm`):** 46 berkas fisik aktif di `public/` dan `private/` dibersihkan, direktori dipertahankan dengan izin akses yang tepat (0750 untuk publik, 0700 untuk privat). Tabel `media_items` dan `consumed_nonces` kosong (0 baris). Layanan `verax-media` berjalan online di PM2 dan endpoint `/health` merespons HTTP 200 OK.
- **Verifikasi Kualitas dan Fungsi Akhir:**
  - `bun run typecheck`: 0 kesalahan TypeScript.
  - `bun run lint`: 0 peringatan, 0 error.
  - `bun test`: 71 passed, 0 failed across 8 test suites (145 assertions passed), 0 penulisan ke Turso produksi.
  - `bun run build`: 26/26 rute Next.js 16.1.3 Turbopack terkompilasi bersih.
  - Uji asap server mandiri: Halaman depan (`/`), desk (`/desk/*`), opini (`/opini`), koreksi (`/koreksi`), serta pustaka media (`/studio/media`) menampilkan status kosong yang otentik tanpa galat render. Login Chief Editor di `/studio/login` berfungsi normal, dashboard menampilkan metrik nol akurat, dan alur pembuatan naskah baru berhasil terverifikasi.

## 26. Verax Press: Pengamanan Isolasi Basis Data Lokal dan Pengujian Pasca-Reset (11 Nov 2026)

- **Status:** Selesai dan terverifikasi penuh.
- **Tindakan Pengamanan:**
  1. **Proteksi Sambungan Turso di Lingkungan Lokal (`src/lib/db.ts`):** Mengunci adapter remote Turso Cloud agar hanya aktif bila `NODE_ENV === 'production'` atau melalui deklarasi eksplisit `VERAX_CONNECT_TURSO=true`. Pada mode pengembangan lokal harian (`NODE_ENV === 'development'`), aplikasi secara tegas diarahkan ke SQLite lokal (`db/custom.db`), menutup celah mutasi tidak sengaja ke Turso produksi di Singapura.
  2. **Isolasi Penuh Suite Pengujian (`src/lib/db.ts`, `tests/db.test.ts`):** Memastikan eksekusi pengujian otomatis (`NODE_ENV === 'test'`) secara eksklusif memanfaatkan berkas basis data uji terisolasi (`db/isolated-test.db`), menjaga kebersihan `db/custom.db` dan Turso Cloud dari data sampah pengujian.
  3. **Penyelarasan Gitignore (`.gitignore`):** Menambahkan aturan pengabaian untuk `db/*test*.db` agar berkas basis data uji sementara tidak tercatat di pohon kerja git.
  4. **Rekonsiliasi Aritmetika Laporan Audit (`docs/superpowers/audits/2026-11-10-verax-clean-slate-reset-report.md`):** Mengoreksi kalkulasi total baris pasca-reset menjadi 12 baris untuk Turso Cloud dan 7 baris untuk SQLite lokal sesuai rincian per tabel.
  5. **Verifikasi Alur Non-Destruktif (`scripts/clean-slate/verify-workflow.ts`):** Mengubah verifikasi Turso menjadi status baca saja (*read-only*), sementara pengujian alur penulisan naskah dialihkan ke lingkungan uji terisolasi.

## 27. Verax Press: Post-Reset Closure Audit & System Readiness (11 Nov 2026)

- **Status:** Investigasi selesai. Laporan lengkap dibukukan di `docs/superpowers/audits/2026-11-11-verax-post-reset-closure-audit.md`.
- **Klasifikasi Resmi:**
  1. **DATA RESET:** PASS (Semua 10 tabel konten editorial bersih 0 baris, 3 desk aktif, relasi referensial 100% konsisten, penyimpanan Azure media 0 berkas).
  2. **INFRASTRUCTURE:** FAIL (Sertifikat port 443 pada `media.aryariap.my.id` menyajikan SAN untuk `efimg.aryariap.my.id`, memblokir koneksi Node/Vercel via HTTPS).
  3. **PRODUCTION RELEASE:** NOT READY (Memerlukan eksekusi `activate-ssl.sh` di VM Azure oleh operator, bootstrapping akun Chief Editor produksi, penanganan `db/custom.db` yang ter-track di git, serta commit & deploy perubahan remediasi QA ke Vercel).
- **Tindakan yang Dilakukan:**
  - Decommissioning permanen `vrtc_demo_agent`: Dicabut dan dihapus dari Turso Cloud dan SQLite lokal, dicatat ke `AuditEvent`. `ApiClient` kini bersih 0 baris.
  - Validasi restorasi arsip cadangan media Azure (`media-backup-clean-slate-20261111.tar.gz`) di direktori isolasi temporer: integritas tar, integritas SQLite, serta 46 berkas media terverifikasi 100% cocok secara kriptografis (SHA-256) dengan rekaman basis data.
  - Penyediaan skrip bootstrap identitas Chief Editor produksi di `scripts/bootstrap-chief-editor.ts` yang memperbarui `StaffUser` dan `Person` secara atomik dengan enkripsi scrypt serta pencatatan audit.

## 28. Verax Press: Pre-Release Hardening and Deployment Preparation (11 Nov 2026)

- **Status:** Selesai dan terverifikasi penuh.
- **Laporan Lengkap:** `docs/superpowers/audits/2026-11-11-verax-pre-release-hardening-report.md`.
- **Klasifikasi Resmi:**
  1. **ADMIN IDENTITY:** NOT READY (Skrip bootstrap diperkeras dengan validasi target eksplisit; menunggu eksekusi kredensial riil oleh pemilik sistem).
  2. **AZURE TLS:** READY (Sertifikat Let's Encrypt resmi untuk `media.aryariap.my.id` port 443 aktif dan terverifikasi valid hingga 9 Februari 2027; port 80 mengalihkan ke HTTPS; SNI `efimg.aryariap.my.id` tetap utuh).
  3. **GIT HYGIENE:** READY (Berkas `db/custom.db` berhasil dilepas dari pelacakan Git via `git rm --cached`; aturan presisi `*.db` dan `*.sqlite` ditambahkan ke `.gitignore`; daftar staging selektif disiapkan; `git diff --check` bersih 0 galat).
  4. **VERCEL CONFIGURATION:** NOT READY (Lingkungan Preview Vercel terhubung ke basis data Turso produksi yang sama; membutuhkan isolasi basis data pratinjau dan penyetelan `NEXTAUTH_SECRET` untuk Preview).
  5. **APPLICATION QA:** PASS (TypeScript typecheck 0 galat, ESLint 0 galat, suite pengujian 71/71 lulus, build Turbopack 26/26 rute berhasil, suite uji asap 31/31 lulus dengan nol kebocoran data).
  6. **PRODUCTION RELEASE:** NOT READY (Tertahan pembaruan identitas kredensial Chief Editor operasional dan pemisahan basis data Vercel Preview).
- **Tindakan Kunci yang Dilakukan:**
  - Pengerasan `scripts/bootstrap-chief-editor.ts`: Menambahkan penegasan target wajib `VERAX_DB_TARGET=turso|local`, penolakan target ambigu (protokol `libsql://`/`https://` wajib untuk Turso; penolakan `turso.io` dan remote scheme pada target lokal), deteksi konflik alamat surel dengan akun staf lain, pembaruan 1-to-1 non-duplikatif pada `StaffUser`, jaminan keutuhan relasi `Person`, penegasan grant `canRiskEdit` dan `canManageComplaints`, stempel waktu ISO 8601, targetType `AUTH` pada `AuditEvent`, serta pencegahan kebocoran rahasia.
  - Verifikasi langsung soket TLS Azure: Inspeksi Node.js SNI membuktikan sertifikat port 443 valid untuk `media.aryariap.my.id` (Let's Encrypt valid hingga 9 Februari 2027) dan koneksi Node `fetch` menghasilkan status 200 OK, sementara host `efimg.aryariap.my.id` tetap terlindungi.
  - Pelepasan pelacakan `db/custom.db`: Menjalankan `git rm --cached db/custom.db` dan memverifikasi berkas lokal di cakram tidak terhapus.
  - Perbaikan isolasi dan kebersihan uji asap: Memperbaiki `scripts/smoke-test.ts` dan `tests/lib/test-db.ts` agar membersihkan naskah, keluhan, dan aset media uji secara tuntas dalam blok `finally`, menghilangkan akumulasi data zombie pada `isolated-test.db`.
  - Mengganti `apiClient.create().catch()` menjadi `apiClient.upsert()` pada `tests/lib/test-db.ts`, menghilangkan jejak galat `prisma:error` saat suite regresi dijalankan.
  - Penyusunan daftar pentahapan selektif presisi (per berkas eksplisit) pada laporan audit untuk mencegah penggunaan `git add` direktori gelondongan.

## 29. Verax Press: Pembaruan Kredensial Pemimpin Redaksi dan Fleksibilitas Identitas Masuk (11 Nov 2026)

- **Status:** Selesai dan terverifikasi penuh (100% Lulus).
- **Objektif:**
  - Melakukan bootstrap kredensial resmi Pemimpin Redaksi pada Turso Cloud dan SQLite lokal sesuai instruksi pemilik sistem (`pemredVP` / `Arya Rizky Ardhi Pratama` / `Arya260408` / `Pemimpin Redaksi Verax Press.`).
  - Menyesuaikan penanganan identitas masuk agar mendukung nama pengguna (*username*) alfanumerik di samping alamat surel standar.
- **Tindakan Teknis yang Dilakukan:**
  1. **Fleksibilitas Identitas Masuk (`src/lib/auth.ts`):** Mengizinkan staf redaksi masuk menggunakan alamat surel maupun nama pengguna dengan pencocokan case-insensitive aman (`db.staffUser.findFirst` dan fallback `$queryRaw` berklausa `COLLATE NOCASE`), mencatat `lastLoginAt` dan peristiwa audit `auth.login` ke `AuditEvent`.
  2. **Formulir Meja Redaksi (`src/app/studio/login/page.tsx`):** Menyesuaikan tipe kolom masukan dari `email` ke `text`, melonggarkan validasi HTML5 peramban agar tidak memblokir masukan nama pengguna seperti `pemredVP`, memperbarui label antarmuka menjadi "Email atau Nama Pengguna Redaksi", serta menambahkan atribut keyboard mobile `autoCapitalize="none"`, `autoCorrect="off"`, dan `spellCheck={false}` untuk mencegah keyboard virtual ponsel mengubah huruf besar/kecil atau mengoreksi ejaan nama pengguna.
  3. **Pengerasan Validasi Skrip Bootstrap (`scripts/bootstrap-chief-editor.ts`):** Memperluas ekspresi reguler validasi identitas agar menerima nama pengguna alfanumerik (3-50 karakter) di samping format surel, menurunkan ambang batas panjang kata sandi minimal ke 8 karakter, serta menerapkan `COLLATE NOCASE` pada verifikasi keunikan akun dengan sifat idempoten penuh.
  4. **Eksekusi Basis Data Turso Cloud (`VERAX_DB_TARGET=turso`):** Berhasil memperbarui rekaman `StaffUser` (`cmwa0zr730003r60343oibcb2`), relasi `Person` (`cmwa0zrbo0007r603pb9yonui`), dan membukukan peristiwa audit `auth.chief_bootstrapped`.
  5. **Eksekusi Basis Data SQLite Lokal (`VERAX_DB_TARGET=local`):** Memperbarui `db/custom.db` sehingga data pengembangan lokal selaras secara identik dengan basis data komputasi awan.
  6. **Suite Pengujian Integrasi Langsung (`tests/auth-identifier.test.ts`):** Memperbaiki dan memperdalam pengujian otomatis agar memanggil langsung metode `options.authorize` resmi dari konfigurasi NextAuth `authOptions` (bukan mock helper terpisah), menguji pencocokan persis (`pemredVP`), huruf kecil (`pemredvp`), huruf besar (`PEMREDVP`), huruf campuran (`PemredVP`), pembuktian pencatatan audit `auth.login`, penolakan kata sandi keliru tanpa pencatatan audit, penolakan akun tidak terdaftar, dan penolakan masukan kosong/null.
- **Hasil Verifikasi:**
  - `bun test`: 78 lulus dari 78 pengujian lintas 9 berkas (167 assertions lulus, 0 gagal).
  - `bun run build`: 26/26 rute Next.js 16.1.3 Turbopack terkompilasi bersih tanpa galat TypeScript atau ESLint.


## 30. Verax Press: Peluncuran Resmi ke Git Remote dan Deployment Vercel Produksi (11 Nov 2026)

- **Status:** Selesai dan sukses (100% Online).
- **Tindakan yang Dilakukan:**
  1. **Git Remote Push:** Mendorong branch `remediation/comprehensive-qa-fix` ke remote origin GitHub (`https://github.com/algojogacor/Verax-Press.git`).
  2. **Penggabungan ke Branch Utama:** Berpindah ke branch `main`, melakukan penggabungan fast-forward dari `remediation/comprehensive-qa-fix` (`0f0df93..af0f104`), dan mendorong pembaruan branch `main` ke remote GitHub.
  3. **Deployment Vercel Produksi:** Menjalankan perintah `vercel --prod --yes` yang memicu build produksi resmi di Washington D.C. (iad1). Kompilasi Next.js 16.1.3 Turbopack selesai dalam 27 detik dan berhasil meng-generate seluruh 26 rute publik dan studio CMS.
  4. **Pemberian Alias Domain Produksi:** Deployment `dpl_7xjTvLH7S2tvmyKL2sDEJVYsuXZm` berhasil dipromosikan ke domain resmi: `https://verax-press.vercel.app`.
  5. **Verifikasi Produksi Langsung:** Probe HTTP terhadap `https://verax-press.vercel.app` mengembalikan HTTP 200 OK dengan status clean-slate otentik ("Belum ada artikel terbit"). Login meja redaksi studio di `https://verax-press.vercel.app/studio/login` aktif melayani autentikasi akun Pemimpin Redaksi.

## 31. Verax Press: Fase 1 Migrasi Role, Struktur Akun, dan Permission Matrix (11 Nov 2026)

- **Status:** Selesai dan terverifikasi penuh (Status Resmi: IMPLEMENTATION COMPLETE).
- **Laporan Audit Teknis:** `docs/superpowers/audits/2026-11-11-fase-1-role-permission-report.md`.
- **Objektif:**
  - Menyederhanakan struktur peran redaksi menjadi dua peran resmi: `CHIEF_EDITOR` dan `WRITER`.
  - Menghapus dependensi pada peran lama (`EDITOR`, `INTERNAL_AUTHOR`, dan referensi `VOLUNTEER` sebagai staf).
  - Menghapus kolom hibah kewenangan khusus `canRiskEdit` dan `canManageComplaints`.
  - Memisahkan identitas semantik `username` (wajib, unik, case-insensitive) dan `email` kontak (opsional, unik).
  - Membangun model dan alur kriptografis `StaffInvitation` (token acak 32-byte, hash SHA-256 di basis data, masa aktif 7 hari, sekali pakai).
  - Menyiapkan fondasi model `Contributor` dan `ContributorApplication` yang terisolasi dari tabel staf untuk persiapan Fase 2.
  - Membangun antarmuka Studio CMS Meja Redaksi `/studio/staff` ("Tim Redaksi") khusus Pemimpin Redaksi (Overview metrik 4 kartu, tab Daftar Anggota dengan pencarian/filter/sortir/paginasi, tab Undangan Aktivasi, dialog Undang Penulis, dialog Edit Profil, dialog Penangguhan).
  - Membangun halaman publik aktivasi `/studio/invitasi/[token]` untuk verifikasi token dan pembuatan kata sandi Penulis baru.
  - Menegakkan proteksi mutlak pada sisi server agar akun Pemimpin Redaksi aktif terakhir tidak dapat ditangguhkan atau dihapus (`LAST_CHIEF_CANNOT_BE_SUSPENDED`).
- **Tindakan Teknis yang Dilakukan:**
  1. **Skema Prisma & Migrasi SQL (`prisma/schema.prisma`):** Menambahkan `username` pada `StaffUser`, menjadikan `email` opsional, mendefinisikan model `StaffInvitation` dan `ContributorApplication`. Berkas migrasi dibuat di `prisma/migrations/20261111120000_fase_1_role_and_staff_migration/migration.sql` dan dieksekusi via `scripts/migrate-role-and-staff.ts` dengan penonaktifan foreign key sementara dan verifikasi `PRAGMA integrity_check: ok`.
  2. **Domain & Permission Helpers:** Memperbarui `src/types/verity.ts`, `src/lib/domain/permissions.ts`, `src/lib/domain/workflow.ts`, `src/lib/domain/serializers.ts`, `src/lib/domain/constants.ts`, dan `src/lib/api.ts`.
  3. **Rute API Studio CMS & Publik:** Memperbarui otorisasi role-scoped pada `/api/studio/articles`, `/api/studio/dashboard`, `/api/studio/media`, `/api/studio/complaints`, `/api/studio/corrections`. Mengimplementasikan endpoint `/api/studio/staff` (GET, PATCH), `/api/studio/staff/invitations` (GET, POST, revoke, resend), serta endpoint publik `/api/public/invitations/[token]` (GET, accept POST).
  4. **Antarmuka Pengguna Studio CMS:** Mengimplementasikan `/studio/staff` dan `/studio/invitasi/[token]` dengan kepatuhan penuh terhadap standar tipografi dan salinan Verax Press (`anti-ai-writing`).
  5. **Pengujian Menyeluruh:** Membuat suite pengujian baru `tests/staff-management.test.ts` (13 pengujian) yang mencakup seluruh skenario wajib, memutakhirkan `tests/backend-remediation.test.ts` dan `tests/regression.test.ts`, serta memperbarui `scripts/smoke-test.ts`.
- **Hasil Verifikasi:**
  - `bun test`: 89 lulus dari 89 pengujian lintas 10 berkas (217 asersi lulus, 0 gagal).
  - `scripts/smoke-test.ts`: 32 pemeriksaan lulus 100%, isolasi Turso Cloud Production strictly untouched (zero leakage).
  - `bun run typecheck`: Bersih 0 galat tipe.
  - `bun run lint`: Bersih 0 galat dan 0 peringatan.
  - `bun run build`: 29/29 rute Next.js 16.1.3 Turbopack terkompilasi bersih ke dalam bundel standalone.

## 32. Verax Press: Fase 2 Sistem Volunteer: Pengajuan, Aktivasi, dan Portal Kontributor (11 Nov 2026)

- **Status:** Selesai dan terverifikasi penuh (Status Resmi: IMPLEMENTATION COMPLETE).
- **Laporan Audit Teknis:** `docs/superpowers/audits/2026-11-11-fase-2-volunteer-report.md`.
- **Objektif:**
  - Memisahkan identitas kontributor eksternal (`Contributor`) dari staf redaksi (`StaffUser`).
  - Membangun formulir pendaftaran terbuka untuk calon relawan di `/kontributor/daftar` dengan konfirmasi kelayakan usia 18+ (`adultConfirmedAt`) dan persetujuan pedoman kontributor.
  - Membangun modul persetujuan permohonan relawan di `/studio/applications` khusus Pemimpin Redaksi, dilengkapi ringkasan metrik 4 kartu, filter status, dialog keputusan (terima dengan token aktivasi kriptografis SHA-256 masa berlaku 7 hari, atau tolak dengan catatan alasan), dan tab tata kelola status kontributor terdaftar (penangguhan dan reaktivasi).
  - Membangun halaman aktivasi publik di `/kontributor/aktivasi/[token]` untuk penetapan nama pengguna unik dan kata sandi baru (minimal 8 karakter).
  - Membangun portal mandiri kontributor di `/kontributor/portal` mencakup dasbor metrik, pembuatan naskah baru format non-berita (OPINION, ANALYSIS, EXPLAINER, FEATURE, INTERVIEW; format NEWS ditolak pada level server), editor naskah draf/revisi, penambahan rujukan sumber primer, alur pengajuan tinjauan editorial (`SUBMIT_REVIEW`), penarikan naskah mandiri (`WITHDRAW`), pengiriman ulang pascarevisi (`RESUBMIT_REVIEW`), pelacakan riwayat telaah redaksi, dan penyuntingan profil publik byline.
  - Mengisolasi hak akses kontributor dari perimeter Studio CMS staf dan mengunci data naskah antar-kontributor (`contributorId === user.id`).
- **Tindakan Teknis yang Dilakukan:**
  1. **Skema Prisma dan Migrasi SQL (`prisma/schema.prisma`):**
     - Memperbarui model `Contributor` dengan kolom `lastLoginAt`, relasi `articles`, dan relasi `application`.
     - Merekonstruksi model `ContributorApplication` dengan kolom minat tulisan, contoh artikel, konfirmasi usia 18+, persetujuan pedoman, relasi pemutus (`decidedById`), catatan keputusan, dan token undangan relasi 1-to-1.
     - Membuat model `ContributorInvitation` dengan token ter-hash SHA-256 (32 byte CSPRNG), stempel kedaluwarsa, stempel diterima, dan stempel dicabut.
     - Menambahkan kolom `contributorId` pada model `Article`.
     - Mengubah kolom `reviewerId` pada model `EditorialReview` menjadi nullable agar pengajuan naskah awal relawan tidak membutuhkan penelaah manusia.
     - Berkas migrasi resmi disimpan di `prisma/migrations/20261111180000_fase_2_volunteer_and_contributor_migration/migration.sql` dan diterapkan ke `db/custom.db` serta `db/isolated-test.db` dengan integritas referensial 100% konsisten.
  2. **Domain, Workflow, dan Otorisasi:**
     - Menambahkan helper `requireContributorSession()` pada `src/lib/api.ts`.
     - Memperbarui `src/lib/auth.ts` untuk memproses autentikasi kontributor eksternal dengan pembedaan klaim sesi `accountType: "CONTRIBUTOR"` vs `"STAFF"` serta pemblokiran akun kontributor berstatus `SUSPENDED`.
     - Menambahkan aksi `WITHDRAW` dari status `PENDING_REVIEW` pada `src/lib/domain/workflow.ts` serta mendaftarkan peran `CONTRIBUTOR` pada aturan alur kerja.
     - Memperbarui `src/lib/domain/permissions.ts` untuk memvalidasi kepemilikan naskah kontributor dan mencegah akses lintas akun.
     - Menambahkan serializer DTO kontributor pada `src/lib/domain/serializers.ts`.
     - Mengunci rute `/studio/applications` (khusus `CHIEF_EDITOR`) dan `/kontributor/portal/*` (khusus `CONTRIBUTOR`) pada `src/middleware.ts`.
  3. **Rute API:**
     - Endpoint Publik: `POST /api/public/contributor/apply`, `GET /api/public/contributor/invitations/[token]`, `POST /api/public/contributor/invitations/[token]/accept`.
     - Endpoint Studio Pemimpin Redaksi: `GET /api/studio/applications`, `GET /api/studio/applications/[id]`, `POST /api/studio/applications/[id]/decide`, `GET /api/studio/volunteers`, `PATCH /api/studio/volunteers/[id]`.
     - Endpoint Portal Kontributor: `GET /api/contributor/dashboard`, `GET & POST /api/contributor/articles`, `GET & PATCH /api/contributor/articles/[id]`, `POST /api/contributor/articles/[id]/transition`, `POST & DELETE /api/contributor/articles/[id]/sources*`, `GET & PATCH /api/contributor/profile`.
  4. **Antarmuka Pengguna (UI):**
     - Memperbarui halaman `/pedoman-kontributor` dengan tautan langsung ke formulir pendaftaran.
     - Membuat halaman pendaftaran di `/kontributor/daftar`, aktivasi akun di `/kontributor/aktivasi/[token]`, dan halaman masuk di `/kontributor/login`.
     - Membangun antarmuka modul Studio `/studio/applications` dengan tab permohonan masuk dan tab kontributor aktif.
     - Membangun portal kontributor terintegrasi di `/kontributor/portal`, `/kontributor/portal/naskah/baru`, `/kontributor/portal/naskah/[id]`, dan `/kontributor/portal/profil`.
  5. **Pengujian dan Verifikasi:**
     - Membuat berkas uji `tests/volunteer-flow.test.ts` memuat 27 skenario pengujian komprehensif (seluruh 27 lulus 100%).
     - Memperbarui `tests/backend-remediation.test.ts`, `tests/regression.test.ts`, dan `tests/workflow.test.ts`.
- **Hasil Verifikasi:**
  - `bun test`: 116 lulus dari 116 pengujian lintas 11 berkas (315 asersi lulus, 0 gagal).
  - `bun run typecheck`: Bersih 0 galat tipe.
  - `bun run lint`: Bersih 0 galat dan 0 peringatan.
  - `scripts/smoke-test.ts`: 32 pemeriksaan lulus 100%, Turso Cloud Production strictly untouched (zero leakage).
  - `bun run build`: 41/41 rute Next.js 16.1.3 Turbopack terkompilasi bersih ke dalam bundel standalone.

## 33. Verax Press: Fase 3 Developer Portal dan AI Agent Integration Infrastructure (11 Nov 2026)

- **Status:** Selesai dan terverifikasi penuh (Status Resmi: IMPLEMENTATION COMPLETE).
- **Laporan Audit Teknis:** `docs/superpowers/audits/2026-11-11-fase-3-developer-portal-ai-agent-report.md`.
- **Objektif:**
  - Membangun portal pengembang resmi di Meja Redaksi Studio (`/studio/api-clients`) khusus Pemimpin Redaksi dengan 5 modul: Ringkasan Metrik Aktual, Tata Kelola Klien & Rotasi Kredensial, Spesifikasi Mesin, Log Permintaan, dan API Playground.
  - Menetapkan siklus hidup kredensial aman: pembuatan kredensial, tampilan kunci rahasia sekali tampil (one-time secret display), penyimpanan hash kriptografis SHA-256 konstan-waktu, rotasi kredensial dengan masa tenggang (grace period), pencabutan kredensial, dan isolasi lingkungan (Development, Preview, Production).
  - Menetapkan protokol autentikasi seragam: `Authorization: Bearer <CLIENT_ID>.<CLIENT_SECRET>`.
  - Membangun dokumentasi mesin berbasis satu sumber kebenaran (Single Source of Truth): `/openapi.json` (OpenAPI 3.1.0), `/.well-known/verax-agent.json` (metadata penemuan mandiri), `/llms.txt`, `/llms-full.txt`, serta panduan pengembang publik `/developers`.
  - Memperkeras endpoint ingestion (`POST /api/internal/v1/ai-submissions`) dengan validasi format naskah non-berita (larangan mutlak format NEWS bagi agen AI), status awal wajib DRAFT, sumber rujukan wajib UNVERIFIED, pelacakan kepemilikan submission (`apiClientId`), korelasi Request ID (`x-request-id`), idempotensi berbasis SHA-256 payload, dan isolasi pemantauan status naskah (`GET /api/internal/v1/ai-submissions/[submissionId]`).
  - Membangun endpoint validasi draf murni tanpa efek samping (`POST /api/internal/v1/ai-submissions/validate`) dan endpoint kapabilitas sistem (`GET /api/internal/v1/capabilities`).
  - Mengimplementasikan pencatatan log telemetri tersanitasi ke tabel `ApiRequestLog` dan proxy pengujian aman di sisi server untuk API Playground tanpa mengekspos secret ke peramban.
- **Tindakan Teknis yang Dilakukan:**
  1. **Skema Prisma dan Migrasi SQL (`prisma/schema.prisma`):**
     - Memperbarui model `ApiClient` dengan kolom `description`, `ownerName`, `environment`, dan relasi ke `credentials`, `submissions`, serta `requestLogs`.
     - Membuat model `ApiClientCredential` untuk mendukung rotasi kunci dan masa tenggang transisi.
     - Membuat model `ApiRequestLog` untuk mencatat durasi, status HTTP, alamat IP tersanitasi, submission ID, kode galat, dan Request ID.
     - Menambahkan kolom `apiClientId` dan indeks terkait pada model `Submission`.
     - Berkas migrasi disimpan di `prisma/migrations/20261111220000_fase_3_developer_portal_and_ai_agent/migration.sql` dan diterapkan ke basis data SQLite lokal (`db/custom.db` dan `db/isolated-test.db`) dengan integritas referensial 100% konsisten.
  2. **Domain, Validasi, dan Keamanan:**
     - Membuat modul `src/lib/domain/ingestion.ts` sebagai acuan validasi terpadu naskah ingestion dan dry-run.
     - Membuat modul `src/lib/domain/api-docs.ts` sebagai sumber kebenaran spesifikasi OpenAPI, discovery metadata, dan teks LLM.
     - Membuat utilitas `src/lib/request-logger.ts` untuk pembangkitan Request ID dan sanitasi data log.
     - Memperbarui `src/lib/api-key.ts` untuk memverifikasi token Bearer, masa aktif kredensial, masa tenggang, dan token proxy in-memory internal.
     - Menambahkan DTO dan serializer di `src/types/verity.ts` dan `src/lib/domain/serializers.ts`.
  3. **Rute API Integrasi:**
     - `POST /api/internal/v1/ai-submissions`: Pengiriman draf naskah resmi dengan idempotensi dan log permintaan.
     - `POST /api/internal/v1/ai-submissions/validate`: Validasi skema naskah dry-run tanpa persistensi.
     - `GET /api/internal/v1/ai-submissions/[submissionId]`: Pemantauan status editorial dengan isolasi kepemilikan ketat antar-klien.
     - `GET /api/internal/v1/capabilities`: Metadata rubrik aktif dan batasan format.
     - `GET /openapi.json`: Spesifikasi OpenAPI 3.1.0 terstruktur.
     - `GET /.well-known/verax-agent.json`: Metadata penemuan standar agen cerdas.
     - `GET /llms.txt` & `GET /llms-full.txt`: Panduan konteks agen AI bebas tanda pisah terlarang.
     - `GET & POST /api/studio/api-clients`: Daftar klien dan pembuatan kredensial baru.
     - `POST /api/studio/api-clients/[id]/rotate`: Rotasi kunci dengan masa tenggang.
     - `POST /api/studio/api-clients/[id]/revoke-credential`: Pencabutan kunci spesifik.
     - `GET /api/studio/api-clients/logs`: Pencarian dan paginasi log telemetri.
     - `GET /api/studio/api-clients/overview`: Metrik ringkasan aktual dari basis data.
     - `POST /api/studio/api-clients/playground/run`: Proxy pengujian server-side tanpa kebocoran secret.
  4. **Antarmuka Pengguna (UI):**
     - Membangun portal terpadu di `/studio/api-clients` mencakup 5 tab fungsional lengkap dengan dialog rotasi, dialog kunci sekali tampil, inspeksi log, dan editor JSON playground.
     - Menyelaraskan urutan menu sidebar Studio CMS menjadi: Dashboard, Artikel, Tim Redaksi, Pengajuan Volunteer, Media, Keluhan, Audit, API & Integrasi.
     - Membangun halaman dokumentasi publik di `/developers`.
  5. **Pengujian dan Verifikasi:**
     - Membuat suite pengujian baru `tests/developer-portal.test.ts` (25 pengujian komprehensif, seluruh 25 lulus 100%).
     - Menjalankan uji regresi penuh: seluruh 141 pengujian pada 12 berkas uji lulus 100%.
- **Hasil Verifikasi:**
  - `bun test`: 141 lulus dari 141 pengujian lintas 12 berkas (428 asersi lulus, 0 gagal).
  - `bun run typecheck`: Bersih 0 galat tipe.
  - `bun run lint`: Bersih 0 galat dan 0 peringatan.
  - `scripts/smoke-test.ts`: 32 pemeriksaan lulus 100%, Turso Cloud Production strictly untouched (zero leakage).
  - `bun run build`: 51/51 rute Next.js 16.1.3 Turbopack terkompilasi bersih ke dalam bundel standalone.

## 34. Koreksi Scope Fase 3: Pengizinan Format NEWS untuk Integrasi Agen AI
- **Tanggal:** 2026-11-11
- **Deskripsi:** Menyesuaikan batasan format naskah pada Content Ingestion API agar format `NEWS` dapat dikirimkan oleh agen kecerdasan buatan, sesuai dengan rancangan awal sistem tanpa membatasi variasi tulisan hanya pada opini atau analisis. Seluruh prinsip editorial Verax Press tetap dipertahankan secara utuh tanpa kompromi.
- **Prinsip Editorial yang Dipertahankan:**
  1. Agen kecerdasan buatan tidak memiliki endpoint maupun izin untuk menerbitkan artikel secara mandiri.
  2. Seluruh naskah yang dikirimkan oleh agen kecerdasan buatan (termasuk format `NEWS`) selalu masuk dengan status awal `DRAFT`.
  3. Seluruh rujukan sumber dari agen kecerdasan buatan selalu berstatus awal `UNVERIFIED` hingga diperiksa dan diverifikasi secara manual oleh redaktur manusia.
  4. Hak persetujuan dan penerbitan tetap eksklusif berada di tangan Pemimpin Redaksi (`CHIEF_EDITOR`).
  5. Byline artikel tetap mengikuti identitas resmi redaksi ("Redaksi Verax Press"), tanpa keberadaan entitas AI Writer di dalam CMS Studio.
  6. Rubrik artikel tetap menggunakan desk aktif yang sudah ada (`hukum-keadilan`, `teknologi-kebijakan`, `nasional-publik`).
- **Komponen yang Disesuaikan:**
  1. `src/lib/domain/constants.ts`: Menambahkan konstanta `INGESTION_ALLOWED_FORMATS` yang mencakup seluruh format `ARTICLE_FORMATS` (termasuk `NEWS`), sementara `CONTRIBUTOR_ALLOWED_FORMATS` tetap membatasi kontributor relawan eksternal agar tidak menulis berita langsung.
  2. `src/lib/domain/ingestion.ts`: Memperbarui fungsi `validateIngestionPayload` agar menerima format `NEWS` dan menolak format yang tidak terdaftar dengan kode galat `FORMAT_REJECTED`.
  3. `src/app/api/internal/v1/capabilities/route.ts`: Menyajikan format `NEWS` pada daftar `allowedFormats` endpoint kapabilitas.
  4. `src/lib/domain/api-docs.ts`: Memperbarui enum format pada OpenAPI 3.1.0, mengosongkan batasan `disallowedFormats` pada metadata `/.well-known/verax-agent.json`, serta memperbarui panduan mesin di `/llms.txt` dan `/llms-full.txt`.
  5. `src/app/(public)/developers/page.tsx`: Memperbarui informasi ketentuan format dan tabel kode galat pada dokumentasi publik.
  6. `src/app/studio/(cms)/api-clients/page.tsx`: Menambahkan opsi pemuatan contoh payload berita bertipe `NEWS` pada antarmuka Playground integrasi Studio CMS.
  7. `tests/developer-portal.test.ts` & `tests/regression.test.ts`: Menyesuaikan skenario pengujian dry-run dan intake agar memastikan format `NEWS` diterima dengan status `DRAFT` dan sumber `UNVERIFIED`, serta memastikan penolakan tetap berlaku untuk format di luar spesifikasi.
- **Hasil Verifikasi:**
  - `bun test`: 144 lulus dari 144 pengujian lintas 12 berkas uji (438 asersi lulus, 0 gagal).
  - `bun run typecheck`: Bersih 0 galat tipe TypeScript.
  - `bun run lint`: Bersih 0 galat dan 0 peringatan ESLint.
  - `scripts/smoke-test.ts`: 32 pemeriksaan lulus 100%, data produksi Turso Cloud aman tanpa kebocoran (0 leakage).
  - `bun run build`: 51 rute Next.js 16.1.3 Turbopack terkompilasi sukses.

## 35. Verax Press: Audit Pasca-Implementasi Fase 1, 2, dan 3 (11 Nov 2026)
- **Status:** Audit Selesai dan Laporan Disetujui Pengguna.
- **Laporan Audit Teknis:** `docs/superpowers/audits/2026-11-11-audit-pasca-implementasi-report.md`.
- **Objektif:**
  - Melakukan verifikasi independen dan berorientasi adversarial terhadap seluruh hasil implementasi Fase 1 (Role & Permission), Fase 2 (Volunteer System), dan Fase 3 (Developer Portal & AI Agent Integration).
  - Menguji kebenaran klaim status selesai melalui eksekusi pengujian otomatis, validasi skema basis data, inspeksi izin akses API, penelusuran kriptografi token, dan audit visual lintas viewport (desktop, tablet, mobile).
- **Hasil Pemeriksaan:**
  - **Tool Otomatis:** `bun run typecheck`, `bun run lint`, `bun test` (144 pengujian, 438 asersi), dan `bun run build` (51 rute Next.js Turbopack) lulus tanpa kesalahan. Tidak ditemukan pembungkaman tipe (`@ts-ignore`) atau linting.
  - **Keamanan Inti:** RBAC, isolasi draf kepemilikan penulis/relawan di level kueri SQL, sanitasi log token, dan hashing SHA-256 kredensial terbukti berfungsi 100%.
  - **Temuan Masalah (7 Temuan):**
    1. FINDING-001 [Tinggi]: Navigasi tab Developer Portal di Studio (`/studio/api-clients`) terpotong pada layar ponsel 390px karena ketiadaan `overflow-x-auto`.
    2. FINDING-002 [Sedang]: Contoh desk liputan pada OpenAPI dan `/llms-full.txt` menyebutkan `ekonomi-lingkungan` yang tidak terdaftar di sistem.
    3. FINDING-003 [Sedang]: Inkonsistensi penamaan variabel lingkungan URL publik (`VERAX_BASE_URL` vs `VERAX_PUBLIC_BASE_URL`) dan sisa baris komentar kredensial peran lama di `.env.example`.
    4. FINDING-004 [Sedang]: Skrip migrasi peran tidak menghentikan eksekusi saat mendeteksi role `VOLUNTEER` pada `StaffUser`.
    5. FINDING-005 [Sedang]: Residu deklarasi izin `canRiskEdit` dan `canManageComplaints` pada tipe TypeScript dan handler dashboard.
    6. FINDING-006 [Rendah]: Ketidakcocokan nilai default pada migrasi awal SQLite dan ketiadaan berkas `migration_lock.toml`.
    7. FINDING-007 [Rendah]: Ketidaksinkronan teks laporan Fase 3 terkait format `NEWS` yang telah diperluas pada entri log 34.
- **Tindakan Lanjutan:**
  - Dilanjutkan dengan eksekusi perbaikan dan pembersihan akun test pada entri log 36.

## 36. Verax Press: Tahap 2 Eksekusi Perbaikan Audit dan Pembersihan Data Test (11 Nov 2026)
- **Status:** Selesai dan terverifikasi penuh (Status Resmi: AUDIT REMEDIATION COMPLETE).
- **Berkas Audit Terkait:** `docs/superpowers/audits/2026-11-11-audit-pasca-implementasi-report.md`.
- **Objektif:**
  - Menyelesaikan seluruh temuan audit FINDING-001 hingga FINDING-007 sesuai rencana prioritas Bagian 5 laporan audit.
  - Menutup celah pengujian otomatis (test coverage gaps) untuk 4 skenario kritis yang belum diuji.
  - Membersihkan seluruh akun staf test seed dari basis data development (`db/custom.db`) dan memastikan akun resmi `pemredVP` menjadi satu-satunya akun staf aktif.
  - Memastikan nol regresi, nol galat tipe, nol peringatan linting, serta integritas relasional 100% konsisten.
- **Tindakan Teknis Perbaikan Temuan Audit:**
  1. **FINDING-001 (Regresi Tab Mobile Developer Portal):**
     - Berkas: `src/app/studio/(cms)/api-clients/page.tsx`
     - Perubahan: Membungkus `<TabsList>` dengan container `w-full overflow-x-auto pb-1` serta menambahkan kelas `inline-flex w-max min-w-full sm:min-w-0 sm:w-auto shrink-0` pada trigger tab. Seluruh 5 tab kini dapat digeser dan diakses penuh pada layar ponsel 390px.
     - Bukti visual: `docs/superpowers/audits/audit-evidence/studio-api-clients-mobile-390.png` telah diperbarui dan diverifikasi.
  2. **FINDING-002 (Inkonsistensi Desk Fiktif di Dokumentasi):**
     - Berkas: `src/lib/domain/api-docs.ts`
     - Perubahan: Mengganti contoh desk `ekonomi-lingkungan` pada skema OpenAPI 3.1.0 dan `/llms-full.txt` dengan desk resmi `nasional-publik`. Pemeriksaan `Get-ChildItem` membuktikan string `ekonomi-lingkungan` telah bersih dari seluruh direktori `src/`.
  3. **FINDING-003 (Penamaan Variabel Lingkungan & Residu Kredensial):**
     - Berkas: `src/app/(public)/developers/page.tsx`, `.env.example`
     - Perubahan: Menyelaraskan contoh kode cURL dan Python di `/developers` agar merujuk ke `VERAX_PUBLIC_BASE_URL`. Mendaftarkan variabel tersebut pada `.env.example`, serta menghapus baris komentar kredensial peran lama (`VERITY_SEED_PASSWORD_EDITOR` dan `VERITY_SEED_PASSWORD_AUTHOR`).
  4. **FINDING-005 (Pembersihan Residu Hak Akses canRiskEdit & canManageComplaints):**
     - Berkas: `src/types/verity.ts`, `src/lib/domain/permissions.ts`, `src/app/api/studio/dashboard/route.ts`, `src/app/studio/(cms)/complaints/page.tsx`, `src/app/studio/(cms)/layout.tsx`, `src/app/studio/(cms)/page.tsx`
     - Perubahan: Menghapus properti residu `canRiskEdit` dan `canManageComplaints` dari `SessionUser`, `userHasPermission`, dan pemalsuan nilai boolean pada handler dashboard. Mengganti pengecekan pada modul keluhan dengan wewenang jabatan langsung (`user.role === 'CHIEF_EDITOR'`). Pencarian menyeluruh memastikan nol hasil pemakaian di seluruh `src/`.
  5. **FINDING-004 (Pengaman Keras Skrip Migrasi Role):**
     - Berkas: `scripts/migrate-role-and-staff.ts`
     - Perubahan: Mengganti `console.warn` menjadi pelemparan eksepsi keras `throw new Error(...)` yang membatalkan migrasi dan keluar dengan kode non-nol saat mendeteksi akun staf dengan role `VOLUNTEER`. Diverifikasi dengan skrip uji terisolasi.
  6. **FINDING-006 (Penyelarasan Skema Migrasi & Lockfile):**
     - Berkas: `prisma/migrations/migration_lock.toml`, `prisma/schema.prisma`, `prisma/migrations/20261111230000_fase_4_align_defaults/migration.sql`
     - Perubahan: Menambahkan `migration_lock.toml` dengan provider `sqlite`. Menambahkan `@default(now())` pada `ContributorApplication.adultConfirmedAt` di `schema.prisma`. Membuat migrasi baru untuk menyelaraskan nilai default dan indeks tanpa mengubah migrasi lama. Eksekusi `bunx prisma migrate diff` menghasilkan `No difference detected` (zero drift).
  7. **FINDING-007 (Addendum Dokumentasi Ruang Lingkup Format Berita AI):**
     - Berkas: `docs/superpowers/audits/2026-11-11-fase-3-developer-portal-ai-agent-report.md`
     - Perubahan: Menambahkan catatan addendum resmi di akhir laporan Fase 3 yang mendokumentasikan perluasan dukungan format `NEWS` terkurasi untuk AI Agent sesuai catatan kerja entri 34.
  8. **Peningkatan Kredensial API:**
     - Berkas: `src/lib/api-key.ts`, `src/app/api/internal/v1/ai-submissions/route.ts`, `src/app/api/internal/v1/ai-submissions/validate/route.ts`, `src/app/api/internal/v1/ai-submissions/[submissionId]/route.ts`
     - Perubahan: Menambahkan fungsi `verifyApiClientDetailed` yang membedakan penolakan kredensial kedaluwarsa dengan kode HTTP 401 `CREDENTIAL_EXPIRED`.
- **Penutupan Kesenjangan Pengujian Otomatis (Test Coverage Gaps):**
  - Membuat suite pengujian baru `tests/audit-remediation.test.ts` (4 pengujian, seluruhnya lulus 100%):
    1. Pengujian penolakan HTTP 401 `CREDENTIAL_EXPIRED` untuk kunci API yang telah melewati `expiresAt`.
    2. Pengujian pembatasan laju permintaan (rate limiter) pada beban konkurensi paralel (20 permintaan simultan via `Promise.all` dengan kuota 5) membuktikan 5 diterima, 15 ditolak dengan `remaining: 0` tanpa kebocoran kuota.
    3. Pengujian penolakan akses portal kontributor mandiri (HTTP 403 `FORBIDDEN`) seketika setelah status kontributor diubah menjadi `SUSPENDED` pada sesi peramban yang sedang aktif.
    4. Pengujian isolasi komentar internal naskah: Penulis (`WRITER`) ditolak dengan HTTP 403 saat membaca atau menambahkan komentar pada artikel milik penulis lain, sementara penulis pemilik naskah diizinkan.
- **Pembersihan Akun Test dan Data Uji (Bagian III):**
  - **Cadangan Data:** Dibuat cadangan sebelum pembersihan di `db/custom.db.pre-cleanup-1794404536538.bak` dan `db/isolated-test.db.pre-cleanup-20261111.bak`.
  - **Skrip Pembersihan Terkelola:** Dibuat dan dijalankan `scripts/cleanup-test-accounts.ts`.
  - **Inisialisasi & Verifikasi Akun Asli:** Akun resmi Pemimpin Redaksi `pemredVP` (Arya Rizky Ardhi Pratama, `pemred@veraxpress.org`, role `CHIEF_EDITOR`, status `ACTIVE`) dipastikan aktif dan menjadi pemilik sah seluruh artikel contoh redaksi.
  - **Penghapusan Akun Test:** 4 akun seed development telah dihapus bersih dari tabel `StaffUser` dan `Person`:
    1. `chief@verity.test` (username: `chief`, "Chief Test")
    2. `editor@verity.test` (username: `editor`, "Editor Test")
    3. `penulis@verity.test` (username: `penulis`, "Alya Rahmadani")
    4. `author@verity.test` (username: `author`, "Author Test")
  - **Pembersihan Klien API Test:** 10 klien API per-run pengujian dibersihkan; menyisakan klien demo resmi `vrtc_demo_agent`.
  - **Atribusi Editorial:** 16 artikel contoh yang ada di basis data tetap utuh dengan atribusi dipindahkan secara sah ke akun `pemredVP`.
  - **Integritas Relasional:** Evaluasi `PRAGMA integrity_check` mengembalikan `ok` dan `PRAGMA foreign_key_check` mengembalikan 0 pelanggaran.
  - **Bukti Visual Pasca-Pembersihan:** Tangkapan layar antarmuka `/studio/staff` disimpan di `docs/superpowers/audits/audit-evidence/studio-staff-post-cleanup.png` membuktikan Meja Redaksi hanya menampilkan 1 anggota staf aktif (`pemredVP`).
- **Hasil Verifikasi Penuh:**
  - `bun run typecheck`: Bersih 0 galat tipe TypeScript.
  - `bun run lint`: Bersih 0 peringatan dan 0 galat ESLint.
  - `bun test`: 148 lulus dari 148 pengujian lintas 13 berkas uji (455 asersi lulus, 0 gagal).
  - `scripts/smoke-test.ts`: 32 pemeriksaan menyeluruh lulus 100%, data produksi Turso Cloud aman tanpa kebocoran (0 leakage).
  - `bun run build`: 51/51 rute Next.js 16.1.3 Turbopack terkompilasi bersih tanpa peringatan.

## 37. Verax Press: Pembersihan Data Uji Lanjutan dan Verifikasi Clean Slate Otentik (11 Nov 2026)
- **Status:** Selesai dan terverifikasi penuh (Status Resmi: CLEAN SLATE VERIFIED).
- **Objektif:**
  - Mengklarifikasi asal-usul dan status klien API `vrtc_demo_agent` serta 16 artikel contoh.
  - Menjalankan pembersihan putaran kedua untuk menghapus seluruh artikel contoh dan klien API dari basis data pengembangan (`db/custom.db`).
  - Menghasilkan kondisi clean slate murni: 0 artikel, 0 klien API, 0 log permintaan API uji, dan 1 akun staf resmi (`pemredVP`).
  - Melakukan verifikasi regresi penuh dan pengujian visual halaman studio.
- **Klarifikasi Temuan Data Uji:**
  1. **Klien API vrtc_demo_agent:**
     - Asal-usul: Dibuat oleh skrip pembenihan awal (`prisma/seed.ts`, baris 1009-1020) dan dipertahankan dalam skrip pembersihan lama (`scripts/clean-slate/reset-local-sqlite.ts`, baris 63) sebagai contoh klien integrasi pada masa awal perancangan API Ingestion.
     - Alasan Dipertahankan Sebelumnya: Pengecualian statis (`WHERE clientId != 'vrtc_demo_agent'`) pada skrip warisan disalahartikan sebagai data perlengkapan sistem resmi.
     - Riwayat Pemakaian: Hanya menggunakan kredensial pengujian lokal bawaan (`vrtk_demo_dev_secret_local_only` dan nilai acak pada `.env.local`). Kredensial tidak pernah dipakai oleh agen eksternal sungguhan atau di luar pengujian otomatis.
  2. **16 Artikel Contoh:**
     - Karakteristik Konten: 12 artikel berasal dari pembenihan (`prisma/seed.ts`) yang dibuat sebagai materi peraga tata letak antarmuka publik dan pengujian pengurai JSON blok terstruktur. Sisanya merupakan naskah draf uji alur kerja redaksi. Seluruh artikel ini bukan laporan jurnalisme riil yang diniatkan untuk dipertahankan.
     - Status Publikasi: 11 artikel berstatus `PUBLISHED`, 1 `CORRECTED`, 1 `PENDING_APPROVAL`, 1 `FACT_CHECK`, dan 3 `DRAFT`. Artikel yang berstatus `PUBLISHED` sebelumnya dapat diakses pada rute publik development lokal.
- **Tindakan Teknis yang Dilakukan:**
  1. **Pembuatan Cadangan Basis Data:**
     - Membuat cadangan sebelum eksekusi pada `db/custom.db.pre-round2-cleanup-20261111.bak` dan cadangan terstempel waktu `db/custom.db.pre-round2-cleanup-1794406319345.bak`.
  2. **Eksekusi Skrip Pembersihan (`scripts/cleanup-articles-and-demo-client.ts`):**
     - Menghapus 1 klien API (`vrtc_demo_agent`), 1 kredensial aktif, dan seluruh catatan log permintaan uji.
     - Menghapus 17 artikel (16 artikel contoh dan 1 naskah uji audit) beserta seluruh entitas anak relasionalnya: `ArticleVersion`, `SourceReference`, `EditorialReview`, `ReviewComment`, `ArticleContribution`, `CorrectionRecord`, dan `Submission`.
     - Memutuskan relasi artikel pada tabel keluhan (`Complaint.articleId = NULL`) untuk menjaga integritas pengujian ombudsman publik.
     - Membukukan catatan audit `editorial.clean_slate_executed` atas nama `pemredVP`.
  3. **Pemeriksaan Integritas Basis Data:**
     - `PRAGMA foreign_key_check`: Bersih (0 pelanggaran).
     - `PRAGMA integrity_check`: Status `ok`.
     - Ringkasan baris data tabel utama pada `db/custom.db`:
       - `StaffUser`: Tepat 1 akun aktif (`pemredVP_official`, Pemimpin Redaksi).
       - `Article`: 0 naskah.
       - `ApiClient`: 0 klien.
       - `ApiClientCredential`: 0 kredensial.
       - `ApiRequestLog`: 0 catatan log.
       - `Submission`: 0 pengajuan.
       - `Contributor`: 0 kontributor.
       - `ContributorApplication`: 0 permohonan.
  4. **Pengujian Regresi Menyeluruh:**
     - `bun run typecheck`: Lulus tanpa galat tipe (0 errors).
     - `bun run lint`: Lulus tanpa peringatan maupun galat ESLint (0 errors, 0 warnings).
     - `bun test`: 148 pengujian lintas 13 berkas lulus 100% (455 asersi lulus).
     - `bun run build`: 51 rute Next.js 16.1.3 Turbopack terkompilasi optimal.
     - `bun run scripts/smoke-test.ts`: 32 pengujian alur redaksi lulus 100% pada basis data pengujian terisolasi, dengan perlindungan nol kebocoran ke Turso Cloud Production.
  5. **Verifikasi Visual Antarmuka Studio:**
     - Menjalankan server lokal terhadap `db/custom.db` dan masuk menggunakan akun resmi Pemimpin Redaksi `pemredVP`.
     - Mengambil bukti visual beresolusi 1440px desktop dan 390px ponsel:
       - `docs/superpowers/audits/audit-evidence/studio-dashboard-clean-slate-desktop-1440.png`: Menampilkan ringkasan "0 naskah terpantau" dan "Belum ada naskah yang terpantau."
       - `docs/superpowers/audits/audit-evidence/studio-articles-clean-slate-desktop-1440.png`: Menampilkan daftar artikel dengan pesan status kosong "Tidak ada naskah yang cocok dengan filter ini."
       - `docs/superpowers/audits/audit-evidence/studio-api-clients-clean-slate-desktop-1440.png`: Menampilkan metrik 0 Klien Integrasi, 0 Permintaan Hari Ini, tab "Klien API (0)", dan wadah status kosong "Belum Ada Klien API" dengan tombol aksi "Buat Klien Pertama".





## 38. Verax Press: Migrasi Skema Produksi Turso Cloud dan Peluncuran Rilis (11 Nov 2026)
- **Status:** Selesai dan terverifikasi penuh (Status Resmi: PRODUCTION MIGRATED & DEPLOYMENT READY).
- **Objektif:**
  - Menerapkan skema kanonis Fase 1 hingga Fase 4 ke basis data produksi Turso Cloud (`libsql://verax-aryarizkyap.aws-ap-southeast-1.turso.io`) atas persetujuan pemilik sistem.
  - Memastikan keselarasan 100% antara skema produksi Turso Cloud dan skema lokal Prisma `prisma/schema.prisma`.
  - Mengonfirmasi akun resmi Pemimpin Redaksi `pemredVP` aktif di Turso Cloud dengan kredensial utuh.
  - Melakukan pendorongan komit (*git push*) ke remote GitHub `main` dan memicu rilis Vercel Produksi.
- **Tindakan Teknis yang Dilakukan:**
  1. **Migrasi Skema Turso Cloud (`scripts/migrate-turso-clean-slate.ts`):**
     - Mengekstrak DDL 21 tabel dan 50 indeks dari `db/custom.db`.
     - Menghapus tabel skema lama Turso secara berurutan dengan penanganan dependensi foreign key.
     - Membuat 21 tabel kanonis baru: `StaffUser` (dengan kolom `username`), `Contributor`, `Desk`, `Person`, `MediaAsset`, `ApiClient`, `ApiClientCredential`, `ApiRequestLog`, `StaffInvitation`, `ContributorApplication`, `ContributorInvitation`, `Article`, `ArticleVersion`, `ArticleContribution`, `SourceReference`, `EditorialReview`, `ReviewComment`, `Submission`, `Complaint`, `CorrectionRecord`, dan `AuditEvent`.
     - Membangun seluruh 50 indeks basis data yang diperlukan.
     - Menyemai 3 desk editorial resmi (`hukum-keadilan`, `teknologi-kebijakan`, `nasional-publik`).
     - Menyemai akun resmi Pemimpin Redaksi `pemredVP` (`pemredVP_official`, `pemred@veraxpress.org`, role `CHIEF_EDITOR`, status `ACTIVE`) beserta relasi baris nama `Person`.
     - Membukukan catatan audit `system.production_schema_migrated` pada tabel `AuditEvent`.
  2. **Verifikasi Integritas Produksi:**
     - `PRAGMA foreign_key_check`: 0 pelanggaran.
     - `PRAGMA integrity_check`: `ok`.
     - Probe kueri `pemredVP` mengembalikan identitas lengkap dengan status `ACTIVE`.
     - Penghitungan baris tabel produksi: 1 `StaffUser`, 1 `Person`, 3 `Desk`, 0 `Article`, 0 `ApiClient`, 0 `ContributorApplication`, 0 `StaffInvitation`.
  3. **Verifikasi Smoke Test Pra-Rilis:**
     - 32/32 pemeriksaan smoke test lulus 100% dengan isolasi ketat terhadap basis data pengujian lokal.


## 39. Verax Press: Peluncuran Resmi ke Git Remote dan Verifikasi Produksi Vercel (11 Nov 2026)
- **Status:** Selesai dan sukses (100% Online & Terverifikasi).
- **Objektif:**
  - Mendorong seluruh komit pembaruan kode dan migrasi ke repositori GitHub `main` (`https://github.com/algojogacor/Verax-Press.git`).
  - Memverifikasi deployment Vercel Produksi yang dipicu secara otomatis.
  - Menguji keaktifan endpoint publik dan sistem autentikasi Meja Redaksi langsung di lingkungan produksi.
- **Tindakan Teknis yang Dilakukan:**
  1. **Git Commit & Push:**
     - Komit `37758e5`: `feat: complete Phase 1-3 implementation, audit remediation, and clean slate schema` (134 berkas termodifikasi/ditambahkan, 17.675 penambahan baris).
     - Berhasil didorong ke `origin/main`.
  2. **Deployment Vercel Produksi:**
     - Deployment ID: `dpl_58DN7yEp1GoTruRdbAdbod9hBnCz`.
     - Status: `READY` (Selesai dalam 1 menit).
     - Domain Utama: `https://verax-press.vercel.app`.
     - Alias Produksi: `https://verax-press-arya-rizkys-projects.vercel.app`, `https://verax-press-git-main-arya-rizkys-projects.vercel.app`.
  3. **Verifikasi Produksi Langsung (*Live Probe*):**
     - Rute Publik:
       - `GET https://verax-press.vercel.app/` : 200 OK (Clean slate: "Belum ada artikel terbit").
       - `GET /studio/login` : 200 OK (Formulir masuk aktif).
       - `GET /developers` : 200 OK (Portal dokumentasi pengembang).
       - `GET /kontributor/daftar` : 200 OK (Pendaftaran sukarelawan dengan verifikasi 18+).
       - `GET /.well-known/verax-agent.json` : 200 OK.
       - `GET /llms.txt` & `/openapi.json` : 200 OK.
     - Autentikasi Produksi & Sesi Studio:
       - Uji masuk via `POST /api/auth/callback/credentials` dengan akun Pemimpin Redaksi `pemredVP`: HTTP 302 Redirect, berhasil menerbitkan sesi kredensial NextAuth.
       - Sesi aktif terverifikasi: `user.username = 'pemredVP'`, `user.role = 'CHIEF_EDITOR'`, `user.name = 'Arya Rizky Ardhi Pratama'`.
       - Dashboard Meja Redaksi `GET /api/studio/dashboard`: HTTP 200 OK, menyajikan 0 naskah, 0 keluhan, dan otoritas penuh redaksi (`canPublish: true`, `canManageStaff: true`, `canManageApiClients: true`).


## 40. Verax Press: Pendaftaran Domain Pendek Vercel (11 Nov 2026)
- **Status:** Selesai dan terverifikasi penuh.
- **Objektif:**
  - Memeriksa ketersediaan domain pendek `vp.vercel.app` dan `vrx.vercel.app`.
  - Mendaftarkan alias domain pendek alternatif berbasis `vrx` dan `vp`.
- **Hasil Pemeriksaan Domain:**
  - `vp.vercel.app`: Tidak tersedia (sudah digunakan oleh pihak ketiga).
  - `vrx.vercel.app`: Tidak tersedia (sudah digunakan oleh pihak ketiga).
- **Domain Pendek yang Berhasil Didaftarkan dan Aktif (HTTP 200 OK):**
  - `https://vrxp.vercel.app` (4 karakter: VRX Press)
  - `https://vpid.vercel.app` (4 karakter: Verax Press Indonesia)
  - `https://vrxid.vercel.app` (5 karakter: VRX Indonesia)
  - `https://vpnews.vercel.app` (6 karakter: VP News)
  - `https://vrxnews.vercel.app` (7 karakter: VRX News)
  - `https://veraxpress.vercel.app` (Verax Press resmi)


## 41. Verax Press: Konfigurasi Domain Utama veraxpress.vercel.app (11 Nov 2026)
- **Status:** Selesai dan sukses (100% Online & Terverifikasi).
- **Objektif:**
  - Mengubah nama proyek Vercel resmi menjadi `veraxpress`.
  - Menetapkan `https://veraxpress.vercel.app` sebagai domain utama kanonis sistem.
  - Memutakhirkan rujukan `getPublicBaseUrl()`, OpenAPI 3.1.0, dokumentasi pengembang, formulir keluhan, dan manifesto agen AI ke domain baru.
  - Menonaktifkan pembatasan SSO Vercel agar domain baru dapat diakses publik secara bebas.
- **Tindakan Teknis yang Dilakukan:**
  1. **Pengubahan Nama Proyek Vercel:** Proyek `verax-press` diubah namanya menjadi `veraxpress` via Vercel CLI (`vercel project rename verax-press veraxpress`).
  2. **Pembaruan Kode Sumber:**
     - `src/lib/domain/constants.ts`: Mengatur fallback domain produksi ke `https://veraxpress.vercel.app`.
     - `src/lib/domain/api-docs.ts`: Menyelaraskan daftar lingkungan resmi ke `https://veraxpress.vercel.app`.
     - `src/app/(public)/developers/page.tsx`: Mengganti tabel Base URL Resmi ke `https://veraxpress.vercel.app`.
     - `src/components/site/complaint-form.tsx`: Memperbarui contoh tautan ke `https://veraxpress.vercel.app`.
  3. **Penonaktifan SSO Deployment Protection:** Menjalankan `vercel project protection disable veraxpress --sso` untuk membuka akses publik pada seluruh rute API dan halaman situs.
  4. **Deployment & Promosi Produksi:** Menjalankan `vercel --prod` (Deployment ID: `dpl_3kPjiKFSm9vVk4ehMH9TPZ1wsuNx`).
  5. **Verifikasi Langsung:**
     - Seluruh endpoint publik (`/`, `/studio/login`, `/developers`, `/kontributor/daftar`, `/.well-known/verax-agent.json`, `/llms.txt`, `/openapi.json`) mengembalikan HTTP 200 OK.
     - Autentikasi Pemimpin Redaksi `pemredVP` pada `https://veraxpress.vercel.app` terverifikasi sukses (HTTP 302 Redirect -> HTTP 200 Dashboard).
