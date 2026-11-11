# Laporan Audit Mutu Menyeluruh Verax Press (Comprehensive Read-Only QA Audit)

Tanggal Audit: 10 November 2026  
Tipe Audit: Audit Kualitas Baca Saja (Strict Read-Only QA Audit)  
Lingkungan yang Diperiksa:
- Produksi Web: `https://verax-press.vercel.app` (Vercel Production, Region sin1 / Singapore)
- Repositori Kode Sumber: `D:\Projects\verax` (Git HEAD, branch main)
- Basis Data Utama: Turso Cloud libSQL (Region Singapore) & SQLite lokal `db/custom.db`
- Layanan Media: `http://media.aryariap.my.id` (Azure VM `forfh-korea-vm`)
- Bukti Tangkapan Layar: `docs/superpowers/audits/evidence/`

---

## 1. Ringkasan Eksekutif (Executive Summary)

Audit independen mendalam dilakukan terhadap seluruh lapisan aplikasi Verax Press, mencakup tampilan visual nyata, perilaku responsif pada 7 ukuran layar, aksesibilitas, arsitektur kode frontend, ketahanan backend dan API, otentikasi, integritas basis data Turso, integrasi penyimpanan media Azure VM, keandalan operasional, serta kepatuhan penulisan sistem berbasis standar anti-ai-writing. Seluruh pemeriksaan dijalankan dengan kepatuhan mutlak pada kebijakan baca saja (strict read-only execution policy) tanpa mutasi data produksi, tanpa penulisan basis data, dan tanpa modifikasi berkas proyek yang sedang dilacak.

### Kesimpulan Kondisi Nyata:
1. **Tampilan Visual Nyata Sangat Mentah dan Tidak Proporsional:** Inspeksi visual langsung terhadap bukti tangkapan layar membantah klaim sepihak bahwa antarmuka sudah matang. Hasil rendering produksi terlihat seperti purwarupa setengah jadi (wireframe). Ditemukan ketimpangan tata letak yang mencolok:
   - Bilah navigasi desktop hanya membentang sekitar 55 persen dari kontainer, menyisakan garis hitam horizontal telanjang yang menggantung aneh hingga batas kanan.
   - Halaman artikel (`/artikel/*`) dan formulir keluhan (`/keluhan`) menempel di sisi kiri dan membiarkan 50 persen sisi kanan layar pada resolusi desktop (1440px dan 1920px) menjadi ruang kosong putih yang sangat masif dan canggung.
   - Halaman masuk CMS (`/studio/login`) berupa kotak wireframe polos yang mengambang di kehampaan putih dengan tombol abu-abu mati dan tautan teks mentah tanpa sentuhan desain profesional.
2. **Responsivitas Ponsel dan Tablet Patah secara Visual:**
   - Pada ponsel 390px dan 360px, bilah utilitas atas bertabrakan: teks *MEDIA INDEPENDEN · EDISI INDONESIA* terlipat dua baris dan saling himpit dengan tautan *LOG KOREKSI* dan *HAK JAWAB*.
   - Ikon menu hamburger berada di kiri luar yang tidak sejajar dengan logo *VERAX PRESS* yang berada di tengah, menciptakan kesan miring dan tidak seimbang (*menceng*).
   - Ukuran huruf headline berita utama di ponsel terlalu raksasa, memakan 5 baris vertikal penuh dan menggeser seluruh isi halaman ke bawah lipatan layar.
   - Pada tablet 768px, grid broadsheet runtuh total menjadi satu kolom air terjun panjang ke bawah; seksi *TERBARU* terlempar jauh ke dasar halaman.
3. **Penyusupan Istilah Teknis ke Pengguna Publik:** Formulir pengaduan publik memuat teks tempat penampung (*placeholder*) yang berbunyi `slug-artikel (kosongkan jika tidak terkait artikel tertentu)`. Penggunaan istilah pengembang (*slug*) pada antarmuka publik memperlihatkan implementasi yang terburu-buru dan tidak ramah pengguna awam.
4. **Pelanggaran Standar Anti-AI Nyata di Halaman Depan:** Ditemukan tanda pisah em dash (`—`) yang terpampang langsung pada headline artikel di halaman depan (`Kode Etik Jurnalistik sebagai Rujukan — Bukan Stiker pada Dinding`) dan pada teks deskripsi naskah (`...terbit – setiap naskah...`), membuktikan bahwa pembersihan em dash sama sekali belum tuntas.
5. **Temuan Kritis Layanan Media Azure (Gagal HTTPS):** Domain `https://media.aryariap.my.id` mengalami kegagalan jabat tangan TLS/SSL (`SEC_E_WRONG_PRINCIPAL`). Nginx di VM hanya mendengarkan port 80 HTTP tanpa sertifikat SSL Let's Encrypt port 443, sehingga pemanggilan API media dari Vercel gagal.
6. **Temuan Kritis Basis Data Turso & Lokal (Data Anak Kosong Total):** Tabel `SourceReference`, `ArticleVersion`, `ArticleContribution`, dan `CorrectionRecord` tercatat memiliki **0 baris** di basis data Turso produksi maupun `db/custom.db`. Akibatnya, modul inti *"Sumber & Verifikasi"* tidak pernah muncul pada naskah berita mana pun, halaman `/koreksi` berstatus kosong, dan riwayat versi naskah pada studio CMS tidak ada.
7. **Cacat Otorisasi Backend CMS:** Rute `GET /api/studio/complaints` dan `PATCH /api/studio/complaints/[id]` secara keliru menyematkan nilai boolean statis `{ canManageComplaints: false }` saat memverifikasi izin, sehingga staf dengan peran EDITOR yang memiliki hak `canManageComplaints: true` ditolak (403 Forbidden).

---

## 2. Ruang Lingkup dan Metodologi (Scope & Methodology)

Pemeriksaan dilakukan dengan metode audit teknis independen:
- **Inspeksi Antarmuka Langsung:** Menggunakan peramban otomasi Chrome DevTools untuk merender situs produksi `https://verax-press.vercel.app`, mengevaluasi DOM tree, mengukur `scrollWidth` vs `innerWidth`, dan mencatat keluaran konsol.
- **Evaluasi Bukti Tangkapan Layar:** Menganalisis secara visual dan proporsional 15 berkas gambar yang tersimpan di `docs/superpowers/audits/evidence/`.
- **Pengujian Responsif 7 Viewport:** Pengujian visual pada resolusi Mobile Small (360x800), Mobile Standard (390x844), Mobile Large (430x932), Tablet (768x1024), Laptop (1366x768), Desktop (1440x900), dan Wide Desktop (1920x1080).
- **Analisis Statis Kode Sumber:** Pemeriksaan kode App Router Next.js 16.1.3, validasi Zod, skema Prisma 6, rute API, dan middleware.
- **Pemeriksaan Basis Data Read-Only:** Eksekusi kueri SELECT-only terhadap Turso Cloud via `@libsql/client` dan pemeriksaan SQLite lokal via `node:sqlite`.
- **Inspeksi Layanan Jaringan Media:** Pemeriksaan endpoint kesehatan (health check) dan sertifikat TLS pada `media.aryariap.my.id` via `curl.exe`.
- **Verifikasi Kualitas Kode Otomatis:** Menjalankan `bun run typecheck`, `bun run lint`, dan pengujian unit murni (`bun test tests/password.test.ts ...`).
- **Pemeriksaan Bahasa Anti-AI:** Pemindaian skrip berbasis kata kunci terlarang dan tanda baca em dash sesuai `docs/editorial/VERAX_WRITING_STANDARDS.md`.

---

## 3. Inventaris Lingkungan dan Versi (Environment Inventory)

| Komponen | Spesifikasi / Versi | Catatan Status |
| :--- | :--- | :--- |
| **Framework Web** | Next.js 16.1.1 (App Router, Turbopack) | Berjalan di Vercel Production |
| **Pustaka UI** | React 19.0.0, Tailwind CSS 4, shadcn/ui | Kompatibel, tanpa hydration mismatch |
| **Bahasa & Runtime** | TypeScript 5, Bun 1.4.3 / Node.js 24 | Typecheck dan linter lolos 0 error |
| **Otentikasi** | NextAuth 4.24.11 | JWT strategy, scrypt password hashing |
| **ORM & Driver** | Prisma 6.11.1 + `@prisma/adapter-libsql` 6.19.2 | Dual engine: LibSQL Turso & native SQLite |
| **Basis Data Utama** | Turso Cloud (libSQL, Region Singapore) | 16 tabel skema, 100 baris total |
| **Layanan Media** | Node.js microservice di Azure VM (Korea Central) | Port 4188 lokal, Nginx reverse proxy port 80 |
| **Hosting Aplikasi** | Vercel Serverless (sin1 / Singapore) | Domain: `verax-press.vercel.app` |

---

## 4. Temuan Detail Kualitas Visual Antarmuka (Visual UI Audit)

Pemeriksaan mendalam terhadap berkas tangkapan layar di `docs/superpowers/audits/evidence/` mengungkap cacat visual konkret:

### 4.1 Cacat Pemotongan Bilah Navigasi Desktop (Bukti: `01-homepage-desktop-1440.png`, `07-homepage-wide-1920.png`, `10-desk-listing-1440.png`)
- **Masalah:** Daftar menu rubrik (*HUKUM & KEADILAN | TEKNOLOGI & KEBIJAKAN | NASIONAL & PUBLIK | OPINI | TENTANG*) hanya mengisi sekitar 55 persen lebar kontainer header.
- **Dampak Visual:** Di sebelah kanan kata *TENTANG*, terdapat garis hitam batas atas-bawah yang membentang kosong tanpa isi hingga ke ujung kanan. Tampilan ini terlihat sangat mentah, asimetris, dan seperti menu yang kehilangan separuh tautannya.

### 4.2 Jurang Ruang Kosong 50 Persen di Halaman Artikel (Bukti: `11-article-detail-1440.png`)
- **Masalah:** Pada resolusi desktop (1440px dan 1920px), kolom baca artikel dipatok sebesar `max-w-(--measure-article)` (sekitar 42rem) dan menempel di sisi kiri.
- **Dampak Visual:** Sisi kanan layar selebar lebih dari 700 piksel dibiarkan berupa ruang putih hampa tanpa sidebar, tanpa daftar naskah terkait, dan tanpa penyeimbang tata letak. Halaman terlihat condong ke kiri (*menceng*) dan tidak seperti publikasi berita profesional yang proporsional.

### 4.3 Drop Cap Menggantung Canggung (Bukti: `11-article-detail-1440.png`)
- **Masalah:** Huruf pembuka besar ("T") pada paragraf pertama artikel berukuran 80 piksel (5rem), sementara teks paragraf pembuka hanya terdiri dari 3 baris pendek.
- **Dampak Visual:** Batang huruf "T" menggantung ke bawah melewati dasar paragraf pertama, menciptakan rongga putih yang ganjil sebelum baris kedua dimulai.

### 4.4 Tampilan Wireframe Polos pada Halaman Masuk CMS (Bukti: `13-studio-login-1440.png`)
- **Masalah:** Halaman login studio CMS berupa kotak kartu persegi kecil yang terapung di tengah kanvas kosong putih masif.
- **Dampak Visual:** Tombol masuk (*Masuk*) berupa balok abu-abu datar yang tidak menarik, dan tautan *← KEMBALI KE SITUS PUBLIK* di bawahnya hanya berupa teks monospace kecil tanpa gaya tombol atau pembatas yang layak. Terlihat seperti komponen scaffold awal yang belum disentuh desainer.

### 4.5 Cacat Tata Letak Formulir Keluhan (Bukti: `14-keluhan-form-1440.png`)
- **Masalah:** Seluruh formulir berjejal di separuh kiri layar dengan 50 persen sisi kanan layar kosong melompong.
- **Penyusupan Istilah Teknis:** Bidang pengisian artikel terkait menampilkan teks bantuan `slug-artikel (kosongkan jika tidak terkait artikel tertentu)`. Pembaca umum tidak memahami arti istilah *slug*, yang seharusnya ditulis sebagai *URL atau Judul Artikel*.

### 4.6 Hilangnya Modul Sumber dan Verifikasi
- **Masalah:** Seksi *Sumber & Verifikasi* sama sekali tidak dirender pada seluruh 12 artikel yang diterbitkan.
- **Akar Masalah:** Logika kondisional `{isLive && article.sources.length > 0}` di `src/app/(public)/artikel/[slug]/page.tsx` mengevaluasi ke `false` karena tabel basis data `SourceReference` memiliki 0 baris rekaman.

---

## 5. Temuan Perilaku Responsif yang Mentah (Responsive Findings)

Meskipun secara teknis tidak terjadi luapan horizontal (`scrollWidth <= innerWidth`), pengujian visual membuktikan tata letak responsif dirancang secara asal jadi:

### 5.1 Kerapatan Parah pada Layar Ponsel 360px dan 390px (Bukti: `02-homepage-mobile-390.png`, `03-homepage-mobile-small-360.png`)
- **Tabrakan Bilah Utilitas:** Teks *MEDIA INDEPENDEN · EDISI INDONESIA* terpotong menjadi:
  ```
  MEDIA INDEPENDEN · EDISI     LOG       HAK
  INDONESIA                    KOREKSI   JAWAB
  ```
  Teks bertumpuk secara canggung dan saling berdekatan secara ekstrem.
- **Ketidaksejajaran Header Mobile:** Tombol hamburger (tiga garis) menempel di margin kiri, sementara teks *VERAX PRESS* berada di tengah-tengah. Ini merusak keseimbangan visual masthead pada perangkat seluler.
- **Bilah Rubrik Mobile yang Aneh:** Di bawah header mobile, bilah horizontal desk menampilkan indikator berupa balok tebal berwarna cokelat muda kusam di bawah teks *HUKUM & KEADILAN*, sementara teks *TEKNOLOGI & KEBIJAKAN* terpotong di tepi kanan layar tanpa indikator gulir yang anggun.

### 5.2 Headline Mobile Terlalu Raksasa
- Teks judul utama *Lima Tahap Sebelum Terbit: Anatomi Alur Editorial Verax Press* memakan 5 baris vertikal raksasa pada layar ponsel 390px, menelan hampir 70 persen tinggi layar awal sebelum pengguna dapat melihat ringkasan berita.

### 5.3 Keruntuhan Grid pada Tablet 768px (Bukti: `05-homepage-tablet-768.png`)
- Pada tablet 768px, layout broadsheet runtuh total. Naskah utama dan dua naskah sekunder ditumpuk secara vertikal satu kolom, dan seksi *TERBARU* dilempar ke bagian bawah layar di bawah lipatan awal. Navigasi rubrik juga terpotong tidak simetris di bagian kanan.

---

## 6. Temuan Aksesibilitas dan Interaksi (UX & A11y Findings)

- **Aksesibilitas Menu Hamburger:** Tombol menu navigasi mobile (`SiteMobileNav`) tidak mengimplementasikan penguncian fokus (*focus trap*), tidak menutup saat tombol `Escape` ditekan, dan tidak memiliki latar penutup (*backdrop*) untuk menutup menu dengan mengklik area luar.
- **Indikator Fokus:** Tombol hamburger pada perangkat sentuh tidak menampilkan cincin fokus (*focus-visible ring*) yang kontras saat dijelajahi menggunakan papan ketik atau pembaca layar.
- **Bahasa Tempat Penampung Form:** Penggunaan kata teknis `slug-artikel` melanggar asas *learnability* dan *clarity* bagi pembaca awam yang ingin mengajukan hak jawab.

---

## 7. Temuan Integritas Kode Backend dan API (Backend Findings)

- **Cacat Otorisasi Penanganan Keluhan (DEF-03):**  
  Pada `src/app/api/studio/complaints/route.ts` baris 11-16 dan `src/app/api/studio/complaints/[id]/route.ts` baris 22, kode memanggil:
  `userHasPermission({ role: user.role, canRiskEdit: false, canManageComplaints: false }, "complaint:manage")`
  Objek buatan ini mengunci nilai `canManageComplaints` selalu `false`. Akibatnya, Editor yang memiliki hak keluhan di basis data ditolak (403 Forbidden). Hanya peran `CHIEF_EDITOR` yang dapat mengakses modul ini.
- **Kerentanan Konkurensi Kode Keluhan (DEF-05):**  
  Pada `POST /api/public/complaints`, kode referensi dihitung via `db.complaint.count() + 1`. Pengajuan bersamaan pada detik yang sama akan memicu galat unik basis data Prisma (HTTP 500).
- **Absensi Transaksi Multi-Operasi (DEF-06):**  
  Pada `POST /api/internal/v1/ai-submissions` dan `POST /api/studio/corrections`, pembuatan entitas berganda dilakukan tanpa `db.$transaction`. Gangguan jaringan di tengah jalan akan meninggalkan data setengah jadi yang merusak integritas relasional.

---

## 8. Temuan Basis Data Turso Cloud (Turso Database Audit)

Pemeriksaan kueri SELECT langsung terhadap Turso Cloud di Singapura membuktikan adanya kekosongan data struktural:

### Jumlah Baris Nyata per Tabel:
- `ApiClient`: 11 baris
- `Article`: 17 baris
- `ArticleContribution`: **0 baris (KOSONG TOTAL)**
- `ArticleVersion`: **0 baris (KOSONG TOTAL)**
- `AuditEvent`: 56 baris
- `Complaint`: 2 baris
- `CorrectionRecord`: **0 baris (KOSONG TOTAL)**
- `Desk`: 3 baris
- `EditorialReview`: **0 baris (KOSONG TOTAL)**
- `MediaAsset`: 2 baris
- `Person`: 5 baris
- `ReviewComment`: **0 baris (KOSONG TOTAL)**
- `SourceReference`: **0 baris (KOSONG TOTAL)**
- `StaffUser`: 4 baris
- `Submission`: 0 baris

Total baris pada 16 tabel: **tepat 100 baris**.

### Dampak Fatal:
- Seluruh 17 artikel di basis data tidak memiliki satu pun rekaman rujukan di tabel `SourceReference`. Klaim transparansi sumber dan motto *Ex Fontibus Veritas* tidak terwujud di antarmuka publik.
- Halaman `/koreksi` berstatus hampa (*"Belum ada koreksi yang tercatat"*) padahal ada naskah berstatus `CORRECTED`.
- Riwayat versi naskah pada studio CMS kosong melompong.

---

## 9. Temuan Integrasi Media Azure VM (Azure Media Storage Audit)

Pengujian jaringan terhadap Azure VM (`20.214.143.187`):
- **HTTP Port 80:** Layanan microservice loopback port 4188 dan Nginx reverse proxy port 80 aktif dan mengembalikan `{"status":"ok","database":"ok","storage":"ok"}`.
- **HTTPS Port 443:** Mengalami kegagalan jabat tangan TLS `SEC_E_WRONG_PRINCIPAL` saat diakses via domain `media.aryariap.my.id`.
- **Konfigurasi Nginx:** Berkas `services/media-storage/media.aryariap.my.id.conf` baris 115 hanya memuat `listen 80;`. Blok `listen 443 ssl;` belum dikonfigurasi dan sertifikat Let's Encrypt belum diterbitkan. Karena situs publik di Vercel menggunakan HTTPS, peramban memblokir seluruh pemanggilan media ke HTTP (mixed content blocker).

---

## 10. Temuan Kepatuhan Penulisan Anti-AI (Anti-AI-Writing Compliance)

Pemeriksaan kode sumber membuktikan pelanggaran standar penulisan masih tersebar:
- Terdeteksi **94 kemunculan tanda pisah em dash (`—`)** di dalam direktori `src/`.
- Tanda em dash muncul langsung pada judul artikel publik di beranda:  
  `Kode Etik Jurnalistik sebagai Rujukan — Bukan Stiker pada Dinding`
- Nilai cadangan untuk data tanggal kosong di studio CMS menampilkan karakter em dash mentah (`"—"`).
- Hal ini membantah laporan audit terdahulu yang mengklaim 167 em dash telah dibasmi 100 persen.

---

## 11. Buku Register Cacat Terverifikasi Lengkap (Prioritized Defect Register)

| ID | Kategori | Keparahan | Komponen / Rute | Bukti Nyata & Dampak Visual/Fungsional | Rekomendasi Remediasi |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **DEF-01** | Media Storage | **High** | `media.aryariap.my.id` | Port 443 SSL mismatch (`SEC_E_WRONG_PRINCIPAL`). Nginx hanya buka port 80. Unggahan media aman gagal. | Terbitkan sertifikat Let's Encrypt di Azure VM dan tambahkan blok `listen 443 ssl` di Nginx conf. |
| **DEF-02** | Database Data | **High** | Turso & SQLite (`SourceReference`) | 0 baris di tabel `SourceReference`. Seksi "Sumber & Verifikasi" hilang total dari seluruh naskah publik. | Perbaiki seed naskah dan sinkronkan data relasi sumber ke Turso Cloud. |
| **DEF-03** | Authorization | **High** | `GET/PATCH /api/studio/complaints` | Hardcoded `{ canManageComplaints: false }` di rute API. Editor dengan izin sah diblokir (403). | Kueri profil `StaffUser` dari basis data sebelum memanggil `userHasPermission`. |
| **DEF-04** | Database Data | **High** | Turso & SQLite (`CorrectionRecord`) | 0 baris di tabel `CorrectionRecord`. Halaman `/koreksi` hampa padahal ada artikel status CORRECTED. | Tambahkan data rekaman koreksi ke seed naskah. |
| **DEF-05** | Visual UI | **High** | Desktop Masthead & Nav | Bilah navigasi hanya mengisi 55% lebar kontainer, meninggalkan garis hitam kosong menggantung ke kanan. | Perluas navigasi agar proporsional selebar kontainer atau gunakan penataan tersebar merata. |
| **DEF-06** | Visual UI | **High** | Halaman Artikel & Keluhan | 50% sisi kanan layar desktop (1440px/1920px) kosong melompong. Tata letak condong ke kiri (*menceng*). | Tambahkan sidebar pendamping (artikel terkait/terbaru) atau pusatkan kolom baca secara simetris. |
| **DEF-07** | Responsive UX | **High** | Mobile Header (360px/390px) | Teks utilitas atas bertumpuk hancur; tombol hamburger di kiri tidak simetris dengan logo di tengah. | Sederhanakan utilitas mobile, sejajarkan hamburger secara harmonis dengan padding proporsional. |
| **DEF-08** | Responsive UI | **Medium** | Mobile Headline (390px) | Judul utama berukuran raksasa memakan 5 baris vertikal penuh, menggeser seluruh isi ke bawah lipatan. | Sesuaikan skala tipografi mobile (`clamp(1.5rem, 5vw, 2.2rem)`) agar nyaman dibaca. |
| **DEF-09** | Visual UI | **Medium** | `/studio/login` | Tampilan kartu login wireframe polos mengambang di kanvas kosong putih dengan tombol abu-abu mati. | Rancang ulang halaman login studio dengan tata visual redaksi yang matang dan elegan. |
| **DEF-10** | UX Copy | **Medium** | `/keluhan` | Placeholder form bertuliskan `slug-artikel`. Istilah teknis pengembang bocor ke pengguna publik. | Ganti teks placeholder menjadi bahasa jurnalistik: *Tautan atau judul artikel terkait*. |
| **DEF-11** | Visual UI | **Medium** | Drop Cap Artikel | Huruf pembuka "T" berukuran 80px menggantung melewati dasar paragraf pertama yang pendek (3 baris). | Batasi drop cap hanya pada paragraf panjang (minimal 4-5 baris penuh) atau gunakan ukuran 3.5rem. |
| **DEF-12** | Writing Standard | **Medium** | Halaman Depan & `src/` | Terdapat 94 kemunculan tanda pisah em dash (`—`), termasuk pada judul berita utama beranda. | Hapus seluruh em dash dan ganti dengan tanda kurung, koma, atau titik dua sesuai panduan Verax. |
| **DEF-13** | API Concurrency | **Medium** | `POST /api/public/complaints` | Penghitungan urutan `count() + 1` berisiko galat unik 500 saat ada pengajuan keluhan bersamaan. | Gunakan sufiks acak tahan bentrok (*nanoid*) atau transaksi dengan mekanisme coba ulang. |
| **DEF-14** | Data Integrity | **Medium** | Ingestion & Correction API | Multi-tabel dibuat tanpa `db.$transaction`. Berisiko data yatim saat terjadi putus koneksi. | Bungkus seluruh mutasi multi-entitas ke dalam blok `db.$transaction`. |
| **DEF-15** | A11y / UX | **Medium** | `SiteMobileNav` | Menu mobile tidak memiliki penanganan tombol `Escape`, backdrop penutup, dan focus trap. | Pasang dialog modal standar yang menjebak fokus dan menutup saat tombol Esc ditekan. |
| **DEF-16** | Test Isolation | **High** | `tests/regression.test.ts` | Suite uji regresi berbagi basis data langsung dengan dev server dan menghapus data saat dijalankan. | Alihkan suite uji ke berkas SQLite terisolasi sementara (`test.db`). |

---

## 12. Penilaian Skor Kategori Berbasis Realitas Nyata (Realistic Scoring)

Setiap skor disesuaikan secara jujur berdasarkan cacat visual, proporsionalitas antarmuka, dan integritas basis data yang sebenarnya (skala 0–100):

| Kategori Evaluasi | Skor Lama (Subagent) | Skor Nyata Terverifikasi | Alasan Penyesuaian Skor |
| :--- | :---: | :---: | :--- |
| **Kualitas Desain Visual** | 92 | **54** | Bilah menu desktop terpotong 55%, sisi kanan artikel kosong 50%, login wireframe polos, drop cap menggantung. |
| **Implementasi Responsif** | 95 | **58** | Header mobile bertabrakan parah pada 360px, judul mobile memakan 5 baris raksasa, tablet runtuh satu kolom. |
| **Pengalaman Pengguna (UX)** | 85 | **62** | Placeholder teknis `slug-artikel` bocor ke publik, menu mobile tanpa tombol Escape/backdrop. |
| **Aksesibilitas (WCAG 2.1 AA)** | 88 | **84** | Kontras warna tinggi, namun tombol navigasi mobile tidak memiliki cincin fokus yang tegas. |
| **Kualitas Kode Frontend** | 88 | **80** | TypeScript dan ESLint bersih 0 error; namun layouting rapuh dan belum memakai optimasi gambar modern. |
| **Kualitas Kode Backend** | 78 | **70** | Cacat otorisasi keluhan memblokir peran Editor sah; ketiadaan transaksi multi-tabel. |
| **Arsitektur & Keamanan API** | 82 | **76** | Validasi Zod baik; konkurensi kode keluhan berisiko galat 500 saat diakses bersamaan. |
| **Otentikasi & Keamanan** | 84 | **80** | Hashing scrypt tangguh; login mewajibkan penulisan DB audit yang rawan gagal saat database sibuk. |
| **Integritas Basis Data** | 65 | **40** | PRAGMA check lolos, tapi tabel anak `SourceReference` dan `CorrectionRecord` kosong melompong (0 baris). |
| **Integrasi Media Azure** | 60 | **45** | Layanan microservice hidup di HTTP port 80, namun HTTPS port 443 mati total akibat salah sertifikat Nginx. |
| **Performa & Latensi** | 90 | **88** | Waktu muat cepat dari edge Singapura; ringan tanpa beban skrip pihak ketiga yang boros. |
| **Keandalan Operasional** | 74 | **65** | Suite uji otomatis masih mencemari basis data dev operasional jika port 3000 aktif. |
| **Kepatuhan Anti-AI-Writing** | 82 | **68** | Bebas buzzword klise AI, tapi menyisakan 94 tanda pisah em dash termasuk di judul artikel beranda. |

---

## 13. Rencana Remediasi Terprioritas (Prioritized Remediation Roadmap)

Rencana perbaikan disusun bertingkat berdasarkan dampak nyata terhadap kredibilitas dan keandalan sistem. **Tidak ada kode yang diubah selama sesi audit baca saja ini.**

### Prioritas P0 (Kritis / Penentu Kelayakan Rilis):
1. **Perbaikan Tampilan Desktop:** Rombak tata letak desktop agar seimbang: buat bilah navigasi memenuhi lebar kontainer, dan tambahkan kolom sekunder di sisi kanan halaman naskah agar tidak ada jurang kosong putih 50 persen.
2. **Perbaikan Responsif Mobile:** Rombak bilah utilitas mobile agar tidak bertabrakan pada layar 360px, perkecil proporsi judul berita utama agar tidak menelan 5 baris layar, dan rapikan posisi tombol hamburger.
3. **Penyalaan SSL Azure Media Storage:** Pasang sertifikat Let's Encrypt untuk `media.aryariap.my.id` dan aktifkan port 443 SSL pada Nginx reverse proxy.
4. **Pengisian Relasi Sumber & Koreksi:** Perbaiki skrip pengisian basis data agar rekaman `SourceReference` dan `CorrectionRecord` terisi lengkap di Turso Cloud.

### Prioritas P1 (Tinggi / Otorisasi & UX Publik):
5. **Perbaikan Otorisasi Keluhan Staf Editor:** Ambil profil staf nyata dari basis data pada `src/app/api/studio/complaints/route.ts` sebelum memeriksa izin `canManageComplaints`.
6. **Pembersihan Istilah Teknis:** Ganti placeholder `slug-artikel` pada formulir keluhan menjadi bahasa jurnalistik yang ramah pembaca awam.
7. **Pembersihan Sisa Em Dash (`—`):** Bersihkan seluruh tanda pisah em dash dari judul berita, teks antarmuka studio, dan komentar sumber.
8. **Isolasi Pengujian Regresi:** Pisahkan suite uji `tests/regression.test.ts` ke basis data sementara agar tidak merusak data dev server.

### Prioritas P2 (Sedang / Poles Visual & Ketahanan):
9. **Desain Ulang Halaman Masuk Studio:** Berikan sentuhan desain editorial pada halaman masuk CMS agar tidak terlihat seperti wireframe polos.
10. **Pembungkusan Transaksi Multi-Operasi:** Bungkus mutasi di `POST /api/internal/v1/ai-submissions` dan `POST /api/studio/corrections` ke dalam `db.$transaction`.
11. **Penyempurnaan Aksesibilitas Menu Mobile:** Pasang focus trap, pendengar tombol Escape, dan penutup backdrop pada `SiteMobileNav`.

---

## 14. Penilaian Akhir Kesiapan Produksi (Production Readiness Assessment)

**Status Kesiapan Produksi: TIDAK SIAP (NOT PRODUCTION READY - VISUALLY & ARCHITECTURALLY UNFINISHED)**

Aplikasi Verax Press saat ini berada dalam kondisi visual mentah (*raw*), tata letak belum proporsional, integrasi media HTTPS terputus, dan basis data produksi kehilangan data relasi referensi sumber. Diperlukan pengerjaan tahap remediasi prioritas P0 dan P1 pada lingkungan staging sebelum aplikasi ini layak diluncurkan kepada publik luas.
