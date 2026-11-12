---
documentId: VERAX-DECISIONS-REQUIRED-01
title: Daftar Keputusan Pemilik Produk, Hukum, dan Redaksi yang Masih Menunggu Penetapan
version: 1.0.0
status: PROPOSED
scope: governance
ownerRole: CHIEF_EDITOR
lastReviewed: 2026-11-12
---

# Daftar Keputusan yang Memerlukan Penetapan Pemilik Produk (`CHIEF_EDITOR`)

Dokumen ini merangkum seluruh isu kebijakan editorial, hukum, dan perubahan skema/kontrak berisiko yang **tidak** boleh diputuskan sepihak selama remediasi teknis lokal. Perubahan pada butir-butir di bawah ini memerlukan persetujuan eksplisit pemilik Verax Press.

---

## 1. Pengesahan Resmi Standar Editorial (`VERAX-EDITORIAL-AI` v`1.0.0`)
- **Kondisi Saat Ini:** Seluruh dokumen dalam `docs/editorial/` dan `verax-editorial-standard.manifest.json` berstatus `PROPOSED` dengan `effectiveDate: null` dan `isBindingEffectivePolicy: false`. Endpoint `/editorial/*` mengekspos dokumen ini secara eksplisit sebagai pratinjau non-mengikat.
- **Keputusan Diperlukan:** Penetapan oleh `CHIEF_EDITOR` kapan status dokumen dinaikkan menjadi `APPROVED` / `ACTIVE` beserta pengisian `effectiveDate`, baik untuk seluruh modul maupun per modul setelah uji coba redaksi lokal.

## 2. Kebijakan Format `NEWS` pada Jalur Agen AI vs Jalur Kontributor (`Decision D2`)
- **Status Terkini (v3.1, Superseded oleh `POL-02`):** Pernyataan historis di bawah bahwa `INGESTION_API` mengizinkan format `NEWS` telah digantikan (`SUPERSEDED`) oleh kebijakan `POL-02` dan implementasi fail-closed pada `src/lib/domain/constants.ts` (`INGESTION_PENDING_FORMATS = ["NEWS"]`), di mana pengiriman `NEWS` melalui `INGESTION_API` ditolak dengan `HTTP 422 FORMAT_REJECTED` (`FORMAT_PENDING_AUTHORIZATION`). Lihat bagian `POL-02` di bawah untuk opsi keputusan aktif.
- **Kondisi Saat Ini (Catatan Historis, Superseded oleh `POL-02`):** `CONTRIBUTOR_ALLOWED_FORMATS` menolak `NEWS` (`422`), sedangkan `INGESTION_ALLOWED_FORMATS` (`ingestion.ts`, `api-docs.ts`, `capabilities`) mengizinkan `NEWS` sebagai draf awal `DRAFT` dengan sumber `UNVERIFIED` dan `tests/developer-portal.test.ts` menguji perilaku tersebut. Sementara itu, dokumen `01_Verity_Editorial_Charter_V1.1.md` (`Decision D2`) pernah mencatat pembatasan format `NEWS` khusus bagi ruang redaksi internal.
- **Keputusan Diperlukan (Opsi Historis; lihat `POL-02` untuk kondisi fail-closed saat ini):** Tegaskan salah satu pilihan resmi:
  1. Mempertahankan `NEWS` diizinkan pada `INGESTION_API` sebagai draf awal terkarantina (dengan syarat ketat anti-fabrikasi di `formats/news.md` dan verifikasi manusia sebelum terbit); atau
  2. Membatasi `INGESTION_API` ke format non-breaking news sesuai tafsir ketat `D2` (perlu pembaruan tes regresi dan pengumuman breaking API).

## 3. Kewajiban `aiUsageNote` saat `aiInvolvement = "substantive"` & Keselarasan Panjang Karakter (`C7`)
- **Kondisi Saat Ini:**
  - Validator API hanya mengembalikan peringatan non-blocking jika `aiInvolvement === "substantive"` tanpa `aiUsageNote` (mengikuti perilaku yang diuji oleh `tests/regression.test.ts:288-309`), dan publikasi diblokir baru pada tahap akhir bila `aiDisclosurePublic === false` (`GATE_AI_DISCLOSURE`).
  - Batas `aiUsageNote` di `ingestion.ts` ialah `1.000` karakter, lalu disalin ke `Article.aiDisclosureNote`, padahal editor Studio (`PATCH /api/studio/articles/[id]`) membatasi `aiDisclosureNote` maksimal `600` karakter.
- **Keputusan Diperlukan:**
  1. Apakah pengiriman `aiInvolvement: "substantive"` tanpa `aiUsageNote` tetap diterima sebagai `DRAFT` dengan peringatan, atau harus diubah menjadi penolakan `422` pada tingkat intake?
  2. Tetapkan batas karakter tunggal (misal `600` karakter di `ingestion.ts` maupun Studio, atau perbesar Studio ke `1.000` karakter) serta pisahkan apakah `aiUsageNote` boleh menjadi catatan teknis sementara sementara `aiDisclosureNote` ditulis khusus oleh redaktur untuk pembaca publik.

## 4. Kebijakan Atribusi, Byline, dan Kredit untuk Draf dari `INGESTION_API` (`C5` Atribusi)
- **Status Terkini (v3.1, Superseded oleh `§11.1`, `AI_PLACEHOLDER_BYLINE` & `GATE_BYLINE_UNCONFIRMED`):** Klaim historis di bawah bahwa draf `INGESTION_API` mendapat nilai default `byline = "Redaksi Verax Press"` telah digantikan (`SUPERSEDED`) oleh aturan pada `§11.1`, konstanta `AI_PLACEHOLDER_BYLINE` (`"Draf Agen AI (Menunggu Penetapan Byline)"` di `src/lib/domain/constants.ts`), serta gerbang publikasi `GATE_BYLINE_UNCONFIRMED` (`src/app/api/studio/articles/[id]/transition/route.ts`).
- **Kondisi Saat Ini (Catatan Historis, Superseded oleh `§11.1`, `AI_PLACEHOLDER_BYLINE` & `GATE_BYLINE_UNCONFIRMED`):** Endpoint ingestion tidak menerima bidang `byline` bebas untuk mencegah spoofing identitas penulis; semua artikel dari `INGESTION_API` mendapat nilai sementara `byline = "Redaksi Verax Press"`. Padahal halaman publik `/kebijakan-ai` dan `VERAX_ETHICS_AND_RESPONSIBILITY.md` menegaskan byline `"Redaksi Verax Press"` hanya sah untuk karya yang benar-benar diverifikasi dan disunting secara bermakna oleh staf redaksi manusia.
- **Keputusan Diperlukan (Catatan Historis; penanda placeholder dan `GATE_BYLINE_UNCONFIRMED` sudah aktif):** Putuskan apakah API atau Studio memerlukan penanda khusus (misal `"Draf Awal Agen AI (Menunggu Penyuntingan)"` sampai `Article.status` masuk `FACT_CHECK` / `PUBLISHED` oleh editor, atau apakah gerbang publikasi perlu memastikan nama `ContributorPerson` / staf penyunting tercatat sebelum `PUBLISH`).

## 5. Rujukan Sumber Non-URL / Dokumen Luring
- **Kondisi Saat Ini:** `sourceItemSchema.url` di `ingestion.ts` mewajibkan URL `http://` atau `https://`, sehingga sumber arsip cetak fisik, putusan pengadilan offline, atau wawancara lapangan staf tidak memiliki bidang rujukan khusus tanpa URL.
- **Keputusan Diperlukan:** Menentukan apakah kontrak `SourceReference` dan model Prisma `SourceReference.url` akan diperluas agar mendukung rujukan terstruktur tanpa URL aktif (misalnya nomor dokumen arsip / metadata repository terverifikasi) atau tetap mensyaratkan tautan resmi/arsip terunggah.

## 6. Standar Minimal Penandaan `isKeySource` Saat Intake
- **Kondisi Saat Ini:** Klien AI dapat mengirim draf tanpa satu pun `isKeySource: true` (sistem hanya memberi warning dan memaksa editor menandai manual sebelum `PUBLISH` lewat `GATE_NO_KEY_SOURCES`).
- **Keputusan Diperlukan:** Tetapkan apakah minimal 1 sumber kunci usulan wajib dinyatakan pada `POST /api/internal/v1/ai-submissions` atau tetap menjadi wewenang eksklusif editor di Studio.

## 7. Alur API Feedback Editorial & Pengiriman Revisi oleh Agen AI
- **Kondisi Saat Ini:** `Submission.status` kini telah tersinkronisasi (`SUBMITTED` -> `EDITORIAL_REVIEW` -> `RESOLVED`), namun `GET /api/internal/v1/ai-submissions/{submissionId}` tidak mengekspos catatan revisi dari `ReviewComment`, dan tidak ada endpoint `POST .../revisions` atau `revisesSubmissionId` bagi klien AI untuk mengirim pembaruan naskah saat artikel berstatus `REVISION_NEEDED`.
- **Keputusan Diperlukan:**
  1. Merancang kontrak eksplisit kolom umpan balik terkurasi khusus AI (terpisah ketat dari `ReviewComment` internal berbendera `authorVisible = false`).
  2. Menetapkan skema resubmission berbasis versi (`ArticleVersion`) agar riwayat audit tidak tertimpa dan hanya sah ketika `Article.status === "REVISION_NEEDED"`.

## 8. Implementasi Penuh `risk_edit` dan `isSynthetic` (`C6` & `C8`)
- **Kondisi Saat Ini:** Prisma sudah memiliki kolom `notifiedAuthorAt` / `authorResponse` pada `ArticleVersion` (untuk `versionType = "risk_edit"`) dan kolom `MediaAsset.isSynthetic`, namun `PATCH /api/studio/articles/[id]` belum membuka `versionType: "risk_edit"` dan `imageItemSchema` di `ingestion.ts` belum menerima boolean `isSynthetic`.
- **Keputusan Diperlukan:** Mengesahkan alur notifikasi penulis pra-terbit untuk `risk_edit` serta penambahan bidang `isSynthetic` pada skema Ingestion API.

## 9. Kepatuhan Hukum & Status Kelembagaan (`LEGAL REVIEW REQUIRED`)
- **Kondisi Saat Ini:** `VERAX_WRITING_STANDARDS`, `/informasi-kelembagaan`, dan `core/VERAX_ETHICS_AND_RESPONSIBILITY.md` menegaskan bahwa Verax Press adalah media percontohan yang belum berbadan hukum pers, belum terverifikasi Dewan Pers, belum terdaftar sebagai PSE, dan belum menetapkan angka tenggat operasional Hak Jawab / Hak Koreksi. Peran staf aktual pun baru 2 role (`CHIEF_EDITOR`, `WRITER`) dibanding 6 peran konseptual pada `01_Charter §8`.
- **Keputusan Diperlukan:** Tinjauan penasihat hukum Indonesia sebelum peluncuran operasional penuh, pengisian tenggat layanan hak jawab/koreksi, harmonisasi teks kontrak pada `02_Verity_Contributor_Policy_Agreement_V1.1.md`, dan pemekaran RBAC staf bila tim bertambah.

## 10. Saluran Pendaftaran / Onboarding Akses Sandbox untuk Klien AI Eksternal
- **Kondisi Saat Ini:** Pembuatan `ApiClient` hanya dapat dilakukan secara manual oleh `CHIEF_EDITOR` di Studio (`/studio/api-clients`), tanpa formulir permohonan sandbox eksternal ataupun mekanisme klien uji terisolasi publik.
- **Keputusan Diperlukan:** Apakah dibutuhkan alur permohonan akses API terstruktur untuk mitra pengembang atau lingkungan sandbox terpisah sebelum memberikan kredensial kepada pihak eksternal.


---

## 11. Inventaris Pembuktian, Koreksi Konten Seed, dan Keputusan Tertunda Tambahan

### 11.1 Bukti Kepemimpinan dan Identitas Penulis (Leadership & Author Evidence Table)

| Peran / Entitas | Status Pembuktian Saat Ini | Aturan Publik yang Berlaku | Tindakan Pemimpin Redaksi yang Diperlukan |
| --- | --- | --- | --- |
| Pemimpin Redaksi (`CHIEF_EDITOR`) | Ditetapkan dan dikonfirmasi secara publik sebagai **Arya Rizky Ardhi Pratama** berdasarkan keputusan final pemilik (v3.1), selaras dengan halaman `/tentang` dan `/informasi-kelembagaan` | Halaman publik `/tentang` dan `/informasi-kelembagaan` mencantumkan **Arya Rizky Ardhi Pratama** sebagai Pemimpin Redaksi; dilarang menambahkan biografi, alamat surel pribadi, afiliasi, atau kredensial yang tidak terverifikasi | Selesai (terkonfirmasi final pada v3.1 untuk penamaan publik dan pengindeksan pencarian; tidak bersifat sementara dan tidak menunggu persetujuan lanjutan) |
| Redaktur Pelaksana / Editor Meja | Belum ada daftar nama redaktur publik terverifikasi | Halaman publik menyatakan tata kelola redaksi secara faktual tanpa mencantumkan susunan staf fiktif | Publikasikan susunan tim editorial terverifikasi setelah penugasan definitif disahkan |
| Kredit Penulis Draf `INGESTION_API` | Draf dari kanal AI otomatis ditetapkan dengan placeholder `Draf Agen AI (Menunggu Penetapan Byline)` | Dilarang menggunakan `"Redaksi Verax Press"` sebagai byline default draf API; publikasi diblokir oleh `GATE_BYLINE_UNCONFIRMED` hingga byline manusia ditetapkan | Verifikasi dan tetapkan kredit penulis/penyunting manusia pada Meja Redaksi sebelum transisi `PUBLISH` |
| Kredit Kolektif Redaksi (`Redaksi Verax Press`) | Disediakan hanya untuk artikel internal kanal `NEWSROOM` bila ditetapkan oleh editor manusia | Tidak pernah diberikan otomatis kepada naskah yang masuk melalui `INGESTION_API` | Pertahankan pemisahan hak pakai byline kolektif hanya untuk produk redaksi internal |

### 11.2 Status Kelembagaan dan Hukum Platform (Institutional & Legal Status Table)

| Aspek Kelembagaan | Status Terverifikasi | Batasan Klaim Publik | Keputusan yang Dibutuhkan |
| --- | --- | --- | --- |
| Identitas Proyek / Publikasi | Verax Press beroperasi sebagai nama kerja platform publikasi digital independen | Tidak mengklaim afiliasi lembaga pers eksternal atau kepemilikan fiktif | Sahkan bentuk badan hukum penyelenggara resmi sebelum operasional komersial |
| Status Badan Hukum Pers & Akta | Belum terverifikasi / belum dipublikasikan dalam repositori | Dilarang mengklaim status PT Pers, badan hukum terdaftar, atau nomor registrasi fiktif | Lengkapi legalitas badan hukum dan penanggung jawab sesuai UU Pers sebelum mencantumkannya di situs |
| Verifikasi Dewan Pers & PSE | Belum terdaftar / belum dipublikasikan dalam repositori | Catatan status kelembagaan wajib menyatakan ketiadaan verifikasi secara transparan | Putuskan jadwal dan prasyarat pendaftaran administratif PSE maupun pendataan Dewan Pers |
| Status Standar Editorial AI (`VERAX-EDITORIAL-AI`) | Versi `1.0.0` berstatus `PROPOSED` (`effectiveDate: null`, `isBindingEffectivePolicy: false`) | Seluruh manifest, API capabilities, OpenAPI, `llms*.txt`, dan halaman `/developers` menandai dokumen sebagai usulan (`PROPOSED`), bukan kebijakan aktif mengikat | Review redaksional penuh lalu ubah status ke `APPROVED` dengan `effectiveDate` yang sah apabila disetujui |

### 11.3 Daftar Koreksi Konten Artikel Seed (Seeded Article Content Correction Register)

Perbaikan tekstual dan tata kelola yang telah diterapkan pada data seed awal (`prisma/seed.ts`):

1. **Artikel Seed #2 (Independensi Media Digital):** Memperbaiki kesalahan tik `"Pelanggannya:"` menjadi `"Peluangnya:"` dan huruf kapital `"bebannya:"` menjadi `"Bebannya:"`.
2. **Artikel Seed #5 (Sitasi Sumber OWASP):** Memperbaiki bentuk kata `"risikonya HTML tak tersanitasi"` menjadi `"risiko HTML tak tersanitasi"`.
3. **Artikel Seed #6 (Hak Jawab & Koreksi):** Memperbaiki kesalahan tik `"membantau"` menjadi `"membantah"`.
4. **Artikel Seed #7 (Contoh Draf `INGESTION_API`):** Mengubah nilai `byline` dari `"Redaksi Verax Press"` menjadi `AI_PLACEHOLDER_BYLINE` (`"Draf Agen AI (Menunggu Penetapan Byline)"`) agar konsisten dengan kebijakan penahanan byline kolektif pada draf API.

### POL-02: Otorisasi Format `NEWS` pada Kanal `INGESTION_API`

- **Status Saat Ini:** Ditahan secara fail-closed (`pendingAuthorizationFormats: ["NEWS"]`). Permintaan `POST /api/internal/v1/ai-submissions`, `/validate`, dan `/editorial/context?channel=INGESTION_API&format=NEWS` ditolak dengan `HTTP 422 FORMAT_REJECTED` (`details[0].code: "FORMAT_PENDING_AUTHORIZATION"`).
- **Konteks Keputusan:** Berita keras (*hard news*) menuntut verifikasi lapangan langsung dan pertanggungjawaban hukum primer yang belum dapat didelegasikan ke pengiriman agen otonom selama standar masih berstatus `PROPOSED`.
- **Opsi Keputusan:**
  1. Pertahankan penahanan permanen agar `NEWS` eksklusif diproduksi melalui `NEWSROOM`.
  2. Buka `NEWS` di `INGESTION_API` hanya setelah standar `VERAX-EDITORIAL-AI` berstatus `APPROVED` dan seluruh gerbang bukti primer tambahan disepakati.

### POL-03: Prasyarat Kondisional Format `FEATURE` dan `INTERVIEW` pada `INGESTION_API`

- **Status Saat Ini:** Aktif secara kondisional (`conditionalFormats: ["FEATURE", "INTERVIEW"]`). Pengiriman ditolak (`HTTP 422 FORMAT_REJECTED`, `details[0].code: "FORMAT_PRECONDITION_FAILED"`) bila tidak memenuhi syarat sumber `PRIMARY`/`INTERVIEW` dengan `supports` minimal 20 karakter (khusus `INTERVIEW` wajib menyertakan minimal 1 sumber bertipe `INTERVIEW`) serta `verificationNotes` minimal 20 karakter.
- **Keputusan yang Diperlukan:** Pemimpin Redaksi perlu meratifikasi apakah prasyarat bukti minimal tersebut memadai atau memerlukan penyertaan transkrip wawancara penuh / verifikasi rekaman sebelum diterima sebagai draf meja redaksi.

### POL-04: Rekonsiliasi Ambang Panjang `aiUsageNote` (600 vs 1.000 Karakter)

- **Status Saat Ini:** Pengiriman naskah AI memancarkan peringatan non-blocking (`warnings`) bila `aiUsageNote` melebihi 600 karakter, sementara skema validasi menolak permintaan apabila panjang `aiUsageNote` melebihi 1.000 karakter.
- **Keputusan yang Diperlukan:** Tetapkan apakah kebijakan redaksi final menginginkan satu batas keras tunggal (600 karakter atau 1.000 karakter) atau mempertahankan mekanisme dua tingkat saat ini (peringatan ringkas di 600 karakter, batas maksimum di 1.000 karakter).
