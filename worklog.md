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
