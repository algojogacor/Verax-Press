# Laporan Kesiapan Technical SEO, Perayapan, dan Pengindeksan Verax Press

Tanggal pelaksanaan: 12 November 2026  
Status teknis lokal: **SIAP DEPLOY STAGING / PRODUKSI (`STAGING READY`)**  
Status produksi publik (`https://veraxpress.vercel.app`): **BELUM DEPLOY RILIS SEO INI (MASIH MENJALANKAN BUILD 11 NOVEMBER 2026)**  
Domain kanonik terpilih: `https://veraxpress.vercel.app`

---

## Ringkasan Eksekutif

Audit ini memeriksa dan menyempurnakan konfigurasi Technical SEO Verax Press sebelum peluncuran publik. Seluruh perubahan kode sumber di workspace lokal telah lolos uji `tsc --noEmit`, `eslint .`, build produksi `next build` (58 halaman statis, 0 eror), 170 pengujian `bun test` (831 asersi), validator XML sitemap (`check_sitemap.py`), pemeriksa HTML (`inspect_html.py`), serta pemeriksaan peramban nyata Google Chrome Headless pada viewport desktop dan seluler.

Pemeriksaan baca-saja terhadap host produksi yang sedang aktif saat laporan ini disusun membuktikan adanya selisih nyata antara deployment 11 November 2026 dan workspace lokal. Pada deployment produksi saat ini, `/sitemap.xml` masih memancarkan URL `http://localhost:3000/`, `/robots.txt` masih memakai lima blok `User-agent` dengan URL sitemap relatif (`/sitemap.xml`), dan sembilan hostname alias Vercel selain `veraxpress.vercel.app` masih merespons HTTP `200 OK` tanpa pengalihan ke domain kanonik. Masalah-masalah tersebut telah diperbaiki di kode sumber lokal dan menunggu otorisasi push serta deploy produksi pemilik.

---

## Tingkat Keyakinan Temuan

Setiap klaim dalam laporan ini dipisahkan menurut dasar pembuktian aktual:

- **Confirmed:** Terbukti langsung oleh eksekusi kode sumber lokal, uji HTTP terisolasi (`db/isolated-test.db` dan salinan `db/custom.db` pada server `standalone` port `3088`), validator Python, Headless Chrome, atau respons HTTP langsung dari server Vercel saat ini.
- **Likely:** Konsisten dengan spesifikasi mesin pencari (Google Search dan Bing) dan desain aplikasi Next.js App Router yang terverifikasi, tetapi eksekusi nyata setelah rilis ke produksi tetap bergantung pada lingkungan Vercel Production.
- **Hypothesis:** Perilaku perayapan, kecepatan pengindeksan ulang, dan penentuan *canonical* oleh Googlebot maupun Bingbot di web terbuka setelah deploy dilakukan.
- **Not assessed:** Status pengindeksan aktual di Google Search Console dan Bing Webmaster Tools, skor Core Web Vitals lapangan (*field data* CrUX), serta verifikasi kepemilikan properti di kedua konsol mesin pencari karena token verifikasi dan akses akun Webmaster tidak disediakan maupun dikarang.

---

## 1. Keputusan Domain Kanonik dan Konsolidasi Hostname (`Confirmed`)

### 1.1 Pemilihan Domain Kanonik
Domain kanonik tunggal ditetapkan pada **`https://veraxpress.vercel.app`**. Dasar keputusan berasal dari tiga sumber konsisten:
1. Konfigurasi proyek Vercel resmi pada [`.vercel/project.json`](../../../.vercel/project.json) tercatat dengan `"projectName": "veraxpress"` (`projectId: prj_zkVrSFKXkkoUhAlZRUi8tkgbIARB`).
2. Keputusan pemilik yang tercatat pada [`worklog.md`](../../../worklog.md) bagian 41 setelah penggantian nama proyek `verax-press` menjadi `veraxpress`.
3. Nilai `CANONICAL_PUBLIC_ORIGIN` di [`src/lib/seo/constants.ts`](../../../src/lib/seo/constants.ts) dan `DEFAULT_PUBLIC_ORIGIN` di [`src/lib/domain/constants.ts`](../../../src/lib/domain/constants.ts) sama-sama mengarah ke `https://veraxpress.vercel.app`.

Fungsi [`getCanonicalBaseUrl()`](../../../src/lib/seo/constants.ts) menolak menimpa origin kanonik dengan URL pengembangan lokal (`localhost`, `127.0.0.1`, `.local`, `.localhost`) maupun URL alias/preview Vercel walaupun variabel lingkungan seperti `VERAX_PUBLIC_BASE_URL` disetel ke `http://localhost:3000`. Pengaman ini mencegah kejadian bug `http://localhost:3000/` pada `/sitemap.xml` maupun tag `<link rel="canonical">` terulang kembali di produksi.

### 1.2 Audit Seluruh Hostname `.vercel.app` Terkait
Pengujian HTTP `HEAD` baca-saja pada 12 November 2026 terhadap sepuluh hostname `.vercel.app` yang terkait dengan proyek ini membuktikan bahwa seluruhnya melayani situs yang sama (`200 OK` tanpa header `Location`):

| Hostname | Peran | Status Produksi Saat Ini (`Confirmed`) | Perilaku Kode Lokal Terbaru (`Confirmed`) | Rekomendasi Pasca-Deploy |
|---|---|---|---|---|
| `https://veraxpress.vercel.app` | **Canonical Primary** | `200 OK` (build 11 Nov, artikel `0`) | Dilayani normal (`200 OK`) | Pertahankan sebagai domain utama tunggal |
| `https://verax-press.vercel.app` | Alias nama lama | `200 OK` (konten ganda, `loc=null`) | **308 Permanent Redirect** ke `https://veraxpress.vercel.app/...` | Set *Redirect to Primary* di Vercel Dashboard Domains agar terjadi di CDN edge |
| `https://vrxp.vercel.app` | Alias pendek | `200 OK` (`loc=null`) | **308 Permanent Redirect** ke `https://veraxpress.vercel.app/...` | Pertahankan redirect permanen atau hapus alias tidak terpakai |
| `https://vpid.vercel.app` | Alias pendek | `200 OK` (`loc=null`) | **308 Permanent Redirect** ke `https://veraxpress.vercel.app/...` | Sama seperti di atas |
| `https://vrxid.vercel.app` | Alias pendek | `200 OK` (`loc=null`) | **308 Permanent Redirect** ke `https://veraxpress.vercel.app/...` | Sama seperti di atas |
| `https://vpnews.vercel.app` | Alias pendek | `200 OK` (`loc=null`) | **308 Permanent Redirect** ke `https://veraxpress.vercel.app/...` | Sama seperti di atas |
| `https://vrxnews.vercel.app` | Alias pendek | `200 OK` (`loc=null`) | **308 Permanent Redirect** ke `https://veraxpress.vercel.app/...` | Sama seperti di atas |
| `https://veraxpress-arya-rizkys-projects.vercel.app` | Alias tim proyek | `200 OK` (`loc=null`) | **308 Permanent Redirect** ke `https://veraxpress.vercel.app/...` | Pertahankan redirect 308 tingkat aplikasi |
| `https://verax-press-arya-rizkys-projects.vercel.app` | Alias tim proyek lama | `200 OK` (`loc=null`) | **308 Permanent Redirect** ke `https://veraxpress.vercel.app/...` | Pertahankan redirect 308 tingkat aplikasi |
| `https://veraxpress-git-main-arya-rizkys-projects.vercel.app` | Alias cabang `main` | `200 OK` (`loc=null`) | **308 Permanent Redirect** ke `https://veraxpress.vercel.app/...` | Pertahankan redirect 308 tingkat aplikasi |

Pengalihan `308` di [`src/middleware.ts`](../../../src/middleware.ts) memakai fungsi [`resolveCanonicalRedirectTarget()`](../../../src/lib/seo/constants.ts) yang membangun ulang URL tujuan dari konstanta `CANONICAL_PUBLIC_ORIGIN` dan menormalisasi awalan jalur ganda (`//`), sehingga tahan terhadap serangan injeksi header `Host` / *open redirect* (`evil.example.com` tidak dialihkan keluar). Saat `VERCEL_ENV === "preview"`, redirect host dinonaktifkan agar URL preview Vercel per-commit tetap dapat ditinjau oleh tim tanpa memaksa lompat ke produksi.

---

## 2. Audit `robots.txt` dan Kebijakan Kontrol Perayapan (`Confirmed`)

### 2.1 Temuan `robots.txt` Produksi vs Lokal
Pemeriksaan `GET https://veraxpress.vercel.app/robots.txt` menunjukkan produksi masih menyajikan aturan lama:
- Memuat lima blok `User-agent` terpisah (`Googlebot`, `Bingbot`, `Twitterbot`, `facebookexternalhit`, dan `*`) dengan aturan identik `Allow: /`.
- Tidak mengecualikan `/api/`.
- Menggunakan URL relatif tidak standar (`Sitemap: /sitemap.xml`).

Berkas lokal [`public/robots.txt`](../../../public/robots.txt) diperbaiki menjadi:

```text
User-agent: *
Allow: /
Disallow: /api/

Sitemap: https://veraxpress.vercel.app/sitemap.xml
```

### 2.2 Alasan Teknis Mengapa `/studio`, `/cms`, dan `/kontributor` Tidak Diblokir di `robots.txt`
Prinsip Google Search menetapkan bahwa halaman yang perlu dicegah masuk ke indeks pencarian tidak boleh diblokir melalui `Disallow` di `robots.txt`. Jika `robots.txt` memblokir `/studio/` atau `/kontributor/`, perayap mesin pencari tidak dapat mengunduh respons HTTP maupun HTML halaman tersebut untuk membaca sinyal `noindex`. Akibatnya, bila tautan eksternal atau rujukan historis tetap ditemukan oleh mesin pencari, URL masih berpeluang muncul di indeks sebagai hasil tanpa cuplikan.

Oleh sebab itu:
1. [`public/robots.txt`](../../../public/robots.txt) menggunakan satu aturan global `User-agent: *`, membuka jalur halaman untuk pembacaan instruksi meta, memblokir `/api/` agar endpoint data mentah tidak dibebani perayap, dan mencantumkan `Sitemap: https://veraxpress.vercel.app/sitemap.xml` secara absolut.
2. Seluruh rute privat dan administratif tetap memancarkan `X-Robots-Tag: noindex, nofollow` dan/atau `<meta name="robots" content="noindex, nofollow">` di responsnya.
3. `robots.txt` **tidak digunakan sebagai mekanisme keamanan**. Kontrol akses `/studio/*` dan `/kontributor/portal/*` dijaga di level JWT middleware ([`src/middleware.ts`](../../../src/middleware.ts)), verifikasi sesi serta kepemilikan pada setiap route handler API ([`src/lib/api.ts`](../../../src/lib/api.ts)), dan kueri basis data terisolasi.

---

## 3. Matriks Kebijakan Indeks Seluruh Rute Aplikasi (`Confirmed`)

Klasifikasi seluruh kelompok rute Verax Press berdasarkan konfigurasi aktual di `src/app/`, [`src/middleware.ts`](../../../src/middleware.ts), [`next.config.ts`](../../../next.config.ts), dan [`src/lib/seo/constants.ts`](../../../src/lib/seo/constants.ts):

| Rute / Pola URL | Status HTTP (Non-Auth) | Kebijakan Meta `robots` | Header HTTP `X-Robots-Tag` | Masuk `sitemap.xml` | Keterangan Teknis |
|---|---|---|---|---|---|
| `/` | `200` | `index, follow` | Tidak diset | Ya | Beranda broadsheet, JSON-LD `NewsMediaOrganization` dan `WebSite` |
| `/desk/[slug]` & `?page=N` | `200` (`404` bila desk/halaman tidak valid) | `index, follow` | Tidak diset | Ya (halaman utama desk) | Paginasi memvalidasi bilangan bulat positif (`> 0`) dan menolak halaman kosong dengan `404` |
| `/opini` & `?page=N` | `200` (`404` bila halaman kosong/tidak valid) | `index, follow` | Tidak diset | Ya (halaman utama opini) | `CollectionPage` JSON-LD + `BreadcrumbList` |
| `/artikel/[slug]` (`PUBLISHED` / `CORRECTED`) | `200` | `index, follow` | Tidak diset | Ya | `NewsArticle` / `Article` JSON-LD, meta `og:type=article`, tautan penulis & penyunting |
| `/artikel/[slug]` (`RETRACTED` / `ARCHIVED`) | `200` (banner penarikan) | `noindex, follow` | Tidak diset | **Tidak** | Mempertahankan catatan arsip transparan tanpa mengindeks ke mesin pencari |
| `/artikel/[slug]` (status draf/internal lain) | `404` | `noindex, nofollow` | Tidak diset | **Tidak** | Tidak pernah diekspos secara publik |
| `/penulis/[id]` (non-anonim, karya terbit >= 1) | `200` | `index, follow` | Tidak diset | Ya | `ProfilePage` + `Person` JSON-LD |
| `/penulis/[id]` (non-anonim, `0` karya terbit) | `200` | `noindex, follow` | Tidak diset | **Tidak** | Mencegah halaman profil kosong (*thin content*) masuk indeks pencarian |
| `/penulis/[id]` (`anonymityMode` `ANON`/`ANONYMOUS`) | `404` | `noindex, nofollow` | Tidak diset | **Tidak** | Melindungi anonimitas penulis tanpa membocorkan profil |
| 12 halaman kelembagaan & publik (`/tentang`, `/standar-editorial`, `/kebijakan-ai`, `/kirim-tulisan`, `/pedoman-kontributor`, `/koreksi`, `/keluhan`, `/informasi-kelembagaan`, `/kebijakan-privasi`, `/syarat-ketentuan`, `/kontak`, `/developers`) | `200` | `index, follow` | Tidak diset | Ya (seluruh 12 rute) | Canonical absolut self-referencing, Open Graph lengkap, Twitter Card `summary_large_image`, `<Breadcrumbs>`, `BreadcrumbList` JSON-LD |
| `/articles/[slug]`, `/kebijakan-redaksi`, `/kontributor/panduan` | `308` Permanent Redirect | Tidak berlaku (redirect) | Tidak diset | **Tidak** | Dialihkan permanen ke `/artikel/[slug]`, `/standar-editorial`, dan `/pedoman-kontributor` |
| `/kontributor/daftar` | `200` | `noindex, follow` | `noindex, follow` | **Tidak** | Formulir aplikasi kontributor tidak perlu diindeks; informasi kontributor publik dikonsolidasikan ke `/kirim-tulisan` |
| `/kontributor/login`, `/kontributor/aktivasi/[token]` | `200` | `noindex, nofollow` | `noindex, nofollow` | **Tidak** | Halaman utilitas autentikasi dan token sekali pakai |
| `/kontributor/portal`, `/kontributor/portal/**` | `307` -> `/kontributor/login` (bila belum masuk) | `noindex, nofollow` | `noindex, nofollow` | **Tidak** | Dilindungi `noindex, nofollow` lewat [`src/app/kontributor/portal/layout.tsx`](../../../src/app/kontributor/portal/layout.tsx), middleware, dan `next.config.ts` |
| `/studio`, `/studio/**`, `/studio/login`, `/studio/invitasi/[token]` | `307` / `200` | `noindex, nofollow` | `noindex, nofollow` | **Tidak** | Dilindungi lewat [`src/app/studio/layout.tsx`](../../../src/app/studio/layout.tsx), middleware, dan `next.config.ts` |
| `/cms` | `307` -> `/studio` | Tidak berlaku (redirect) | `noindex, nofollow` | **Tidak** | Redirect internal `307` tetap terjaga demi kompatibilitas kontrak uji regresi, disertai header `X-Robots-Tag: noindex, nofollow` |
| `/api/**` | Bervariasi | Tidak berlaku | `noindex, nofollow` (dan `Disallow: /api/`) | **Tidak** | Endpoint JSON/API privat dan formulir publik |
| `/openapi.json`, `/llms.txt`, `/llms-full.txt`, `/.well-known/verax-agent.json` | `200` | Tidak berlaku | `noindex, nofollow` | **Tidak** | Tetap dapat diakses agen AI dan alat pengembang, tetapi dicegah masuk ke hasil pencarian web umum |

---

## 4. Audit Sitemap XML Dinamis (`Confirmed`)

Perbandingan langsung antara `/sitemap.xml` produksi saat ini dan implementasi [`src/app/sitemap.ts`](../../../src/app/sitemap.ts) lokal:

1. **Perbaikan URL Host Kanonik:** Produksi 11 November memancarkan `<loc>http://localhost:3000/...</loc>` karena variabel `VERAX_PUBLIC_BASE_URL` bawaan tidak ditolak. Versi lokal memakai [`getCanonicalBaseUrl()`](../../../src/lib/seo/constants.ts) sehingga 100% URL dalam `/sitemap.xml` menggunakan `https://veraxpress.vercel.app/...`.
2. **Kejujuran Tanggal `<lastmod>`:** Versi produksi sebelumnya mengembalikan `new Date()` pada halaman depan dan halaman opini di setiap permintaan HTTP, yang memicu sinyal pembaruan palsu bagi perayap. Versi terbaru di [`src/app/sitemap.ts`](../../../src/app/sitemap.ts) menghitung `<lastmod>` murni dari tanggal publikasi dan koreksi artikel terbit aktual melalui `getArticleSeoDates()`, tanggal `correctedAt` terbaru untuk `/koreksi`, serta tidak menyertakan `<lastmod>` buatan pada halaman kebijakan statis tanpa kolom histori modifikasi.
3. **Penyaringan Konten Dinamis:** Hanya desk aktif (`isActive: true`), artikel berstatus `PUBLISHED`/`CORRECTED`, dan profil `/penulis/[id]` non-anonim dengan minimal satu karya ber-kredit publik yang dimasukkan. Artikel berstatus `RETRACTED`, `ARCHIVED`, draf internal, akun anonim, dan anggota tanpa karya terbit seperti `person_pemredVP` dikecualikan secara otomatis.
4. **Hasil Uji `check_sitemap.py` terhadap Salinan Database Lokal Berartikel:**
   - Total entri: `34` URL (14 halaman statis publik + 3 desk aktif + 12 artikel terbit/dikoreksi + 5 profil penulis non-anonim dengan karya terbit).
   - Ukuran tidak terkompresi: `5.076` byte, `0` duplikat, `0` galat, `0` peringatan (`valid_basic_structure: true`).

---

## 5. Metadata, Open Graph, Twitter Card, Schema.org, dan Ikon (`Confirmed`)

### 5.1 Penyelesaian Pewarisan Dangkal (*Shallow Merge*) Next.js Metadata
Dalam Next.js Metadata API, mendefinisikan ulang objek `openGraph` atau `twitter` di halaman anak akan menimpa objek milik root layout dan menghilangkan `openGraph.siteName` maupun `openGraph.images`. Seluruh halaman indeks, artikel, profil penulis, serta 12 halaman kelembagaan dan dokumentasi pengembang sekarang mengisi `openGraph.siteName`, `openGraph.locale` (`id_ID`), `openGraph.images`, serta `twitter.card` (`summary_large_image`) secara eksplisit melalui [`buildPublicMetadata()`](../../../src/lib/seo/metadata.ts) maupun `generateMetadata` per rute.

### 5.2 Data Terstruktur JSON-LD (Schema.org)
Komponen [`<JsonLd />`](../../../src/components/seo/json-ld.tsx) dan pembangun [`src/lib/seo/structured-data.ts`](../../../src/lib/seo/structured-data.ts) mensterilkan karakter `<`, `>`, dan `&` menjadi urutan unicode (`\u003c`, `\u003e`, `\u0026`) untuk mencegah injeksi penutup tag `</script>`. Skema yang diterbitkan hanya memuat fakta yang benar-benar tampil di halaman:
- **Beranda (`/`):** `@graph` berisi `NewsMediaOrganization` (mengacu ke `/brand/verax-press-logo.png` `512x512`, `publishingPrinciples`, `correctionsPolicy`, `ethicsPolicy`, `ownershipFundingInfo`, dan `actionableFeedbackPolicy`) serta `WebSite`.
- **Artikel (`/artikel/[slug]`):** `Article` untuk format `OPINION` dan `NewsArticle` untuk format liputan lain (`NEWS`, `ANALYSIS`, `EXPLAINER`, `FEATURE`, `INTERVIEW`). Properti `datePublished` diambil dari `firstPublishedAt ?? publishedAt`. Properti `dateModified` dan meta `article:modified_time` **hanya** diterbitkan apabila terdapat catatan koreksi pada `CorrectionRecord` atau status `CORRECTED`, bukan dari kolom `updatedAt` akibat operasi re-seed database.
- **Atribusi Penulis dalam JSON-LD:** Bila artikel memiliki kredit publik penulis non-anonim, `author` berupa objek `Person` yang terhubung ke `/penulis/[id]`. Bila byline berupa `Anonim`, `author` memakai `Person` bernama `"Anonim"` tanpa tautan URL profil. Untuk liputan kolektif redaksi tanpa kredit individu perorangan, `author` mengacu ke `NewsMediaOrganization` `"Verax Press"`.
- **Gambar Artikel di OG & JSON-LD:** Helper `collectArticleRasterImages()` menyaring gambar raster valid dan menggunakan `/brand/verax-press-og.png` (`1200x630`) sebagai cadangan Open Graph. Gambar SVG pada isi artikel tidak dimasukkan ke properti raster Schema.org.
- **Desk (`/desk/[slug]`) & Opini (`/opini`):** `CollectionPage` dan `BreadcrumbList`.
- **Profil Penulis (`/penulis/[id]`):** `ProfilePage` (hanya ketika penulis memiliki karya terbit) dan `BreadcrumbList`.

### 5.3 Tautan Internal, Penjelajahan, dan Pengurangan Halaman Yatim (*Orphan Pages*)
1. **Tautan Byline Penulis & Penyunting ([`src/app/(public)/artikel/[slug]/page.tsx`](../../../src/app/(public)/artikel/[slug]/page.tsx)):** Nama penulis pada byline dan daftar penyunting (`Disunting oleh ...`) kini ditautkan ke `/penulis/[id]` untuk profil non-anonim dengan kredit publik. Anonimitas tetap dijaga penuh (`Anonim` tidak diberi tautan dan `/penulis/[anonId]` mengembalikan `404`).
2. **Navigasi Remah Roti ([`src/components/site/breadcrumbs.tsx`](../../../src/components/site/breadcrumbs.tsx)):** Ditambahkan ke halaman artikel, desk, opini, profil penulis, dan seluruh 12 halaman kelembagaan maupun pengembang, selaras dengan `BreadcrumbList` JSON-LD.
3. **Paginasi Aman Perayap:** `/desk/[slug]` dan `/opini` menyediakan tautan `rel="prev"` / `rel="next"`, membatasi 24 artikel per halaman, memvalidasi `?page=`, dan mengembalikan HTTP `404` untuk parameter non-numerik (`?page=abc`), nol (`?page=0`), atau melampaui total halaman (`?page=999`).
4. **Aset Ikon & Identitas Visual Statis:** Ikon dipusatkan agar bebas konflik Turbopack antara ikon berkas di `src/app/` dan ikon biner statis: [`src/app/icon.svg`](../../../src/app/icon.svg) (`357` byte), [`public/favicon.ico`](../../../public/favicon.ico) (`1.847` byte, resolusi 16x16, 32x32, 48x48), [`public/icon.png`](../../../public/icon.png) (`3.268` byte, `192x192`), [`public/apple-icon.png`](../../../public/apple-icon.png) (`3.122` byte, `180x180`), [`public/brand/verax-press-logo.png`](../../../public/brand/verax-press-logo.png) (`14.027` byte, `512x512`), dan [`public/brand/verax-press-og.png`](../../../public/brand/verax-press-og.png) (`64.910` byte, `1200x630`). Aset template lama `public/logo.svg` telah dihapus.

---

## 6. Kesiapan Google Search Console & Bing Webmaster Tools (`Confirmed` & `Not assessed`)

- **Implementasi Kesiapan di Kode ([`src/app/layout.tsx`](../../../src/app/layout.tsx) & [`.env.example`](../../../.env.example)):** Root layout mendukung tag verifikasi HTML melalui variabel lingkungan opsional `GOOGLE_SITE_VERIFICATION` (`<meta name="google-site-verification" ...>`) dan `BING_SITE_VERIFICATION` (`<meta name="msvalidate.01" ...>`). Ketika kedua variabel belum diisi, tag meta verifikasi tidak dirender sehingga tidak menghasilkan nilai palsu di HTML publik.
- **Batas Kejujuran Pelaporan:** Tidak ada token verifikasi yang dikarang atau ditanam di kode sumber. Kepemilikan domain di Google Search Console maupun Bing Webmaster Tools **belum terverifikasi** (`Not assessed`), dan belum ada satu pun URL Verax Press yang dapat diklaim sudah terindeks hanya berdasarkan kode HTTP `200` maupun terbukanya `robots.txt`.

---

## 7. Ringkasan Verifikasi Empiris Lokal (`Confirmed`)

Seluruh pemeriksaan di bawah dijalankan terhadap workspace aktual setelah seluruh perubahan kode SEO selesai:

| Pemeriksaan | Lingkungan / Data | Hasil Aktual |
|---|---|---|
| `bun run typecheck` (`tsc --noEmit`) | Workspace TypeScript | Exit `0`, `0` galat |
| `bun run lint` (`eslint .`) | Seluruh proyek | Exit `0`, `0` galat dan `0` peringatan |
| `bun run build` (`prisma generate && next build`) | Next.js 16.1.3 Turbopack dengan `DATABASE_URL` dan `TEST_DATABASE_URL` ke `db/isolated-test.db` | Exit `0`, kompilasi `5.5s`, `58/58` halaman statis terbangun tanpa kontak ke Turso produksi |
| `bun test` (15 berkas uji) | `db/isolated-test.db` dan `standalone` server port `3088` | **`170 pass, 0 fail`**, `831 expect()` assertions dalam `13.53s`, termasuk [`tests/seo.test.ts`](../../../tests/seo.test.ts) |
| `check_sitemap.py` (`GET /sitemap.xml`) | Salinan `db/custom.db` (12 artikel terbit, 6 profil) via `.next/standalone/server.js` | `valid_basic_structure: true`, `34` URL kanonik `https://veraxpress.vercel.app`, `0` duplikat, `0` eror |
| Uji Header `X-Forwarded-Host: verax-press.vercel.app` ke `/tentang` | Server `standalone` port `3088` | HTTP `308` dengan `Location: https://veraxpress.vercel.app/tentang` |
| `inspect_html.py` di 11 rute publik, auth, penulis & artikel | Server `standalone` port `3088` | 8 rute `index, follow` memiliki 1 `<h1>`, tag `canonical` tepat, dan JSON-LD valid; `/studio/login` & `/kontributor/login` memancarkan `X-Robots-Tag: noindex, nofollow` + meta `noindex, nofollow`; `/kontributor/daftar` & penulis 0-karya `person_pemredVP` memancarkan `noindex, follow` |
| Google Chrome Headless CDP di 5 rute inti (`/` , `/desk/hukum-keadilan`, `/tentang`, artikel, penulis) | Desktop `1440x900` & Mobile `390x844` | `overflow=0` pada 10/10 viewport-rute, `1` `<h1>` per halaman, semua blok JSON-LD terurai valid (`ok: true`), `/icon.svg` dan `/favicon.ico` berstatus `200 OK`, `0` console error, `0` page exception, `0` HTTP `>= 400` error |

---

## 8. Langkah Wajib Pemilik Saat dan Sesudah Deploy Produksi

1. **Tinjau & Deploy ke Vercel Produksi:** Lakukan commit dan push setelah peninjauan diff, lalu jalankan deployment produksi (`vercel --prod`). Pastikan `NEXTAUTH_SECRET` dan variabel database produksi Turso sudah aktif di proyek `veraxpress`.
2. **Aktifkan Edge Domain Redirect di Vercel Dashboard:** Buka `Project Settings > Domains` di dashboard Vercel `veraxpress`, tetapkan `veraxpress.vercel.app` sebagai **Primary Domain**, dan arahkan seluruh alias lama (`verax-press.vercel.app`, `vrxp.vercel.app`, `vpid.vercel.app`, `vrxid.vercel.app`, `vpnews.vercel.app`, `vrxnews.vercel.app`) menjadi *308 Redirect to Primary Domain* di edge CDN agar tidak perlu melewati fungsi serverless aplikasi.
3. **Verifikasi Ulang Endpoint Produksi Pasca-Deploy:** Setelah deploy selesai, periksa langsung:
   - `https://veraxpress.vercel.app/robots.txt` hanya memuat blok `User-agent: *`, `Disallow: /api/`, dan `Sitemap: https://veraxpress.vercel.app/sitemap.xml`.
   - `https://veraxpress.vercel.app/sitemap.xml` hanya memuat URL `https://veraxpress.vercel.app/...` (bukan `http://localhost:3000/`).
   - `https://verax-press.vercel.app/` mengembalikan status `308` menuju `https://veraxpress.vercel.app/`.
4. **Daftarkan ke Google Search Console & Bing Webmaster Tools:**
   - Tambahkan properti `https://veraxpress.vercel.app` pada Google Search Console dan Bing Webmaster Tools.
   - Salin token verifikasi resmi masing-masing ke Environment Variables Vercel Production (`GOOGLE_SITE_VERIFICATION` dan `BING_SITE_VERIFICATION`), lalu re-deploy sekali lagi sebelum menekan tombol *Verify*.
   - Kirimkan `https://veraxpress.vercel.app/sitemap.xml` melalui menu Sitemaps pada kedua konsol setelah minimal laporan berita perdana terbit di Turso produksi.
