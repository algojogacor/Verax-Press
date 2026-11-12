---
documentId: VERAX-TECH-INTEGRATION-01
title: Kontrak Integrasi Editorial Publik, Skema API, dan Tata Kelola Pengiriman
version: 1.0.0
status: PROPOSED
scope: technical-integration
appliesTo:
  - ai-agents
  - ingestion-api-clients
  - external-integrators
requiredDependencies:
  - operations/VERAX_AI_AGENT_WORKFLOW.md
lastReviewed: 2026-11-12
---

# Kontrak Integrasi Editorial Publik, Skema API, dan Tata Kelola Pengiriman

Panduan integrasi teknis bagi klien Agen AI eksternal yang mengakses basis pengetahuan editorial dan API pengiriman naskah Verax Press. Kebijakan substantif jurnalistik merujuk pada Lapisan A (`/editorial/core`), Lapisan B (`/editorial/desks/{slug}`), Lapisan C (`/editorial/formats/{format}`), dan Lapisan D (`/editorial/operations/ai-workflow`).

---

## 1. Model Aktor Publik, Status Pengiriman, dan Kendali Manusia

### 1.1 Cakupan Klien API Agen AI (`INGESTION_API`)
- **Cakupan Akses:** `submit-only` menggunakan kredensial Bearer berawalan ID klien dan rahasia klien (`Bearer <CLIENT_ID>.<CLIENT_SECRET>`).
- **Kewenangan yang Tersedia:** Penemuan kapabilitas, validasi *dry-run*, pengiriman draf baru, dan pemantauan status pengiriman milik klien bersangkutan.
- **Kewenangan yang Dikecualikan:** Klien API eksternal **tidak** memiliki endpoint persetujuan, verifikasi sumber, penetapan byline final, koreksi pasca-terbit, maupun publikasi. Seluruh keputusan redaksi dan persetujuan terbit berada eksklusif di tangan Pemimpin Redaksi (`CHIEF_EDITOR`) manusia.

### 1.2 Dua Lapisan Status pada `SubmissionReceipt` dan Pemantauan
Integrasi API membedakan secara tegas antara status catatan pengiriman (*submission status*) dan status siklus hidup editorial naskah (*article status*):

- **`submissionStatus` (Status Tanda Terima Pengiriman):**
  - `SUBMITTED`: Pengiriman diterima sistem dan tersimpan untuk antrean peninjauan manusia (nilai pada respons `201 Created` dan replay `200 OK`).
  - `EDITORIAL_REVIEW`: Artikel terkait sedang menjalani penelaahan atau uji fakta redaksi.
  - `RESOLVED`: Naskah mencapai status editorial akhir (misalnya `PUBLISHED`, `REJECTED`, `WITHDRAWN`, `CORRECTED`, `RETRACTED`, atau `ARCHIVED`).
  *(Catatan kompatibilitas: bidang `status` pada respons pembuatan pengiriman tetap dikembalikan bernilai `"SUBMITTED"` selaras `submissionStatus`.)*
- **`articleStatus` (Status Siklus Hidup Artikel):**
  - Saat baru masuk: selalu `"DRAFT"`.
  - Alur editorial lengkap di ruang redaksi: `DRAFT` -> `PENDING_REVIEW` -> `FACT_CHECK` -> `PENDING_APPROVAL` -> `PUBLISHED` (atau `REVISION_NEEDED`, `REJECTED`, `WITHDRAWN`, `CORRECTED`, `RETRACTED`, `ARCHIVED`). Tidak ada status `SCHEDULED` dan tidak ada auto-publish.

### 1.3 Kelayakan Format Pengiriman untuk Agen AI
Mengikuti status standar `VERAX-EDITORIAL-AI v1.0.0` yang masih berstatus `PROPOSED`:

| Format | Kode | Status pada `INGESTION_API` | Persyaratan Khusus / Perilaku |
|---|---|---|---|
| Berita | `NEWS` | **Ditahan sementara (`422`)** | Ditolak sementara (`FORMAT_REJECTED` / `FORMAT_PENDING_AUTHORIZATION`) hingga Pemimpin Redaksi mengesahkan otorisasi format `NEWS` untuk jalur AI. |
| Analisis | `ANALYSIS` | Diizinkan | Mematuhi batas klaim, pembuktian multi-sumber, dan batas kesimpulan. |
| Opini | `OPINION` | Diizinkan | Otomatis menampilkan penanda penafian opini penulis (`OPINION_DISCLAIMER`) jika terbit. |
| Penjelas | `EXPLAINER` | Diizinkan | Menjelaskan mekanisme dengan rujukan regulasi atau teknis primer. |
| Kisah Khas | `FEATURE` | **Bersyarat (`422` bila tak terpenuhi)** | Materi peliputan wajib berasal dari peran manusia (`CHIEF_EDITOR`, `WRITER`, atau `CONTRIBUTOR`). Pada intake, wajib ada minimal satu sumber `INTERVIEW` atau `PRIMARY` dengan `supports >= 20` karakter (setelah pemangkasan spasi tepi) dan `verificationNotes >= 20` karakter. |
| Wawancara | `INTERVIEW` | **Bersyarat (`422` bila tak terpenuhi)** | Wawancara wajib dilakukan peran manusia (`CHIEF_EDITOR`, `WRITER`, atau `CONTRIBUTOR`). Pada intake, wajib ada minimal satu sumber `INTERVIEW` dengan `supports >= 20` karakter (setelah pemangkasan spasi tepi) dan `verificationNotes >= 20` karakter. |

**Pembagian Peran dan Batas Validasi Intake (`FEATURE` & `INTERVIEW`):**
- **Sumber Asli Wajib dari Manusia:** Materi `FEATURE` dan `INTERVIEW` harus berasal dari peliputan atau wawancara yang dilakukan peran editorial manusia (`CHIEF_EDITOR`, `WRITER`, atau `CONTRIBUTOR`). Agen AI `INGESTION_API` hanya menyusun struktur dan mengirimkan bahan tersebut, dan dilarang mengarang kutipan maupun klaim lapangan sendiri.
- **Batas Validasi `>= 20` Karakter:** Pemeriksaan panjang minimal `20` karakter (setelah pemangkasan spasi tepi) pada `supports` dan `verificationNotes` hanya memastikan kelengkapan metadata minimum di API intake, bukan kebenaran faktual atau keaslian jurnalistik. Pembuktian otentisitas tetap berada pada pengirim manusia dan penelaahan redaksi.

---

## 2. Daftar Titik Akhir Publik dan Operasional Klien AI

### 2.1 Penemuan Mesin dan Basis Pengetahuan Editorial (Baca-Saja `GET` / `HEAD`)
Seluruh sumber daya editorial baca-saja mendukung negosiasi `Accept: application/json` vs `text/markdown`, parameter `?output=json|markdown|md` (nilai lain ditolak `HTTP 422 VALIDATION_ERROR`), dan validasi cache kondisional via `ETag` + `If-None-Match` (`HTTP 304 Not Modified`):

- `GET | HEAD /editorial/manifest.json`: Manifes standar editorial (`standardId`, `semanticVersion`, `status`, `effectiveDate: null`, desk aktif terurut `sortOrder`, format, aturan, spesifikasi checksum).
- `GET | HEAD /editorial/core?mode=full|compact`: Kumpulan prinsip inti Lapisan A (penuh 5 dokumen atau ringkas).
- `GET | HEAD /editorial/core/{slug}`: Satu dokumen inti (`identity`, `principles`, `verification`, `ethics`, `language`).
- `GET | HEAD /editorial/desks/{slug}`: Profil desk aktif (`hukum-keadilan`, `teknologi-kebijakan`, `nasional-publik`); slug tidak dikenal mengembalikan `404 NOT_FOUND`.
- `GET | HEAD /editorial/formats/{format}`: Profil format (`NEWS`, `ANALYSIS`, `OPINION`, `EXPLAINER`, `FEATURE`, `INTERVIEW`).
- `GET | HEAD /editorial/operations/{slug}`: Dokumen operasional (`ai-workflow`, `quality-assessment`, `review-checklist`, `api-integration`).
- `GET | HEAD /editorial/context?desk={slug}&format={format}&channel=INGESTION_API|NEWSROOM|CONTRIBUTOR&coreMode=compact|full`: Penggabungan konteks selektif untuk satu penugasan spesifik (Lapisan A + satu Desk + satu Format + parameter Layer D opsional).
- `GET | HEAD /.well-known/verax-agent.json`, `GET | HEAD /openapi.json`, `GET | HEAD /llms.txt`, `GET | HEAD /llms-full.txt`, serta halaman `GET /developers`.

### 2.2 Titik Akhir Submission & Kapabilitas (`/api/internal/v1/*`)
1. `GET | HEAD /api/internal/v1/capabilities` *(Publik, tanpa auth)*: Mengembalikan daftar desk aktif (diurutkan berdasarkan `sortOrder` menaik), daftar format yang diizinkan vs ditahan/bersyarat, batas payload, tautan dokumentasi, serta metadata status standar.
2. `POST /api/internal/v1/ai-submissions/validate` *(Bearer auth, rate limit `30` permintaan/menit per IP)*: Validasi skema *dry-run* tanpa menyimpan ke basis data. Mengembalikan `{ valid, desk, warnings, requestId }` atau galat validasi `422`.
3. `POST /api/internal/v1/ai-submissions` *(Bearer auth, rate limit `12` permintaan/menit per IP)*:
   - Menerapkan idempotensi ketat melalui `idempotencyKey`: pengulangan kunci dengan payload identik mengembalikan `HTTP 200 OK` dengan `idempotentReplay: true` (dan `submissionStatus: "SUBMITTED"`, `articleStatus: "DRAFT"`); pemakaian ulang kunci untuk payload berbeda ditolak `HTTP 409 IDEMPOTENCY_CONFLICT`.
   - Menciptakan draf berstatus awal `articleStatus: "DRAFT"`, `submissionStatus: "SUBMITTED"`, seluruh sumber berstatus `UNVERIFIED`, serta byline sementara `"Draf Agen AI (Menunggu Penetapan Byline)"`.
4. `GET | HEAD /api/internal/v1/ai-submissions/{submissionId}` *(Bearer auth, terisolasi kepemilikan)*: Memantau `submissionStatus`, `articleStatus`, status keputusan editorial, dan waktu penerimaan/pembaruan tanpa membuka catatan telaah internal redaksi. Klien hanya dapat mengakses kiriman miliknya sendiri (`404 NOT_FOUND` untuk kiriman klien lain).

---

## 3. Skema Tujuh Blok Konten (`content[]`)

Tubuh artikel terdiri atas larik JSON berisi `1` hingga `300` blok terstruktur. HTML mentah tidak diterima atau dirender.

| `type` | Properti Wajib | Properti Opsional | Batas & Ketentuan Validator |
|---|---|---|---|
| `paragraph` | `type: "paragraph"`, `text` | `none` | `text`: `1` hingga `20.000` karakter (tidak boleh hanya berisi spasi pada `INGESTION_API`; pemformatan spasi di tepi isi tetap dipertahankan). Blok indeks `0` minimal `120` karakter memicu tipografi *drop cap*. |
| `heading` | `type: "heading"`, `level`, `text` | `none` | `level`: wajib `2` atau `3` (`H2`/`H3`); `text`: `1` hingga `300` karakter (tidak boleh hanya berisi spasi pada `INGESTION_API`). |
| `quote` | `type: "quote"`, `text` | `attribution` | `text`: `1` hingga `5.000` karakter (tidak boleh hanya berisi spasi pada `INGESTION_API`); `attribution`: maks `300` karakter. |
| `list` | `type: "list"`, `style`, `items` | `none` | **`style` WAJIB bernilai `"bullet"` atau `"number"`**; `items`: `1` hingga `50` butir, masing-masing `1` hingga `2.000` karakter (setiap butir pada `INGESTION_API` harus memuat karakter non-spasi). |
| `image` | `type: "image"`, `url` | `alt`, `caption`, `credit` | `url`: URL HTTP(S) atau path aset valid maks `2.000` karakter; `alt` & `caption`: maks `500`; `credit`: maks `300`. |
| `note` | `type: "note"`, `text` | `label` | `label`: maks `120` karakter; `text`: `1` hingga `3.000` karakter (tidak boleh hanya berisi spasi pada `INGESTION_API`). |
| `qa` | `type: "qa"`, `question`, `answer` | `none` | `question`: `1` hingga `1.000` karakter; `answer`: `1` hingga `10.000` karakter (keduanya tidak boleh hanya berisi spasi pada `INGESTION_API`, dan di ruang redaksi `GATE_EMPTY_CONTENT` memblokir publikasi jika kosong/hanya spasi). |

**Kewajiban Isi Non-Kosong (`GATE_EMPTY_CONTENT`):** Untuk lolos ke tahap terbit, `content[]` wajib memuat minimal satu blok berisi teks nyata non-kosong: `paragraph` dengan `text.trim().length > 0`, `quote` dengan `text.trim().length > 0`, `list` dengan minimal satu item non-kosong, atau `qa` dengan baik `question` maupun `answer` non-kosong. Endpoint `/validate` mengeluarkan peringatan bila `content[]` hanya memuat blok non-isi seperti `heading`, `image`, atau `note`.

---

## 4. Ringkasan Bidang Payload Pengiriman & Aturan Tambahan

| Bidang | Wajib saat Kirim | Batas dan Nilai Sah |
|---|---|---|
| `title` | Ya | String, `8` hingga `200` karakter (spasi tepi dipangkas sebelum validasi panjang; string hanya-spasi ditolak `422`). |
| `deck` | Opsional di intake; **Wajib sebelum `PUBLISH`** | String, maks `400` karakter. `/validate` memberi peringatan bila kosong. |
| `desk` | Ya | Slug desk aktif (`1` hingga `60` karakter setelah pemangkasan tepi; string hanya-spasi ditolak `422`). |
| `format` | Ya | Enum format (`ANALYSIS`, `OPINION`, `EXPLAINER`, `FEATURE`, `INTERVIEW`; `NEWS` sementara ditolak `422` pada jalur `INGESTION_API`). |
| `content` | Ya | Larik blok konten valid (`1` hingga `300` blok). |
| `sources` | Ya | Larik `1` hingga `40` rujukan: `title` (`3..300` karakter setelah pemangkasan tepi), `publisher?` (`<=200`), `url` (HTTP/HTTPS `<=2.000`), `sourceType` (`PRIMARY`, `SECONDARY`, `DOCUMENT`, `INTERVIEW`, `DATA`, `OFFICIAL`), `publishedAt?` (ISO 8601), `accessedAt?` (ISO 8601), `supports?` (`<=600`; pada `FEATURE`, minimal satu sumber `INTERVIEW` atau `PRIMARY` dan pada `INTERVIEW`, minimal satu sumber `INTERVIEW` wajib mengisi `supports >= 20` karakter setelah pemangkasan spasi tepi sebagai cek kelengkapan metadata intake saja, bukan pembuktian keaslian faktual), `isKeySource?` (boolean). |
| `images` | Tidak | Larik `0` hingga `20` lampiran: `url` (`<=2.000`), `creator?` (`<=200`), `license?` (`<=200`), `permissionEvidence?` (`<=600`), `caption?` (`<=500`). Cantumkan keterangan eksplisit pada `license` dan `caption` apabila visual bersifat sintetis/hasil AI. |
| `tags` | Tidak | Larik `0` hingga `10` string (`2..40` karakter setelah pemangkasan tepi). |
| `verificationNotes` | Opsional umum; **Wajib untuk `FEATURE` & `INTERVIEW`** | String teks bebas, maks `3.000` karakter. Pada format `FEATURE` dan `INTERVIEW`, wajib minimal `20` karakter (setelah pemangkasan spasi tepi) yang menerangkan asal peliputan atau wawancara dari peran manusia (`CHIEF_EDITOR`, `WRITER`, atau `CONTRIBUTOR`). Validasi ini hanya memeriksa kelengkapan metadata minimum di intake, bukan keaslian faktual atau jurnalistik. |
| `aiInvolvement` | Ya | `"none"`, `"assistive"`, atau `"substantive"`. |
| `aiUsageNote` | Opsional untuk `none`/`assistive`; sangat dianjurkan saat `substantive` | String. Batas validator API saat ini `1.000` karakter; **klien sangat dianjurkan membatasi panjang maksimal `600` karakter** agar tetap selaras dengan batas panjang catatan keterbukaan publik redaksi. |
| `agentId` | Ya | String, `2` hingga `120` karakter setelah pemangkasan tepi (string hanya-spasi ditolak `422`). |
| `idempotencyKey` | Ya | String unik, `8` hingga `128` karakter setelah pemangkasan tepi (string hanya-spasi ditolak `422`). |

---

## 5. Kode Autentikasi, Galat, dan Enam Gerbang Publikasi

### 5.1 Kode Galat API Submission
- `400 Bad Request`: `MALFORMED_JSON` (body permintaan bukan JSON yang valid).
- `401 Unauthorized`: `UNAUTHORIZED`, `CREDENTIAL_REVOKED`, `CREDENTIAL_EXPIRED`, `CLIENT_INACTIVE`, `FORBIDDEN_SCOPE`.
- `404 Not Found`: `NOT_FOUND` (termasuk pengajuan milik klien lain).
- `405 Method Not Allowed`: `METHOD_NOT_ALLOWED` (dengan header `Allow`).
- `409 Conflict`: `IDEMPOTENCY_CONFLICT` (kunci sama, isi payload berbeda).
- `422 Unprocessable Entity`: `VALIDATION_ERROR`, `FORMAT_REJECTED` (`FORMAT_PENDING_AUTHORIZATION` / `FORMAT_PRECONDITION_FAILED` / `FORMAT_NOT_ALLOWED`), `DESK_REJECTED` (`details[0].code: DESK_NOT_FOUND`).
- `429 Too Many Requests`: `RATE_LIMITED` (dengan header `Retry-After`).
- `500 Internal Server Error`: `INTERNAL_ERROR`.

### 5.2 Enam Gerbang Publikasi Keras (Dijalankan Eksklusif Redaksi Manusia)
Sebelum sebuah naskah dapat berubah ke `PUBLISHED`, server memverifikasi enam syarat:
1. `GATE_NO_KEY_SOURCES`: minimal satu sumber ditandai `isKeySource: true`.
2. `GATE_SOURCE_VERIFICATION`: seluruh sumber kunci berstatus `VERIFIED` (nol `UNVERIFIED` atau `DISPUTED`).
3. `GATE_EMPTY_CONTENT`: minimal satu blok isi non-kosong (`paragraph`, `quote`, `list`, atau `qa`).
4. `GATE_NO_DECK`: bidang `deck` tidak boleh kosong.
5. `GATE_AI_DISCLOSURE`: bila `aiInvolvement === "substantive"`, pengungkapan AI publik wajib diaktifkan.
6. `GATE_BYLINE_UNCONFIRMED`: `byline` final tidak boleh kosong atau memakai teks placeholder otomatis (`Draf Agen AI (Menunggu Penetapan Byline)`), dan artikel asal `INGESTION_API` wajib memiliki atribusi penyuntingan/kredit manusia atau penetapan byline sah sebelum terbit.

---

## 6. Resep Reproduksibilitas Checksum (`sha256`)

Untuk setiap dokumen tunggal maupun bundel yang dikembalikan endpoint `/editorial/*`:
1. Ambil string persis dari bidang JSON `bodyMarkdown` (atau isi Markdown murni setelah menghapus banner YAML HTTP bila mengunduh lewat `Accept: text/markdown`).
2. Pastikan pemisah baris dinormalisasikan ke LF (`\n`, mengganti `\r\n` dan `\r`).
3. Enkode sebagai byte UTF-8 murni tanpa BOM.
4. Hitung hash SHA-256 dan format sebagai string heksadesimal huruf kecil 64 karakter; hasilnya akan identik dengan bidang `sha256` dalam respons JSON dan banner metadata.
