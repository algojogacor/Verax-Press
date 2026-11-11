# Laporan Audit Teknis: Fase 1 Migrasi Role, Struktur Akun, dan Permission Matrix

Dokumen audit ini mencatat perancangan arsitektur, implementasi teknis, migrasi skema basis data, dan hasil pengujian menyeluruh untuk Fase 1 (Newsroom Administration bagian 1 dari 3) pada Verax Press.

Status Resmi: **IMPLEMENTATION COMPLETE**  
Tanggal Audit: 11 November 2026  
Pemeriksa: Antigravity Senior Systems Engineer  
Repositori: `D:\Projects\verax` (Branch `main`)  
Kompatibilitas Basis Data: SQLite (Lokal & Pengujian) dan Turso Cloud/libSQL (Produksi)  

---

## 1. Arsitektur Awal (Sebelum Migrasi)

Sebelum pelaksanaan migrasi Fase 1, repositori Verax Press memiliki struktur otorisasi dan akun dengan karakteristik sebagai berikut:

### Struktur Role dan Entitas Akun
- Model `StaffUser` menampung tiga peran editorial warisan: `CHIEF_EDITOR`, `EDITOR`, dan `INTERNAL_AUTHOR`.
- Terdapat referensi konseptual terhadap peran `VOLUNTEER` pada level staf, yang berpotensi mencampuradukkan anggota internal tetap dan kontributor eksternal lepas.
- Model `StaffUser` menyertakan kolom kewenangan khusus boolean: `canRiskEdit` (izin penyuntingan naskah sensitif/berisiko) dan `canManageComplaints` (izin pengelolaan pengaduan publik). Pola ini menduplikasi hak prerogatif Pemimpin Redaksi dan memicu ambiguitas hierarki keputusan.
- Identitas staf hanya mengandalkan kolom `email String @unique`. Pada implementasi sebelumnya, akun Pemimpin Redaksi dibootstrap dengan nama pengguna `pemredVP` tanpa alamat surel standar, sehingga memicu inkonsistensi semantik antara identifier masuk dan kanal komunikasi.
- Kontributor eksternal belum memiliki pemisahan identitas yang tegas di tingkat basis data. Model `Contributor` belum dilengkapi kolom pengenal unik `username`, dan belum tersedia fondasi model relasional untuk alur pengajuan aplikasi kontributor (`ContributorApplication`).

### Sesi dan Otorisasi Rute
- Modul sesi NextAuth (`src/lib/auth.ts`) hanya memuat klaim peran generik tanpa menyertakan `accountType` eksplisit untuk membedakan staf internal redaksi dari kontributor portal eksternal.
- Lapisan perantara (`src/middleware.ts`) belum menyekat rute khusus manajemen staf redaksi (`/studio/staff`) dan belum mengisolasi batas perimeter rute kontributor eksternal (`/kontributor/*`).

---

## 2. Arsitektur Akhir (Setelah Migrasi)

Setelah implementasi Fase 1, arsitektur otorisasi dan manajemen staf Verax Press disederhanakan secara menyeluruh dengan mengadopsi prinsip hak akses minimum (*least privilege*) dan kendali editorial terpusat.

### Penyederhanaan Peran Staf
- Staf internal redaksi (`StaffUser`) hanya mengenal dua peran resmi:
  1. **Pemimpin Redaksi (`CHIEF_EDITOR`):** Pemegang kewenangan tertinggi dalam organisasi redaksi, mencakup pengelolaan anggota tim redaksi, peninjauan naskah, keputusan alur editorial, persetujuan dan publikasi naskah, verifikasi sumber primer, pengelolaan catatan koreksi dan hak jawab, serta pemantauan jejak audit global.
  2. **Penulis (`WRITER`):** Anggota staf tetap redaksi yang berfokus pada pembuatan naskah, penyimpanan draf, penambahan sumber rujukan, penyuntingan naskah milik sendiri pada status yang diizinkan (`DRAFT` dan `REVISION_NEEDED`), serta pengajuan naskah untuk ditinjau oleh redaksi.
- Seluruh peran lama (`EDITOR`, `INTERNAL_AUTHOR`) dan kolom hibah khusus (`canRiskEdit`, `canManageComplaints`) telah dihapus dari skema basis data, kode domain, dan antarmuka Studio CMS.

### Pemisahan Identitas Semantik
- Kolom pengenal `StaffUser` kini memisahkan secara tegas antara:
  - `username` (wajib, unik, alfanumerik 3-50 karakter): Pengenal utama akun staf untuk autentikasi dan penyebutan internal redaksi.
  - `email` (opsional, unik): Alamat kontak operasional dan korespondensi resmi staf.
- Modul autentikasi NextAuth (`src/lib/auth.ts`) mendukung pencocokan nama pengguna maupun alamat surel secara fleksibel dan tidak sensitif huruf besar/kecil (*case-insensitive*) dengan klausul `COLLATE NOCASE`.
- Token sesi memuat klaim eksplisit `accountType: "STAFF"`, `role`, dan `username`, menjamin validasi otorisasi server yang deterministik.

### Fondasi Relasional Kontributor Eksternal
- Relasi kontributor eksternal diisolasi secara terpisah pada model `Contributor` (menambahkan `username String? @unique`).
- Dibuat model `ContributorApplication` yang terhubung secara relasional ke `StaffUser` (melalui relasi `reviewedBy`) sebagai persiapan struktural untuk alur onboarding Volunteer pada Fase 2, tanpa mencemari tabel staf redaksi.

---

## 3. Perubahan Role dan Database

### Ringkasan Skema Prisma (`prisma/schema.prisma`)
1. **Model `StaffUser`:**
   - Menambahkan field `username String @unique`.
   - Mengubah field `email String? @unique` menjadi opsional.
   - Mengubah definisi role menjadi `CHIEF_EDITOR | WRITER`.
   - Menghapus kolom `canRiskEdit` dan `canManageComplaints`.
   - Menambahkan relasi `sentInvitations StaffInvitation[] @relation("StaffInviter")`.
   - Menambahkan relasi `reviewedApplications ContributorApplication[] @relation("ApplicationReviewer")`.
2. **Model Baru `StaffInvitation`:**
   - Menyimpan undangan aktivasi staf baru yang dibuat oleh Pemimpin Redaksi.
   - Field: `id`, `tokenHash` (SHA-256, unik), `username` (unik), `name`, `email` (opsional), `role` (default "WRITER"), `expiresAt` (stempel waktu 7 hari), `acceptedAt` (opsional), `revokedAt` (opsional), `invitedById` (relasi ke `StaffUser`).
3. **Model Baru `ContributorApplication`:**
   - Menyimpan berkas pengajuan kontributor eksternal untuk persiapan Fase 2.
   - Field: `id`, `fullName`, `email`, `portfolioUrl`, `motivation`, `sampleArticle`, `status` ("SUBMITTED" | "APPROVED" | "REJECTED"), `reviewedById`, `reviewedAt`, `notes`.

### Berkas Migrasi SQL Resmi
Berkas migrasi SQL telah disusun di:
`prisma/migrations/20261111120000_fase_1_role_and_staff_migration/migration.sql`

Skrip migrasi mandiri yang aman dan kompatibel dengan SQLite lokal serta Turso Cloud telah diimplementasikan di:
`scripts/migrate-role-and-staff.ts`

---

## 4. Strategi Migrasi Data

Migrasi basis data dirancang untuk menjaga integritas data riil tanpa menimbulkan gangguan referensial atau kehilangan rekaman:

1. **Pembuatan Cadangan Otomatis:**
   Sebelum eksekusi skrip migrasi, berkas cadangan SQLite lokal dibuat secara otomatis:
   - `db/custom.db.pre-role-migration-[timestamp].bak`
   - `db/backups/custom_pre_role_migration_20261111.db`
2. **Pemetaan Peran Warisan:**
   - Pengguna dengan peran `EDITOR` dimigrasikan menjadi `WRITER`.
   - Pengguna dengan peran `INTERNAL_AUTHOR` dimigrasikan menjadi `WRITER`.
   - Pengguna dengan peran `CHIEF_EDITOR` dipertahankan seutuhnya.
   - Pemeriksaan pra-migrasi membuktikan tidak terdapat rekaman dengan peran `VOLUNTEER` pada tabel staf.
3. **Rekonstruksi Tabel SQLite yang Aman:**
   - Pengecekan foreign key dinonaktifkan sementara (`PRAGMA foreign_keys = OFF;`).
   - Dibuat tabel sementara `new_StaffUser` dengan struktur skema baru (memuat `username` dan kolom opsional `email`).
   - Data disalin dari `StaffUser` lama dengan logika fallback nama pengguna: bila kolom username belum terisi, sistem mengambil bagian awalan email sebelum tanda `@` (misalnya `editor@verity.test` dipetakan ke nama pengguna `editor`).
   - Tabel lama diganti dengan tabel baru, indeks unik dibangun ulang, dan foreign key diaktifkan kembali.
4. **Verifikasi Integritas:**
   Pemeriksaan integritas pasca-migrasi membuktikan:
   - `PRAGMA integrity_check` mengembalikan hasil: `ok`.
   - `PRAGMA foreign_key_check` mengembalikan hasil: `0 pelanggaran`.
   - Basis data pengembangan `db/custom.db` dan basis data pengujian `db/isolated-test.db` termigrasi dengan status bersih.

---

## 5. Sistem Undangan Penulis (Staff Invitation)

Verax Press tidak menerapkan pendaftaran mandiri terbuka untuk staf internal redaksi. Akun Penulis hanya dapat diterbitkan melalui mekanisme undangan resmi oleh Pemimpin Redaksi.

### Alur Kriptografis Token Sekali Pakai
1. **Pembuatan Undangan (`POST /api/studio/staff/invitations`):**
   - Pemimpin Redaksi memasukkan nama lengkap, nama pengguna yang diinginkan, dan alamat surel kontak opsional.
   - Sistem membangkitkan token acak kriptografis sepanjang 32 byte (64 karakter heksadesimal) menggunakan `crypto.randomBytes(32)`.
   - Token di-hash menggunakan algoritma SHA-256 (`crypto.createHash("sha256")`).
   - Basis data hanya menyimpan representasi `tokenHash`. Token mentah tidak pernah disimpan di basis data dan tidak pernah dicatat dalam log audit, melainkan hanya dikembalikan satu kali dalam respons API untuk disalin oleh Pemimpin Redaksi.
   - Masa berlaku undangan ditetapkan tepat 7 hari sejak penerbitan.
2. **Verifikasi Publik Undangan (`GET /api/public/invitations/[token]`):**
   - Calon Penulis mengakses tautan aktivasi `/studio/invitasi/[token]`.
   - Sistem melakukan hash SHA-256 terhadap token masukan URL dan mencocokkannya ke tabel `StaffInvitation`.
   - Bila token tidak ditemukan: mengembalikan status 404 (Token tidak valid).
   - Bila token telah dicabut: mengembalikan status 410 dengan kode `INVITATION_REVOKED`.
   - Bila token telah kedaluwarsa: mengembalikan status 410 dengan kode `INVITATION_EXPIRED`.
   - Bila token telah digunakan: mengembalikan status 410 dengan kode `ALREADY_ACCEPTED`.
   - Bila valid: mengembalikan data profil pratinjau (nama, nama pengguna, surel) untuk ditampilkan pada formulir aktivasi.
3. **Klaim dan Pembuatan Sandi (`POST /api/public/invitations/[token]/accept`):**
   - Calon Penulis menetapkan kata sandi baru (minimal 8 karakter).
   - Sistem mengenkripsi kata sandi menggunakan fungsi derivasi kunci `scrypt` dengan salt unik.
   - Dalam satu transaksi atomik (`db.$transaction`):
     - Rekaman akun `StaffUser` dibuat dengan status `ACTIVE` dan peran `WRITER`.
     - Rekaman profil publik `Person` dibuat secara otomatis dan dihubungkan ke `StaffUser`.
     - Kolom `acceptedAt` pada `StaffInvitation` diperbarui dengan waktu saat ini.
   - Peristiwa audit `staff.invitation_accepted` dan `staff.activated` dicatat ke dalam log audit.
   - Token secara otomatis hangus dan tidak dapat digunakan kembali (*one-time use*).

---

## 6. Permission Matrix Final

Matriks hak akses editorial dan administratif Verax Press ditegakkan secara ketat pada sisi server:

| Aktivitas Operasional | Pemimpin Redaksi (`CHIEF_EDITOR`) | Penulis (`WRITER`) | Kontributor Eksternal (`Volunteer`) |
|---|:---:|:---:|:---:|
| Membuat Naskah Baru | Ya | Ya | Ya (Fase 2) |
| Melihat Seluruh Naskah Redaksi | Ya | Tidak (Hanya Naskah Sendiri) | Tidak (Hanya Naskah Sendiri) |
| Melihat Naskah Milik Sendiri | Ya | Ya | Ya |
| Mengubah Naskah Milik Sendiri | Ya | Ya (Hanya Status DRAFT / REVISION_NEEDED) | Ya (Sesuai Status) |
| Mengirim Naskah untuk Ditinjau | Ya | Ya | Ya |
| Menulis & Membaca Catatan Internal | Ya | Tidak (Dibersihkan dari Respons API) | Tidak |
| Meninjau Naskah Anggota Lain | Ya | Tidak | Tidak |
| Memverifikasi Sumber Primer | Ya | Tidak | Tidak |
| Menyetujui Naskah | Ya | Tidak | Tidak |
| Menerbitkan Naskah | Ya | Tidak | Tidak |
| Mengelola Anggota Tim Redaksi | Ya | Tidak | Tidak |
| Meninjau Aplikasi Volunteer | Ya | Tidak | Tidak |
| Mengelola Kunci Klien API | Ya | Tidak | Tidak |
| Membaca Log Audit Global | Ya | Tidak | Tidak |
| Menangani Keluhan & Hak Jawab | Ya | Tidak | Tidak |
| Menerbitkan Catatan Koreksi | Ya | Tidak | Tidak |

### Proteksi Akun Administratif Terakhir
Endpoint pembaruan profil staf (`PATCH /api/studio/staff/[id]`) dilengkapi pengaman mutlak: sistem menghitung jumlah akun aktif yang memegang peran `CHIEF_EDITOR`. Bila permintaan mencoba menangguhkan status (`SUSPENDED`) atau mengubah peran akun Pemimpin Redaksi aktif terakhir, server secara tegas menolak tindakan dengan status HTTP 422 dan kode galat `LAST_CHIEF_CANNOT_BE_SUSPENDED`.

---

## 7. Hasil Pengujian Menyeluruh

Pengujian dilakukan berlapis menggunakan runner Bun v1.4.3 pada basis data uji terisolasi (`db/isolated-test.db`).

### Ringkasan Eksekusi Suite Pengujian
- **Total Pengujian Otomatis:** 89 pengujian lintas 10 berkas uji.
- **Hasil:** 89 Lulus (100%), 0 Gagal.
- **Total Asersi Kritis:** 217 panggilan `expect()`.
- **Waktu Eksekusi:** 5.03 detik.

### Rincian Suite Pengujian per Berkas
1. `tests/staff-management.test.ts` (13 pengujian, 54 asersi, 100% Lulus):
   - Uji pembuatan undangan Penulis baru oleh Pemimpin Redaksi (201).
   - Uji penolakan undangan yang dilakukan oleh Penulis (403 Forbidden).
   - Uji penolakan penetapan peran selain WRITER pada skema undangan (422).
   - Uji penolakan token undangan yang kedaluwarsa pada endpoint pratinjau dan klaim (410 INVITATION_EXPIRED).
   - Uji sifat token sekali pakai: klaim pertama berhasil (200), klaim kedua ditolak (410 ALREADY_ACCEPTED).
   - Uji penolakan autentikasi untuk akun staf berstatus SUSPENDED (NextAuth authorize menghasilkan null).
   - Uji proteksi Pemimpin Redaksi terakhir yang aktif terhadap penangguhan akun (422 LAST_CHIEF_CANNOT_BE_SUSPENDED).
   - Uji fleksibilitas identifier masuk: pencocokan case-insensitive untuk nama pengguna dan surel tanpa bentrok.
   - Uji pembatasan penyuntingan Penulis: hanya naskah sendiri pada status DRAFT dan REVISION_NEEDED yang dapat diubah.
   - Uji isolasi akses naskah: Penulis tidak dapat melihat naskah Penulis lain di daftar maupun detail artikel (403).
   - Uji larangan publikasi naskah oleh Penulis (403 Forbidden).
   - Uji kewenangan eksklusif Pemimpin Redaksi dalam persetujuan dan publikasi naskah (200).
   - Uji pengamanan server-side pada seluruh rute API administratif (401/403).
2. `tests/regression.test.ts` (42 pengujian, 69 asersi, 100% Lulus):
   - Seluruh kontrak regresi inti, gerbang verifikasi sumber kunci, mesin status editorial, privasi catatan internal, dan visibilitas publik berhasil divalidasi selaras dengan matriks peran 2 tingkat.
3. `tests/auth-identifier.test.ts` (7 pengujian, 100% Lulus):
   - Autentikasi kredensial resmi Pemimpin Redaksi `pemredVP` teruji akurat pada format huruf persis, huruf kecil, huruf besar, dan huruf campuran.
4. `tests/backend-remediation.test.ts` (7 pengujian, 16 asersi, 100% Lulus):
   - Validasi izin otoritatif langsung pada rekaman basis data, konkurensi nomor referensi keluhan, dan rollback atomik transaksi multi-entitas.
5. `tests/workflow.test.ts` (5 pengujian, 100% Lulus):
   - Transisi alur editorial untuk peran CHIEF_EDITOR dan WRITER terverifikasi penuh.
6. `tests/api-key.test.ts`, `tests/content.test.ts`, `tests/db.test.ts`, `tests/isolation-guard.test.ts`, `tests/password.test.ts` (15 pengujian, 100% Lulus).

### Hasil Suite Uji Asap Mandiri (`scripts/smoke-test.ts`)
- **Total Pemeriksaan Uji Asap:** 32 pemeriksaan.
- **Hasil:** 32 Lulus (100%), 0 Gagal.
- **Isolasi Target:** Turso Cloud Production strictly untouched (zero leakage) dengan perbandingan artikel awal: 0, artikel akhir: 0.

### Hasil Pengecekan Kualitas Kode
- `bun run typecheck` (`tsc --noEmit`): Bersih 0 galat tipe.
- `bun run lint` (`eslint .`): Bersih 0 galat dan 0 peringatan.
- `bun run build`: Berhasil mengompilasi seluruh 29 rute Next.js 16.1.3 Turbopack ke dalam bundel standalone.

---

## 8. Deskripsi Visual Antarmuka Tim Redaksi

Antarmuka manajemen staf redaksi (`/studio/staff`) telah diimplementasikan penuh mengikuti standar desain Verax Press:

### 1. Panel Ringkasan Metrik (Header Overview)
- Terdapat 4 kartu metrik dengan tipografi angka tegas dan bingkai hairline klasik:
  - **Total Anggota:** Jumlah seluruh akun staf redaksi yang terdaftar.
  - **Staf Aktif:** Jumlah akun staf yang memiliki hak akses aktif ke Studio CMS.
  - **Penulis Internal:** Jumlah staf yang memegang peran Penulis tetap.
  - **Undangan Terbuka:** Jumlah tautan aktivasi yang masih aktif menunggu klaim calon staf.

### 2. Tab Navigasi dan Pengendalian Daftar
- Terdapat dua tab navigasi utama: **Daftar Anggota** dan **Undangan Aktivasi**.
- Pada tab Daftar Anggota:
  - Bilah pencarian instan berdasarkan nama lengkap, nama pengguna, atau alamat surel.
  - Filter pilihan peran (Semua Peran, Pemimpin Redaksi, Penulis).
  - Filter pilihan status (Semua Status, Aktif, Ditangguhkan).
  - Tombol aksi utama **Undang Penulis** dengan ikon `UserPlus` yang membuka dialog pembuatan undangan baru.
  - Tabel data responsif dengan kolom: Nama & Nama Pengguna, Alamat Surel Kontak, Peran (Badge kontras), Status Akun (Badge Aktif/Ditangguhkan), Tanggal Bergabung, Sesi Terakhir, dan Menu Aksi Tiga Titik.
  - Menu aksi tiga titik menyediakan: Edit Profil, Tangguhkan Akun (dengan proteksi last chief), atau Aktifkan Kembali.
- Pada tab Undangan Aktivasi:
  - Menampilkan daftar undangan yang pernah diterbitkan beserta nama pengguna target, surel, tanggal pembuatan, batas kedaluwarsa, dan status (Aktif, Digunakan, Dicabut, Kedaluwarsa).
  - Aksi langsung untuk menyalin kembali tautan aktivasi, mengirim ulang / memperpanjang masa berlaku undangan, atau mencabut undangan aktif.

### 3. Dialog Modal
- **Dialog Undang Penulis:** Formulir ringkas berlatar belakang bersih dengan validasi langsung untuk nama lengkap, nama pengguna unik, dan alamat surel. Setelah pengiriman berhasil, dialog menampilkan tautan aktivasi lengkap dan tombol satu klik untuk menyalin ke papan klip.
- **Dialog Edit Profil:** Memungkinkan Pemimpin Redaksi memperbarui nama tampilan, surel kontak, dan biografi editorial staf.
- **Dialog Konfirmasi Penangguhan:** Menampilkan peringatan risiko sebelum akun dinonaktifkan, dan menolak tindakan apabila akun yang dipilih merupakan Pemimpin Redaksi aktif terakhir.

### 4. Halaman Publik Aktivasi (`/studio/invitasi/[token]`)
- Didesain secara fokus dan minimalis di tengah layar (*centered container*).
- Menampilkan nama Verax Press, lambang gembok pengaman, dan ringkasan undangan aktivasi akun Penulis.
- Formulir penetapan kata sandi baru dilengkapi kolom konfirmasi dan peringatan panjang sandi minimal 8 karakter.
- Menangani status galat secara ramah dan transparan (token tidak ditemukan, tautan kedaluwarsa, atau tautan sudah digunakan).
- Saat aktivasi berhasil, menyajikan kartu konfirmasi dan tombol langsung menuju halaman masuk meja redaksi (`/studio/login`).

---

## 9. Known Limitations dan Rekomendasi

1. **Pengiriman Email Undangan Otomatis:**
   Sistem saat ini mengembalikan tautan aktivasi langsung di antarmuka Studio CMS agar dapat disalin manual oleh Pemimpin Redaksi. Integrasi pengiriman email transaksional otomatis (misal via Resend / SMTP) direkomendasikan untuk ditambahkan saat infrastruktur domain surat elektronik Verax Press siap.
2. **Avatar dan Foto Profil Staf:**
   Foto profil staf saat ini mengandalkan inisial nama dan data teks bio pada model `Person`. Penambahan pengunggahan avatar mandiri dapat dijadwalkan pada fase penyempurnaan UI berikutnya.
3. **Pemberitahuan Audit Melalui Saluran Eksternal:**
   Pencatatan audit saat ini disimpan secara reliabel dan permanen di tabel `AuditEvent`. Webhook pengingat eksternal (misal ke saluran Telegram atau Slack redaksi) dapat diintegrasikan pada Fase 3 bersamaan dengan pengelolaan API Client.

---

## 10. Kesiapan untuk Fase 2 (Volunteer Onboarding)

Fase 1 telah selesai secara sempurna dan menyediakan fondasi yang kokoh untuk pelaksanaan Fase 2:

- **Isolasi Model Bersih:** Model `Contributor` dan `ContributorApplication` telah tersedia di skema basis data dan tidak tercampur sedikit pun dengan tabel `StaffUser`.
- **Peran Terkunci:** Peran `StaffUser` telah dipagari hanya untuk `CHIEF_EDITOR` dan `WRITER`, mencegah kerancuan identitas antara staf tetap dan sukarelawan eksternal.
- **Relasi Editorial Terhubung:** Model `ContributorApplication` telah memiliki relasi foreign key `reviewedBy` ke `StaffUser`, memungkinkan Pemimpin Redaksi menyetujui atau menolak aplikasi pendaftaran kontributor pada portal Fase 2.
- **Perimeter Rute Aman:** Berkas middleware telah mengonfigurasi batas pemisah antara lingkungan `/studio/*` dan `/kontributor/*`.

Status akhir: **IMPLEMENTATION COMPLETE**. Sistem lokal berada dalam kondisi stabil, terverifikasi 100%, dan siap untuk peninjauan arsitektural sebelum melangkah ke Fase 2.
