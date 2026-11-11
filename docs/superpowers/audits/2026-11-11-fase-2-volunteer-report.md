# Laporan Audit Teknis: Fase 2 Sistem Volunteer (Pengajuan, Aktivasi, dan Portal Kontributor)

Dokumen audit ini mencatat hasil audit arsitektur, perancangan sistem, migrasi basis data terisolasi, implementasi logika backend dan antarmuka pengguna, serta hasil pengujian menyeluruh untuk Fase 2 (Newsroom Administration bagian 2 dari 3) pada Verax Press.

Status Resmi: **IMPLEMENTATION COMPLETE**  
Tanggal Audit: 11 November 2026  
Pemeriksa: Antigravity Senior Systems Engineer  
Repositori: `D:\Projects\verax` (Branch `main`)  
Kompatibilitas Basis Data: SQLite (Lokal & Pengujian) dan Turso Cloud/libSQL (Produksi)  

---

## 1. Ringkasan Eksekutif

Fase 2 melanjutkan pembaruan struktur peran Fase 1 dengan mengimplementasikan sistem penanganan kontributor eksternal (Volunteer). Volunteer bukan pegawai tetap redaksi dan tidak memiliki akses ke Studio CMS internal. Seluruh naskah kontributor dikerjakan melalui portal mandiri, diverifikasi rujukan primernya, dan wajib melewati kendali penelaahan Pemimpin Redaksi sebelum diterbitkan.

Semua komponen yang ditetapkan dalam spesifikasi Fase 2 telah selesai diimplementasikan secara fungsional:
1. Formulir pengajuan publik (`/kontributor/daftar`) dengan validasi deklarasi usia 18+ dan persetujuan pedoman kontributor.
2. Modul penelaahan permohonan di Studio CMS (`/studio/applications`) khusus Pemimpin Redaksi dengan fitur persetujuan, penolakan berlandaskan catatan, serta penerbitan token aktivasi kriptografis sekali pakai.
3. Halaman aktivasi akun publik (`/kontributor/aktivasi/[token]`) yang memverifikasi hash SHA-256 token, menetapkan nama pengguna dan kata sandi minimal 8 karakter, serta mengaktifkan entitas Contributor dan Person.
4. Portal Kontributor (`/kontributor/portal`) lengkap dengan ringkasan metrik naskah mandiri, pembuatan naskah baru terkurasi (hanya format non-NEWS), penyuntingan draf, pengelolaan rujukan primer, pelacakan riwayat penelaahan redaksi, dan pembaharuan profil publik.
5. Isolasi otorisasi server dan middleware yang menyekat perimeter akses antara akun staf redaksi (`accountType: "STAFF"`) dan kontributor eksternal (`accountType: "CONTRIBUTOR"`).

Pengujian otomatis mencakup 27 pengujian baru pada test suite khusus Volunteer (`tests/volunteer-flow.test.ts`), 116 pengujian pada test suite regresi menyeluruh, dan 32 pemeriksaan smoke test dengan hasil kelulusan 100 persen serta nol kebocoran ke basis data produksi Turso Cloud.

---

## 2. Hasil Audit Awal dan Kondisi Sebelum Fase 2

Sebelum pengerjaan Fase 2, dilakukan audit menyeluruh terhadap skema basis data dan logika domain hasil Fase 1:

### Kondisi Model Kontributor dan Permohonan
- Model `Contributor` pada skema sebelumnya hanya menampung kolom kredensial dasar tanpa pelacakan riwayat masuk (`lastLoginAt`) dan belum terhubung secara langsung ke naskah (`Article`).
- Model `ContributorApplication` yang dibuat pada skema awal belum memuat kolom hukum penting: deklarasi usia dewasa (`adultConfirmedAt`), persetujuan pedoman kontributor (`guidelinesAccepted`), fokus bidang minat penulisan (`interests`), dan contoh tulisan (`sampleArticle`).
- Belum tersedia entitas undangan aktivasi khusus kontributor (`ContributorInvitation`). Pada Fase 1, undangan aktivasi baru dibuat untuk staf internal (`StaffUser`), sehingga calon kontributor yang disetujui belum memiliki mekanisme registrasi aman dengan token kriptografis ter-hash.
- Model `EditorialReview` memiliki kolom `reviewerId` bertipe NOT NULL yang merujuk ke `StaffUser`. Ketika kontributor eksternal mengajukan draf naskah (`SUBMIT_REVIEW`), belum ada staf manusia yang ditugaskan sebagai penelaah, sehingga ketiadaan nilai `reviewerId` dapat memicu kegagalan integritas basis data.

### Sesi dan Lapisan Perantara
- Session NextAuth pada Fase 1 telah mendukung klaim `accountType`, namun rute portal kontributor (`/kontributor/portal/*`) belum diproteksi oleh guard middleware khusus.
- Helper otorisasi API (`src/lib/api.ts`) baru memiliki `requireSession()` untuk staf, dan belum menyediakan helper verifikasi sesi kontributor (`requireContributorSession()`).

---

## 3. Rincian Perubahan Database dan Skema Prisma

Perubahan skema dilakukan secara aman pada berkas `prisma/schema.prisma` dan dimigrasikan menggunakan skrip migrasi mandiri ke `db/custom.db` serta `db/isolated-test.db`.

### Struktur Model Baru dan Pembaruan Skema
1. **Model `Contributor`:**
   - Menambahkan kolom `lastLoginAt DateTime?` untuk audit aktivitas masuk.
   - Menambahkan relasi `articles Article[] @relation("ContributorArticles")`.
   - Menambahkan relasi satu ke satu `application ContributorApplication?`.
2. **Model `ContributorApplication`:**
   - Menambahkan kolom `interests String?` (bidang minat tulisan).
   - Menambahkan kolom `sampleArticle String?` (contoh naskah atau motivasi).
   - Menambahkan kolom `adultConfirmedAt DateTime` (verifikasi usia minimal 18 tahun).
   - Menambahkan kolom `guidelinesAccepted Boolean @default(true)`.
   - Menambahkan kolom `status String @default("PENDING")` (PENDING, APPROVED, REJECTED).
   - Menghubungkan relasi keputusan ke `StaffUser` (`decidedById`, `decidedAt`, `decisionNote`).
   - Menghubungkan relasi aktivasi ke `ContributorInvitation` dan `Contributor`.
3. **Model Baru `ContributorInvitation`:**
   - `id String @id @default(cuid())`
   - `tokenHash String @unique` (hash SHA-256 dari token acak 32-byte)
   - `email String`
   - `name String`
   - `expiresAt DateTime` (masa berlaku 7 hari)
   - `acceptedAt DateTime?` (penanda token sekali pakai)
   - `revokedAt DateTime?` (pencabutan hak aktivasi oleh redaksi)
   - `applicationId String @unique` (relasi ke `ContributorApplication`)
   - `invitedById String` (relasi ke `StaffUser` yang menyetujui)
   - Indeks pada `tokenHash`, `email`, dan `expiresAt`.
4. **Pembaruan Model `Article`:**
   - Menambahkan kolom `contributorId String?` dan relasi ke `Contributor`.
   - Menambahkan indeks `@@index([contributorId])`.
5. **Penyesuaian Model `EditorialReview`:**
   - Mengubah kolom `reviewerId String?` menjadi opsional (nullable) untuk mengakomodasi aksi penyerahan naskah mandiri oleh kontributor sebelum redaktur staf ditugaskan.
   - Menerapkan pola rekonstruksi tabel 12 langkah SQLite untuk mengubah nullability kolom secara aman tanpa merusak data lama.

### Berkas Migrasi SQL Resmi
Berkas migrasi SQL tersimpan di:  
`prisma/migrations/20261111180000_fase_2_volunteer_and_contributor_migration/migration.sql`

Migrasi ini kompatibel penuh dengan SQLite lokal dan sintaks Turso Cloud/libSQL untuk kebutuhan penyebaran masa depan.

---

## 4. Alur Pengajuan Volunteer (Pendaftaran Publik)

Alur pengajuan kontributor eksternal dirancang transparan dan memenuhi prinsip integritas data:

1. **Endpoint Pengajuan:** `POST /api/public/contributor/apply`
2. **Halaman Publik:** `/kontributor/daftar`
3. **Validasi Formulir:**
   - Nama lengkap (minimal 2 karakter, maksimal 120 karakter).
   - Alamat email tervalidasi format email standar.
   - Biografi singkat, fokus bidang penulisan, portofolio URL, dan contoh naskah.
   - Deklarasi usia 18+ wajib dicentang (menghasilkan stempel waktu `adultConfirmedAt`).
   - Pernyataan persetujuan pedoman kontributor wajib dicentang (`guidelinesAccepted: true`).
4. **Penanganan Integritas dan Duplikasi:**
   - Jika terdapat permohonan berstatus `PENDING` dengan email yang sama, sistem menolak dengan kode galat `409 APPLICATION_PENDING`.
   - Jika alamat email telah terdaftar sebagai staf redaksi aktif atau kontributor aktif, sistem menolak dengan kode galat `409 EMAIL_IN_USE`.
   - Jika deklarasi usia 18+ tidak diberikan, sistem menolak dengan kode galat `422 VALIDATION_ERROR`.
5. **Pencegahan Akses Awal:**
   - Permohonan berstatus `PENDING` tidak menciptakan akun pada tabel `Contributor`.
   - Calon kontributor yang masih berstatus pending tidak dapat masuk ke sistem karena belum memiliki kredensial aktif.

---

## 5. Alur Peninjauan Redaksi dan Aktivasi Akun

Proses penerimaan kontributor berada sepenuhnya di bawah kendali Pemimpin Redaksi:

1. **Dashboard Penelaahan Studio:**
   - Halaman `/studio/applications` hanya dapat dibuka oleh akun `CHIEF_EDITOR`. Pengguna dengan peran `WRITER` atau tanpa sesi ditolak dengan kode `403 FORBIDDEN` atau `401 UNAUTHORIZED`.
   - Antarmuka menyajikan 4 metrik ringkasan: Total Permohonan, Menunggu Review, Disetujui, dan Ditolak.
   - Dilengkapi penyaringan status, pencarian nama/email/minat, serta modal peninjauan detail permohonan.
2. **Keputusan Editorial (`POST /api/studio/applications/[id]/decide`):**
   - **Tolak Permohonan (`decision: "REJECT"`):** Redaksi wajib atau dapat menyertakan catatan alasan penolakan. Permohonan berganti status menjadi `REJECTED` dan dicatat dalam jejak audit.
   - **Terima Permohonan (`decision: "APPROVE"`):** Sistem menghasilkan token acak 32-byte hex (64 karakter) melalui `crypto.randomBytes(32)`. Token disimpan ke tabel `ContributorInvitation` hanya dalam bentuk hash SHA-256 dengan batas waktu kedaluwarsa 7 hari.
   - Endpoint mengembalikan `activationToken` dan `activationUrl` (`/kontributor/aktivasi/[token]`) kepada Pemimpin Redaksi dengan modal salin tautan instan.
3. **Verifikasi Tautan Aktivasi (`GET /api/public/contributor/invitations/[token]`):**
   - Halaman `/kontributor/aktivasi/[token]` memverifikasi keabsahan token.
   - Jika token tidak ditemukan: mengembalikan `404 INVITATION_NOT_FOUND`.
   - Jika token telah kedaluwarsa (lebih dari 7 hari): mengembalikan `410 INVITATION_EXPIRED`.
   - Jika token telah dicabut: mengembalikan `410 INVITATION_REVOKED`.
   - Jika token sudah pernah digunakan: mengembalikan `410 ALREADY_ACCEPTED`.
4. **Klaim Akun (`POST /api/public/contributor/invitations/[token]/accept`):**
   - Calon kontributor menetapkan nama pengguna unik (huruf kecil, angka, garis bawah, minimal 3 karakter) dan kata sandi minimal 8 karakter.
   - Kata sandi di-hash menggunakan algoritma timing-safe scrypt.
   - Sistem membuat entitas `Contributor` dengan status `ACTIVE` dan stempel `adultConfirmedAt`.
   - Sistem membuat entitas `Person` bertipe `accountType: "EXTERNAL"` untuk byline publik.
   - Undangan ditandai `acceptedAt: now()`. Token tidak dapat digunakan untuk kedua kalinya.

---

## 6. Portal Kontributor dan Alur Naskah Mandiri

Portal Kontributor (`/kontributor/portal`) dibangun sebagai ruang kerja mandiri penulis eksternal yang terpisah dari Studio CMS staf:

### Perbandingan Kapabilitas Penulis (Staf) vs Kontributor (Volunteer)

| Aspek | Penulis (WRITER) | Volunteer (CONTRIBUTOR) |
|---|---|---|
| Status Organisasi | Staf redaksi tetap internal | Penulis independen eksternal |
| Model Akun | `StaffUser` | `Contributor` |
| Portal Kerja | `/studio/*` | `/kontributor/portal/*` |
| Pendaftaran Akun | Undangan langsung Pemred | Pengajuan publik dan penelaahan Pemred |
| Format Tulisan | Seluruh format (termasuk Berita) | Non-NEWS (Opini, Analisis, Explainer, Feature, Wawancara) |
| Pemilihan Rubrik | Bebas memilih rubrik aktif | Bebas memilih rubrik aktif |
| Akses Draf Lain | Draf milik sendiri | Naskah milik sendiri (terisolasi total) |
| Catatan Editorial | Melihat catatan internal staf | Hanya melihat catatan revisi yang ditujukan untuk penulis |
| Hak Publikasi | Tidak (melalui Pemred) | Tidak (melalui Pemred) |
| Penarikan Naskah | Melalui alur Studio | Mandiri saat status DRAFT, PENDING_REVIEW, REVISION_NEEDED |

### Fitur Portal Kontributor
1. **Dashboard Metrik (`/kontributor/portal`):**
   - Menampilkan metrik naskah mandiri: Total Naskah, Draf & Revisi, Sedang Ditelaah, dan Terbit.
   - Daftar naskah dilengkapi pencarian, penyaringan status, dan status indikator warna.
2. **Penulisan Naskah Baru (`/kontributor/portal/naskah/baru`):**
   - Judul, ringkasan gagasan (deck), pilihan desk rubrik aktif, dan deklarasi penggunaan AI (tanpa AI, asistif, substantif).
   - Pemilihan format dibatasi pada 5 format terkurasi. Pemilihan format `NEWS` ditolak oleh validasi Zod backend dengan kode `422`.
3. **Penyuntingan dan Rujukan Primer (`/kontributor/portal/naskah/[id]`):**
   - Kontributor dapat menyunting isi naskah dan ringkasan saat berstatus `DRAFT` atau `REVISION_NEEDED`.
   - Saat naskah berstatus `PENDING_REVIEW` atau `FACT_CHECK`, antarmuka terkunci dalam mode baca untuk menjaga integritas naskah selama ditinjau redaktur.
   - Penambahan dan penghapusan rujukan sumber primer (`/api/contributor/articles/[id]/sources`). Sumber baru selalu berstatus awal `UNVERIFIED` dan penanda kunci `isKeySource: false` (hanya Pemimpin Redaksi yang berhak memverifikasi sumber atau menetapkan sumber kunci).
   - Aksi transisi alur kerja mandiri: `SUBMIT_REVIEW` (mengajukan naskah), `RESUBMIT_REVIEW` (mengirim revisi), dan `WITHDRAW` (menarik naskah).
4. **Profil Penulis Publik (`/kontributor/portal/profil`):**
   - Melihat informasi akun terdaftar, email, status akun, dan tanggal registrasi.
   - Menyunting nama publik (byline) dan biografi kepengarangan yang sinkron secara atomik dengan entitas `Person`.

---

## 7. Otorisasi Server-Side dan Keamanan Batas Perimeter

Keamanan sistem ditegakkan secara berlapis (*defense-in-depth*):

1. **Klaim Sesi Otentikasi:**
   - Sesi NextAuth membedakan `accountType: "STAFF"` dengan peran `CHIEF_EDITOR` atau `WRITER`, dan `accountType: "CONTRIBUTOR"`.
   - Modul `src/lib/api.ts` menyediakan `requireContributorSession()` yang memvalidasi bahwa sesi adalah kontributor, akun kontributor ada di basis data, dan akun berstatus `ACTIVE`.
2. **Middleware Perimeter Guard (`src/middleware.ts`):**
   - Rute `/studio/*` (selain `/studio/login` dan `/studio/invitasi/*`) hanya dapat diakses oleh staf. Akun kontributor yang mencoba mengakses rute Studio diredirect atau ditolak.
   - Rute `/studio/applications` dilindungi sebagai rute khusus Pemimpin Redaksi (`chiefOnlyPaths`).
   - Rute `/kontributor/portal/*` hanya dapat diakses oleh kontributor aktif. Pengguna tanpa sesi diarahkan ke `/kontributor/login`, sedangkan staf redaksi yang mencoba mengakses portal kontributor dialihkan ke ruang kerja `/studio`.
3. **Pencegahan Akses Silang Naskah (Cross-Tenant Isolation):**
   - Seluruh endpoint naskah kontributor (`/api/contributor/articles/*`) memverifikasi kepemilikan naskah (`article.contributorId === user.id`).
   - Upaya membaca atau menyunting naskah milik kontributor lain secara otomatis menghasilkan galat `403 FORBIDDEN`.
4. **Perlindungan Catatan Internal Redaksi:**
   - Detail artikel yang dikirimkan ke peramban kontributor hanya memuat riwayat penelaahan formal (`reviews`). Catatan diskusi internal redaksi (`ReviewComment` dengan `authorVisible: false`) disaring secara ketat di backend dan tidak pernah dikirimkan ke klien kontributor.
5. **Penonaktifan Akun (Suspension):**
   - Pemimpin Redaksi dapat menonaktifkan akun kontributor sewaktu-waktu melalui `/api/studio/volunteers/[id]` (`status: "SUSPENDED"`).
   - Kontributor berstatus suspended langsung ditolak saat mencoba masuk, dan seluruh panggilan API yang membutuhkan sesi kontributor aktif otomatis ditolak dengan kode `403 FORBIDDEN`.

---

## 8. Hasil Pengujian dan Verifikasi Regresi

Sistem telah diuji secara komprehensif menggunakan isolated test database (`db/isolated-test.db`).

### 1. Test Suite Khusus Volunteer (`tests/volunteer-flow.test.ts`)
Total 27 pengujian otomatis lulus 100 persen:
- Pengajuan permohonan volunteer publik dengan deklarasi usia 18+ (201): LULUS
- Penolakan permohonan duplikat berstatus pending (409 APPLICATION_PENDING): LULUS
- Penolakan permohonan tanpa deklarasi usia 18+ (422): LULUS
- Pemohon pending tidak dapat melakukan login: LULUS
- Penulis staf (non-Chief) ditolak mengakses daftar permohonan (403): LULUS
- Pemimpin Redaksi dapat melihat daftar permohonan dan metrik overview (200): LULUS
- Pemimpin Redaksi dapat melihat rincian lengkap permohonan (200): LULUS
- Pemimpin Redaksi dapat menolak permohonan dengan catatan alasan (200): LULUS
- Pemimpin Redaksi dapat menyetujui permohonan dan menerbitkan token aktivasi (200): LULUS
- Verifikasi keabsahan token aktivasi publik (200): LULUS
- Penolakan aktivasi jika kata sandi kurang dari 8 karakter (422): LULUS
- Aktivasi akun kontributor dengan penetapan username dan password (200): LULUS
- Token aktivasi hanya dapat digunakan sekali (klaim kedua 410 ALREADY_ACCEPTED): LULUS
- Penolakan token aktivasi yang telah kedaluwarsa (410 INVITATION_EXPIRED): LULUS
- Kontributor aktif dapat login dan mengakses dashboard portal (200): LULUS
- Kontributor dilarang keras mengakses endpoint Studio CMS staf (403): LULUS
- Kontributor dilarang membuat naskah berformat NEWS (422): LULUS
- Kontributor dapat membuat naskah OPINION / ANALYSIS sebagai DRAFT (201): LULUS
- Kontributor dapat membaca dan menyunting naskah draf miliknya (200): LULUS
- Kontributor dapat menambahkan dan menghapus sumber rujukan pada naskah draf (201 & 200): LULUS
- Kontributor tidak dapat mengakses naskah milik kontributor lain (403): LULUS
- Kontributor dilarang mempublikasikan naskah secara langsung (403): LULUS
- Kontributor dapat mengajukan naskah ke antrean redaksi (SUBMIT_REVIEW -> PENDING_REVIEW): LULUS
- Kontributor dapat menarik naskah miliknya dari antrean telaah (WITHDRAW -> WITHDRAWN): LULUS
- Siklus peninjauan revisi oleh Pemred dan pengiriman ulang revisi oleh kontributor (200): LULUS
- Kontributor dapat memperbarui nama publik dan biografi (200): LULUS
- Pemimpin Redaksi dapat menonaktifkan dan mengaktifkan kembali akun kontributor (200): LULUS

### 2. Test Suite Regresi Menyeluruh (`bun test`)
Seluruh 116 pengujian dalam repositori lulus tanpa galat:
- `tests/volunteer-flow.test.ts`: 27 pass
- `tests/staff-management.test.ts`: 13 pass
- `tests/regression.test.ts`: 40 pass
- `tests/auth-identifier.test.ts`: 7 pass
- `tests/backend-remediation.test.ts`: 7 pass
- `tests/content.test.ts`: 4 pass
- `tests/db.test.ts`: 2 pass
- `tests/isolation-guard.test.ts`: 4 pass
- `tests/password.test.ts`: 3 pass
- `tests/workflow.test.ts`: 5 pass
- `tests/api-key.test.ts`: 2 pass
- **Total: 116 lulus, 0 gagal, 315 asersi terpenuhi.**

### 3. Pengecekan Kualitas Kode
- `bun run typecheck` (`tsc --noEmit`): 0 galat tipe.
- `bun run lint` (`eslint .`): 0 galat linting, 0 peringatan.
- `bun run build`: Berhasil mengompilasi 41 rute Turbopack ke bundel produksi mandiri (*standalone*).

### 4. Pemeriksaan Smoke Test Mandiri (`bun run scripts/smoke-test.ts`)
Total 32 dari 32 pemeriksaan smoke test lulus dengan sempurna.

---

## 9. Bukti Isolasi Mutlak Basis Data Produksi (Zero Production Leakage)

Pemeriksaan keamanan dilakukan sebelum dan sesudah pelaksanaan pengujian untuk membuktikan bahwa lingkungan produksi Turso Cloud tidak pernah disentuh:

```
[TARGET ISOLATION] Active Test DB URL: file:D:/Projects/verax/db/isolated-test.db
[TURSO CLOUD READ-ONLY CHECK] Baseline Production Articles: 0
...
--- 14. Target Isolation Guard ---
  ✓ [PASS] Turso Cloud Production strictly untouched (zero leakage) (Initial: 0, Final: 0)
```

Seluruh pengujian dijalankan pada database terisolasi lokal `db/isolated-test.db`. Kredensial, data artikel, dan konfigurasi Turso Cloud produksi tetap berada dalam kondisi aman dan tidak berubah.

---

## 10. Catatan Kesiapan dan Batasan Arsitektural untuk Fase 3

Sebagai persiapan menuju Fase 3 (Developer Portal dan Integrasi Agen AI):

1. **Pemisahan Asal Naskah (`Article.origin`):**
   - Kolom `origin` kini membedakan tiga sumber naskah secara eksplisit: `NEWSROOM` (staf redaksi), `CONTRIBUTOR` (volunteer eksternal), dan `INGESTION_API` (kiriman agen AI eksternal).
   - Pada Fase 3, agen AI hanya diizinkan mengirim naskah melalui `INGESTION_API` dan dilarang keras meniru identitas akun `StaffUser` maupun `Contributor`.
2. **Prinsip Kendali Editorial Manusia Mutlak:**
   - Naskah yang berasal dari `INGESTION_API` tidak boleh memiliki status `PUBLISHED` secara otomatis. Semua naskah agen AI harus masuk ke antrean `PENDING_REVIEW` untuk ditelaah dan diputuskan oleh Pemimpin Redaksi manusia.
3. **Penyimpanan Token Kriptografis:**
   - Pola penyimpanan token aktivasi pada `ContributorInvitation` (hanya menyimpan hash SHA-256 dan membatasi masa berlaku) harus diadopsi saat mengelola rahasia API (*API Client Secrets*) pada Fase 3. Secret kunci API tidak boleh disimpan dalam bentuk teks biasa (*plain text*).
4. **Isolasi Log Audit:**
   - Jejak audit (`AuditEvent`) mencatat `actorType: "CONTRIBUTOR"` secara terpisah. Pada Fase 3, jejak audit agen AI harus menggunakan `actorType: "API_CLIENT"` untuk menjamin keterlacakan penuh antara aktivitas manusia dan otomasi mesin.

---

Laporan ini disusun dengan standar kejujuran teknis penuh dan menyatakan bahwa implementasi Fase 2 telah selesai secara menyeluruh serta terverifikasi pada lingkungan kerja lokal.
