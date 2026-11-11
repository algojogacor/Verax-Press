# Laporan Audit Kesiapan Peluncuran Publik Verax Press

Tanggal pelaksanaan: 12 November 2026  
Status resmi: **STAGING READY / NEEDS OWNER DEPLOY & EDITORIAL CONTENT**  
Domain kanonis: `https://veraxpress.vercel.app`  
Lingkungan teruji: Local Workspace (`http://localhost:3000` dengan `db/custom.db`, server uji terisolasi `:3088` dengan `db/isolated-test.db`), serta observasi baca-saja (*read-only*) terhadap Produksi Vercel (`https://veraxpress.vercel.app`)

---

## Ringkasan Eksekutif

Pekerjaan kesiapan peluncuran ini menata ulang Verax Press dari sistem penerbitan internal menjadi publikasi digital yang langsung dipahami pengunjung luar tanpa panduan pengembang maupun pengelola. Pengunjung dapat membaca liputan per rubrik dan opini, memeriksa identitas serta kepemimpinan redaksi, memahami cara mengirim tulisan melalui jalur kontributor, menelusuri log koreksi, serta mengajukan hak jawab atau keluhan secara mandiri.

Audit menyelaraskan sepuluh pedoman kerja: `/credentials`, `/verification-before-completion`, `/vercel-react-best-practices`, `/web-design-guidelines`, `/agency-frontend-developer`, `/agency-reality-checker`, `/agency-backend-architect`, `/writing-guidelines` (mengacu [`docs/editorial/VERAX_WRITING_STANDARDS.md`](../../editorial/VERAX_WRITING_STANDARDS.md)), `unslop`, dan `security-audit`. Secara kode sumber dan antarmuka lokal, seluruh jalur publik siap ditinjau pada tahap *staging*, tetapi situs produksi (`https://veraxpress.vercel.app`) belum menerima pembaruan rilis ini dan basis data produksi masih kosong artikel berita.

---

## BAGIAN A: INVENTARISASI RUTE MENYELURUH (104 BERKAS `src/app`)

Pemetaan dilakukan langsung terhadap berkas aktual pada `src/app/`, `src/middleware.ts`, `next.config.ts`, dan `public/robots.txt`. Terdapat 104 berkas di `src/app/`: 40 halaman (`page.tsx`), 51 *endpoint* API (`src/app/api/**/route.ts`), 4 *endpoint* penemuan mesin (`route.ts`), 5 berkas tata letak (`layout.tsx`), serta `globals.css`, `sitemap.ts`, `icon.svg`, dan `favicon.ico`.

### A.1. Halaman Publik & Pengalihan Kompatibilitas (20 Rute `page.tsx`)

| Route | Current Purpose | Intended Audience | Access Level | Navigation Exposure | SEO / Indexability | Current Quality | Recommended Action | Reason |
|---|---|---|---|---|---|---|---|---|
| `/` | Beranda broadsheet (lead, daftar terbaru, banner orientasi publikasi, seksi desk, opini, strip koreksi) | Pembaca umum | Public | Logo masthead, menu beranda | Index, follow, canonical | Sangat baik (`0px` overflow, CTA kontras) | Keep | Titik masuk utama pembaca baru |
| `/artikel/[slug]` | Halaman baca artikel utuh (2 kolom, sumber rujukan, log koreksi, hak jawab, banner *retracted/archived*) | Pembaca umum | Public (`PUBLISHED`/`CORRECTED` / notice penarikan) | Kartu beranda, desk, opini, penulis | Index, follow (meta dinamis) | Sangat baik | Keep | Ruang baca utama dengan transparansi sumber |
| `/articles/[slug]` | Pengalihan kompatibilitas tautan berbahasa Inggris | Pengunjung tautan lama | Public | Tersembunyi (kompatibilitas) | Redirect `307` ke `/artikel/[slug]` | Baik | Keep redirect | Mencegah 404 dari tautan lama |
| `/desk/[slug]` | Indeks artikel terbit per rubrik (unggulan, liputan terkini, arsip) | Pembaca topik spesifik | Public (`isActive: true`) | Bilah navigasi utama & footer | Index, follow | Sangat baik | Keep | Penjelajahan tematik per rubrik |
| `/opini` | Arsip artikel format Opini beserta penafian pendapat penulis | Pembaca kolom gagasan | Public | Bilah navigasi utama & footer | Index, follow | Sangat baik | Keep | Memisahkan opini dari laporan berita |
| `/kirim-tulisan` | Halaman arahan kontributor (5 format diterima, pengecualian Berita, 5 tahap telaah, non-garansi terbit) | Calon penulis luar | Public | Bilah utilitas atas, banner beranda, footer | Index, follow | Baru, jernih | Keep | Menjelaskan jalur kontribusi tanpa jargon internal |
| `/pedoman-kontributor` | Syarat teknis, etika penulisan, batas usia 18+, dan rujukan primer | Calon kontributor | Public | Footer, `/kirim-tulisan`, portal | Index, follow | Baik | Keep | Acuan standar naskah kontributor |
| `/kontributor/panduan` | Pengalihan kompatibilitas rute panduan kontributor | Penulis / tautan lama | Public | Tersembunyi (kompatibilitas) | Redirect `307` ke `/pedoman-kontributor` | Baru, baik | Keep redirect | Menjawab variasi alamat panduan |
| `/tentang` | Misi, enam nilai editorial, daftar desk, cara kerja, kepemimpinan redaksi, direktori lembaga | Pembaca, mitra, pemerhati | Public | Bilah navigasi utama & footer | Index, follow | Diperbarui, lengkap | Keep | Menjelaskan identitas dan kendali editorial |
| `/standar-editorial` | Ringkasan publik verifikasi sumber, keberimbangan, kebijakan AI, atribusi, koreksi | Pembaca, subjek berita | Public | Banner beranda, footer, sidebar `/tentang` | Index, follow | Sangat baik | Keep | Fondasi akuntabilitas pemberitaan |
| `/kebijakan-redaksi` | Pengalihan kanonis sinonim kebijakan redaksi | Pembaca / pencari | Public | Tersembunyi (kompatibilitas) | Redirect `307` ke `/standar-editorial` | Baru, baik | Keep redirect | Menangkap variasi pencarian kebijakan |
| `/kebijakan-ai` | Penjelasan 3 tingkat keterlibatan AI (`none`, `assistive`, `substantive`) dan larangan terbit otomatis | Publik, akademisi, pengembang | Public | Footer, sidebar lembaga | Index, follow | Sangat baik | Keep | Transparansi penggunaan AI |
| `/koreksi` | Log kronologis koreksi material pada artikel terbit | Publik luas | Public | Bilah utilitas atas, footer, beranda | Index, follow | Sangat baik | Keep | Akuntabilitas ralat terbuka |
| `/keluhan` | Formulir pengaduan, hak jawab, hak koreksi dengan nomor register (`KEL-YYYY-NNNN`) | Subjek berita, pembaca | Public (rate-limited) | Bilah utilitas atas, footer, artikel | Index, follow | Diperbarui (`…`, `spellCheck={false}`) | Keep | Saluran formal penyelesaian keberatan |
| `/informasi-kelembagaan` | Transparansi status hukum apa adanya (nama kerja, non-PT pers, non-Dewan Pers, non-PSE) | Publik, pemerhati, regulator | Public | Footer hukum, `/tentang`, sidebar | Index, follow | Baru, jujur faktual | Keep | Keterbukaan status administratif tanpa klaim fiktif |
| `/kebijakan-privasi` | Kebijakan data sesuai implementasi aktual (kuki sesi `HttpOnly`, scrypt, tanpa pelacak pihak ketiga) | Pengunjung, kontributor, pelapor | Public | Footer hukum, `/tentang` | Index, follow | Baru, akurat teknis | Keep | Transparansi pengelolaan data pribadi |
| `/syarat-ketentuan` | Hak cipta, kutipan wajar, lisensi non-eksklusif kontributor, penafian nasihat profesional | Pembaca, kontributor | Public | Footer hukum, `/tentang` | Index, follow | Baru, terstruktur | Keep | Kerangka penggunaan layanan & lisensi naskah |
| `/kontak` | Direktori korespondensi via register `/keluhan`, pengiriman tulisan, dan domisili operasional | Pembaca, pelapor, mitra | Public | Footer, sidebar `/tentang` | Index, follow | Diperbarui (tanpa surel fiktif) | Keep | Menghindari pemajangan alamat surel yang belum aktif |
| `/penulis/[id]` | Profil publik penulis dan arsip karya (`anonymityMode: ANON` mengembalikan 404) | Pembaca artikel | Public (jika non-anonim) | Tautan nama pada artikel terkait | Index, follow (judul tab diperbaiki) | Diperbarui (title non-duplikat) | Keep | Rekam jejak penulis sekaligus melindungi anonimitas |
| `/developers` | Dokumentasi teknis integrasi API agen AI (OpenAPI, cURL, TS, Python, base URL kanonis) | Pengembang, integrator AI | Public | Footer kolom Kontribusi | Index, follow | Lengkap | Keep | Dokumentasi saluran intake draf terstruktur |

### A.2. Autentikasi & Portal Kontributor (7 Rute `page.tsx`)

| Route | Current Purpose | Intended Audience | Access Level | Navigation Exposure | SEO / Indexability | Current Quality | Recommended Action | Reason |
|---|---|---|---|---|---|---|---|---|
| `/kontributor/daftar` | Formulir pengajuan akun kontributor eksternal (wajib konfirmasi 18+ dan pedoman) | Calon kontributor luar | Public | `/kirim-tulisan`, footer, `/kontributor/login` | Index, follow (`Allow` di `robots.txt`) | Sangat baik | Keep | Jalur pendaftaran mandiri terstruktur |
| `/kontributor/login` | Gerbang masuk Portal Kontributor (tanpa tautan silang ke `/studio/login`) | Kontributor aktif | Public | Footer, `/kirim-tulisan` | Crawlable (`Allow`), halaman utilitas auth | Sangat baik | Keep | Memisahkan pintu masuk penulis eksternal dan staf |
| `/kontributor/aktivasi/[token]` | Penetapan username dan kata sandi dari token aktivasi kontributor | Kontributor yang disetujui | Token-based Public | Tautan aktivasi dari pemred | Blocked in `robots.txt` (`/kontributor/aktivasi/`) | Sangat baik | Protect | Token bermasa berlaku dan sekali pakai |
| `/kontributor/portal` | Dashboard draf, metrik, filter status, dan daftar naskah milik kontributor | Kontributor terautentikasi | Authenticated (`CONTRIBUTOR`, Middleware + API guard) | Header portal kontributor | Blocked in `robots.txt` | Sangat baik | Protect | Ruang kerja pribadi kontributor |
| `/kontributor/portal/naskah/baru` | Penyusun draf kontributor (hanya `OPINION`, `ANALYSIS`, `EXPLAINER`, `FEATURE`, `INTERVIEW`) | Kontributor terautentikasi | Authenticated (`CONTRIBUTOR`) | Menu portal (`Tulis Naskah`) | Blocked in `robots.txt` | Sangat baik | Protect | Melarang pembuatan format `NEWS` oleh luar |
| `/kontributor/portal/naskah/[id]` | Penyunting draf, pengelolaan sumber, ajukan/tarik penelaahan milik sendiri | Kontributor pemilik | Authenticated (`CONTRIBUTOR` + ownership check) | Daftar di dashboard portal | Blocked in `robots.txt` | Sangat baik | Protect | Isolasi ketat kepemilikan naskah |
| `/kontributor/portal/profil` | Pembaruan `publicName`, bio, dan mode tampilan byline kontributor | Kontributor terautentikasi | Authenticated (`CONTRIBUTOR`) | Menu portal (`Profil & Byline`) | Blocked in `robots.txt` | Sangat baik | Protect | Kendali identitas byline penulis |

### A.3. Studio Redaksi Internal & Jalan Pintas (13 Rute `page.tsx`)

| Route | Current Purpose | Intended Audience | Access Level | Navigation Exposure | SEO / Indexability | Current Quality | Recommended Action | Reason |
|---|---|---|---|---|---|---|---|---|
| `/cms` | Pengalihan jalan pintas internal menuju Studio CMS | Staf redaksi | Public redirect | Akses langsung internal | Blocked in `robots.txt`; redirect `307` ke `/studio` | Baik | Keep internal redirect | Memudahkan staf tanpa paparan navigasi publik |
| `/studio/login` | Gerbang autentikasi internal meja redaksi | Staf (`CHIEF_EDITOR`, `WRITER`) | Public login terisolasi | Tidak ditautkan di situs publik | Blocked in `robots.txt` | Baik | Protect / Keep hidden | Pemisahan ruang masuk staf |
| `/studio/invitasi/[token]` | Aktivasi akun staf baru dari token undangan Pemimpin Redaksi | Staf terundang | Token-based Public | Tautan undangan staf | Blocked in `robots.txt` (`/studio`) | Baik | Protect | Onboarding akun staf dengan token hash SHA-256 |
| `/studio` | Dashboard meja redaksi (ringkasan status, gate, keluhan, aktivitas) | Staf terautentikasi | Authenticated (`STAFF`, Middleware + API guard) | Menu Studio | Blocked in `robots.txt` | Sangat baik | Protect | Pusat pemantauan editorial |
| `/studio/articles` | Daftar artikel lintas status dengan filter desk, format, dan pencarian | Staf terautentikasi | Authenticated (`STAFF`, `WRITER` dibatasi miliknya) | Menu Studio | Blocked in `robots.txt` | Sangat baik | Protect | Sirkulasi naskah ruang redaksi |
| `/studio/articles/new` | Pembuatan draf artikel internal oleh staf | Staf terautentikasi | Authenticated (`STAFF`) | Menu Studio | Blocked in `robots.txt` | Baik | Protect | Penulisan draf newsroom |
| `/studio/articles/[id]` | Meja kerja editorial 5 tab (Konten, Sumber, Alur, Catatan, Audit) | Staf terautentikasi | Authenticated (`STAFF` + izin tab) | Daftar artikel Studio | Blocked in `robots.txt` | Diperbarui (`article-sources-tab.tsx` diperbaiki) | Protect | Jantung penyuntingan dan uji fakta |
| `/studio/applications` | Penelaahan dan keputusan permohonan kontributor eksternal | Pemimpin Redaksi | `CHIEF_EDITOR` (Middleware + API guard) | Menu Studio (khusus Pemred) | Blocked in `robots.txt` | Baik | Protect | Gerbang penerimaan penulis luar |
| `/studio/staff` | Pengelolaan anggota tim redaksi, undangan aktivasi, dan suspensi | Pemimpin Redaksi | `CHIEF_EDITOR` | Menu Studio (khusus Pemred) | Blocked in `robots.txt` | Diperbarui (placeholder email diperbaiki) | Protect | Tata kelola akun staf internal |
| `/studio/complaints` | Register penanganan keluhan/hak jawab serta penerbitan koreksi | Pemimpin Redaksi / Editor | `CHIEF_EDITOR` di Studio nav/middleware + API `complaint:manage` | Menu Studio (khusus Pemred) | Blocked in `robots.txt` | Baik | Protect | Penanganan sengketa pemberitaan |
| `/studio/audit` | Pembaca log audit append-only seluruh mutasi penting sistem | Pemimpin Redaksi | `CHIEF_EDITOR` | Menu Studio (khusus Pemred) | Blocked in `robots.txt` | Baik | Protect | Forensik dan integritas operasional |
| `/studio/media` | Pustaka aset visual dan pengunggahan berkredit wajib | Staf terautentikasi | Authenticated (`STAFF`) | Menu Studio | Blocked in `robots.txt` | Baik | Protect | Manajemen lisensi dan atribusi gambar |
| `/studio/api-clients` | Manajemen klien integrasi agen AI, rotasi kunci, log API, dan *playground* | Pemimpin Redaksi | `CHIEF_EDITOR` | Menu Studio (khusus Pemred) | Blocked in `robots.txt` | Baik | Protect | Pengamanan integrasi API eksternal |

### A.4. Utilitas Web, Metadata, Ikon, Rewrite & Middleware

| Route / File | Current Purpose | Intended Audience | Access Level | Navigation Exposure | SEO / Indexability | Current Quality | Recommended Action | Reason |
|---|---|---|---|---|---|---|---|---|
| `/sitemap.xml` (`src/app/sitemap.ts`) | Peta situs dinamis: 14 halaman statis publik + desk aktif + artikel `PUBLISHED`/`CORRECTED` | Mesin pencari | Public | Dirujuk dari `/robots.txt` | XML Sitemap | Baik (base URL kanonis) | Keep | Pengindeksan rute publik saja |
| `/.well-known/verax-agent.json` | Manifest penemuan agen AI sesuai skema web | Agen AI / integrator | Public | `/developers`, `/api/internal/v1/capabilities` | JSON machine discovery | Lengkap | Keep | Standar penemuan mesin |
| `/llms.txt` & `/llms-full.txt` | Konteks ringkas dan teknis lengkap untuk model bahasa | LLM / pengembang | Public | `/developers` | Plaintext machine docs | Lengkap | Keep | Panduan agen otomatis |
| `/openapi.json` | Spesifikasi OpenAPI 3.1.0 API ingest AI Verax | Pengembang API | Public | `/developers` | JSON specification | Lengkap | Keep | Kontrak skema API resmi |
| `/icon.svg` & `/favicon.ico` | Ikon monogram Verax Press (SVG + 32x32 ICO) | Peramban web & penanda tab | Public static assets | Otomatis di `<head>` Next.js | Static assets (`200 OK`) | Baru ditambahkan | Keep | Menghilangkan eror konsol 404 pada `/favicon.ico` |
| `/robots.txt` (`public/robots.txt`) | Mengizinkan rute publik dan memblokir `/studio`, `/cms`, `/api/`, `/kontributor/portal`, `/kontributor/aktivasi/` | Web crawlers | Public | Root host | Crawler policy | Diperbarui | Keep | Mencegah perayapan area internal |
| `/api/cms/:path*` (`next.config.ts`) | *Rewrite* kompatibilitas internal menuju `/api/studio/:path*` | Klien / skrip lama | Sesuai endpoint Studio | Tidak dipublikasikan | N/A | Baik | Keep rewrite | Kompatibilitas transisi penamaan `/api/studio` |
| `src/middleware.ts` | Proteksi awal `/studio/*` dan `/kontributor/portal/*` + pemisahan role & tipe akun | Staf & kontributor | Cookie JWT terverifikasi | Otomatis pada rute cocok | N/A | Diperbarui (fail-closed di produksi) | Protect | Selaras dengan aturan rahasia `src/lib/auth.ts` |

### A.5. Inventarisasi Seluruh 51 *Endpoint* API (`src/app/api/**/route.ts`)

| Grup API (Jumlah) | Daftar Endpoint Aktual | Intended Audience | Access Level & Guard | SEO / Indexability | Current Quality | Recommended Action | Reason |
|---|---|---|---|---|---|---|---|
| Auth (`1`) | `/api/auth/[...nextauth]` | Staf & Kontributor | Public callback (NextAuth v4 Credentials + scrypt; blokir non-ACTIVE) | Blocked by `robots.txt` | Baik | Protect | Sesi JWT HttpOnly 8 jam |
| Publik (`7`) | `/api/public/desks`, `/api/public/complaints`, `/api/public/contributor/apply`, `/api/public/contributor/invitations/[token]` + `/accept`, `/api/public/invitations/[token]` + `/accept` | Klien situs publik & form aktivasi | Public dengan Zod validation, URL sanitization (`safeExternalHttpUrl`), dan per-IP `rateLimit` | Blocked by `robots.txt` | Aman & teruji | Keep | Menjaga integritas data masukan publik |
| Portal Kontributor (`7`) | `/api/contributor/dashboard`, `/api/contributor/profile`, `/api/contributor/articles`, `/api/contributor/articles/[id]`, `/transition`, `/sources`, `/sources/[sourceId]` | Kontributor aktif | `requireContributorSession()` + kepemilikan `contributorId === user.id` + blokir format `NEWS` | Blocked by `robots.txt` | Aman & teruji | Protect | Isolasi ketat antar-penulis eksternal |
| Ingestion AI v1 (`4`) | `/api/internal/v1/capabilities`, `/api/internal/v1/ai-submissions`, `/validate`, `/[submissionId]` | Agen AI terintegrasi & publik (`capabilities`) | `capabilities` publik cacheable; `ai-submissions*` memakai Bearer token hash SHA-256 (`authenticateApiClient`) + idempotensi + paksa `DRAFT` & `UNVERIFIED` | Blocked by `robots.txt` | Aman & teruji | Protect | Mencegah AI menerbitkan artikel secara langsung |
| Studio Redaksi (`32`) | **Umum & Artikel (10):** `dashboard`, `corrections`, `audit`, `articles`, `articles/[id]`, `transition`, `sources`, `sources/[sourceId]`, `comments`, `audit`; **Media (3):** `media`, `media/[id]`, `[id]/preview`; **Keluhan (2):** `complaints`, `complaints/[id]`; **Permohonan & Kontributor (5):** `applications`, `[id]`, `[id]/decide`, `volunteers`, `volunteers/[id]`; **Staf (5):** `staff`, `[id]`, `invitations`, `invitations/[id]/resend`, `invitations/[id]/revoke`; **Klien API (7):** `api-clients`, `[id]`, `[id]/rotate`, `[id]/revoke-credential`, `overview`, `logs`, `playground/run` | Staf redaksi berwenang | `requireSession()` / `requireRole("CHIEF_EDITOR")` / `requireStaffPermission(...)` berbasis kueri DB langsung + `writeAudit` | Blocked by `robots.txt` | Aman & teruji | Protect | Otorisasi server-side dan jejak audit penuh |

---

## BAGIAN B: BUKTI KEPATUHAN 10 SKILLS (DELAPAN WAJIB + `unslop` + `security-audit`)

Setiap klaim di bawah merujuk langsung ke berkas yang dibaca, diperiksa, atau diperbaiki selama sesi audit:

1. **`/credentials` (`credentials`)**
   - `src/lib/auth.ts:12-28`: Fungsi `getAuthSecret()` menolak kondisi produksi apabila `NEXTAUTH_SECRET`/`AUTH_SECRET` kosong atau bernilai `"verity-dev-secret-change-me"`.
   - `src/middleware.ts:6-36`: Ditambahkan `getMiddlewareSecret()` agar verifikasi token di proxy/middleware juga menolak ketiadaan secret maupun nilai fallback dev pada `NODE_ENV === "production"`.
   - `src/lib/media-client.ts:30-80`: Autentikasi server-to-server menuju layanan media memakai tanda tangan HMAC-SHA256 ber-timestamp, kedaluwarsa, dan nonce acak tanpa membocorkan kunci ke bundel klien.
   - `src/app/kontributor/login/page.tsx:167-177`, `src/app/studio/(cms)/staff/page.tsx:800-806,896-902`, `src/components/site/complaint-form.tsx:214-224`: Input surel dan kata sandi menggunakan `autoComplete` dan `spellCheck={false}`. Kredensial Pemimpin Redaksi (`pemredVP`) maupun rahasia `.env` tidak diubah dan tidak masuk ke tangkapan layar atau kode klien.

2. **`/verification-before-completion` (`verification-before-completion`)**
   - Ditemukan dan diperbaiki galat sintaks pra-eksis pada `src/components/studio/article-sources-tab.tsx:294-296` (kurung penutup `.map` JSX hilang) yang sebelumnya membuat `tsc --noEmit` dan `eslint .` gagal.
   - Ditemukan dan diperbaiki positif palsu pada `tests/visitor-journeys.test.ts:6` (pencocokan terlalu lebar `not.toContain("(*")` diperketat menjadi `/\(\*[A-Za-z0-9]/` agar keterangan resmi `"Tanda bintang (*)"` pada `/keluhan` tidak tertolak).
   - Menangkap dan memperbaiki 404 `/favicon.ico` dengan `src/app/icon.svg` dan `src/app/favicon.ico`, serta memastikan `scripts/capture-readiness.ts after` menuntaskan 20/20 tangkapan layar tanpa satu pun galat konsol atau 404.
   - Seluruh perintah verifikasi (`typecheck`, `lint`, `build`, `bun test`, `capture-readiness.ts`) dijalankan ulang sesudah suntingan terakhir berkas kode dan dokumentasi.

3. **`/vercel-react-best-practices` (`vercel-react-best-practices`)**
   - Deduplikasi kueri per-request melalui React `cache()` pada `src/lib/domain/desks.ts:5-16` (`getActiveDesks`), `src/app/(public)/desk/[slug]/page.tsx:28-33` (`loadDesk`), `src/app/(public)/artikel/[slug]/page.tsx:26-35` (`loadArticle`), dan `src/app/(public)/penulis/[id]/page.tsx:15-40` (`loadPerson`).
   - Eksekusi paralel memakai `Promise.all` pada `src/app/(public)/page.tsx:61-75` dan `src/app/sitemap.ts:12-23` guna mencegah *waterfall* basis data.
   - Batas Server/Client Components dijaga: halaman publik informasional (`HomePage`, `DeskPage`, `AboutPage`, `KirimTulisanPage`, `PrivacyPolicyPage`, `TermsPage`, `InstitutionalInfoPage`, `KontakPage`), `Masthead`, dan `SiteFooter` berjalan sebagai Server Component, sementara `"use client"` dibatasi pada komponen interaktif (`DeskNav`, `SiteMobileNav`, `ComplaintForm`, portal kontributor, Studio CMS).

4. **`/web-design-guidelines` (`web-design-guidelines`)**
   - Tautan lewati ke konten utama (`Lewati ke konten utama`) + `<main tabIndex={-1}>` tersedia di `src/app/(public)/layout.tsx:12-21`, `src/app/kontributor/daftar/page.tsx:74-96`, `src/app/kontributor/portal/layout.tsx:136-144`, dan `src/app/studio/(cms)/layout.tsx:142-205`.
   - Indikator posisi aktif `aria-current="page"` dan `<nav aria-label="...">` diterapkan pada navigasi publik, portal kontributor, dan Studio.
   - Ikon dekoratif Lucide memakai `aria-hidden="true"`, pemisah visual tidak membanjiri pembaca layar, tipografi elipsis menggunakan `…` (`U+2026`), dan metadata judul tab halaman `/penulis/[id]` (`src/app/(public)/penulis/[id]/page.tsx:45-46`) dirapikan agar tidak menggandakan akhiran `| Verax Press`.

5. **`/agency-frontend-developer` (`agency-frontend-developer`)**
   - Responsivitas tata letak diukur di 3 lebar layar (`1440px` desktop, `768px` tablet, `390px` ponsel) menggunakan Google Chrome Headless via DevTools Protocol pada seluruh 20 skenario uji dengan hasil `overflow=0px`.
   - Kontras tombol CTA utama (`bg-verity-ink` `#141413` dan `text-verity-paper` `#faf9f5`) diperiksa otomatis lewat `getComputedStyle` di peramban nyata (`ctaOk=true`).

6. **`/agency-reality-checker` (`agency-reality-checker`)**
   - Dilakukan pemeriksaan baca-saja terhadap host produksi `https://veraxpress.vercel.app` yang mengonfirmasi adanya *drift* (6 rute baru/pengalihan dan `/favicon.ico` masih mengembalikan HTTP `404`, `robots.txt` produksi belum memblokir `/studio`, dan artikel terbit di produksi masih 0).
   - Menolak pelabelan "siap rilis produksi komersial" sebelum proses deploy pemilik serta pengisian berita jurnalistik perdana; menetapkan status jujur sebagai **`STAGING READY / NEEDS OWNER DEPLOY & EDITORIAL CONTENT`**.

7. **`/agency-backend-architect` (`agency-backend-architect`)**
   - Proteksi berlapis: pemblokiran URL navigasi di `src/middleware.ts` dipadukan dengan verifikasi keaktifan akun serta izin per-endpoint di `src/lib/api.ts` (`requireSession`, `verifyStaffUserPermission`, `requireContributorSession`).
   - Validasi tautan aman via `src/lib/url.ts:9-62` (`safeExternalHttpUrl`, `safeMediaSrcUrl`, `httpUrlSchema`, `mediaUrlSchema`) di `src/lib/domain/content.ts:30`, `src/components/content/content-renderer.tsx:125-126`, dan `src/app/api/public/contributor/apply/route.ts:15-18`, menolak `javascript:`/`//` dengan status HTTP `422`.
   - Pembatasan laju permintaan (`rateLimit`) diterapkan di endpoint pengajuan publik (`complaints/route.ts:16`, `contributor/apply/route.ts:32`), sedangkan unggahan gambar di `src/app/api/studio/media/route.ts:24-37` memeriksa *magic bytes* JPEG/PNG/WebP.

8. **`/writing-guidelines` (`writing-guidelines` & `docs/editorial/VERAX_WRITING_STANDARDS.md`)**
   - Istilah internal `Volunteer` dihilangkan dari seluruh antarmuka publik dan diganti dengan penamaan alami *Kontributor* dan *Kirim Tulisan*.
   - Alamat surel dan domisili jalan fiktif dihapus dari `/kontak` (`tests/visitor-journeys.test.ts:112-113`), sementara contoh placeholder lama `@veraxpress.id` pada `src/app/studio/(cms)/staff/page.tsx:802,899` diganti menjadi `@contoh.id`.
   - Pemindaian `rg` pada antarmuka publik, portal kontributor, dan dokumen audit memastikan nihil em dash (`—`), nihil garis ganda (`--`) dalam prosa, nihil kosakata klise AI (`ekosistem`, `wadah`, `delve`, `robust`, `seamless`, `garda terdepan`), dan nihil emoji dekoratif.

9. **`unslop` & `security-audit`**
   - Estetika diselaraskan ke karakter surat kabar broadsheet (palet kertas hangat, tinta arang `#141413`, satu aksen editorial `#c96442`, garis rambut dan pemisah ganda klasik, bebas gradien SaaS atau lencana mengilap).
   - Peninjauan keamanan dalam *guidance mode* memastikan pemisahan sesi kontributor vs staf, minimalisasi data publik (penulis anonim terlindungi di `/penulis/[id]`, draf internal mengembalikan 404 di `/artikel/[slug]`), dan tidak adanya kebocoran log keluhan maupun catatan internal.

---

## BAGIAN C: DRIFT PRODUKSI (`https://veraxpress.vercel.app`) VS LOKAL

Pemeriksaan baca-saja (*read-only HTTP GET*) pada 12 November 2026 terhadap `https://veraxpress.vercel.app` (deployment 11 November `dpl_3kPjiKFSm9vVk4ehMH9TPZ1wsuNx`) menunjukkan perbedaan berikut dibanding workspace lokal:

| Rute / Aset | Status Lokal | Status Produksi Saat Ini | Keterangan Drift |
|---|---|---|---|
| `/` | `200 OK` (13 artikel kebijakan/contoh dari `db/custom.db`) | `200 OK` (`Belum ada artikel terbit`) | DB Turso produksi masih bersih (0 artikel), banner orientasi baru belum terpasang di produksi |
| `/kirim-tulisan` | `200 OK` | `404 Not Found` | Rute baru belum di-deploy ke Vercel |
| `/informasi-kelembagaan` | `200 OK` | `404 Not Found` | Rute baru belum di-deploy ke Vercel |
| `/kebijakan-privasi` | `200 OK` | `404 Not Found` | Rute baru belum di-deploy ke Vercel |
| `/syarat-ketentuan` | `200 OK` | `404 Not Found` | Rute baru belum di-deploy ke Vercel |
| `/kebijakan-redaksi` | `307` -> `/standar-editorial` | `404 Not Found` | Rute pengalihan baru belum di-deploy |
| `/kontributor/panduan` | `307` -> `/pedoman-kontributor` | `404 Not Found` | Rute pengalihan baru belum di-deploy |
| `/favicon.ico` | `200 OK` (`image/x-icon`) | `404 Not Found` | Ikon broadsheet V (`favicon.ico` dan `icon.svg`) baru ditambahkan di lokal |
| `/robots.txt` | Memblokir `/studio`, `/cms`, `/api/`, `/kontributor/portal/`, `/kontributor/aktivasi/` + URL sitemap penuh | Versi lama masih `Allow: /` tanpa pembatasan `/studio/` dan memakai `Sitemap: /sitemap.xml` | Pembaruan `public/robots.txt` belum di-deploy ke Vercel |

Rute lain yang telah aktif di produksi dengan status yang sesuai saat pemeriksaan adalah `/tentang`, `/standar-editorial`, `/kebijakan-ai`, `/pedoman-kontributor`, `/koreksi`, `/keluhan`, `/kontak`, `/developers`, `/sitemap.xml`, `/.well-known/verax-agent.json`, `/llms.txt`, `/openapi.json`, `/studio/login`, `/kontributor/daftar`, `/kontributor/login` (masing-masing `200`), serta `/cms` (`307`).

---

## BAGIAN D: PERUBAHAN BERKAS & TEMUAN RESIDUAL YANG DILAPORKAN JUJUR

### D.1. Ringkasan Perubahan Berkas Utama Sesi Ini
1. **Rute Publik, Pengalihan, & Ikon Baru:**
   - `src/app/(public)/kirim-tulisan/page.tsx`, `src/app/(public)/informasi-kelembagaan/page.tsx`, `src/app/(public)/kebijakan-privasi/page.tsx`, `src/app/(public)/syarat-ketentuan/page.tsx`
   - `src/app/(public)/kebijakan-redaksi/page.tsx`, `src/app/kontributor/panduan/page.tsx`
   - `src/app/icon.svg`, `src/app/favicon.ico`
   - `src/lib/domain/desks.ts`, `src/lib/url.ts`, `src/components/site/institutional-links.ts`, `src/components/site/institutional-nav.tsx`
2. **Pembaruan Antarmuka, SEO, Keamanan, & Perbaikan Bug:**
   - `src/app/(public)/page.tsx`, `src/app/(public)/tentang/page.tsx`, `src/app/(public)/kontak/page.tsx`, `src/app/(public)/pedoman-kontributor/page.tsx`, `src/app/(public)/artikel/[slug]/page.tsx`, `src/app/(public)/desk/[slug]/page.tsx`, `src/app/(public)/developers/page.tsx`, `src/app/(public)/kebijakan-ai/page.tsx`, `src/app/(public)/koreksi/page.tsx`, `src/app/(public)/layout.tsx`, `src/app/(public)/penulis/[id]/page.tsx`
   - `src/components/site/masthead.tsx`, `src/components/site/site-footer.tsx`, `src/components/site/site-mobile-nav.tsx`, `src/components/site/institutional.tsx`, `src/components/site/complaint-form.tsx`, `src/components/content/content-renderer.tsx`
   - `src/app/kontributor/*` (`daftar`, `login`, `aktivasi/[token]`, `portal/**`)
   - `src/components/studio/article-sources-tab.tsx` (perbaikan JSX `return (` di baris 294-296), `src/app/studio/(cms)/staff/page.tsx` (perbaikan placeholder `@veraxpress.id` menjadi `@contoh.id`), `src/middleware.ts` (pengetatan secret produksi), `public/robots.txt`, `src/app/sitemap.ts`, `src/app/layout.tsx`, `eslint.config.mjs`
3. **Alat Pengujian & Dokumentasi:**
   - `tests/visitor-journeys.test.ts` (perbaikan regex `assertCleanHtml`), `scripts/capture-readiness.ts`, `worklog.md`, `docs/superpowers/audits/2026-11-12-verax-public-launch-readiness.md`.

### D.2. Catatan Temuan Residual (Di Luar Cakupan Perubahan Saat Ini)
1. **Isi Artikel Contoh pada `db/custom.db`:** Ringkasan dan paragraf sejumlah artikel contoh internal (bukan UI sistem) di basis data pengembangan lokal masih mengandung em dash karena berasal dari seed awal (`prisma/seed.ts`). Basis data dibiarkan utuh agar tidak menyalahi batasan keamanan data.
2. **Berkas Aset Bawaan `public/logo.svg`:** Berkas logo lama berbawaan template (`Z.ai` `.z-breathe`) masih ada di direktori `public/` dengan 0 rujukan kode di aplikasi. Dibiarkan agar tidak menghapus aset repo secara diam-diam tanpa konfirmasi pemilik.
3. **Pesan Muat Internal Studio:** Beberapa komponen internal lama (`src/app/studio/(cms)/staff/page.tsx` teks tombol loading) masih memakai tiga titik ASCII (`...`) di ruang kerja staf.

---

## BAGIAN E: HASIL VERIFIKASI OTOMATIS & TANGKAPAN LAYAR

Seluruh hasil berikut diperoleh dari eksekusi perintah nyata terhadap workspace terkini (`db/isolated-test.db` untuk uji terisolasi dan build standalone, `http://localhost:3000` dengan `db/custom.db` untuk simulasi E2E pengunjung serta penangkapan layar Chrome):

1. **Pemeriksaan Tipe TypeScript (`bun run typecheck`):** `tsc --noEmit`, exit code `0` (`0` galat).
2. **Pemeriksaan Linter (`bun run lint`):** `eslint .`, exit code `0` (`0` galat / `0` peringatan).
3. **Build Produksi Standalone (`bun run build`):** `prisma generate && next build` (Next.js 16.1.3 Turbopack), exit code `0`, kompilasi `5.6s`, `59/59` halaman statis berhasil dibangun (total 96 rute di tabel `Route (app)` + `/_not-found` + `/favicon.ico` metadata route + `Proxy (Middleware)`).
4. **Seluruh Rangkaian Pengujian (`bun test` lintas 14 berkas):** `154 pass, 0 fail` (`569 expect()` assertions) dalam `18.11s`, meliputi unit test, audit keamanan, manajemen staf, portal kontributor, developer portal, dan 6 skenario `tests/visitor-journeys.test.ts` (Persona A hingga F, termasuk uji penolakan URL berbahaya `javascript:alert(1)` -> HTTP `422`).
5. **Verifikasi Aset Ikon & Penangkapan Layar Headless Chrome (`bun run scripts/capture-readiness.ts after`):**
   - `GET http://localhost:3000/favicon.ico` mengembalikan `200 image/x-icon`; `GET http://localhost:3000/icon.svg` mengembalikan `200 image/svg+xml`.
   - Total **20/20 tangkapan layar clean** (exit code `0`): setiap URL berstatus `200`, `overflow=0px`, `ctaOk=true`, dan `errors=0` (konsol/jaringan 404 bersih).
   - Direktori arsip: `docs/superpowers/audits/launch-readiness-evidence/baseline/` (15 berkas sebelum) dan `docs/superpowers/audits/launch-readiness-evidence/after/` (20 berkas sesudah: `01-homepage-desktop-1440.png` hingga `20-informasi-kelembagaan-desktop-1440.png`).

---

## BAGIAN F: PRASYARAT PELUNCURAN PEMILIK (OWNER ACTION REQUIRED)

1. **Otorisasi Push & Deploy ke Vercel Produksi:** Mendorong komit yang telah ditinjau ke GitHub `main` dan menjalankan deployment produksi (`vercel --prod`) agar seluruh rute baru (`/kirim-tulisan`, `/informasi-kelembagaan`, `/kebijakan-privasi`, `/syarat-ketentuan`, `/favicon.ico`, `robots.txt` terbaru) menggantikan build 11 November di `https://veraxpress.vercel.app`. Memastikan variabel lingkungan `NEXTAUTH_SECRET` terpasang aman di Vercel Production sebelum rilis.
2. **Penerbitan Berita Perdana pada Turso Cloud Produksi:** Saat ini basis data produksi memuat `0` artikel terbit (halaman depan menampilkan *"Belum ada artikel terbit"*). Minimal beberapa laporan berita atau analisis siap baca perlu melalui alur Studio hingga disetujui Pemimpin Redaksi (`PUBLISHED`) sebelum promosi publik dimulai.
3. **Konfigurasi Surel Resmi Redaksi (Jika Diperlukan):** Menyiapkan kotak surat organisasi dan memperbarui halaman `/kontak` hanya apabila domain surel tersebut sudah benar-benar aktif menerima korespondensi.
4. **Keputusan Hukum & SLA Hak Jawab:** Kolom `deadline` keluhan tetap `null` dan antarmuka secara sadar tidak mencantumkan janji hari kerja sampai pemilik menetapkan tenggat operasional sesuai kajian hukum UU Pers dan kesiapan tim redaksi, demikian pula pembaruan `/informasi-kelembagaan` bila kelak berbadan hukum pers, terdaftar PSE, atau terverifikasi Dewan Pers.

---

## BAGIAN G: KEPUTUSAN AKHIR

Status kesiapan peluncuran ditetapkan sebagai:

### **`STAGING READY / NEEDS OWNER DEPLOY & EDITORIAL CONTENT`**

Secara teknis, desain editorial, aksesibilitas, keamanan dasar, arsitektur informasi, dan jalur mandiri pembaca maupun calon kontributor pada kode sumber lokal telah teruji lengkap dan bersih tanpa eror kompilasi maupun galat UI. Peluncuran penuh ke masyarakat umum tinggal menunggu persetujuan deploy pemilik ke Vercel produksi serta penerbitan naskah jurnalistik perdana di basis data produksi.
