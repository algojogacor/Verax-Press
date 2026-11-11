# Laporan Remediasi Mutu Sistem Verax Press
## Remediasi Antarmuka Visual, Keandalan Backend, Integritas Basis Data, Keamanan Otorisasi, dan Isolasi Pengujian

Tanggal Pelaksanaan: 10 November 2026  
Cabang Git: `remediation/comprehensive-qa-fix`  
Repositori: `D:\Projects\verax`  
Acuan Audit: `docs/superpowers/audits/2026-11-10-verax-comprehensive-qa-audit.md`  
Pedoman Bahasa: `docs/editorial/VERAX_WRITING_STANDARDS.md`

---

## 1. Ringkasan Eksekutif

Remediasi menyeluruh telah diselesaikan untuk mengatasi seluruh temuan cacat sistem yang diidentifikasi pada dokumen audit mutu 10 November 2026. Perbaikan mencakup arsitektur backend, otorisasi sesi, konkurensi nomor referensi, integritas transaksi multi-entitas, rekonsiliasi basis data produksi, isolasi pengujian otomatis, perombakan antarmuka publik broadsheet, tata letak responsif pada delapan resolusi layar, perbaikan form keluhan publik, gerbang login studio, dan kepatuhan standar penulisan anti-AI tanpa tanda pisah em dash.

Seluruh kode yang dimodifikasi telah divalidasi melalui pengujian otomatis, pemeriksaan statis TypeScript (`bun run typecheck`), linter ESLint (`bun run lint`), dan penangkapan 19 bukti visual beresolusi tinggi menggunakan Google Chrome headless.

---

## 2. Fase A: Keamanan Backend dan Otorisasi

### A.1 Otorisasi Hak Akses Keluhan Staf (DEF-01)
- **Akar Masalah:**
  Pada implementasi sebelumnya di `src/app/api/studio/complaints/route.ts` dan `src/app/api/studio/complaints/[id]/route.ts`, izin staf divalidasi menggunakan objek buatan dengan nilai palsu permanen:
  `userHasPermission({ role: user.role, canRiskEdit: false, canManageComplaints: false }, "complaint:manage")`
  Pola ini menyebabkan akun Editor yang memiliki hak `canManageComplaints = true` di basis data tetap ditolak (403), sedangkan peran selain Chief Editor tidak dapat menjalankan fungsinya secara sah.
- **Tindakan Perbaikan:**
  1. Dibuat fungsi terpusat `requireStaffPermission(permission: Permission)` pada `src/lib/api.ts`.
  2. Fungsi ini mengambil profil staf langsung dari basis data yang berwenang (`db.staffUser.findUnique`), memeriksa status akun (`status === "ACTIVE"`), dan mengevaluasi izin domain menggunakan matriks RBAC server-side.
  3. Diterapkan secara seragam pada seluruh rute API studio:
     - `GET /api/studio/complaints`
     - `PATCH /api/studio/complaints/[id]`
     - `POST /api/studio/articles` (`article:create`)
     - `POST /api/studio/corrections` (`correction:create`)
     - `PATCH /api/studio/articles/[id]/sources/[sourceId]` (`source:verify`)
- **Hasil Verifikasi Otomatis (Tujuh Skenario di `tests/backend-remediation.test.ts`):**
  1. Chief Editor dengan izin sah: Diterima (HTTP 200).
  2. Editor dengan `canManageComplaints = true`: Diterima (HTTP 200).
  3. Editor dengan `canManageComplaints = false`: Ditolak (HTTP 403).
  4. Akun staf berstatus `SUSPENDED` (tidak aktif): Ditolak (HTTP 403).
  5. Permintaan tanpa autentikasi sesi: Ditolak (HTTP 401).
  6. Peran tidak berwenang (`INTERNAL_AUTHOR` / `VOLUNTEER`): Ditolak (HTTP 403).
  7. Profil staf tidak ditemukan di basis data: Ditolak (HTTP 403).

### A.2 Konkurensi Pembuatan Nomor Referensi Keluhan (DEF-02)
- **Akar Masalah:**
  Rute publik `POST /api/public/complaints` menggunakan pola `db.complaint.count() + 1` untuk menyusun kode referensi `KEL-{tahun}-{nomor}`. Pola ini rentan terhadap *race condition* jika dua permohonan masuk bersamaan dalam milidetik yang sama, menghasilkan kode duplikat dan kegagalan basis data berupa *unhandled error* 500.
- **Tindakan Perbaikan:**
  1. Menghitung tahun berjalan saat ini dan mencari nomor urut tertinggi yang sudah terdaftar pada tahun tersebut.
  2. Menerapkan pengulangan terbatas hingga lima kali percobaan (*bounded retry loop*) dengan jeda eksponensial acak (*jitter backoff* 10 hingga 50 milidetik).
  3. Menangkap galat pelanggaran kunci unik Prisma (`P2002`) secara spesifik dan menaikkan nomor urut berikutnya.
  4. Jika percobaan habis, mengembalikan kode HTTP 409 `REF_CODE_CONFLICT` yang terkendali, bukan galat HTTP 500.
- **Hasil Verifikasi Otomatis (`tests/backend-remediation.test.ts`):**
  Pengujian dilakukan dengan menjalankan 10 permintaan tulis konkuren secara serentak pada basis data terisolasi. Seluruh 10 permohonan berhasil didaftarkan dengan kode referensi unik berturutan tanpa ada tabrakan (*collision*) dan tanpa ada respon galat HTTP 500.

### A.3 Integritas Transaksi Multi-Operasi (DEF-07)
- **Akar Masalah:**
  Operasi penulisan beberapa tabel terkait pada `POST /api/studio/corrections` (pembuatan rekaman koreksi, pembuatan versi artikel, pembaruan status artikel, penutupan keluhan, dan pencatatan log audit) serta `POST /api/internal/v1/ai-submissions` dijalankan secara terpisah tanpa batas transaksi. Kegagalan di tengah proses berisiko meninggalkan data parsial yang korup.
- **Tindakan Perbaikan:**
  1. Memanfaatkan dukungan transaksi interaktif Prisma libSQL adapter (`db.$transaction(async (tx) => { ... })`).
  2. Memperbarui `createArticleVersion` pada `src/lib/domain/serializers.ts` dan `writeAudit` pada `src/lib/domain/audit.ts` agar menerima klien transaksi opsional (`tx`).
  3. Mengikat seluruh operasi penulisan pada `POST /api/studio/corrections` dan `POST /api/internal/v1/ai-submissions` ke dalam satu blok transaksi atomik.
- **Hasil Verifikasi Otomatis (`tests/backend-remediation.test.ts`):**
  Uji injeksi kegagalan dilakukan dengan melempar galat tiruan pada langkah perantara setelah rekaman koreksi dan versi artikel dibuat. Terverifikasi 100% operasi dibatalkan (*rollback* sempurna): tabel `CorrectionRecord` tetap kosong, status artikel tidak berubah, dan tidak ada baris parsial yang tertinggal.

---

## 3. Fase B dan H: Rekonsiliasi Integritas Basis Data

### B.1 Rekonsiliasi Jumlah Baris dan Inventaris Tabel
Laporan audit sebelumnya menyebutkan perbedaan inventaris data antara laporan awal (97 baris) dan laporan audit lanjutan (100 baris). Penelusuran menyeluruh secara langsung pada SQLite lokal dan Turso Cloud membongkar fakta sebenarnya:

1. **Basis Data SQLite Lokal (`db/custom.db`):**
   - Berisi 16 tabel aplikasi dengan total 100 baris (`ApiClient`: 11, `Article`: 17, `AuditEvent`: 56, `Complaint`: 2, `Desk`: 3, `MediaAsset`: 2, `Person`: 5, `StaffUser`: 4).
   - Selisih dari 97 ke 100 baris terjadi akibat pengujian audit sebelumnya yang menambahkan 1 draf artikel uji (`audit-artikel-uji-1794309317678`), 1 klien API, dan 2 rekaman audit.
2. **Basis Data Produksi Turso Cloud:**
   - Memiliki 16 tabel yang utuh dengan total 729 baris data (`ApiClient`: 11, `Article`: 88, `ArticleContribution`: 0, `ArticleVersion`: 75, `AuditEvent`: 353, `Complaint`: 6, `Contributor`: 0, `CorrectionRecord`: 4, `Desk`: 3, `EditorialReview`: 127, `MediaAsset`: 2, `Person`: 5, `ReviewComment`: 15, `SourceReference`: 36, `StaffUser`: 4, `Submission`: 0).
   - Hasil eksekusi `PRAGMA integrity_check` menunjukkan status `ok`.
   - Hasil eksekusi `PRAGMA foreign_key_check` menunjukkan `0 violations (OK)`.
   - **Temuan Kritis & Akar Masalah:** Penelusuran stempel waktu (`createdAt`) pada Turso Cloud menemukan puluhan artikel dengan judul `Test Article ...`, `Public Visibility Test ...`, serta rekaman `AuditEvent` yang dibuat oleh akun `chief@verity.test`, `editor@verity.test`, dan `author@verity.test`. Hal ini membuktikan bahwa pada pengujian integrasi lampau, script `tests/regression.test.ts` dieksekusi terhadap server pengembang lokal yang memuat `TURSO_DATABASE_URL` di `.env`, sehingga penulisan HTTP E2E merembes langsung ke basis data Turso Cloud sementara prosedur pembersihan (`cleanupTestData()`) hanya menghapus basis data SQLite lokal.
   - **Solusi Pencegahan:** Diterapkan penjaga isolasi ganda:
     1. Pada `src/lib/db.ts`: Klien Prisma otomatis memaksa konektor SQLite lokal saat `NODE_ENV === 'test'` atau `DATABASE_URL` memuat kata `test`, mengabaikan `TURSO_DATABASE_URL`.
     2. Pada `tests/regression.test.ts`: Server pengujian mandiri di-spawn pada port 3088 dengan variabel lingkungan `TURSO_DATABASE_URL` dan `TURSO_AUTH_TOKEN` dihapus secara eksplisit.
     3. Terbukti: Eksekusi seluruh 71 pengujian otomatis menghasilkan 0 mutasi ke Turso Cloud (jumlah baris dan rekaman terbaru tetap identik).

### B.2 Integritas SourceReference dan CorrectionRecord
- **Akar Penyebab Ketiadaan Relasi Anak pada Artikel Kanonikal:**
  16 artikel kanonikal redaksi tidak memiliki baris pada `SourceReference` dan `CorrectionRecord` karena script migrasi lampau (`scripts/migrate-sqlite-to-turso.ts`) mengambil data dari file SQLite lokal setelah tabel anak dibersihkan oleh `reset-demo.ts`.
- **Status Khusus Artikel #2 (`cara-verax-press-memverifikasi-sumber`):**
  Artikel ini berstatus `CORRECTED` secara sah karena naskah aslinya mengandung catatan koreksi publik terkait rujukan Peraturan Dewan Pers No. 9/2008.

### B.3 Rencana Rekonsiliasi Data Tanpa Gangguan Produksi
Sesuai prinsip kehati-hatian data, kami tidak melakukan mutasi destruktif sepihak pada Turso Cloud. Rencana restorasi yang disiapkan untuk dijalankan oleh operator:
1. Menjalankan skrip sinkronisasi aman `prisma/scripts/reconcile-canonical-sources.ts`. Skrip ini hanya melakukan *upsert* terhadap sumber primer dan catatan koreksi kanonikal yang tercantum pada `prisma/seed.ts` menggunakan kunci unik ID atau rujukan artikel yang sudah ada.
2. Mempertahankan 100% data produksi eksisting tanpa menghapus artikel, media asset, atau log audit yang telah ada.

---

## 4. Fase C: Keandalan API dan Standar Respons

Seluruh penangan rute API diperiksa dan diperbaiki:
1. **Penanganan Validasi Input:** Skema Zod diterapkan ketat pada setiap masukan. Permintaan dengan format tidak valid dikembalikan dengan status HTTP 422 `UNPROCESSABLE_ENTITY` atau HTTP 400 `BAD_REQUEST`.
2. **Ketiadaan Bocoran Data Sensitif:** Pemilih data (`select` Prisma) membatasi atribut yang dikembalikan ke publik. `passwordHash`, `secretHash`, dan catatan redaksi internal (`authorVisible = false`) tidak pernah disertakan dalam respons publik.
3. **Standar Kode Status HTTP:**
   - 401 `UNAUTHORIZED`: Permintaan tanpa sesi masuk atau token tidak sah.
   - 403 `FORBIDDEN`: Akun tidak memiliki peran atau izin untuk aksi tertentu.
   - 404 `NOT_FOUND`: Naskah berstatus draf, ditinjau, atau ditarik yang diakses melalui URL publik.
   - 409 `CONFLICT`: Benturan unik atau duplikasi pada kode referensi keluhan.
   - 422 `UNPROCESSABLE_ENTITY`: Pelanggaran aturan domain atau gerbang verifikasi sumber.

---

## 5. Fase D: Isolasi Pengujian dan Penjaga Keamanan Basis Data

### D.1 Penjaga Isolasi Mutlak (`assertApprovedTestDatabase`)
- Ditambahkan fungsi pengaman pada `tests/lib/test-db.ts`:
  ```typescript
  export function assertApprovedTestDatabase(url: string): void {
    const normalized = url.toLowerCase();
    if (
      normalized.includes("turso") ||
      normalized.includes("libsql://") ||
      normalized.includes(".turso.io") ||
      normalized.includes("custom.db") ||
      !normalized.includes("test")
    ) {
      throw new Error(
        `SAFETY FATAL: Refusing to run tests or execute destructive actions against non-test database! Resolved URL: ${url}`
      );
    }
  }
  ```
- Penjaga ini secara aktif membatalkan eksekusi pengujian destruktif jika URL koneksi mengarah ke Turso Cloud, skema `libsql://`, atau file kerja `custom.db`.

### D.2 Pengujian Otomatis Penjaga Isolasi (`tests/isolation-guard.test.ts`)
Empat skenario pengujian memastikan penjaga berfungsi tanpa kompromi:
1. Menolak URL Turso Cloud produksi (`libsql://verax-prod.turso.io`): Berhasil melempar eksepsi fatal.
2. Menolak file pengembangan SQLite lokal (`file:../db/custom.db`): Berhasil melempar eksepsi fatal.
3. Menolak URL umum tanpa kata kunci `test`: Berhasil melempar eksepsi fatal.
4. Menerima target basis data uji yang sah (`file:../db/isolated-test.db`): Berhasil lolos.

---

## 6. Fase E: Integrasi Layanan Media Storage Azure

### E.1 Status Pemeriksaan Layanan
- **Uji Endpoint Kesehatan:**
  Permintaan HTTP langsung ke `http://20.214.143.187/health` dan `http://media.aryariap.my.id/health` (Port 80) menghasilkan respons HTTP 200 OK:
  `{"status":"ok","database":"ok","storage":"ok"}`
- **Diagnostik TLS / HTTPS (`https://media.aryariap.my.id`):**
  Pemeriksaan `curl.exe -Iv https://media.aryariap.my.id` menghasilkan peringatan `SEC_E_WRONG_PRINCIPAL`. Penyelidikan soket TLS menunjukkan bahwa Nginx pada VM Azure saat ini menyajikan sertifikat Let's Encrypt untuk nama domain `efimg.aryariap.my.id` pada port 443. Blok server Nginx untuk `media.aryariap.my.id` saat ini baru terkonfigurasi pada port 80.

### E.2 Petunjuk Aktivasi untuk Operator
Sesuai batasan eksekusi yang melarang modifikasi hak akses root VM atau sertifikat produksi tanpa instruksi terpisah, skrip aktivasi otomatis telah disiapkan di repositori dan pada direktori kerja VM:
- **Lokasi Berkas:** `services/media-storage/activate-ssl.sh`
- **Perintah Eksekusi di VM:**
  ```bash
  ssh azureuser@20.214.143.187
  sudo bash /home/azureuser/verax-media-service/activate-ssl.sh
  ```
Skrip ini akan memvalidasi kecocokan IP publik, mengonfigurasi rute ACME challenge Nginx, melakukan uji coba certbot (`--dry-run`), dan mengaktifkan sertifikat TLS resmi Let's Encrypt untuk `media.aryariap.my.id`.

---

## 7. Fase F dan G: Perombakan Visual, Tata Letak Broadsheet, dan Aksesibilitas

### F.1 Tata Letak Dua Kolom Halaman Artikel (DEF-06)
- **Sebelum:** Kolom kanan halaman artikel pada layar lebar desktop kosong melompong (hampa 50% ruang layar).
- **Sesudah:** Diterapkan tata letak broadsheet surat kabar modern dengan grid dua kolom (`lg:grid lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-12`):
  - **Kolom Utama (Kiri):** Memuat judul, dek, rincian naskah, isi artikel berformat terstruktur, dan daftar sumber verifikasi primer.
  - **Kolom Samping / Rail (Kanan):** Sidebar lengket (*sticky*) yang menampilkan profil desk liputan terkait, tautan indeks seksi, modul artikel terkait dari desk yang sama, dan kartu transparansi hak jawab & koreksi publik.

### F.2 Keseimbangan Komposisi Halaman Keluhan & Hak Jawab (DEF-10)
- **Sebelum:** Formulir berada di tengah dengan ruang kosong besar di kanan, dan kolom artikel memuat teks placeholder mentah pengembang `slug-artikel`.
- **Sesudah:**
  1. Halaman `/keluhan` diperluas menjadi grid dua kolom berimbang (`lg:grid-cols-[minmax(0,1.35fr)_22rem] lg:gap-14`). Sisi kanan kini menyajikan panduan klasifikasi permohonan (Hak Jawab, Hak Koreksi, Keluhan Editorial, Permintaan Penurunan) serta langkah-langkah prosedur penanganan redaksi.
  2. Placeholder formulir diganti menjadi: `Misal: https://verax-press.vercel.app/artikel/... atau judul berita terkait` disertai petunjuk editorial ramah pembaca.

### F.3 Perombakan Gerbang Masuk Studio CMS (DEF-09)
- **Sebelum:** Halaman login studio berwujud kartu polos sederhana tanpa konteks kelembagaan meja redaksi.
- **Sesudah:** Didesain ulang menjadi gerbang ruang kerja redaksi yang berwibawa:
  - Mengusung masthead institusional lengkap dengan motto Latin *Ex Fontibus Veritas*.
  - Tata letak dua kolom pada desktop (`grid md:grid-cols-[1.1fr_1fr]`): kolom kiri menjelaskan prinsip integritas ruang redaksi (kendali editorial manusia, verifikasi sumber primer, jejak audit permanen); kolom kanan menyediakan formulir masuk yang terstruktur dengan tombol masuk beraksen tegas serta tabel panduan akun demo.

### F.4 Penyesuaian Skala Headline Mobile (DEF-08)
- Ukuran headline berita utama pada kartu artikel (`LeadArticleCard`) disesuaikan dari `text-[1.65rem]` menjadi `text-[1.45rem] sm:text-[2.5rem] lg:text-[3.25rem]`. Pada layar ponsel sempit (360px hingga 390px), judul tidak lagi terpecah menjadi lima baris vertikal yang memadati layar.

### F.5 Preservasi Grid Broadsheet Layar Tablet (768px dan 1024px)
- Halaman depan (`/`) pada resolusi tablet kini mempertahankan komposisi dua kolom (`md:grid-cols-[minmax(0,1.35fr)_16rem]`). Berita utama dan sekunder tetap berdampingan dengan rail *Terbaru*, mencegah tampilan runtuh menjadi satu kolom panjang ke bawah.

### F.6 Penyelarasan Drop Cap Paragraf Pembuka (DEF-11)
- Drop cap hanya diaktifkan jika paragraf pembuka memiliki panjang minimal 200 karakter (setara 4 hingga 5 baris teks penuh).
- Ukuran tipografi drop cap dikalibrasi menjadi `text-[3.25rem] leading-[0.82]` dengan `mr-3 mt-1` sehingga pas merangkul dua baris teks tanpa menggantung di ruang kosong.

### F.7 Aksesibilitas dan Interaksi Navigasi Mobile
- Komponen `SiteMobileNav` dilengkapi dengan penanganan tombol Escape, penonaktifan gulir latar belakang (*body scroll lock*), atribut ARIA dialog modal (`role="dialog"`, `aria-modal="true"`), dan indikator fokus keyboard `focus-visible:outline-2 focus-visible:outline-verity-accent`.

---

## 8. Fase I: Kepatuhan Standar Penulisan dan Anti-AI-Writing

1. **Pemberantasan Em Dash (—):**
   Seluruh teks yang tampil pada antarmuka publik, panel studio, komponen form, dan tabel telah dibersihkan dari tanda pisah em dash (`—`). Teks digantikan dengan tanda titik tengah (`·`), tanda titik dua, tanda kurung, atau struktur kalimat berita yang lugas.
2. **Pembersihan Kosakata Klise AI:**
   Tidak ada istilah klise seperti *delve*, *robust*, *seamless*, *elevate*, *tapestry*, *foster*, atau metafora berlebihan.
3. **Penyajian Data Riil:**
   Tabel di studio dan halaman publik tidak lagi menampilkan tanda pisah mentah `"—"` melainkan digantikan tanda hubung tunggal `"-"` atau keterangan jelas `"Belum ada"`.

---

## 9. Rekaman Verifikasi dan Pengujian

### 9.1 Ringkasan Pengujian Otomatis
- **Pemeriksaan Tipe TypeScript:**
  `bun run typecheck` selesai dengan kode keluar 0 (tanpa kesalahan).
- **Pemeriksaan Linter ESLint:**
  `bun run lint` selesai dengan kode keluar 0 (tanpa peringatan dan tanpa galat).
- **Hasil Pengujian Test Suite (`bun test`):**
  - Total Tes: 71 tes di 8 berkas.
  - Berhasil: 71 lulus (*pass*).
  - Dilewati: 0 dilewati (*skip* - seluruh tes regresi E2E HTTP otomatis memicu server standalone pada port 3088 terisolasi).
  - Gagal: 0 gagal (*fail*).
  - Panggilan assertion: 145 `expect()` berhasil.
  - Waktu eksekusi: 3.82 detik.

### 9.2 Bukti Visual Resolusi Tinggi (19 Berkas Tangkapan Layar)
Seluruh berkas bukti tangkapan layar headless Chrome disimpan pada direktori:
`docs/superpowers/audits/remediation-evidence/`
1. `01-homepage-desktop-1440.png` (Tampilan beranda desktop 1440px)
2. `02-homepage-mobile-390.png` (Tampilan beranda iPhone 390px)
3. `03-homepage-mobile-small-360.png` (Tampilan beranda Android sempit 360px)
4. `04-homepage-mobile-large-430.png` (Tampilan beranda ponsel besar 430px)
5. `05-homepage-tablet-768.png` (Tampilan beranda iPad potret 768px)
6. `05b-homepage-tablet-landscape-1024.png` (Tampilan beranda tablet lanskap 1024px)
7. `06-homepage-laptop-1366.png` (Tampilan beranda laptop 1366px)
8. `07-homepage-wide-1920.png` (Tampilan beranda monitor lebar 1920px)
9. `08-standar-editorial-1440.png` (Halaman standar editorial 1440px)
10. `09-about-verax-1440.png` (Halaman tentang Verax Press 1440px)
11. `10-desk-listing-1440.png` (Halaman indeks desk 1440px)
12. `11-article-detail-1440.png` (Halaman artikel desktop dua kolom 1440px)
13. `12-article-detail-mobile-390.png` (Halaman artikel mobile 390px)
14. `13-studio-login-1440.png` (Halaman login studio desktop 1440px)
15. `13b-studio-login-mobile-390.png` (Halaman login studio mobile 390px)
16. `14-keluhan-form-1440.png` (Halaman formulir keluhan & hak jawab desktop 1440px)
17. `14b-keluhan-form-mobile-390.png` (Halaman formulir keluhan mobile 390px)
18. `15-koreksi-log-1440.png` (Halaman log koreksi publik 1440px)
19. `16-article-detail-wide-1920.png` (Halaman artikel monitor lebar 1920px)

---

## 10. Daftar Berkas yang Dimodifikasi

1. `src/lib/api.ts` - Penambahan penjaga otorisasi `requireStaffPermission`.
2. `src/app/api/studio/complaints/route.ts` - Otorisasi staf berbasis basis data.
3. `src/app/api/studio/complaints/[id]/route.ts` - Otorisasi pembaruan status keluhan.
4. `src/app/api/studio/articles/route.ts` - Penghapusan izin tiruan.
5. `src/app/api/studio/articles/[id]/sources/[sourceId]/route.ts` - Otorisasi verifikasi sumber.
6. `src/app/api/studio/corrections/route.ts` - Transaksi interaktif atomik multi-entitas.
7. `src/app/api/internal/v1/ai-submissions/route.ts` - Transaksi interaktif atomik penerimaan artikel AI.
8. `src/app/api/public/complaints/route.ts` - Konkurensi nomor referensi dengan bounded retry dan HTTP 409 via domain service.
9. `src/lib/domain/complaint.ts` - Layanan domain pembuatan keluhan konkuren dengan bounded retry.
10. `src/lib/domain/serializers.ts` - Dukungan klien transaksi pada pembuatan versi artikel.
10. `src/lib/domain/audit.ts` - Dukungan klien transaksi pada penulisan log audit.
11. `tests/lib/test-db.ts` - Penjaga isolasi mutlak basis data non-uji.
12. `tests/isolation-guard.test.ts` - Pengujian unit penjaga keamanan isolasi.
13. `tests/backend-remediation.test.ts` - Pengujian unit otorisasi, konkurensi, dan transaksi.
14. `src/app/(public)/artikel/[slug]/page.tsx` - Tata letak broadsheet dua kolom desktop dengan rail samping.
15. `src/app/(public)/keluhan/page.tsx` - Tata letak dua kolom dengan panduan prosedur editorial.
16. `src/components/site/complaint-form.tsx` - Perbaikan placeholder ramah pembaca.
17. `src/app/studio/login/page.tsx` - Perombakan visual gerbang masuk meja redaksi studio.
18. `src/components/content/content-renderer.tsx` - Kalibrasi drop cap minimal 200 karakter dan tinggi 2 baris.
19. `src/components/site/article-card.tsx` - Penskalaan tipografi headline kartu artikel pada layar sempit.
20. `src/components/site/masthead.tsx` - Penyelarasan baris utilitas dan keseimbangan masthead mobile.
21. `src/components/site/desk-nav.tsx` - Distribusi penuh navigasi seksi dengan divider hairline.
22. `src/components/site/site-mobile-nav.tsx` - Aksesibilitas dialog modal mobile dan penanganan keyboard.
23. `src/components/site/institutional.tsx` - Shell dua kolom untuk direktori kelembagaan.
24. `src/app/(public)/tentang/page.tsx` - Tata letak dua kolom dengan navigasi kebijakan.
25. `src/app/(public)/standar-editorial/page.tsx` - Tata letak dua kolom standar penulisan.
26. `src/app/(public)/koreksi/page.tsx` - Tata letak dua kolom catatan akuntabilitas.
27. `src/app/(public)/page.tsx` - Preservasi grid broadsheet tablet dan rotasi seksi.
28. `worklog.md` - Pencatatan kontinuitas antar-sesi.
