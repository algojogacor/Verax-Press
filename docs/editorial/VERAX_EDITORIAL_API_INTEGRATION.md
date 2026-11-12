---
documentId: VERAX-TECH-INTEGRATION-01
title: Kontrak Teknis Integrasi Editorial, Skema API, dan Catatan Keselarasan Sistem
version: 1.0.0
status: PROPOSED
scope: technical-integration
appliesTo:
  - ai-agents
  - ingestion-api-clients
  - platform-engineers
  - newsroom-operators
requiredDependencies:
  - docs/editorial/README.md
  - docs/editorial/operations/VERAX_AI_AGENT_WORKFLOW.md
lastReviewed: 2026-11-12
---

# Kontrak Teknis Integrasi Editorial, Skema API, dan Catatan Keselarasan Sistem

Dokumen ini memisahkan seluruh detail teknis kode sumber, titik akhir API, batas karakter skema Zod, model basis data Prisma, gerbang publikasi CMS, serta celah keselarasan dokumen lama dari prosa kebijakan editorial. Kebijakan substantif jurnalistik berada di `docs/editorial/core/`, `desks/`, `formats/`, dan `operations/`.

Seluruh fakta implementasi di bawah ini diverifikasi langsung dari kode sumber repositori `D:\Projects\verax` pada **12 November 2026**.

---

## 1. Peran Sistem, Jalur Asal (`origin`), dan Status Artikel Aktual

### 1.1 Peran Staf dan Aktor Eksternal Aktual
- **Staf Internal CMS Studio (`prisma/schema.prisma`, `src/lib/domain/constants.ts`, `src/lib/domain/permissions.ts`):** Sistem berjalan hanya memakai dua kode peran `StaffUser`, yakni `CHIEF_EDITOR` (Pemimpin Redaksi: otoritas penuh review, penandaan sumber kunci, verifikasi sumber, koreksi publik, manajemen API client, manajemen staf/aplikasi, dan persetujuan `PUBLISH` tunggal) dan `WRITER` (Penulis internal: menyusun dan merevisi naskah milik sendiri pada status `DRAFT` atau `REVISION_NEEDED`, menambah sumber status `UNVERIFIED`, serta mengajukan ke penelaahan).
- **Kontributor Eksternal (`Contributor`, `origin = "CONTRIBUTOR"`):** Akun terpisah pada rute portal kontributor; hanya dapat mengakses dan menyunting naskah miliknya, menambah sumber `UNVERIFIED`, serta menjalankan transisi `SUBMIT_REVIEW`, `RESUBMIT_REVIEW`, dan `WITHDRAW`.
- **Agen AI (`ApiClient`, `origin = "INGESTION_API"`):** Klien API internal dengan cakupan tunggal `submit` (*submit-only*). Agen tidak memiliki endpoint publikasi, persetujuan, pengubahan sumber terverifikasi, maupun akses ke catatan telaah internal (`ReviewComment` berflag `authorVisible = false`).

### 1.2 Mesin Status Artikel Aktual (`src/lib/domain/workflow.ts`)
Semua artikel masuk melalui alur status tunggal:
1. Status aktif alur kerja: `DRAFT` -> `PENDING_REVIEW` -> `FACT_CHECK` -> `PENDING_APPROVAL` -> `PUBLISHED` (atau `REVISION_NEEDED`, `REJECTED`, `WITHDRAWN`, `CORRECTED`, `RETRACTED`, `ARCHIVED`).
2. **Tidak ada status `SCHEDULED`** pada implementasi aktif maupun skema basis data.
3. Tidak ada publikasi otomatis oleh API, penjadwal, atau agen penilai mutu.

### 1.3 Kelayakan Format per Jalur Pengiriman (`constants.ts`, `ingestion.ts`, `contributor/articles/route.ts`)

| `format` | Label UI (`FORMAT_LABELS`) | `NEWSROOM` | `INGESTION_API` | `CONTRIBUTOR` | Perilaku Sistem Penting |
|---|---|---|---|---|---|
| `NEWS` | `Berita` | Ya | Ya | **Ditolak (`422`)** | Kiriman API masuk sebagai `DRAFT` dan sumber `UNVERIFIED`; portal kontributor menolak `NEWS` sesuai Editorial Charter `D2`. |
| `OPINION` | `Opini` | Ya | Ya | Ya | Halaman publik menampilkan `OPINION_DISCLAIMER` secara otomatis (`src/app/(public)/opini/page.tsx` dan `artikel/[slug]/page.tsx`). |
| `ANALYSIS` | `Analisis` | Ya | Ya | Ya | Tersedia di ketiga jalur. |
| `EXPLAINER` | `Penjelas` | Ya | Ya | Ya | Tersedia di ketiga jalur. |
| `FEATURE` | `Kisah Khas` | Ya | Ya | Ya | Tersedia di ketiga jalur. |
| `INTERVIEW` | `Wawancara` | Ya | Ya | Ya | Tersedia di ketiga jalur. |

---

## 2. Daftar Titik Akhir Terkait Agen AI dan Pengiriman Naskah

1. **Penemuan Kapabilitas Aktif (Publik):**
   - `GET /api/internal/v1/capabilities` (`src/app/api/internal/v1/capabilities/route.ts`) mengembalikan daftar desk dengan `Desk.isActive === true` (diurutkan berdasarkan `name` ascending pada endpoint ini, sedangkan `src/lib/domain/desks.ts` mengurutkan `sortOrder` ascending), `allowedFormats` (`INGESTION_ALLOWED_FORMATS`), tautan dokumentasi, serta batas `rateLimitPerMinute: 12`, `maxTitleLength: 200`, `maxSourcesCount: 40`, `maxImagesCount: 20`.
2. **Validasi Dry Run (Terautentikasi Bearer `<CLIENT_ID>.<CLIENT_SECRET>`, Rate Limit 30/menit):**
   - `POST /api/internal/v1/ai-submissions/validate` (`src/app/api/internal/v1/ai-submissions/validate/route.ts`) memvalidasi skema tanpa menyimpan ke basis data; mengembalikan `{ valid, desk, warnings, requestId }` atau galat `422`.
3. **Pengiriman Draf Naskah (Terautentikasi Bearer, Rate Limit 12/menit):**
   - `POST /api/internal/v1/ai-submissions` (`src/app/api/internal/v1/ai-submissions/route.ts`) menerapkan pengecekan `idempotencyKey` (key sama + payload hash identik mengembalikan `200` dengan `idempotentReplay: true`; key sama + payload beda mengembalikan `409 IDEMPOTENCY_CONFLICT`). Menciptakan `Article` (`status = "DRAFT"`, `byline = "Redaksi Verax Press"` sementara sebelum penetapan editor, `aiDisclosureNote = payload.aiUsageNote ?? null`), `ArticleVersion` (`versionType = "ingestion"`), `SourceReference` (seluruh sumber selalu `verificationStatus = "UNVERIFIED"`), `MediaAsset`, `Submission`, serta `AuditEvent` (`submission.ingested`).
4. **Pemantauan Status Pengiriman (Terautentikasi Bearer, Terisolasi Kepemilikan):**
   - `GET /api/internal/v1/ai-submissions/{submissionId}` (`src/app/api/internal/v1/ai-submissions/[submissionId]/route.ts`) mengembalikan status pengiriman dan status editorial tanpa membuka `ReviewComment` internal; mengembalikan `404 NOT_FOUND` bila bukan milik klien pemohon.
5. **Titik Akhir Dokumentasi Mesin Eksposur:**
   - `GET /openapi.json`, `GET /llms.txt`, `GET /llms-full.txt`, `GET /.well-known/verax-agent.json` (bersumber dari `src/lib/domain/api-docs.ts`), dan halaman web `/developers` (`src/app/(public)/developers/page.tsx`).
6. **Titik Akhir Terkait Lainnya (Hanya Staf / Kontributor):**
   - Studio CMS: `PATCH /api/studio/articles/[id]`, `POST /api/studio/articles/[id]/sources`, `PATCH|DELETE /api/studio/articles/[id]/sources/[sourceId]`, `POST /api/studio/articles/[id]/transition`, `POST /api/studio/corrections`, `GET|POST /api/studio/media`.
   - Kontributor Portal: `GET|POST /api/contributor/articles`, `POST /api/contributor/articles/[id]/sources`, `POST /api/contributor/articles/[id]/transition`.

---

## 3. Skema Blok Konten Aktual (`src/lib/domain/content.ts`) dan Perender (`content-renderer.tsx`)

Seluruh tubuh artikel disimpan dan divalidasi sebagai larik JSON (`articleContentSchema`, maksimal `300` blok). Tidak ada HTML mentah yang diizinkan masuk atau dirender.

### 3.1 Tujuh Tipe Blok yang Valid

| `type` | Properti Wajib | Properti Opsional | Batas dan Aturan Validator | Perilaku Perender Publik (`ContentRenderer`) |
|---|---|---|---|---|
| `paragraph` | `type: "paragraph"`, `text` | `none` | `text`: 1 hingga `20.000` karakter. | Jika blok indeks `0` bertipe `paragraph` dan `text.length >= 120`, huruf pertama dirender sebagai *drop cap* klasik 2 baris (`first-letter:text-[3.25rem]`). |
| `heading` | `type: "heading"`, `level`, `text` | `none` | `level`: wajib `2` atau `3` (`H2`/`H3`); `text`: 1 hingga `300` karakter. | `H2` pertama memberi jeda babak lebih besar (`mt-12`); heading tidak memakai *drop cap*. |
| `quote` | `type: "quote"`, `text` | `attribution` | `text`: 1 hingga `5.000` karakter; `attribution`: maks `300` karakter. | Dirender terpusat sebagai *pull-quote* miring berbingkai garis atas-bawah. |
| `list` | `type: "list"`, `style`, `items` | `none` | **`style` WAJIB bernilai `"bullet"` atau `"number"`**; `items`: larik `1` hingga `50` butir, tiap butir `1` hingga `2.000` karakter. | `bullet` dirender dengan kotak kecil; `number` dirender dengan nomor dua digit (`01`, `02`). |
| `image` | `type: "image"`, `url` | `alt`, `caption`, `credit` | `url`: HTTP(S) atau path lokal `/...` maks `2.000` karakter; `alt` & `caption`: maks `500` karakter; `credit`: maks `300` karakter. | Disaring lewat `safeMediaSrcUrl`, dimuat malas (`loading="lazy"`). |
| `note` | `type: "note"`, `text` | `label` | `label`: maks `120` karakter; `text`: 1 hingga `3.000` karakter. | Kotak keterangan berlatar lembut untuk konteks metodologi, pembaruan, atau catatan redaksi. |
| `qa` | `type: "qa"`, `question`, `answer` | `none` | `question`: 1 hingga `1.000` karakter; `answer`: 1 hingga `10.000` karakter. | Merender label `T` beraksen untuk pertanyaan dan `J` untuk jawaban secara otomatis. |

---

## 4. Batas Skema Payload Ingestion API (`src/lib/domain/ingestion.ts`)

| Bidang | Wajib saat Kirim | Batas dan Nilai Sah |
|---|---|---|
| `title` | Ya | String, `8` hingga `200` karakter. |
| `deck` | Opsional di intake; **Wajib sebelum `PUBLISH`** | String, maks `400` karakter. |
| `desk` | Ya | Slug desk dengan `isActive: true` di tabel `Desk` (`1..60` karakter). Saat ini: `hukum-keadilan`, `teknologi-kebijakan`, `nasional-publik`. |
| `format` | Ya | `NEWS`, `OPINION`, `ANALYSIS`, `EXPLAINER`, `FEATURE`, `INTERVIEW`. |
| `content` | Ya | Larik blok valid `articleContentSchema` (maks `300` blok; harus memuat blok teks non-kosong untuk lolos `GATE_EMPTY_CONTENT`). |
| `sources` | Ya | Larik `1` hingga `40` `sourceItemSchema`: `title` (`3..300`), `publisher?` (`<=200`), `url` (HTTP/HTTPS `<=2.000`), `sourceType` (`PRIMARY`, `SECONDARY`, `DOCUMENT`, `INTERVIEW`, `DATA`, `OFFICIAL`, default `"SECONDARY"`), `publishedAt?` (string), `accessedAt?` (string), `supports?` (`<=600`), `isKeySource?` (boolean). |
| `images` | Tidak | Larik `0` hingga `20` `imageItemSchema`: `url` (`mediaUrlSchema <=2.000`), `creator?` (`<=200`), `license?` (`<=200`), `permissionEvidence?` (`<=600`), `caption?` (`<=500`). |
| `tags` | Tidak | Larik `0` hingga `10` string (`2..40` karakter). Disimpan di `Submission.tagsJson`; tidak otomatis terpublikasi. |
| `verificationNotes` | Tidak | String, maks `3.000` karakter. Disimpan di `Submission.verificationNotes`. |
| `aiInvolvement` | Ya | `"none"`, `"assistive"`, atau `"substantive"`. |
| `aiUsageNote` | Tidak (sangat dianjurkan/peringatan non-blocking bila `substantive`) | String, maks `1.000` karakter. Disimpan di `Submission.aiUsageNote` **dan disalin awal ke `Article.aiDisclosureNote`**. |
| `agentId` | Ya | String, `2` hingga `120` karakter. |
| `idempotencyKey` | Ya | String unik, `8` hingga `128` karakter. |

---

## 5. Lima Gerbang Publikasi Keras (`POST /api/studio/articles/[id]/transition`)

Transisi menuju `PUBLISHED` hanya dapat dieksekusi oleh `CHIEF_EDITOR` dari status `PENDING_APPROVAL` dan wajib melewati lima gerbang server:

| Kode Error (`422`) | Kondisi Penolakan | Penanggung Jawab Penyelesaian |
|---|---|---|
| `GATE_NO_KEY_SOURCES` | Artikel belum memiliki satu pun `SourceReference` bertanda `isKeySource: true`. | `CHIEF_EDITOR` menandai sumber kunci di tab sumber Studio. |
| `GATE_SOURCE_VERIFICATION` | Masih ada sumber kunci berstatus `UNVERIFIED` atau `DISPUTED`. | `CHIEF_EDITOR` memeriksa dokumen asli dan mengubah seluruh sumber kunci ke `VERIFIED`. |
| `GATE_EMPTY_CONTENT` | Tidak ada blok berisi teks non-kosong pada tipe `paragraph`, `quote`, `list`, atau `qa`. | Penulis atau editor melengkapi isi artikel. |
| `GATE_NO_DECK` | Bidang `article.deck` kosong atau hanya spasi putih. | Penulis, agen, atau editor mengisi `deck` (maks `400` karakter). |
| `GATE_AI_DISCLOSURE` | `aiInvolvement === "substantive"` tetapi `aiDisclosurePublic === false`. | `CHIEF_EDITOR` mengaktifkan pengungkapan AI publik serta memeriksa `aiDisclosureNote`. |

---

## 6. Inventaris Konflik Implementasi dan Celah Dokumentasi Teknis (`C1` hingga `C8`)

Penyelarasan kode aplikasi berada di luar mandat dokumen editorial ini. Celah berikut dicatat apa adanya dari inspeksi langsung kode agar agen, penulis, dan tim pengembang tidak terjebak asumsi keliru:

1. **`C1`: `NEWS` via Ingestion API vs Charter `D2` (`LOCKED`):** `01_Charter` Decision `D2` menyatakan format `NEWS` hanya diproduksi oleh newsroom, sedangkan `INGESTION_ALLOWED_FORMATS` (`src/lib/domain/constants.ts`), `ingestion.ts`, `api-docs.ts`, dan `/developers` mengizinkan agen AI mengirim draf `NEWS` (status `DRAFT`, sumber `UNVERIFIED`), sementara portal kontributor memblokir `NEWS`. *Resolusi operasional saat ini:* ikuti perilaku validator API aktual bagi Agen AI dengan pembatasan ketat anti-fabrikasi liputan pada `formats/news.md`, sambil mencatat status keputusan `D2` ini untuk tinjauan Pemimpin Redaksi.
2. **`C2`: Jumlah Peran Staf dan Ketersediaan Rute Kontributor Tahap B:** `01_Charter §8` dan `03_Verity_Technical_Architecture_V1.1.md §5` menyebut enam peran termasuk `Editor` terpisah dan menempatkan portal kontributor pada Tahap B setelah gerbang hukum/kapasitas; implementasi aktif baru memiliki dua peran `StaffUser` (`CHIEF_EDITOR`, `WRITER`), sedangkan rute `/api/contributor/*` sudah tersedia di basis kode.
3. **`C3`: Ketidakselarasan `VERAX_WRITING_STANDARDS.md` vs Prosa Jurnalistik:** Aturan larangan tanda baca mutlak pada salinan sistem berpotensi merusak kutipan atau istilah baku jika diterapkan mekanis ke artikel; `VERAX_LANGUAGE_AND_STYLE.md` membatasi cakupan masing-masing dokumen secara tegas.
4. **`C4`: Sinkronisasi Skema Blok di `api-docs.ts` dan `/developers` `[DIREMEDIASI DI KODE]`:** Spesifikasi OpenAPI 3.1.0, `/llms-full.txt`, dan `/developers` telah diperbarui agar mendokumentasikan ketujuh blok (`paragraph`, `heading`, `quote`, `list` dengan properti wajib `style`, `image`, `note`, `qa`) memakai skema diskriminator `oneOf`. Catatan penomoran tanggal pada `sourceItemSchema` (`C6`) juga telah diperketat melalui validator ISO 8601 (`parseOptionalIsoDate`).
5. **`C5`: `deck` Opsional saat Intake vs `GATE_NO_DECK` saat `PUBLISH`:** `ingestion.ts` membiarkan `deck` opsional di API intake (kini memicu peringatan non-blocking pada `/validate` jika kosong), namun `transition/route.ts` memblokir `PUBLISH` jika `deck` kosong. Oleh karena itu standar mewajibkan penyusunan `deck` sejak awal pada level alur kerja editorial.
6. **`C6`: Celah `isSynthetic` dan Validasi Tanggal pada `ingestion.ts` `[SEBAGIAN DIREMEDIASI]`:**
   - Tabel `MediaAsset` dan `/api/studio/media` memiliki kolom boolean `isSynthetic`, namun `imageItemSchema` pada `ingestion.ts` belum menyediakan bidang `isSynthetic` (tercatat pada `DECISIONS_REQUIRED.md`). Oleh sebab itu Agen AI wajib menuliskan keterangan sifat sintetis secara terang pada kolom `license` dan `caption` apabila mengirim gambar konseptual.
   - Validasi tanggal `publishedAt` dan `accessedAt` pada `ingestion.ts` kini telah diperketat menerima format ISO 8601 yang sah (`YYYY-MM-DD` atau `YYYY-MM-DDTHH:mm:ssZ`) dengan penolakan `422 VALIDATION_ERROR` (bukan lagi `new Date()` mentah yang berisiko `500`).
7. **`C7`: Ketidaksinkronan Label Mikro dan Salinan `aiUsageNote` ke `aiDisclosureNote` `[SEBAGIAN DIREMEDIASI]`:**
   - `STATUS_LABELS.DRAFT` di `constants.ts` masih tertulis `"Draft"`, berbeda dengan konvensi `"Draf"` di `VERAX_WRITING_STANDARDS.md`.
   - `api-docs.ts` (`getLlmsFullTxt`) telah diperbarui agar selaras dengan penekanan verifikasi sumber primer, standar modular `PROPOSED`, serta pemisahan kebijakan jalur. Daftar status di `02_Contributor_Policy §6` masih menunggu harmonisasi pasca-tinjauan hukum.
   - `ai-submissions/route.ts` menyalin `aiUsageNote` (batas `1.000` karakter) awal ke `Article.aiDisclosureNote` (batas `600` karakter saat disunting di Studio). Penyelarasan wajib tidaknya `aiUsageNote` saat `substantive` serta batas karakter tunggal tercatat pada `DECISIONS_REQUIRED.md`.
8. **`C8`: Dukungan Rute Eksekusi `risk_edit` Belum Lengkap di Studio API (plus Rute Revisi AI):** Skema Prisma (`ArticleVersion.versionType`, `notifiedAuthorAt`, `authorResponse`), `constants.ts`, dan `permissions.ts` (`article:risk_edit`) telah menyiapkan tipe versi `risk_edit`, namun endpoint `PATCH /api/studio/articles/[id]/route.ts` saat ini baru menerima `versionType: z.enum(["author", "editorial_copyedit"])`. Status sinkronisasi `Submission.status` pada `studio/articles/[id]/transition` telah diperbaiki (`EDITORIAL_REVIEW` dan `RESOLVED`), sedangkan endpoint API pengiriman ulang revisi AI dan pembacaan feedback terkurasi masih membutuhkan keputusan produk (`DECISIONS_REQUIRED.md`).

---

## 7. Target Eksposur Mesin dan Sinkronisasi Lanjutan `[TERIMPLEMENTASI PRATINJAU PROPOSED]`

Basis pengetahuan modular dari `docs/editorial/verax-editorial-standard.manifest.json` kini diekspos secara baca-saja melalui:
1. `GET|HEAD /editorial/manifest.json`, `/editorial/core`, `/editorial/core/{slug}`, `/editorial/desks/{slug}`, `/editorial/formats/{format}`, `/editorial/operations/{slug}`, dan resolver konteks selektif `/editorial/context` (status `PROPOSED`, `isBindingEffectivePolicy: false`);
2. `GET|HEAD /api/internal/v1/capabilities` dan `GET|HEAD /.well-known/verax-agent.json` (`standardId`, `semanticVersion`, `status`, desk aktif, format aktif, serta tautan manifest dan konteks selektif);
3. `GET|HEAD /openapi.json`, `GET|HEAD /llms.txt`, `GET|HEAD /llms-full.txt`, serta halaman `/developers`.
