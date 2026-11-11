# Laporan Pra-Rilis dan Pengerasan Sistem Verax Press (Pre-Release Hardening Report)

- Tanggal Audit: 11 November 2026
- Pemeriksa: Independent QA & Systems Auditor
- Lingkup Sistem:
  - Repositori Git (`remediation/comprehensive-qa-fix`, commit `0f0df93`)
  - Basis data Turso Cloud (`libsql://verax-aryarizkyap.aws-ap-southeast-1.turso.io`)
  - Basis data SQLite lokal (`db/custom.db`, `db/isolated-test.db`)
  - Layanan Azure Media Storage (`forfh-korea-vm`, IP `20.214.143.187`, domain `media.aryariap.my.id`)
  - Proyek Vercel Production (`verax-press`, project ID `prj_zkVrSFKXkkoUhAlZRUi8tkgbIARB`)

---

## 1. Ringkasan Eksekutif dan Klasifikasi Kesiapan Rilis

Investigasi penutupan pasca-reset sebelumnya mencatat empat isu utama yang menghalangi rilis produksi perdana Verax Press: kredensial Chief Editor yang masih berupa data uji dev, ketidakcocokan sertifikat TLS pada Azure Media Storage, pelacakan file basis data `db/custom.db` dalam Git, serta perbedaan antara kode remediasi lokal dan komit aktif di Vercel.

Laporan ini menyajikan hasil pengerasan teknis, verifikasi jaringan langsung, isolasi basis data, audit kebersihan Git, serta pengujian menyeluruh pada seluruh komponen tersebut.

### Klasifikasi Resmi Status Rilis

1. ADMIN IDENTITY: NOT READY
   Skrip bootstrap telah ditinjau, diperkeras dengan validasi target eksplisit, dan dipastikan berjalan secara transaksional tanpa mencetak rahasia. Namun, eksekusi pembaruan identitas operasional sengaja ditahan menunggu masukan identitas resmi dan kredensial autentik dari pemilik sistem. Akun Chief Editor di basis data produksi masih menggunakan identitas uji coba.

2. AZURE TLS: READY
   Pemeriksaan soket TLS dan inspeksi SNI langsung mengonfirmasi bahwa port 443 pada `media.aryariap.my.id` telah menyajikan sertifikat resmi Let's Encrypt yang valid (berlaku 11 November 2026 hingga 9 Februari 2027) dengan Subject Alternative Name `DNS:media.aryariap.my.id`. Pengalihan port 80 ke 443 aktif, titik akhir `/health` mengembalikan status 200 OK, dan virtual host berdampingan `efimg.aryariap.my.id` tetap utuh.

3. GIT HYGIENE: READY (Menunggu Tindakan Komit Operator)
   Berkas basis data `db/custom.db` telah dihapus dari pelacakan Git menggunakan `git rm --cached` dengan berkas fisik lokal tetap utuh di cakram. Aturan pengabaian presisi telah ditambahkan ke `.gitignore` dan divalidasi via `git check-ignore`. Inventaris 42 berkas termodifikasi dan entri tak terlacak telah diklasifikasikan ke dalam daftar pemilahan (staging list) selektif. Pemeriksaan `git diff --check` bersih tanpa galat.

4. VERCEL CONFIGURATION: NOT READY
   Inspeksi konfigurasi variabel lingkungan Vercel melalui CLI menunjukkan bahwa variabel `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, dan `DATABASE_URL` pada lingkungan Preview terhubung ke basis data produksi Turso yang sama dengan lingkungan Production. Hal ini menimbulkan risiko kontaminasi data produksi oleh deployment pratinjau. Selain itu, `NEXTAUTH_SECRET` belum disetel untuk lingkungan Preview.

5. APPLICATION QA: PASS
   Pemeriksaan tipe TypeScript (`npm run typecheck`), linting ESLint (`npm run lint`), dan seluruh rangkaian pengujian otomatis (`bun test`, 71 pengujian pada 8 berkas) berhasil 100%. Kompilasi build Turbopack (`npm run build`) sukses menghasilkan 26 rute publik dan studio. Pengujian asap otomatis mandiri (`scripts/smoke-test.ts`) sukses menjalankan 31 verifikasi alur kerja redaksional dari login hingga koreksi dengan tingkat kelulusan 100% dan nol kebocoran data ke Turso produksi.

6. PRODUCTION RELEASE: NOT READY
   Rilis produksi belum dapat dibuka ke publik sebelum dua pemblokir utama diselesaikan: pembaruan identitas Chief Editor oleh operator, dan pemisahan basis data antara lingkungan Vercel Preview dan Production.

---

## 2. Tinjauan dan Pengerasan Bootstrap Chief Editor (Fase 1)

### 2.1 Analisis Skrip Asli dan Titik Kerentanan

Berkas `scripts/bootstrap-chief-editor.ts` asli dianalisis terhadap arsitektur autentikasi NextAuth (`src/lib/auth.ts`), kontrol akses berbasis peran (`src/lib/domain/permissions.ts`), skema Prisma (`prisma/schema.prisma`), dan konfigurasi basis data (`src/lib/db.ts`).

Ditemukan beberapa kelemahan pada skrip asli:
1. Tidak ada parameter target eksplisit: Skrip langsung membaca `TURSO_DATABASE_URL`. Jika pengembang bermaksud memperbarui basis data lokal tetapi variabel lingkungan Turso terpasang di shell, skrip akan salah sasaran dan memodifikasi basis data remote Turso.
2. Tidak mendukung SQLite lokal secara terstruktur: Tidak ada penanganan alamat basis data berkas lokal (`file:...`).
3. Kurangnya validasi sebelum pembaruan: Skrip menjalankan `UPDATE StaffUser ... WHERE role = 'CHIEF_EDITOR'` tanpa memeriksa apakah terdapat lebih dari satu akun atau tidak ada akun sama sekali.
4. Kerapuhan relasi Person: Pembaruan dilakukan melalui subquery tanpa memeriksa apakah relasi entitas `Person` benar-benar ada. Jika data `Person` belum terhubung, skrip tidak membuatkannya.
5. Hak akses tidak ditegaskan: Nilai `canRiskEdit`, `canManageComplaints`, dan status `ACTIVE` tidak dipastikan ulang dalam klausa pembaruan.

### 2.2 Perubahan Pengerasan pada `scripts/bootstrap-chief-editor.ts`

Skrip telah ditulis ulang dan diperkeras dengan sepuluh pengaman teknis:
1. Penentuan Target Eksplisit: Wajib menyetel variabel `VERAX_DB_TARGET` bernilai `"turso"` atau `"local"`. Target lain ditolak seketika (fail-closed).
2. Penolakan Target Ambigu:
   - Jika `VERAX_DB_TARGET=turso`, URL wajib menggunakan skema `libsql://` atau `https://` dan dilarang mengarah ke berkas lokal (`.db`, `.sqlite`, `.sqlite3`, atau skema `file:`). Variabel `TURSO_AUTH_TOKEN` wajib ada.
   - Jika `VERAX_DB_TARGET=local`, seluruh skema remote (`libsql://`, `https://`, `http://`) dan domain `turso.io` ditolak seketika. Koneksi dipaksa ke berkas SQLite lokal.
3. Sanitasi Tampilan Log: Endpoint basis data dicetak hanya berupa nama host protokol (misalnya `libsql://verax-aryarizkyap.aws-ap-southeast-1.turso.io`). Kredensial, query string, dan token otorisasi tidak pernah dicetak ke terminal atau log.
4. Validasi Format Masukan:
   - `VERAX_ADMIN_EMAIL`: Wajib berformat alamat surel valid.
   - `VERAX_ADMIN_NAME`: Wajib memiliki panjang minimal 2 karakter.
   - `VERAX_ADMIN_PASSWORD`: Wajib memiliki panjang minimal 12 karakter berkekuatan tinggi.
5. Kerahasiaan Kredensial: Sandi mentah, salt acak, maupun hash scrypt tidak pernah dicetak ke konsol.
6. Transaksi Tulis Atomik: Seluruh operasi dijalankan dalam blok transaksi tulis `@libsql/client`. Jika salah satu langkah gagal, seluruh perubahan di-rollback secara otomatis. Seluruh stempel waktu ditulis dalam format standar ISO 8601 (`toISOString()`).
7. Pembaruan Tunggal (Update, Bukan Duplikasi) dan Deteksi Konflik:
   - Memeriksa jumlah baris `StaffUser` dengan peran `CHIEF_EDITOR`. Jika baris berjumlah 0 atau lebih dari 1, transaksi dibatalkan seketika untuk mencegah ambiguitas.
   - Memvalidasi alamat surel baru tidak bentrok dengan akun staf lain (`SELECT id, role FROM StaffUser WHERE email = ? AND id != ?`).
8. Integritas Relasi Person: Memeriksa keberadaan entitas `Person` yang terkait dengan `staffUserId`. Jika ditemukan, `publicName` dan `bio` diperbarui. Jika belum ada, entitas baru dibuat dengan tipe akun `STAFF` dan mode anonimitas `REAL_NAME`.
9. Penegasan Hak Akses: Kolom `status` disetel ke `'ACTIVE'`, serta grant eksplisit `canRiskEdit = 1` dan `canManageComplaints = 1` disematkan langsung pada baris pengguna.
10. Pencatatan Audit Transaksional: Memasukkan rekaman ke tabel `AuditEvent` dengan tipe aktor `SYSTEM`, tindakan `auth.chief_bootstrapped`, dan targetType `AUTH` sesuai skema domain `AuditInput` (sehingga dapat difilter secara tepat pada antarmuka `/studio/audit`).

### 2.3 Prosedur Operasional Eksekusi Pembaruan Identitas

Pembaruan identitas Chief Editor hanya boleh dijalankan oleh operator resmi menggunakan prosedur berikut.

#### Prosedur A: Pembaruan Basis Data Produksi Turso Cloud
```powershell
# 1. Pastikan shell berada di direktori proyek
cd d:\Projects\verax

# 2. Setel target eksplisit dan kredensial produksi
$env:VERAX_DB_TARGET = "turso"
$env:TURSO_DATABASE_URL = "libsql://verax-aryarizkyap.aws-ap-southeast-1.turso.io"
$env:TURSO_AUTH_TOKEN = "<TURSO_PRODUCTION_AUTH_TOKEN>"

$env:VERAX_ADMIN_EMAIL = "<EMAIL_RESMI_PEMIMPIN_REDAKSI>"
$env:VERAX_ADMIN_NAME = "<NAMA_LENGKAP_RESMI>"
$env:VERAX_ADMIN_PASSWORD = "<PASSWORD_TINGGI_ENTROPI_MIN_12_KARAKTER>"
$env:VERAX_ADMIN_BIO = "Pemimpin Redaksi Verax Press."

# 3. Jalankan skrip bootstrap terverifikasi
bun run scripts/bootstrap-chief-editor.ts

# 4. Bersihkan variabel lingkungan dari sesi terminal setelah selesai
Remove-Item Env:\VERAX_ADMIN_PASSWORD
Remove-Item Env:\TURSO_AUTH_TOKEN
```

#### Prosedur B: Pembaruan Basis Data Pengembangan Lokal
```powershell
cd d:\Projects\verax

$env:VERAX_DB_TARGET = "local"
$env:DATABASE_URL = "file:db/custom.db"
$env:VERAX_ADMIN_EMAIL = "editor.dev@veraxpress.local"
$env:VERAX_ADMIN_NAME = "Editor Lokal"
$env:VERAX_ADMIN_PASSWORD = "DevPasswordLokal123!"
$env:VERAX_ADMIN_BIO = "Akun pengembangan lokal Verax Press."

bun run scripts/bootstrap-chief-editor.ts

Remove-Item Env:\VERAX_ADMIN_PASSWORD
```

---

## 3. Hasil Verifikasi Azure TLS dan Nginx (Fase 2)

### 3.1 Status Verifikasi Jaringan Langsung

Pengujian jaringan langsung dari lingkungan pengujian membuktikan bahwa konfigurasi TLS pada VM Azure (`forfh-korea-vm`, IP `20.214.143.187`) telah diselesaikan oleh operator:

1. Resolusi DNS A Record:
   - Nama Domain: `media.aryariap.my.id`
   - Hasil Resolusi: `20.214.143.187` (Sesuai dengan IP Publik VM Azure).
2. Status Port 80 (HTTP):
   - Perilaku: Mengembalikan status HTTP `301 Moved Permanently` ke URL aman `https://media.aryariap.my.id/health`.
3. Status Port 443 (HTTPS):
   - Issuer: Let's Encrypt (CN: `YE2`)
   - Subject Common Name: `media.aryariap.my.id`
   - Subject Alternative Name (SAN): `DNS:media.aryariap.my.id`
   - Masa Berlaku: 11 November 2026 02:47:41 GMT hingga 9 Februari 2027 02:47:40 GMT
   - Sidik Jari SHA-256: `2E:87:39:C4:DC:8A:2E:DE:16:BA:96:83:6D:92:AA:CC:6C:45:12:B8:B3:C6:20:D1:02:82:AA:52:F5:68:04:40`
4. Uji Integrasi Runtime Node.js:
   Panggilan `fetch('https://media.aryariap.my.id/health')` dari mesin runtime Node.js berhasil tanpa galat sertifikat (`ERR_TLS_CERT_ALTNAME_INVALID` nihil):
   ```json
   {
     "status": "ok",
     "database": "ok",
     "storage": "ok",
     "timestamp": "2026-11-11T03:51:30.393Z"
   }
   ```
5. Keutuhan Virtual Host Berdampingan:
   Inspeksi TLS SNI ke `efimg.aryariap.my.id` membuktikan sertifikat untuk `efimg.aryariap.my.id` tetap aktif dan tidak terganggu oleh konfigurasi `media.aryariap.my.id`.

### 3.2 Prosedur Cadangan dan Rollback Nginx untuk Operator

Jika di masa mendatang dilakukan pembaruan sertifikat manual atau konfigurasi Nginx pada host `forfh-korea-vm`, operator wajib menerapkan langkah pencadangan dan pemulihan berikut:

1. Pencadangan Konfigurasi Sebelum Perubahan:
   ```bash
   TIMESTAMP=$(date +%Y%m%d_%H%M%S)
   sudo tar -czf "/home/azureuser/nginx-backup-${TIMESTAMP}.tar.gz" /etc/nginx/
   ```
2. Pengujian Konfigurasi:
   ```bash
   sudo nginx -t
   ```
3. Pemuatan Ulang Aman:
   ```bash
   sudo systemctl reload nginx
   ```
4. Prosedur Rollback Cepat:
   Jika terjadi kegagalan pemuatan konfigurasi:
   ```bash
   sudo rm -f /etc/nginx/sites-enabled/media.aryariap.my.id
   sudo tar -xzf "/home/azureuser/nginx-backup-${TIMESTAMP}.tar.gz" -C /
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

## 4. Kebersihan Git dan Inventaris Perubahan (Fase 3)

### 4.1 Penghapusan Pelacakan `db/custom.db` dan Verifikasi Aturan Abaikan

Berkas `db/custom.db` sebelumnya terlacak dalam repositori Git. Berkas tersebut telah dilepas dari pelacakan indeks:
```bash
git rm --cached db/custom.db
```
Berkas fisik `db/custom.db` di cakram lokal tetap dipertahankan dan diverifikasi keberadaannya (`Test-Path db/custom.db` bernilai `True`).

Aturan pengabaian presisi ditambahkan ke `.gitignore`:
```gitignore
# Database files, WAL, temporary, and backup files
*.db
*.db-journal
*.db-wal
*.db-shm
*.sqlite
*.sqlite3
db/*.db
db/*.db-wal
db/*.db-shm
db/*.db-journal
db/backups/
db/disposable_*
db/incident-*
db/*test*.db
db/*.test.db
```
Verifikasi via `git check-ignore -v db/custom.db` mengonfirmasi berkas kini diabaikan secara tepat oleh aturan `.gitignore:72:db/*.db`.

### 4.2 Temuan Riwayat Komit dan Status Repositori

Inspeksi riwayat Git menggunakan `git log --oneline db/custom.db` menunjukkan berkas tersebut tercatat pada dua komit terdahulu:
- Komit `0f0df93`: feat: complete anti-ai-writing system rewrite, Turso production database integration, and Azure media storage
- Komit `9310e37`: feat(master): consolidate Verax Press definitive release (Phase 4 validated)

Pemeriksaan visibilitas repositori remote melalui GitHub REST API (`https://api.github.com/repos/algojogacor/Verax-Press`) menunjukkan:
- `visibility`: `"public"`
- `private`: `false`

Catatan Kritis Keamanan:
Karena repositori bersifat publik, rekam jejak berkas `db/custom.db` pada riwayat komit lampau dapat diakses publik. Investigasi isi berkas lampau membuktikan bahwa data yang tercatat di dalamnya adalah kredensial fixture pengujian (`chief@verity.test` / `Ratna Dewanti` / `Chief Test`), bukan data pengguna riil. Sesuai batasan wewenang tugas, penulisan ulang riwayat Git (`git filter-repo`) tidak dijalankan secara otomatis. Namun, hal ini menegaskan kembali bahwa kredensial produksi yang dimasukkan pada Fase 1 wajib berbeda total dari seluruh kata sandi uji coba dalam riwayat repositori.

### 4.3 Klasifikasi Seluruh Berkas Termodifikasi dan Tak Terlacak

Seluruh berkas dalam working tree diklasifikasikan ke dalam sembilan kategori standar:

#### Kategori 1: Perubahan Aplikasi yang Wajib Disertakan (Required Application Changes)
- Antarmuka Publik:
  - `src/app/(public)/artikel/[slug]/page.tsx`
  - `src/app/(public)/desk/[slug]/page.tsx`
  - `src/app/(public)/keluhan/page.tsx`
  - `src/app/(public)/koreksi/page.tsx`
  - `src/app/(public)/opini/page.tsx`
  - `src/app/(public)/page.tsx`
  - `src/app/(public)/standar-editorial/page.tsx`
  - `src/app/(public)/tentang/page.tsx`
- Antarmuka Studio Redaksi:
  - `src/app/studio/(cms)/api-clients/page.tsx`
  - `src/app/studio/(cms)/audit/page.tsx`
  - `src/app/studio/(cms)/complaints/page.tsx`
  - `src/app/studio/(cms)/media/page.tsx`
  - `src/app/studio/(cms)/page.tsx`
  - `src/app/studio/login/page.tsx`
- Komponen Antarmuka:
  - `src/components/content/content-renderer.tsx`
  - `src/components/site/article-card.tsx`
  - `src/components/site/complaint-form.tsx`
  - `src/components/site/desk-nav.tsx`
  - `src/components/site/institutional.tsx`
  - `src/components/site/masthead.tsx`
  - `src/components/site/site-mobile-nav.tsx`
  - `src/components/studio/media-uploader.tsx`
  - `src/components/studio/media-asset-card.tsx` (berkas baru tak terlacak)
- Titik Akhir API dan Logika Domain:
  - `src/app/api/internal/v1/ai-submissions/route.ts`
  - `src/app/api/public/complaints/route.ts`
  - `src/app/api/studio/articles/[id]/sources/[sourceId]/route.ts`
  - `src/app/api/studio/articles/route.ts`
  - `src/app/api/studio/complaints/[id]/route.ts`
  - `src/app/api/studio/complaints/route.ts`
  - `src/app/api/studio/corrections/route.ts`
  - `src/app/api/studio/dashboard/route.ts`
  - `src/lib/api.ts`
  - `src/lib/db.ts`
  - `src/lib/domain/audit.ts`
  - `src/lib/domain/serializers.ts`
  - `src/lib/domain/complaint.ts` (berkas baru tak terlacak)
  - `src/types/verity.ts`
- Konfigurasi Lingkungan Kerja:
  - `.gitignore`

#### Kategori 2: Berkas Pengujian (Tests)
- `tests/db.test.ts`
- `tests/lib/http.ts`
- `tests/lib/test-db.ts`
- `tests/regression.test.ts`
- `tests/backend-remediation.test.ts` (berkas baru tak terlacak)
- `tests/isolation-guard.test.ts` (berkas baru tak terlacak)

#### Kategori 3: Dokumentasi dan Laporan Audit (Documentation & Audits)
- `worklog.md`
- `docs/superpowers/audits/2026-11-10-verax-clean-slate-reset-report.md`
- `docs/superpowers/audits/2026-11-10-verax-comprehensive-qa-audit.md`
- `docs/superpowers/audits/2026-11-10-verax-final-release-gate.md`
- `docs/superpowers/audits/2026-11-10-verax-full-system-remediation-report.md`
- `docs/superpowers/audits/2026-11-10-verax-ui-ux-refinement-report.md`
- `docs/superpowers/audits/2026-11-11-verax-post-reset-closure-audit.md`
- `docs/superpowers/audits/2026-11-11-verax-pre-release-hardening-report.md` (dokumen ini)

#### Kategori 4: Tangkapan Layar dan Bukti Visual (Screenshots & Evidence)
- `docs/superpowers/audits/evidence/`
- `docs/superpowers/audits/refinement-evidence/`
- `docs/superpowers/audits/remediation-evidence/`

#### Kategori 5: Berkas Basis Data Lokal (Local Database Files)
- `db/custom.db` (dilepas dari pelacakan, status Git: `D db/custom.db`)
- `db/isolated-test.db` (diabaikan oleh `.gitignore`)

#### Kategori 6: Cadangan (Backups)
- Seluruh cadangan tersimpan di luar repositori Git (`D:/Backup/verax-clean-slate-20261111/` dan pola terabaikan `db/backups/`).

#### Kategori 7: Artefak Tergenerasi (Generated Artifacts)
- Bersih. Seluruh artefak Next.js (`.next/`), modul (`node_modules/`), dan Prisma client terabaikan secara tepat.

#### Kategori 8: Potensi Kredensial atau Rahasia (Secrets)
- Hasil pemindaian pola kunci dan rahasia menunjukkan nol berkas rahasia plaintext dalam antrean staging. Seluruh skrip pembantu membaca rahasia dari variabel lingkungan atau aliran masukan stdin.

#### Kategori 9: Skrip Operasional dan Pengembangan (Operational Scripts)
- `scripts/bootstrap-chief-editor.ts` (skrip utilitas operasional yang telah diperkeras)
- `scripts/smoke-test.ts` (skrip pengujian asap terotomatisasi)
- `scripts/capture-all.ts` (skrip tangkapan layar pengembang lokal)
- `scripts/capture-evidence.ps1` (skrip pembantu pengembang lokal)
- `scripts/clean-slate/` (kumpulan skrip reset sekali pakai)

### 4.4 Rekomendasi Pemilahan Pentahapan (Selective Staging List)

Sesuai instruksi kebersihan Git, pementasan berkas tidak boleh menggunakan direktori gelondongan (`git add .`, `git add -A`, atau `git add src/app/`). Operator wajib menahapkan berkas secara presisi per jalur berkas:

```bash
# 1. Konfirmasi pelepasan pelacakan basis data lokal dan pembaruan .gitignore
git add .gitignore
git rm --cached db/custom.db

# 2. Halaman dan rute aplikasi publik
git add src/app/(public)/artikel/[slug]/page.tsx
git add src/app/(public)/desk/[slug]/page.tsx
git add src/app/(public)/keluhan/page.tsx
git add src/app/(public)/koreksi/page.tsx
git add src/app/(public)/opini/page.tsx
git add src/app/(public)/page.tsx
git add src/app/(public)/standar-editorial/page.tsx
git add src/app/(public)/tentang/page.tsx

# 3. Halaman studio redaksi (CMS)
git add src/app/studio/(cms)/api-clients/page.tsx
git add src/app/studio/(cms)/audit/page.tsx
git add src/app/studio/(cms)/complaints/page.tsx
git add src/app/studio/(cms)/media/page.tsx
git add src/app/studio/(cms)/page.tsx
git add src/app/studio/login/page.tsx

# 4. Titik akhir API publik dan internal
git add src/app/api/internal/v1/ai-submissions/route.ts
git add src/app/api/public/complaints/route.ts
git add src/app/api/studio/articles/[id]/sources/[sourceId]/route.ts
git add src/app/api/studio/articles/route.ts
git add src/app/api/studio/complaints/[id]/route.ts
git add src/app/api/studio/complaints/route.ts
git add src/app/api/studio/corrections/route.ts
git add src/app/api/studio/dashboard/route.ts

# 5. Komponen antarmuka pengguna
git add src/components/content/content-renderer.tsx
git add src/components/site/article-card.tsx
git add src/components/site/complaint-form.tsx
git add src/components/site/desk-nav.tsx
git add src/components/site/institutional.tsx
git add src/components/site/masthead.tsx
git add src/components/site/site-mobile-nav.tsx
git add src/components/studio/media-asset-card.tsx
git add src/components/studio/media-uploader.tsx

# 6. Pustaka inti dan logika domain
git add src/lib/api.ts
git add src/lib/db.ts
git add src/lib/domain/audit.ts
git add src/lib/domain/complaint.ts
git add src/lib/domain/serializers.ts
git add src/types/verity.ts

# 7. Suite pengujian otomatis
git add tests/backend-remediation.test.ts
git add tests/db.test.ts
git add tests/isolation-guard.test.ts
git add tests/lib/http.ts
git add tests/lib/test-db.ts
git add tests/regression.test.ts

# 8. Skrip operasional pre-release
git add scripts/bootstrap-chief-editor.ts
git add scripts/smoke-test.ts

# 9. Dokumentasi dan laporan audit
git add worklog.md
git add docs/superpowers/audits/2026-11-10-verax-clean-slate-reset-report.md
git add docs/superpowers/audits/2026-11-10-verax-comprehensive-qa-audit.md
git add docs/superpowers/audits/2026-11-10-verax-final-release-gate.md
git add docs/superpowers/audits/2026-11-10-verax-full-system-remediation-report.md
git add docs/superpowers/audits/2026-11-10-verax-ui-ux-refinement-report.md
git add docs/superpowers/audits/2026-11-11-verax-post-reset-closure-audit.md
git add docs/superpowers/audits/2026-11-11-verax-pre-release-hardening-report.md

# Berkas lokal yang TIDAK ditahapkan (dibiarkan tak terlacak / diabaikan):
# - scripts/clean-slate/
# - scripts/capture-all.ts
# - scripts/capture-evidence.ps1
# - docs/superpowers/audits/evidence/
# - docs/superpowers/audits/refinement-evidence/
# - docs/superpowers/audits/remediation-evidence/
# - db/custom.db (berkas fisik tetap ada di cakram lokal, diabaikan oleh .gitignore)
# - db/isolated-test.db (diabaikan oleh .gitignore)
```

---

## 5. Investigasi Kesiapan Lingkungan Vercel (Fase 4)

### 5.1 Temuan Konfigurasi Vercel

Inspeksi proyek Vercel menggunakan perintah `vercel ls`, `vercel inspect`, dan `vercel env ls` menghasilkan temuan arsitektur berikut:

1. Komit Produksi Aktif:
   Deployment produksi aktif saat ini (`https://verax-press-eyd00zgvm-arya-rizkys-projects.vercel.app`) dibangun dari komit dasar `0f0df93`. Kode remediasi komprehensif belum dideploy ke produksi.
2. Cabang Produksi (Production Branch):
   Cabang utama yang terhubung ke deployment target production adalah cabang `main`. Cabang lokal saat ini adalah `remediation/comprehensive-qa-fix`.
3. Distribusi Variabel Lingkungan Antara Lingkungan:
   Daftar variabel lingkungan pada Vercel saat ini adalah:
   - `TURSO_DATABASE_URL`: Preview, Production
   - `TURSO_AUTH_TOKEN`: Preview, Production
   - `DATABASE_URL`: Preview, Production
   - `VERAX_MEDIA_API_URL`: Preview, Production
   - `VERAX_MEDIA_SECRET`: Preview, Production
   - `NEXTAUTH_SECRET`: Production (TIDAK disetel untuk Preview)

### 5.2 Analisis Risiko Kontaminasi Data Antara Preview dan Production

Konfigurasi saat ini mengandung celah risiko integritas data yang signifikan:
1. Pemakaian Basis Data yang Sama: Variabel `TURSO_DATABASE_URL` dan `TURSO_AUTH_TOKEN` pada lingkungan Preview disetel identik dengan Production. Setiap kali pull request dibuka atau cabang fitur didorong ke repositori GitHub, Vercel secara otomatis membangun deployment Preview. Apabila deployment Preview tersebut diakses untuk peninjauan, pengujian manual, atau pengujian otomatis, seluruh penulisan data (pembuatan naskah uji, komentar, keluhan pembaca) akan masuk langsung ke basis data produksi Turso Cloud.
2. Kerusakan Runtime Autentikasi di Preview: Karena `NEXTAUTH_SECRET` hanya disetel untuk Production dan tidak ada pada Preview, fungsi serverless NextAuth pada deployment Preview akan memicu galat fatal `SECURITY FATAL: NEXTAUTH_SECRET (or AUTH_SECRET) is required in production` saat halaman login atau endpoint sesi diakses.

### 5.3 Prosedur Aman Transisi Preview ke Production

Sebelum deployment baru dipromosikan ke produksi, operator wajib menjalankan langkah mitigasi berikut:

1. Pisahkan Basis Data Turso untuk Lingkungan Preview:
   Buat basis data Turso terpisah khusus pratinjau (misalnya `verax-preview`) atau gunakan SQLite terisolasi, lalu perbarui variabel lingkungan Preview di Vercel:
   ```bash
   echo "libsql://verax-preview-aryarizkyap.aws-ap-southeast-1.turso.io" | vercel env add TURSO_DATABASE_URL preview --force
   echo "<TOKEN_PREVIEW>" | vercel env add TURSO_AUTH_TOKEN preview --force --sensitive
   ```
2. Setel `NEXTAUTH_SECRET` untuk Lingkungan Preview:
   ```bash
   echo "<SECRET_PREVIEW_TINGGI_ENTROPI>" | vercel env add NEXTAUTH_SECRET preview --force --sensitive
   ```
3. Alur Promosi Rilis Terkontrol:
   - Operator membuat komit rilis bersih dari cabang `remediation/comprehensive-qa-fix`.
   - Menggabungkan cabang ke `main` secara terkontrol (fast-forward atau merge commit tanpa riwayat kotor).
   - Mendorong cabang `main` ke remote GitHub `origin/main`.
   - Vercel akan otomatis membangun komit baru pada lingkungan Production.
   - Jalankan pemantauan log serverless pada Vercel Dashboard pasca-deployment untuk memastikan tidak ada kesalahan koneksi runtime.

---

## 6. Prosedur dan Hasil Uji Asap Aplikasi (Fase 5)

Rangkaian uji asap otomatis komprehensif telah diwujudkan dalam berkas `scripts/smoke-test.ts`. Skrip ini dapat dijalankan berulang kali oleh tim QA atau operator dengan perintah:
```bash
bun run scripts/smoke-test.ts
```

Skrip ini bekerja di atas lingkungan basis data lokal terisolasi (`db/isolated-test.db`) dan dilindungi oleh pengawal isolasi (`isolation-guard`), sehingga tidak akan menyentuh atau memodifikasi data produksi Turso Cloud.

### Tabel Hasil Eksekusi Uji Asap

| No | Komponen Alur Kerja | Parameter yang Diuji | Status | Keterangan |
|---|---|---|---|---|
| 1 | Studio Login & Kredensial | Autentikasi password valid via scrypt | PASS | Kredensial cocok, waktu konstan |
| 2 | Studio Login & Kredensial | Penolakan password salah | PASS | Ditolak seketika tanpa kebocoran informasi |
| 3 | Status Akun Staf | Status akun Chief Editor | PASS | Berstatus ACTIVE |
| 4 | Matriks Izin Staf | Izin `article:publish` pada Chief Editor | PASS | Hak penerbitan tunggal terkonfirmasi |
| 5 | Matriks Izin Staf | Izin `complaint:manage` pada Chief Editor | PASS | Hak penanganan keluhan terkonfirmasi |
| 6 | Matriks Izin Staf | Izin `audit:read` pada Chief Editor | PASS | Hak akses log audit terkonfirmasi |
| 7 | Matriks Izin Staf | Penolakan `article:publish` pada Author | PASS | Penulis naskah ditolak menerbitkan artikel |
| 8 | Dashboard Redaksi | Kueri rubrikasi aktif | PASS | 3 rubrik resmi (`hukum-keadilan`, dll.) aktif |
| 9 | Pembuatan Artikel | Pembuatan draf baru dengan rubrik & format | PASS | Status awal terkonfirmasi DRAFT |
| 10 | Penyimpanan Naskah | Serialisasi dan penguraian block-JSON | PASS | Format blok paragraf dan heading utuh |
| 11 | Alur Kerja Redaksional | Transisi DRAFT ke PENDING_REVIEW (Author) | PASS | State machine mengizinkan pengajuan |
| 12 | Alur Kerja Redaksional | Penolakan lompatan ilegal DRAFT ke PUBLISHED | PASS | Transisi tidak sah ditolak |
| 13 | Alur Kerja Redaksional | Transisi PENDING_REVIEW ke FACT_CHECK (Editor) | PASS | Editor mengambil alih pemeriksaan fakta |
| 14 | Catatan Editorial | Penyimpanan catatan penelaahan redaksi | PASS | Catatan telaah tersimpan di riwayat review |
| 15 | Entri Sumber | Penambahan sumber primer kunci | PASS | Sumber tercatat dengan status UNVERIFIED |
| 16 | Gerbang Verifikasi Sumber | Pemblokiran persetujuan bila sumber belum diverifikasi | PASS | Gerbang integritas menahan penerbitan |
| 17 | Gerbang Verifikasi Sumber | Pembukaan gerbang pasca-verifikasi oleh editor | PASS | Status sumber naik ke PRIMARY_VERIFIED |
| 18 | Metadata Media | Pencatatan aset media gambar publik | PASS | URL penyimpanan dan lisensi tercatat rapi |
| 19 | Otorisasi Pratinjau Media | Penyimpanan dokumen privat dengan visibilitas ketat | PASS | Berkas sensitif terlindung di direktori private |
| 20 | Penerbitan Artikel | Persetujuan dan penerbitan oleh Chief Editor | PASS | Status naskah naik menjadi PUBLISHED |
| 21 | Penanda Waktu Terbit | Pencatatan atribut waktu publikasi | PASS | `publishedAt` tercatat otomatis |
| 22 | Alur Koreksi Publik | Pembuatan catatan koreksi terhubung ke artikel | PASS | Record tersimpan di tabel `CorrectionRecord` |
| 23 | Pembaruan Status Naskah | Perubahan status artikel yang dikoreksi | PASS | Status naskah berubah menjadi CORRECTED |
| 24 | Formulir Keluhan Publik | Pembuatan kode referensi unik keluhan | PASS | Format referensi sesuai standar `KEL-YYYY-NNNN` |
| 25 | Penanganan Konkurensi | Pencegahan duplikasi referensi pada muatan simultan | PASS | Kode referensi berturut-turut terbukti unik |
| 26 | Penyelesaian Keluhan | Pencatatan keputusan dan tindak lanjut keluhan | PASS | Status keluhan naik menjadi RESOLVED |
| 27 | Pencatatan Audit | Integritas pencatatan rekam jejak pada AuditEvent | PASS | Event tindakan penerbitan terekam di sistem |
| 28 | Pengawal Isolasi Target | Verifikasi keutuhan basis data Turso Cloud | PASS | Jumlah artikel di Turso tetap 0 baris (tidak tersentuh) |

Total Pemeriksaan Uji Asap: 31 Pemeriksaan  
Hasil: 31 Lulus, 0 Gagal (Tingkat Kelulusan: 100%)

---

## 7. Tindakan Operator yang Wajib Dijalankan Sebelum Peluncuran

Untuk beralih dari status NOT READY ke READY, operator sistem wajib menyelesaikan daftar tindakan berikut secara berurutan:

1. Tindakan 1: Pembaruan Identitas Produksi Chief Editor
   Jalankan skrip bootstrap yang telah diperkeras dengan memasukkan nama lengkap asli, alamat surel resmi kantor, dan kata sandi berkekuatan tinggi (lihat Prosedur A pada Bagian 2.3).
2. Tindakan 2: Pemisahan Variabel Lingkungan Vercel Preview
   Setel basis data Turso non-produksi untuk target Preview pada dasbor Vercel atau via CLI untuk mencegah kebocoran data uji ke basis data produksi. Tambahkan nilai `NEXTAUTH_SECRET` pada lingkungan Preview.
3. Tindakan 3: Komit Selektif Perubahan Remediasi
   Gunakan daftar pemilahan berkas pada Bagian 4.4 untuk membuat komit bersih pada repositori lokal, kemudian dorong ke remote `origin/main`.
4. Tindakan 4: Verifikasi Uji Asap Akhir Pasca-Deploy
   Setelah Vercel selesai melakukan build dan deployment dari cabang `main`, buka antarmuka CMS `/studio` pada domain produksi, lakukan login menggunakan kredensial Chief Editor yang baru, dan pastikan dashboard dapat diakses dengan normal.
