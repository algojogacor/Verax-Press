---
documentId: VERAX-INDEX-00
title: Indeks Basis Pengetahuan Editorial dan Protokol Pemuatan Selektif Verax Press
version: 1.0.0
status: PROPOSED
scope: index
appliesTo:
  - all-desks
  - all-formats
  - human-contributors
  - newsroom-staff
  - ai-agents
requiredDependencies: []
lastReviewed: 2026-11-12
---

# Basis Pengetahuan Editorial Verax Press (`VERAX-EDITORIAL-AI`)

Basis pengetahuan ini mengatur standar penulisan naskah jurnalistik dan operasional Agen Kecerdasan Artifisial (`AI Agent`) di **Verax Press** untuk seluruh penulis internal, kontributor eksternal, redaktur, dan klien API eksternal.

Standar ini **terpisah secara tegas** dari [`VERAX_WRITING_STANDARDS.md`](./VERAX_WRITING_STANDARDS.md), yang tetap mengatur salinan milik sistem (*system-owned copy*: antarmuka pengguna, label CMS, pesan galat, metadata, dan dokumen kelembagaan).

- **ID Standar:** `VERAX-EDITORIAL-AI`
- **Versi:** `1.0.0`
- **Status:** `PROPOSED` (menunggu pengesahan Pemimpin Redaksi / `CHIEF_EDITOR`; Verax Press beroperasi sebagai nama kerja media digital independen percontohan dengan rujukan hukum berstatus `LEGAL REVIEW REQUIRED`)
- **Indeks Mesin Pendamping:** [`verax-editorial-standard.manifest.json`](./verax-editorial-standard.manifest.json)

---

## 1. Struktur Direktori Modular

```text
docs/editorial/
|-- README.md                                  # Indeks utama, protokol pemuatan selektif, resolusi konflik
|-- verax-editorial-standard.manifest.json     # Indeks mesin untuk penemuan profil & kontrak API
|-- VERAX_EDITORIAL_API_INTEGRATION.md         # Kontrak skema API, 7 blok konten, gerbang publish, konflik C1-C8
|-- VERAX_EDITORIAL_AI_WRITING_STANDARD.md     # Penunjuk kanonik arsip lama ke struktur modular
|-- VERAX_WRITING_STANDARDS.md                 # Standar terpisah untuk salinan milik sistem (tidak berubah)
|-- core/                                      # Lapisan A: prinsip universal wajib bagi semua naskah
|   |-- VERAX_EDITORIAL_IDENTITY.md            # Identitas, 4 pilar editorial, 4 lapisan, kata kunci normatif
|   |-- VERAX_JOURNALISTIC_PRINCIPLES.md       # VERAX-R01..VERAX-R10 & 5 kategori epistemik
|   |-- VERAX_RESEARCH_AND_VERIFICATION.md     # 5 tingkat sumber, supports, uji 7 titik, 8 larangan fabrikasi
|   |-- VERAX_ETHICS_AND_RESPONSIBILITY.md     # Konflik kepentingan, kewaspadaan hukum, privasi, risk-edit
|   `-- VERAX_LANGUAGE_AND_STYLE.md            # Prosa jurnalistik, 7 batas anti-AI, ledger skill lokal MIT
|-- desks/                                     # Lapisan B: muat HANYA SATU desk sesuai penugasan
|   |-- hukum-keadilan.md                      # Desk aktif #1: Hukum & Keadilan
|   |-- teknologi-kebijakan.md                 # Desk aktif #2: Teknologi & Kebijakan
|   `-- nasional-publik.md                     # Desk aktif #3: Nasional & Publik
|-- formats/                                   # Lapisan C: muat HANYA SATU format sesuai penugasan
|   |-- news.md                                # NEWS (Berita)
|   |-- analysis.md                            # ANALYSIS (Analisis)
|   |-- opinion.md                             # OPINION (Opini)
|   |-- explainer.md                           # EXPLAINER (Penjelas)
|   |-- feature.md                             # FEATURE (Kisah Khas)
|   `-- interview.md                           # INTERVIEW (Wawancara)
|-- operations/                                # Lapisan D, alur agen, rubrik mutu, dan daftar periksa
|   |-- VERAX_AI_AGENT_WORKFLOW.md             # 11 parameter Layer D, 10 langkah agen, 7 larangan AI
|   |-- VERAX_EDITORIAL_QUALITY_ASSESSMENT.md  # Non-kuota kata, FAIL-01..07, DIM-01..06, larangan auto-publish
|   `-- VERAX_EDITORIAL_REVIEW_CHECKLIST.md    # Daftar periksa Penulis, Agen AI, dan CHIEF_EDITOR
`-- examples/                                  # Rujukan opsional berbasis permintaan (bukan konteks wajib)
    |-- good-and-bad-examples.md               # Contoh kontrastif eksekusi baik vs buruk [CONTOH SIMULASI FIKTIF]
    `-- desk-format-examples.md                # Matriks penuh 3 x 6 dan 10 skenario walk-through
```

---

## 2. Protokol Pemuatan Konteks Selektif (`WAJIB`)

Basis pengetahuan ini dipecah secara modular agar Agen AI maupun penyusun naskah **tidak perlu memuat desk lain, format lain, atau bank contoh penuh** ke dalam jendela konteks kerjanya.

### Urutan Pemuatan Wajib per Penugasan (`desk` + `format`)

1. **Tahap 1 (Indeks):** Baca [`README.md`](./README.md) ini untuk menentukan berkas desk dan format target serta hierarki resolusi konflik.
2. **Tahap 2 (Lapisan A / Inti Universal):** Muat seluruh lima berkas di `core/`:
   - [`core/VERAX_EDITORIAL_IDENTITY.md`](./core/VERAX_EDITORIAL_IDENTITY.md)
   - [`core/VERAX_JOURNALISTIC_PRINCIPLES.md`](./core/VERAX_JOURNALISTIC_PRINCIPLES.md)
   - [`core/VERAX_RESEARCH_AND_VERIFICATION.md`](./core/VERAX_RESEARCH_AND_VERIFICATION.md)
   - [`core/VERAX_ETHICS_AND_RESPONSIBILITY.md`](./core/VERAX_ETHICS_AND_RESPONSIBILITY.md)
   - [`core/VERAX_LANGUAGE_AND_STYLE.md`](./core/VERAX_LANGUAGE_AND_STYLE.md)
3. **Tahap 3 (Lapisan B / Desk Tunggal):** Muat **tepat satu** berkas desk aktif yang ditugaskan (`desks/<slug>.md`). **Dilarang** memuat profil dua desk lainnya secara bersamaan kecuali tugas secara eksplisit meminta penelaahan lintas desk.
4. **Tahap 4 (Lapisan C / Format Tunggal):** Muat **tepat satu** berkas format aktif yang ditugaskan (`formats/<format_lowercase>.md`). **Dilarang** memuat profil lima format lainnya agar suara dan struktur naskah tidak saling mencampur.
5. **Tahap 5 (Operasional & Integrasi Teknis):**
   - Seluruh penulis dan agen yang mengerjakan tugas terstruktur memuat [`operations/VERAX_AI_AGENT_WORKFLOW.md`](./operations/VERAX_AI_AGENT_WORKFLOW.md) (aturan Layer D dan pelaporan celah).
   - Agen AI yang menyusun payload ke `/api/internal/v1/*` memuat pula [`VERAX_EDITORIAL_API_INTEGRATION.md`](./VERAX_EDITORIAL_API_INTEGRATION.md) dan daftar periksa Agen AI di [`operations/VERAX_EDITORIAL_REVIEW_CHECKLIST.md`](./operations/VERAX_EDITORIAL_REVIEW_CHECKLIST.md).
   - Penyunting (`CHIEF_EDITOR`) atau agen pemeriksa mutu memuat [`operations/VERAX_EDITORIAL_QUALITY_ASSESSMENT.md`](./operations/VERAX_EDITORIAL_QUALITY_ASSESSMENT.md) dan daftar periksa peran penyunting.
6. **Tahap 6 (Opsional Sesuai Kebutuhan):** Berkas di `examples/` hanya dimuat apabila penulis atau agen membutuhkan contoh ilustratif tambahan.

### Contoh Nyata Pemuatan Selektif (`Hukum & Keadilan + NEWS`)

Agen AI yang menerima penugasan `desk = "hukum-keadilan"` dan `format = "NEWS"` cukup memuat:
- `README.md` + 5 berkas `core/`
- `desks/hukum-keadilan.md`
- `formats/news.md`
- `operations/VERAX_AI_AGENT_WORKFLOW.md`, `operations/VERAX_EDITORIAL_REVIEW_CHECKLIST.md`, dan `VERAX_EDITORIAL_API_INTEGRATION.md`

Agen tersebut **sama sekali tidak perlu memuat** `teknologi-kebijakan.md`, `nasional-publik.md`, `analysis.md`, `opinion.md`, `explainer.md`, `feature.md`, `interview.md`, `VERAX_EDITORIAL_QUALITY_ASSESSMENT.md` (kecuali bertindak sebagai penilai mutu), maupun `examples/desk-format-examples.md`.

### Ketentuan Penghentian Aman (*Fail-Closed*) Desk Non-Aktif
Sesuai `GET /api/internal/v1/capabilities` dan skema tabel `Desk` saat ini, hanya **tiga desk** berstatus aktif (`hukum-keadilan`, `teknologi-kebijakan`, `nasional-publik`). Desk ekspansi pada Charter lama (*Ekonomi & Bisnis*, *Sosial & Budaya*, *Internasional*) **tidak aktif** dan belum memiliki berkas profil desk. Bila penugasan menyebut desk yang tidak dikenal atau tidak aktif, agen `WAJIB` berhenti dan mengonfirmasi ulang kepada redaksi, bukan mengarang aturan desk baru.

---

## 3. Hierarki Penyelesaian Konflik Kebijakan

Apabila muncul ketegangan aturan antar-dokumen dalam satu penugasan, berlaku urutan prioritas mengikat berikut:

1. **Prioritas 1 (Tertinggi): Prinsip Integritas Universal, Etika, dan Larangan Fabrikasi (`core/*` serta `FAIL-01` s.d. `FAIL-07`).** Tidak dapat dikalahkan oleh gaya format, kebebasan opini, maupun tenggat penugasan.
2. **Prioritas 2: Aturan Spesifik Desk (`desks/<slug>.md`).** Kewaspadaan hukum, hierarki pembuktian, dan kehati-hatian terminologi bidang mengikat format apa pun di desk tersebut (misalnya asas praduga tak bersalah tetap mengikat `OPINION` di `hukum-keadilan`).
3. **Prioritas 3: Aturan Spesifik Format (`formats/<format>.md`).** Suara naratif, susunan struktur, dan pembatasan peran AI per format mengalahkan preferensi umum penulisan (misalnya Agen AI dilarang mengarang adegan `FEATURE` atau tanya jawab `INTERVIEW`).
4. **Prioritas 4: Konteks Penugasan (`Layer D`).** Mengkhususkan topik, sudut pemeriksaan, kedalaman, dan cara menutup atau melaporkan `knownInformationGaps`, tanpa pernah mengizinkan asumsi fakta fiktif.

---

## 4. Ringkasan Peta Desk x Format dan Kelayakan Jalur

| Kode Format | Label | Ruang Redaksi | Agen AI (`INGESTION_API`) | Kontributor Eksternal | Dokumen Profil Format |
|---|---|---|---|---|---|
| `NEWS` | Berita | Ya | Ya (draf `DRAFT`, sumber `UNVERIFIED`, dilarang mengarang liputan) | **Tidak** (`422` sesuai Charter `D2`) | [`formats/news.md`](./formats/news.md) |
| `ANALYSIS` | Analisis | Ya | Ya | Ya | [`formats/analysis.md`](./formats/analysis.md) |
| `OPINION` | Opini | Ya | Ya (dengan `OPINION_DISCLAIMER`) | Ya (dengan `OPINION_DISCLAIMER`) | [`formats/opinion.md`](./formats/opinion.md) |
| `EXPLAINER` | Penjelas | Ya | Ya | Ya | [`formats/explainer.md`](./formats/explainer.md) |
| `FEATURE` | Kisah Khas | Ya | Ya (hanya dari dokumentasi/arsip nyata; dilarang adegan fiktif) | Ya | [`formats/feature.md`](./formats/feature.md) |
| `INTERVIEW` | Wawancara | Ya | Ya (hanya dari transkrip wawancara sah milik redaksi) | Ya | [`formats/interview.md`](./formats/interview.md) |

Profil lengkap ketiga desk aktif:
- [`desks/hukum-keadilan.md`](./desks/hukum-keadilan.md) (`Hukum & Keadilan`)
- [`desks/teknologi-kebijakan.md`](./desks/teknologi-kebijakan.md) (`Teknologi & Kebijakan`)
- [`desks/nasional-publik.md`](./desks/nasional-publik.md) (`Nasional & Publik`)

Matriks penuh 18 kombinasi dan 10 walk-through tersedia secara opsional pada [`examples/desk-format-examples.md`](./examples/desk-format-examples.md).

---

## 5. Ringkasan Konflik Lintas-Dokumen dan Celah Implementasi (`C1` hingga `C8`)

Inspeksi kode sumber terhadap dokumen baseline lama menemukan delapan kesenjangan teknis dan kebijakan (`C1` sampai `C8`) yang dicatat lengkap pada [`VERAX_EDITORIAL_API_INTEGRATION.md`](./VERAX_EDITORIAL_API_INTEGRATION.md):
- **`C1`:** Charter `D2` membatasi `NEWS` hanya untuk newsroom, tetapi Ingestion API (`constants.ts`) masih menerima draf `NEWS` dari AI sementara Portal Kontributor menolaknya.
- **`C2`:** Charter §8 merancang 6 peran internal dan portal kontributor pada Tahap B, sedangkan kode berjalan hanya memiliki `CHIEF_EDITOR` dan `WRITER` plus portal `/api/contributor/*` yang telah aktif.
- **`C3`:** Pemisahan mutlak larangan tanda baca salinan sistem (`VERAX_WRITING_STANDARDS.md`) dari aturan perlindungan kutipan verbatim pada prosa artikel.
- **`C4`:** `/developers`, OpenAPI, dan `/llms-full.txt` belum mendokumentasikan blok `image`, `note`, dan `qa`, serta menghilangkan atribut wajib `style` pada blok `list`.
- **`C5`:** Bidang `deck` opsional di skema intake `ingestion.ts`, namun wajib sebelum publikasi akibat `GATE_NO_DECK`.
- **`C6`:** `imageItemSchema` belum memiliki kolom `isSynthetic`, dan `sourceItemSchema` menerima tanggal string mentah tanpa `.datetime()` meski langsung diproses `new Date(...)` di server.
- **`C7`:** Perbedaan label `"Draft"` vs `"Draf"`, kalimat positioning lama di `api-docs.ts`, serta `aiUsageNote` (`1.000` karakter) yang disalin langsung ke `Article.aiDisclosureNote` (batas Studio `600` karakter).
- **`C8`:** Jalur eksekusi `risk_edit` sudah disiapkan di Prisma dan izin `permissions.ts`, namun endpoint sunting Studio baru menerima `author` dan `editorial_copyedit`.

---

## 6. Tabel Pemetaan Migrasi dari Dokumen Tunggal Sebelumnya

| Bagian Dokumen Lama (`VERAX_EDITORIAL_AI_WRITING_STANDARD.md` 864 Baris) | Lokasi Modular Kanonik Saat Ini |
|---|---|
| §1 Identitas Kerja & Batas Kelembagaan, §2 Tujuan & Pemisahan `VERAX_WRITING_STANDARDS.md`, §3 Pilar & Kata Kunci Normatif | [`core/VERAX_EDITORIAL_IDENTITY.md`](./core/VERAX_EDITORIAL_IDENTITY.md) |
| §4 Sepuluh Prinsip Jurnalistik Universal & Pemisahan Kategori Epistemik | [`core/VERAX_JOURNALISTIC_PRINCIPLES.md`](./core/VERAX_JOURNALISTIC_PRINCIPLES.md) |
| §5 Hierarki Sumber, Pemetaan `supports`, Verifikasi 7 Titik, 8 Larangan Fabrikasi, Ketidakpastian, & Visual | [`core/VERAX_RESEARCH_AND_VERIFICATION.md`](./core/VERAX_RESEARCH_AND_VERIFICATION.md) |
| §6.1 Desk Hukum & Keadilan | [`desks/hukum-keadilan.md`](./desks/hukum-keadilan.md) |
| §6.2 Desk Teknologi & Kebijakan | [`desks/teknologi-kebijakan.md`](./desks/teknologi-kebijakan.md) |
| §6.3 Desk Nasional & Publik | [`desks/nasional-publik.md`](./desks/nasional-publik.md) |
| §7.1–§7.6 Profil Enam Format Artikel | [`formats/{news,analysis,opinion,explainer,feature,interview}.md`](./formats/news.md) |
| §8.1–§8.2 Layer D (11 Parameter & Celah Informasi) dan §12 Alur Kerja Agen AI | [`operations/VERAX_AI_AGENT_WORKFLOW.md`](./operations/VERAX_AI_AGENT_WORKFLOW.md) |
| §8.3 Matriks `3 x 6` dan §8.4 Sepuluh Walk-Through | [`examples/desk-format-examples.md`](./examples/desk-format-examples.md) |
| §9 Dimensi Substansi & §13 Rubrik `FAIL-01..07` dan `DIM-01..06` | [`operations/VERAX_EDITORIAL_QUALITY_ASSESSMENT.md`](./operations/VERAX_EDITORIAL_QUALITY_ASSESSMENT.md) |
| §10 Bahasa, Disiplin Anti-AI, Batas Keras, & Atribusi Skill Lokal MIT | [`core/VERAX_LANGUAGE_AND_STYLE.md`](./core/VERAX_LANGUAGE_AND_STYLE.md) |
| §11 Etika, Rujukan Hukum Indonesia, Privasi, Plagiarisme, & `Risk-Edit` | [`core/VERAX_ETHICS_AND_RESPONSIBILITY.md`](./core/VERAX_ETHICS_AND_RESPONSIBILITY.md) |
| §14 Empat Contoh Eksekusi Baik & Buruk (diperjelas sebagai simulasi fiktif) | [`examples/good-and-bad-examples.md`](./examples/good-and-bad-examples.md) |
| §15 Daftar Periksa Penulis, Agen AI, dan `CHIEF_EDITOR` | [`operations/VERAX_EDITORIAL_REVIEW_CHECKLIST.md`](./operations/VERAX_EDITORIAL_REVIEW_CHECKLIST.md) |
| Detail Teknis Rute API, Blok Konten, Gerbang Sistem, & Audit Konflik `C1`–`C8` | [`VERAX_EDITORIAL_API_INTEGRATION.md`](./VERAX_EDITORIAL_API_INTEGRATION.md) |
| §16 Tata Kelola, Versi Semantik, & Sinkronisasi Eksposur Mesin | Bagian 7 di berkas ini & [`VERAX_EDITORIAL_API_INTEGRATION.md`](./VERAX_EDITORIAL_API_INTEGRATION.md) |

---

## 7. Tata Kelola, Peninjauan Berkala, dan Versi Semantik

1. **Otoritas Pengesahan:** Kewenangan mengesahkan standar `PROPOSED` menjadi berlaku serta menetapkan revisi berikutnya berada sepenuhnya pada Pemimpin Redaksi (`CHIEF_EDITOR`).
2. **Siklus Peninjauan:** Minimal setiap **enam bulan sekali** (selaras Editorial Charter), atau segera apabila salah satu kondisi terjadi: pengaktifan desk baru di basis data, perubahan `ARTICLE_FORMATS` atau `articleContentSchema`, pembaruan endpoint `/api/internal/v1/*`, maupun hasil kajian hukum resmi.
3. **Aturan Versi Semantik (`MAJOR.MINOR.PATCH`):**
   - `MAJOR` (`X.0.0`): Perubahan prinsip universal `core/`, perubahan kondisi kegagalan mutlak Bagian A rubrik, atau perubahan syarat wajib kepatuhan Agen AI.
   - `MINOR` (`1.X.0`): Penambahan profil desk baru, penambahan profil format baru, atau pembaruan panduan operasional yang kompatibel ke belakang.
   - `PATCH` (`1.0.X`): Perbaikan redaksional, penambahan atau penyempurnaan contoh simulasi fiktif, dan sinkronisasi referensi skema.
4. **Sinkronisasi Perubahan:** Setiap pembaruan berkas Markdown di bawah `docs/editorial/` wajib disertai sinkronisasi metadata pada [`verax-editorial-standard.manifest.json`](./verax-editorial-standard.manifest.json) serta pencatatan di `worklog.md`.
