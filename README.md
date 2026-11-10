# Verax Press

> **"Ex Fontibus Veritas"** | *Kebenaran Bersumber dari Asalnya. Publikasi Media Digital Independen dengan Kendali Editorial Redaktur.*

Verax Press adalah publikasi jurnalisme digital independen yang menempatkan verifikasi sumber primer, transparansi penelusuran fakta, dan pertanggungjawaban manusia di atas kecepatan publikasi. Sistem ini dibangun dengan arsitektur web modern yang memisahkan gerbang redaksi, repositori artikel, dan penyimpanan aset media secara tegas.

---

## Nilai Redaksi dan Prinsip Kerja

1. **Kendali Penuh Redaktur:** Naskah hanya dapat terbit melalui persetujuan berjenjang redaktur manusia. Agen kecerdasan buatan hanya diperlakukan sebagai asisten penyusunan draf awal melalui gerbang pemasukan data (ingestion API) dan tidak memiliki wewenang penerbitan langsung.
2. **Gerbang Verifikasi Sumber:** Setiap rujukan penting wajib berstatus terverifikasi sebelum naskah dapat diterbitkan. Sistem secara teknis menolak transisi status ke `PUBLISHED` bila masih terdapat sumber primer berkategori kunci yang belum ditelaah redaksi.
3. **Pencatatan Koreksi Terbuka:** Kekeliruan faktual yang ditemukan pasca-penerbitan diperbaiki dengan mencantumkan catatan revisi pada naskah bersangkutan serta diarsipkan pada halaman `/koreksi`.
4. **Tipografi Broadsheet Klasik:** Mengadaptasi hierarki visual surat kabar dengan rupa huruf Newsreader, penanda akhir naskah tombstone, dan tata letak berjenjang yang memprioritaskan kenyamanan baca serta kepatuhan kontras aksesibilitas.

---

## Komponen Teknologi

- **Runtime dan Manajer Paket:** [Bun](https://bun.sh/)
- **Kerangka Kerja Web:** [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Pustaka Antarmuka:** [React 19](https://react.dev/)
- **Bahasa Pemrograman:** [TypeScript 5](https://www.typescriptlang.org/) (Strict mode)
- **Penataan Gaya:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Komponen Dasar:** [Radix UI](https://www.radix-ui.com/) dan pola shadcn/ui
- **ORM Database:** [Prisma ORM 6.19.2](https://www.prisma.io/)
- **Basis Data Produksi:** [Turso Cloud](https://turso.tech/) (libSQL, wilayah Singapura `aws-ap-southeast-1`) dengan adapter `@prisma/adapter-libsql`
- **Basis Data Lokal:** SQLite berkas lokal (`db/custom.db`, mode WAL) untuk lingkungan pengembangan mandiri
- **Penyimpanan Media:** Layanan terisolasi Verax Media Storage Service pada mesin virtual Azure (`https://media.aryariap.my.id`), verifikasi HMAC SHA-256, jalur penyimpanan kanonikal di `/var/lib/verax/media`
- **Autentikasi Redaksi:** [NextAuth.js v4](https://next-auth.js.org/) dengan fungsi hashing `scrypt` (native `node:crypto`)
- **Pemeriksa Mutu Otomatis:** Bun Test (51 pengujian otomatis untuk domain, alur kerja, keamanan, dan persistensi)

---

## Susunan Direktori

```text
D:\Projects\verax\
├── prisma/
│   ├── schema.prisma       # Skema model basis data (Desk, Article, SourceReference, MediaAsset, dll.)
│   ├── migrations/         # Riwayat migrasi Prisma
│   └── seed.ts             # Data awal idempotensial (desk editorial, staf, contoh artikel)
├── db/
│   ├── custom.db           # Berkas basis data SQLite untuk pengembangan lokal
│   └── backups/            # Salinan cadangan SQLite (VACUUM INTO)
├── docs/
│   ├── editorial/          # Standar penulisan redaksional (VERAX_WRITING_STANDARDS.md)
│   ├── adr/                # Catatan keputusan arsitektur (ADR-001 hingga ADR-005)
│   └── runbooks/           # Panduan operasional dan pemulihan sistem
├── public/
│   ├── assets/editorial/   # Diagram vektor SVG redaksional
│   └── uploads/            # Direktori cadangan media statis
├── src/
│   ├── app/
│   │   ├── (public)/       # Halaman pembaca (beranda, desk, artikel, kebijakan, kontak)
│   │   ├── studio/         # Antarmuka CMS redaksi (dashboard, artikel, media, keluhan, audit)
│   │   ├── api/            # Rute API studio, internal v1, dan publik
│   │   ├── globals.css     # Variabel desain dan rupa huruf cetak
│   │   └── layout.tsx      # Kerangka utama situs web
│   ├── components/
│   │   ├── site/           # Komponen publik (kepala surat kabar, navigasi, kartu artikel, kaki halaman)
│   │   ├── studio/         # Komponen CMS (penyunting naskah, alur kerja, pengunggah media)
│   │   └── ui/             # Primitif antarmuka pengguna
│   ├── lib/
│   │   ├── domain/         # Mesin status alur kerja, parser konten blok, serialisasi
│   │   ├── db.ts           # Inisialisasi koneksi basis data (Turso / SQLite)
│   │   ├── auth.ts         # Konfigurasi otentikasi staf redaksi
│   │   └── media-client.ts # Klien integrasi layanan penyimpanan media via HMAC
│   └── tests/              # Kumpulan pengujian otomatis
├── AGENTS.md               # Pedoman instruksi agen pengembang
└── worklog.md              # Catatan kronologis kemajuan proyek
```

---

## Panduan Menjalankan Proyek

### 1. Memasang Dependensi
```bash
bun install
```

### 2. Menyiapkan Variabel Lingkungan
Salin berkas konfigurasi acuan:
```bash
cp .env.example .env
```
Lengkapi konfigurasi berikut di berkas `.env`:
- `DATABASE_URL`: Alamat koneksi database (URL libSQL Turso atau file lokal SQLite).
- `TURSO_AUTH_TOKEN`: Token otentikasi Turso Cloud (jika menggunakan koneksi jarak jauh).
- `NEXTAUTH_SECRET`: Kunci enkripsi sesi redaksi.
- `VERAX_MEDIA_API_URL`: URL layanan media (`https://media.aryariap.my.id`).
- `VERAX_MEDIA_SECRET`: Kunci rahasia penandatanganan HMAC media.

### 3. Mengatur Basis Data
Untuk menginisialisasi skema pada basis data:
```bash
bun x prisma db push
```
Untuk mengisi data awal redaksi:
```bash
bun run db:seed
```

### 4. Menjalankan Server Pengembangan
```bash
bun run dev
```
Buka peramban di `http://localhost:3000` untuk portal publik dan `http://localhost:3000/studio` untuk ruang kerja redaksi.

---

## Pengujian dan Pemeriksaan Mutu

Sebelum mengajukan perubahan kode, jalankan seluruh rangkaian pemeriksaan mutu berikut:

```bash
# 1. Pemeriksaan tipe data TypeScript
bun run typecheck

# 2. Pemeriksaan kaidah penulisan kode (linting)
bun run lint

# 3. Pengujian logika domain, keamanan, dan alur kerja
bun test

# 4. Kompilasi build produksi Next.js
bun run build
```

---

## Arsitektur Data dan Penyimpanan

### Basis Data
Sistem mengadopsi pemisahan lingkungan yang jelas:
- **Produksi (Vercel):** Menghubungkan aplikasi ke kluster Turso Cloud di wilayah Singapura melalui protokol libSQL terenkripsi dengan koneksi pooling terkelola.
- **Pengembangan Lokal:** Mendukung berkas SQLite lokal murni tanpa ketergantungan koneksi internet.

### Penyimpanan Media
Seluruh berkas gambar dan lampiran dokumen dikelola oleh layanan khusus Verax Media Storage yang berjalan pada mesin virtual Linux terisolasi. Unggahan dari CMS diautentikasi menggunakan tanda tangan digital HMAC SHA-256 berbasis waktu. Berkas fisik disimpan pada direktori `/var/lib/verax/media` dan didistribusikan melalui proksi balik Nginx dengan enkripsi TLS.

---

## Kepatuhan dan Standar Redaksional

Seluruh teks sistem, antarmuka CMS, dokumentasi teknis, dan komunikasi publik dalam repositori ini wajib mematuhi standar penulisan institusional Verax Press yang terdokumentasi di [docs/editorial/VERAX_WRITING_STANDARDS.md](file:///d:/Projects/verax/docs/editorial/VERAX_WRITING_STANDARDS.md). Aturan ini melarang penggunaan tanda pisah em dash, kata klise kecerdasan buatan, metrik fiktif, serta ornamen visual yang berlebihan.
