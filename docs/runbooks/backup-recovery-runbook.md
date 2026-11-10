# VERAX PRESS — Runbook Pencadangan, Pemulihan & Integritas Data (SQLite Stage A)

**Kode Dokumen:** `09_Backup_and_Recovery_Runbook`  
**Status:** Operasional Wajib (Stage A — Verax Master Consolidated)  
**Basis Teknologi:** SQLite WAL (`PRAGMA journal_mode = WAL`, `PRAGMA synchronous = NORMAL`) diakses via Prisma ORM / Bun  
**Lokasi Database Master:** `db/custom.db`  
**Lokasi Direktori Cadangan:** `db/backups/`

---

## 1. Definisi & Karakteristik Snapshot (Klarifikasi Teknis)

> [!IMPORTANT]
> **Klasifikasi Teknis Snapshot:**  
> Perintah SQLite `VACUUM INTO` menghasilkan **snapshot konsisten online (point-in-time snapshot)** pada detik eksekusi. Prosedur ini **BUKAN** continuous point-in-time recovery (PITR) berbasis rollforward journal WAL tanpa henti.
>
> - **Recovery Point Objective (RPO):** Dibatasi oleh frekuensi jadwal snapshot (misal: snapshot harian = RPO $\le$ 24 jam; snapshot per jam = RPO $\le$ 1 jam).
> - **Recovery Time Objective (RTO):** $\le$ 5 menit untuk database $\le$ 1 GB (hanya memerlukan penyalinan file snapshot terverifikasi ke path master).
> - **Keamanan Eksekusi Online:** `VACUUM INTO` aman dijalankan saat server Next.js sedang melayani request membaca atau menulis, tanpa mengunci database secara eksklusif dan tanpa risiko *torn page* atau korupsi WAL.

---

## 2. Cakupan Data Kritis yang Wajib Dicadangkan

| Komponen | Path Lokasi | Deskripsi & Kekritisan |
| :--- | :--- | :--- |
| **Database Utama SQLite** | `db/custom.db` | Tabel seluruh domain (Artikel, Desk, Staff, Submissions, Complaints, Corrections, Audit Events). **KRITIS.** |
| **Jurnal Transaksi WAL** | `db/custom.db-wal`<br>`db/custom.db-shm` | Buffer transaksi aktif sebelum dilakukan checkpoint otomatis ke file utama. |
| **Aset Media Editorial** | `public/uploads/` & `storage/media/` | Berkas gambar, infografik, dan dokumen lampiran artikel beserta metadata lisensi. |
| **Konfigurasi Lingkungan** | `.env` | Kredensial rahasia (`NEXTAUTH_SECRET`, `AUTH_SECRET`, dsb.). Disimpan di Secret Manager terpisah; **dilarang keras** di-commit ke Git. |

---

## 3. Prosedur Pencadangan Mandiri (Automated Snapshot)

Pencadangan standar Verax Press dijalankan secara terotomatisasi menggunakan skrip pemeliharaan bawaan:

```bash
bun scripts/backup-db.ts
```

### Mekanisme Internal Skrip:
1. Memeriksa keberadaan file master `db/custom.db`.
2. Mengeksekusi `PRAGMA wal_checkpoint(PASSIVE)` secara implisit melalui transaksi Prisma `$executeRawUnsafe("VACUUM INTO 'db/backups/custom-<timestamp>.db'")`.
3. Membuka koneksi baru ke file snapshot yang baru dibuat.
4. Menjalankan `PRAGMA integrity_check;` dan memverifikasi hasilnya bernilai `"ok"`.
5. Melaporkan ukuran file dan status integritas. Jika integritas gagal, proses keluar dengan status kode `1`.

---

## 4. Jadwal & Kebijakan Retensi

1. **Snapshot Harian (Daily Backup):** Dijalankan otomatis setiap pukul `01:00 WIB` (`18:00 UTC`), disimpan selama 30 hari.
2. **Snapshot Mingguan (Weekly Archive):** Dijalankan setiap hari Minggu pukul `02:00 WIB`, disimpan selama 12 minggu.
3. **Snapshot Pra-Rilis / Pra-Migrasi:** Wajib dijalankan sebelum eksekusi `prisma migrate deploy` atau pembaruan perangkat lunak.
4. **Cadangan Off-Instance (Disaster Recovery):** Salinan file snapshot terenkripsi dikirimkan secara berkala ke penyimpanan objek terpisah (misalnya AWS S3 / Google Cloud Storage) yang memiliki konfigurasi *Object Lock* / *WORM (Write Once, Read Many)* untuk perlindungan audit trail jurnalistik.

---

## 5. Prosedur Pemulihan Bencana (Disaster Recovery / Restore)

Jika terjadi insiden data, file rusak, atau kesalahan manusia pada database operasional:

### Langkah 1: Hentikan Proses Aplikasi
Hentikan daemon server Next.js agar tidak ada penulisan transaksi baru:
```bash
# Hentikan proses dev atau systemd/pm2 process
```

### Langkah 2: Amankan File Forensik
Pindahkan database bermasalah beserta file WAL ke direktori insiden untuk investigasi forensik:
```bash
mkdir -p db/incident-$(date -u +"%Y%m%dT%H%M%SZ")
mv db/custom.db* db/incident-*/ 2>/dev/null || true
```

### Langkah 3: Pulihkan dari Snapshot Terverifikasi Terakhir
Salin file snapshot snapshot yang valid ke path operasional:
```bash
cp db/backups/custom-<TARGET_TIMESTAMP>.db db/custom.db
```

### Langkah 4: Verifikasi Integritas dan Skema
Jalankan verifikasi integritas menggunakan Prisma/Bun sebelum menyalakan kembali server:
```bash
bun scripts/test-migrations.ts "file:../db/custom.db" "Verifikasi Pasca Pemulihan"
```

Pastikan:
- `PRAGMA integrity_check` bernilai `ok`.
- Seluruh tabel domain (16 model) terdeteksi.
- Data artikel dan staf sesuai catatan snapshot.

### Langkah 5: Nyalakan Kembali Aplikasi
Jalankan kembali server aplikasi dan verifikasi endpoint publik `/` serta studio `/studio`.
