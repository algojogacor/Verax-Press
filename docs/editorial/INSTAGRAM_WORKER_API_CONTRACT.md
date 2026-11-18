# Kontrak Teknis API Instagram Worker Verax Press

Dokumen ini memuat spesifikasi teknis resmi untuk dua titik akhir (*endpoint*) API internal yang digunakan oleh worker otomatisasi Instagram (`INSTAGRAM_WORKER`):
1. `GET /api/internal/v1/instagram/articles`: Pengambilan naskah siap terbit.
2. `POST /api/internal/v1/instagram/publish`: Rendering visual dan publikasi karosel ke feed Instagram.

---

## 1. Arsitektur dan Isolasi Kredensial

### 1.1 Mekanisme Autentikasi
Seluruh pemanggilan API wajib menyertakan header HTTP `Authorization` dengan skema Bearer:
```http
Authorization: Bearer <CLIENT_ID>.<CLIENT_SECRET>
```
Kredensial divalidasi melalui fungsi server-side `verifyApiClientDetailed`:
- Nilai token dipecah menjadi dua bagian yang dipisahkan tanda titik: `clientId` dan `secret`.
- `clientId` diperiksa keberadaannya pada tabel `ApiClient` basis data.
- `secret` diverifikasi kecocokannya menggunakan hashing kriptografis SHA-256 (`crypto.createHash("sha256")`).
- Status klien wajib `ACTIVE` dan belum melewati `expiresAt`.

### 1.2 Isolasi Cakupan Hak Akses (*Scope Isolation*)
Sistem menerapkan pemisahan ketat tipe klien API (`clientType`):
- `INSTAGRAM_WORKER`: Hanya diizinkan mengakses `GET /api/internal/v1/instagram/articles` dan `POST /api/internal/v1/instagram/publish`. Klien tipe ini ditolak dengan kode `403 INVALID_CLIENT_SCOPE` jika mencoba mengirimkan naskah ke endpoint `POST /api/internal/v1/ai-submissions`.
- `INGESTION`: Hanya diizinkan mengakses `POST /api/internal/v1/ai-submissions`. Klien tipe ini ditolak dengan kode `403 INVALID_CLIENT_SCOPE` jika memanggil endpoint Instagram.

### 1.3 Pembatasan Panggilan (*Rate Limit*)
- Endpoint pembacaan naskah (`GET /api/internal/v1/instagram/articles`): Tidak dibatasi rate-limit frekuensi tinggi, namun disarankan dipanggil sesuai siklus polling berkala (misal 5 hingga 15 menit).
- Endpoint publikasi (`POST /api/internal/v1/instagram/publish`): Dibatasi secara platform oleh kuota resmi Meta Graph API (maksimal 25 unggahan per 24 jam untuk akun bisnis Instagram).

---

## 2. Endpoint 1: Pengambilan Naskah Siap Terbit

Mengambil daftar artikel berita dan investigasi yang telah melewati persetujuan Pemimpin Redaksi (status `PUBLISHED`) dan belum pernah berhasil dipublikasikan ke feed Instagram.

- **Metode:** `GET`
- **Jalur URL:** `/api/internal/v1/instagram/articles`
- **Autentikasi:** Wajib (Bearer token `INSTAGRAM_WORKER` atau sesi aktif staf redaksi)

### 2.1 Parameter Kueri (Query Parameters)

| Parameter | Tipe Data | Wajib | Keterangan |
|---|---|---|---|
| `limit` | integer | Tidak | Jumlah naskah maksimal yang diambil. Nilai minimum 1, nilai maksimum 100, default 10. |

### 2.2 Aturan Penyaringan Basis Data (*Query Filter*)
Endpoint ini menyaring artikel dengan kriteria:
1. `status: "PUBLISHED"` (naskah draf, telaah, atau revisi tidak pernah dikembalikan).
2. `instagramPosts.none: { status: "POSTED" }`: Artikel yang sudah pernah berhasil terbit (memiliki catatan `POSTED`) dikecualikan secara permanen.
3. **Penanganan Artikel Gagal (`FAILED`):** Jika sebuah artikel sebelumnya mengalami kegagalan posting 3 kali berturut-turut (tercatat dengan status `FAILED`), artikel tersebut **tetap dikembalikan** pada endpoint ini agar AI worker atau redaktur dapat mencoba kembali publikasinya setelah penyebab masalah diperbaiki.

### 2.3 Skema Respons Sukses (HTTP 200 OK)

```json
{
  "articles": [
    {
      "id": "cmwjcm7fe000d9hr8qmc3gdrp",
      "title": "Aliran Siluman Rp 412 Miliar Proyek Dermaga Selat Makassar",
      "deck": "Investigasi mengungkap penunjukan rekanan tunggal Konsorsium Tripatra mendahului lelang resmi dan mengabaikan audit kelayakan BPKP.",
      "contentJson": "[{\"type\":\"p\",\"children\":[{\"text\":\"...\"}]}]",
      "content": "[{\"type\":\"p\",\"children\":[{\"text\":\"...\"}]}]",
      "slug": "aliran-siluman-dermaga-selat-makassar",
      "desk": {
        "id": "desk-investigasi-01",
        "name": "Investigasi",
        "slug": "investigasi"
      },
      "tags": ["dermaga", "anggaran", "selat-makassar"],
      "byline": "Disunting oleh Redaksi Verax Press",
      "publishedAt": "2026-11-16T08:00:00.000Z",
      "heroMedia": {
        "id": "media-asset-01",
        "url": "/uploads/media/dermaga-makassar.webp",
        "caption": "Dermaga logistik peti kemas di kawasan Selat Makassar.",
        "creator": "Fotografer Redaksi",
        "title": "Dermaga Logistik Selat Makassar",
        "mimeType": "image/webp",
        "isSynthetic": false,
        "isGeneric": false
      }
    }
  ]
}
```

### 2.4 Deskripsi Bidang Respons

- `id` (string, wajib): Pengenal unik naskah di basis data Verax Press. Nilai ini yang diserahkan kembali pada parameter `articleId` saat memanggil endpoint publish.
- `title` (string, wajib): Judul lengkap artikel versi situs web.
- `deck` (string, opsional/null): Rangkuman atau pengantar pendek artikel.
- `contentJson` (string, opsional/null): Naskah utuh dalam format serialisasi Block-JSON.
- `slug` (string, wajib): Bagian URL web naskah (`https://veraxpress.vercel.app/artikel/<slug>`).
- `desk` (objek, wajib): Metadata desk redaksi (`id`, `name`, `slug`).
- `tags` (larik string, wajib): Topik bahasan liputan.
- `byline` (string, opsional/null): Kredit penulisan atau penyuntingan resmi.
- `publishedAt` (string ISO-8601, opsional/null): Waktu publikasi artikel di portal berita.
- `heroMedia` (objek atau null): Aset media utama artikel (tautan gambar, keterangan foto, atribusi pembuat).

---

## 3. Endpoint 2: Validasi, Render Visual, dan Publikasi Karosel

Memvalidasi susunan slide karosel, merender kanvas 1080x1080 px menjadi berkas PNG berstandar broadsheet klasik melalui Satori dan Sharp, mengunggah aset ke penyimpanan publik, dan mengirimkan permintaan penerbitan karosel multi-slide ke Meta Instagram Graph API.

- **Metode:** `POST`
- **Jalur URL:** `/api/internal/v1/instagram/publish`
- **Autentikasi:** Wajib (Header `Authorization: Bearer <CLIENT_ID>.<CLIENT_SECRET>`, scope `INSTAGRAM_WORKER`)
- **Tipe Konten:** `application/json`

### 3.1 Skema Permintaan (Request Body Schema)

Payload harus berupa objek JSON valid dengan struktur:

| Bidang | Tipe Data | Wajib | Validasi / Batasan |
|---|---|---|---|
| `articleId` | string | Ya | Tidak boleh kosong. Wajib merujuk ke artikel yang ada di basis data dengan status `PUBLISHED`. |
| `caption` | string | Ya | Tidak boleh kosong. Teks pengantar postingan Instagram, memuat narasi investigasi, pertanyaan diskusi kritis, tautan web, dan tagar resmi. |
| `slides` | array objek | Ya | Minimal 2 slide, maksimal 10 slide (batasan resmi platform Instagram Carousel). |

#### Struktur Objek Elemen `slides`:

| Bidang Slide | Tipe Data | Wajib | Keterangan |
|---|---|---|---|
| `slideType` | enum string | Tidak | Salah satu dari: `"cover"`, `"content"`, `"quote"`, `"closing"`. Jika tidak diisi, otomatis disesuaikan berdasarkan urutan slide. |
| `kicker` | string | Tidak | Label kategori huruf kapital (contoh: `"LAPORAN KHUSUS"`, `"KONTEKS ANGGARAN"`, `"TEMUAN INVESTIGASI"`). |
| `title` | string | Tidak | Untuk slide `content`, berfungsi sebagai kalimat pembuka utama (pukulan pertama/lead punch) dengan huruf Newsreader Bold ukuran besar. |
| `content` | string | Ya | Naskah teks narasi slide. Untuk slide `content`, dapat memuat beberapa kalimat penjelasan konkret atau paragraf bertingkat. |
| `sourceNotes` | string | Tidak | Rujukan dokumen primer atau dasar verifikasi (ditampilkan sebagai teks kecil bersahaja di bagian bawah slide, tanpa kotak dekoratif). |
| `callToAction` | string | Tidak | Khusus slide `closing`: pertanyaan kritis pemantik diskusi atau ajakan membaca naskah lengkap di web. |
| `quoteAuthor` | string | Tidak | Khusus slide `quote`: nama lengkap narasumber yang dikutip. |
| `quoteAuthorTitle`| string | Tidak | Khusus slide `quote`: jabatan, instansi, atau keterangan dokumen pemeriksaan narasumber. |
| `keyTakeaways` | array string | Tidak | Larik butir pokok temuan (opsional). |

### 3.2 Contoh Payload Permintaan yang Valid

```json
{
  "articleId": "cmwjcm7fe000d9hr8qmc3gdrp",
  "caption": "Pencairan kilat Rp 412,8 miliar untuk proyek dermaga logistik di Selat Makassar menyisakan kejanggalan serius.\n\nPenyelidikan Verax Press bersama dokumen audit BPKP mengungkap bahwa alokasi anggaran diselipkan melalui pos cadangan bencana tanpa persetujuan parlemen. Lebih jauh, Konsorsium Tripatra Nusacipta telah menerima Surat Perintah Kerja dua pekan sebelum lelang elektronik LPSE resmi diumumkan ke publik.\n\nTermin awal senilai Rp 123,8 miliar bahkan telah ditransfer ke rekening penampung swasta, kendati jaminan bank yang diserahkan terbukti tidak terdaftar pada sistem perbankan nasional.\n\nPertanyaan kritisnya: jika prosedur verifikasi jaminan perbankan dapat dilewati begitu mudah oleh pejabat pembuat komitmen, siapa pihak yang menjamin keselamatan keuangan negara dalam proyek ini?\n\nBuka rekonsiliasi transfer kas, transkrip pemeriksaan internal, dan rantai dokumen bukti autentik selengkapnya di situs web kami:\nveraxpress.vercel.app (tautan di bio).\n\n#VeraxPress #JurnalismeInvestigasi #TransparansiAnggaran #AuditForensik",
  "slides": [
    {
      "slideType": "cover",
      "kicker": "LAPORAN KHUSUS",
      "title": "Aliran Siluman Rp 412 Miliar di Selat Makassar",
      "content": "Konsorsium rekanan ditunjuk sepihak dua pekan sebelum tender diumumkan. Uang muka ratusan miliar mengalir tanpa garansi bank yang sah."
    },
    {
      "slideType": "content",
      "kicker": "KONTEKS ANGGARAN",
      "title": "Anggaran Rp 412,8 Miliar Dicairkan Kilat Lewat Pos Cadangan Bencana",
      "content": "Kementerian Koordinator Infrastruktur meloloskan pencairan dana dermaga logistik hanya dalam lima hari kerja pada 14 Januari 2026. Alokasi ini diselipkan ke pos cadangan darurat tanpa persetujuan Badan Anggaran DPR, mendahului jadwal resmi pembahasan nota keuangan daerah.",
      "sourceNotes": "Sumber: Salinan Lembar Disposisi Kemenko No. 018/DISP/I/2026"
    },
    {
      "slideType": "content",
      "kicker": "TEMUAN INVESTIGASI",
      "title": "Konsorsium Tripatra Ditunjuk Sepihak 14 Hari Sebelum Tender Terbuka",
      "content": "Panitia lelang menandatangani Surat Perintah Kerja No. 044 pada 28 Januari 2026 kepada Konsorsium Tripatra Nusacipta. Padahal, pengumuman lelang elektronik LPSE baru diunggah ke publik pada 11 Februari 2026 dengan spesifikasi teknis yang telah dikunci bagi rekanan tunggal.",
      "sourceNotes": "Sumber: Berkas Audit Pengadaan Barang dan Jasa BPKP Wilayah IV"
    },
    {
      "slideType": "content",
      "kicker": "IMPLIKASI HUKUM",
      "title": "Uang Muka Rp 123,8 Miliar Mengalir Tanpa Jaminan Bank Asli",
      "content": "Pemeriksaan forensik BPKP menemukan surat garansi bank dari Bank Mandiri Cabang Sudirman yang diserahkan rekanan berstatus tidak terdaftar pada sistem perbankan nasional. Kendati tanpa verifikasi jaminan, kas negara tetap mentransfer termin awal Rp 123,8 miliar ke rekening penampung swasta.",
      "sourceNotes": "Sumber: Laporan Hasil Pemeriksaan Forensik BPKP No. PE.04/112/2026"
    },
    {
      "slideType": "quote",
      "kicker": "KESAKSIAN KUNCI",
      "content": "Kami diperintahkan menandatangani berita acara serah terima dokumen garansi tanpa memeriksa kode verifikasi ke bank penerbit.",
      "quoteAuthor": "Pejabat Pembuat Komitmen",
      "quoteAuthorTitle": "Keterangan resmi dalam Berita Acara Pemeriksaan Inspektorat Jenderal",
      "sourceNotes": "Dokumen wawancara dan transkrip pemeriksaan internal"
    },
    {
      "slideType": "closing",
      "kicker": "BACA INVESTIGASI LENGKAP",
      "callToAction": "Mengapa pencairan anggaran ratusan miliar dapat lolos tanpa verifikasi garansi perbankan yang sah?",
      "content": "Buka rekonsiliasi transfer kas, transkrip pemeriksaan, dan rantai dokumen bukti autentik selengkapnya di situs web kami."
    }
  ]
}
```

### 3.3 Skema Respons Sukses (HTTP 200 OK)

Respons saat seluruh proses rendering, pengunggahan media, dan publikasi ke Meta Graph API selesai:

```json
{
  "status": "POSTED",
  "postUrl": "https://www.instagram.com/p/DF9kLmZqP1w/",
  "instagramPostId": "clx091kld00019hr8z789abcd",
  "attempts": 1,
  "lastError": null
}
```

Jika terjadi kendala eksternal di sisi API Meta yang gagal dipulihkan setelah 3 kali percobaan otomatis, server tetap mengembalikan HTTP 200 dengan status `FAILED` beserta rincian kegagalan:

```json
{
  "status": "FAILED",
  "postUrl": null,
  "instagramPostId": "clx091kld00019hr8z789abcd",
  "attempts": 3,
  "lastError": "Meta Graph API temporary outage: 503 Service Unavailable"
}
```

---

## 4. Rincian Kode Galat HTTP (Error Codes)

Seluruh respons galat menggunakan format JSON standar:
```json
{
  "error": "Pesan deskripsi kesalahan dalam bahasa Indonesia.",
  "code": "KODE_GALAT",
  "details": []
}
```

| Status HTTP | Kode (`code`) | Kondisi Pemicu | Solusi Tindakan |
|---|---|---|---|
| **400** | `MALFORMED_JSON` | Body request bukan merupakan format JSON yang valid. | Periksa sintaks penutupan tanda kurung dan tanda kutip JSON. |
| **400** | `INVALID_ARTICLE_STATUS` | Artikel yang ditargetkan memiliki status bukan `PUBLISHED` (misal `DRAFT`, `PENDING_REVIEW`). | Hanya artikel yang telah disetujui Pemred dan terbit di web yang dapat diposting. |
| **401** | `UNAUTHORIZED` | Header `Authorization` hilang, format Bearer salah, atau secret klien tidak cocok. | Periksa token pada konfigurasi worker atau buat kredensial baru di CMS Studio. |
| **401** | `CREDENTIAL_EXPIRED` | Kredensial API Client telah melewati masa berlaku (`expiresAt`). | Buat pasangan kredensial baru melalui menu API Client di CMS Studio. |
| **403** | `INVALID_CLIENT_SCOPE` | Klien terautentikasi namun memiliki `clientType` bukan `INSTAGRAM_WORKER` (contoh klien tipe `INGESTION`). | Gunakan kredensial khusus yang didaftarkan dengan tipe `INSTAGRAM_WORKER`. |
| **404** | `NOT_FOUND` | Nilai `articleId` yang dikirimkan tidak ditemukan pada basis data. | Pastikan `articleId` diperoleh dari respons endpoint `GET /api/internal/v1/instagram/articles`. |
| **409** | `ALREADY_POSTED` | Artikel tersebut telah memiliki entri `InstagramPost` berstatus `POSTED` (penjaga idempotensi). | Respons menyertakan `instagramPostId` dan `postUrl` dari postingan yang sudah ada. Dilarang menduplikasi postingan artikel yang sama. |
| **422** | `VALIDATION_ERROR` | Bidang wajib hilang (`articleId`, `caption`), jumlah slide kurang dari 2 atau lebih dari 10, atau isi teks slide kosong. | Rincian validasi dikembalikan pada array `details` Zod issue. Perbaiki payload sesuai batas skema. |
| **500** | `RENDER_ERROR` | Terjadi kegagalan fatal saat mesin Satori atau Sharp menyusun gambar PNG. | Periksa apakah ada karakter glif biner yang tidak didukung atau kesalahan internal memori render. |
| **500** | `INTERNAL` | Terjadi kegagalan koneksi basis data atau pengecualian sistem tak terduga lainnya. | Periksa log peladen (*server logs*) untuk diagnosa koneksi. |

---

## 5. Logika Percobaan Ulang (*Retry*) dan Penanganan Kegagalan

1. **Titik Pencatatan Database:**
   - Status awal `PENDING` langsung dicatat ke tabel `InstagramPost` **setelah** seluruh buffer gambar PNG selesai dirender dan sebelum pemanggilan pertama ke Meta Graph API.
2. **Mekanisme Retry Otomatis:**
   - Jika pemanggilan kontainer media atau publikasi Meta Graph API mengembalikan galat sementara (*transient error* seperti HTTP 500, 502, 503, atau galat jaringan koneksi), sistem melakukan percobaan ulang otomatis hingga **3 kali percobaan**.
   - Setiap percobaan diselingi jeda eksponensial (1 detik, 2 detik, 4 detik).
   - Pada tiap percobaan ulang, proses rendering gambar **tidak diulang dari awal** melainkan menggunakan kembali buffer gambar yang sudah ada demi efisiensi CPU peladen.
3. **Status Akhir dan Notifikasi Redaksi:**
   - Jika percobaan berhasil dalam 3 kali kesempatan: status diperbarui menjadi `POSTED`, `postUrl` dan `instagramMediaId` disimpan, dan artikel otomatis keluar dari antrean publikasi.
   - Jika ke-3 percobaan gagal: status diperbarui menjadi `FAILED` dan pesan galat terakhir dicatat pada kolom `lastError`.
   - Postingan dengan status `FAILED` otomatis memicu kotak peringatan (*alert banner*) pada dashboard utama CMS Studio (`/studio`) sehingga Pemimpin Redaksi dapat segera mengambil tindakan perbaikan.
