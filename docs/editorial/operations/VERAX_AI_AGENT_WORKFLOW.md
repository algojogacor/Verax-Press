---
documentId: VERAX-OPS-WORKFLOW-01
title: Protokol Konteks Penugasan (Layer D) dan Alur Kerja Operasional Agen AI
version: 1.0.0
status: PROPOSED
scope: operations
appliesTo:
  - all-desks
  - all-formats
  - ai-agents
  - newsroom-staff
requiredDependencies:
  - docs/editorial/README.md
  - docs/editorial/core/VERAX_EDITORIAL_IDENTITY.md
  - docs/editorial/core/VERAX_JOURNALISTIC_PRINCIPLES.md
  - docs/editorial/core/VERAX_RESEARCH_AND_VERIFICATION.md
  - docs/editorial/core/VERAX_ETHICS_AND_RESPONSIBILITY.md
  - docs/editorial/core/VERAX_LANGUAGE_AND_STYLE.md
lastReviewed: 2026-11-12
---

# Protokol Konteks Penugasan (Layer D) dan Alur Kerja Operasional Agen AI

Dokumen ini mengatur **Lapisan D (`Layer D`)** dan alur kerja sepuluh langkah bagi Agen AI maupun penyusun penugasan terstruktur di Verax Press. Agen AI yang melakukan integrasi langsung ke endpoint `/api/internal/v1/*` memuat pula kontrak skema JSON dan daftar keselarasan teknis pada `docs/editorial/VERAX_EDITORIAL_API_INTEGRATION.md`.

---

## 1. Rumus Komposisi Empat Lapis

Verax Press menyusun arahan penulisan melalui empat lapisan komplementer tanpa memaksakan penyeragaman gaya antarformat maupun antardesk:

$$\text{Arah Penulisan Naskah} = \text{Layer A (Inti Universal)} + \text{Layer B (Satu Desk Aktif)} + \text{Layer C (Satu Format)} + \text{Layer D (Konteks Penugasan)}$$

1. **Layer A (`core/`):** Menjaga integritas fakta (`VERAX-R01` sampai `VERAX-R10`), metode verifikasi, batas etik, dan disiplin prosa bebas klise AI.
2. **Layer B (`desks/<slug>.md`):** Menetapkan pertanyaan inti bidang, hierarki sumber pilihan, istilah teknis, serta sensitivitas hukum desk terkait.
3. **Layer C (`formats/<format>.md`):** Mengatur fungsi naskah, suara naratif, alur bagian, dan syarat bukti khusus format terkait.
4. **Layer D (Dokumen Ini):** Menurunkan ketiganya ke penugasan konkret hari itu serta mengunci aturan penanganan fakta yang belum lengkap.

---

## 2. Sebelas Parameter Konteks Penugasan (Layer D)

Sebelum meriset atau menulis, Agen AI `WAJIB` mendefinisikan atau mengekstrak kesebelas parameter berikut dari instruksi penugasan redaksi:

| No | Parameter | Pertanyaan Operasional |
|---|---|---|
| 1 | `desk` | Desk aktif mana yang ditugaskan (`hukum-keadilan`, `teknologi-kebijakan`, atau `nasional-publik`)? |
| 2 | `format` | Format mana yang ditugaskan (`NEWS`, `ANALYSIS`, `OPINION`, `EXPLAINER`, `FEATURE`, atau `INTERVIEW`)? |
| 3 | `topic` | Peristiwa, dokumen hukum, sistem teknologi, atau kebijakan spesifik apa yang dibahas? |
| 4 | `mainEditorialQuestion` | Satu pertanyaan sentral apa yang harus terjawab tuntas ketika pembaca selesai membaca? |
| 5 | `intendedAudience` | Tingkat pemahaman awal pembaca umum terhadap istilah hukum, anggaran, atau teknis pada isu ini? |
| 6 | `proposedAngle` | Sudut fokus pemeriksaan naskah (sebagai hipotesis kerja, bukan kesimpulan yang dipaksakan sebelum riset)? |
| 7 | `availableSources` | Daftar sumber primer, dokumen resmi, data, dan keterangan narasumber yang benar-benar telah tersedia dan terverifikasi? |
| 8 | `currentnessAndChronology` | Titik waktu pembaruan terakhir perkara atau kebijakan, serta posisi urutannya pada hari penulisan? |
| 9 | `geographicInstitutionalContext` | Yurisdiksi hukum, cakupan wilayah geografis terdampak, dan instansi berwenang yang terlibat? |
| 10 | `requestedDepth` | Kedalaman liputan yang diminta (perkembangan cepat-faktual, telaah mendalam multi-sumber, atau panduan mekanisme dasar)? |
| 11 | `knownInformationGaps` | Fakta kunci, angka terbaru, dokumen turunan, atau tanggapan pihak terkait apa yang belum diperoleh saat penugasan dimulai? |

### Aturan Penanganan Celah Informasi (`WAJIB`)
Apabila unsur penting dalam `knownInformationGaps` tidak tersedia pada `availableSources`, Agen AI maupun penulis `DILARANG` mengisi celah itu dengan asumsi wajar, interpolasi statistik, atau rekaan. Penulis wajib memilih salah satu jalur sah:
1. Melakukan penelusuran sumber primer tambahan guna menutup celah secara sah sebelum menyusun draf; atau
2. Mempersempit cakupan klaim naskah secara jujur sebatas bukti yang telah terverifikasi, lalu melaporkan celah tersebut di tubuh naskah bila relevan (`VERAX-R08`) dan di `verificationNotes`.

---

## 3. Sepuluh Langkah Operasional Wajib Agen AI

1. **Penemuan Kapabilitas Aktif dan Pemuatan Konteks Selektif (`Discovery`):**
   Panggil `GET /api/internal/v1/capabilities` untuk memastikan daftar slug `desk` yang berstatus aktif, format yang diterima, serta batas teknis payload saat ini. Muat berkas kebijakan secara selektif sesuai `docs/editorial/README.md` (**hanya** `README.md`, `core/`, **satu** profil desk tujuan, **satu** profil format tujuan, berkas operasional, dan `VERAX_EDITORIAL_API_INTEGRATION.md`).
2. **Penguncian Lensa Desk (`Layer B`):**
   Baca tuntas profil desk penugasan (`desks/<slug>.md`) dan jadikan pertanyaan inti, syarat verifikasi khusus desk, serta sensitivitas hukum desk tersebut sebagai batas kerja riset.
3. **Penguncian Suara dan Struktur Format (`Layer C`):**
   Baca tuntas profil format penugasan (`formats/<format>.md`). Terapkan suara naratif, susunan struktur, syarat sumber, dan batas kewenangan Agen AI untuk format tersebut (terutama larangan mengarang adegan `FEATURE` maupun tanya jawab `INTERVIEW`).
4. **Audit Konteks Penugasan dan Celah Awal (`Layer D`):**
   Petakan sebelas parameter Layer D dan pisahkan tegas sejak awal unsur apa yang masuk `knownInformationGaps`.
5. **Pelaksanaan Riset dan Verifikasi Tujuh Titik:**
   Telusuri sumber primer sesuai hierarki desk dan jalankan tujuh titik verifikasi pada `VERAX_RESEARCH_AND_VERIFICATION.md`. Jangan mengutip dokumen yang hanya dibaca dari ringkasan berita lain atau URL yang gagal diakses penuh.
6. **Penyusunan Peta Klaim ke Sumber (`SourceReference`):**
   Susun larik rujukan yang menopang setiap klaim faktual inti. Isi keterangan `supports` secara spesifik menyebut klaim serta bagian dokumennya, catat tanggal terbit (`publishedAt`) dan tanggal akses (`accessedAt`) dalam format ISO 8601 yang sah, dan ajukan `isKeySource: true` semata untuk sumber penopang klaim inti.
7. **Penyusunan Draf dan *Deck* dalam Blok Konten Verax:**
   Susun isi artikel menggunakan tujuh tipe blok terstruktur valid (`paragraph`, `heading` level `2`/`3`, `quote`, `list` dengan properti `style: "bullet" | "number"` wajib diisi, `image`, `note`, dan `qa`). Selalu sertakan `deck` yang padat dan proporsional (maksimal 400 karakter) agar draf tidak tertahan oleh gerbang publikasi redaksi (`GATE_NO_DECK`), serta perhatikan bahwa paragraf pembuka minimal 120 karakter akan tampil bersama *drop cap* klasik. *(Lihat `VERAX_EDITORIAL_API_INTEGRATION.md` untuk detail skema Zod dan panjang maksimum tiap bidang.)*
8. **Swatelaah Dua Tahap dan Validasi Dry-Run:**
   Lakukan audit dua tahap berurutan:
   - *Tahap pertama (Substansi dan Keabsahan):* periksa akurasi fakta, kesesuaian klaim terhadap `supports`, pemisahan fakta dari dugaan/opini (`VERAX-R07`), dan keutuhan kutipan verbatim.
   - *Tahap kedua (Kejelasan Prosa Anti-AI):* pangkas pembuka hampa, pembesaran signifikansi kosong, dan klise mekanis tanpa melanggar tujuh batas keras pada `VERAX_LANGUAGE_AND_STYLE.md` Bagian 2.
   Setelah lulus swatelaah, jalankan validasi payload melalui `POST /api/internal/v1/ai-submissions/validate` sebelum pengiriman nyata.
9. **Pengungkapan Jujur AI dan Catatan Verifikasi:**
   Nyatakan `aiInvolvement` (`none`, `assistive`, atau `substantive`) secara jujur tanpa menurunkan tingkat keterlibatan demi pencitraan. Jika bernilai `substantive`, isi `aiUsageNote` secara jelas dan ringkas (disarankan maksimal 600 karakter agar selaras dengan batas penyuntingan Studio pada temuan keselarasan sistem `C7` di `VERAX_EDITORIAL_API_INTEGRATION.md`) serta susun `verificationNotes` memakai templat Bagian 5 di bawah.
10. **Pengiriman Draf dan Pemantauan Status:**
    Kirim naskah ke `POST /api/internal/v1/ai-submissions` memakai `agentId` yang konsisten dan `idempotencyKey` unik. Seluruh pengiriman masuk sebagai `DRAFT` dengan seluruh sumber berstatus `UNVERIFIED`. Agen dapat memantau perkembangan lewat `GET /api/internal/v1/ai-submissions/{submissionId}` tanpa pernah mengasumsikan persetujuan atau penayangan.

---

## 4. Tujuh Larangan Keras bagi Agen AI (`DILARANG`)

Agen AI dilarang mutlak melakukan tujuh hal berikut dalam keadaan apa pun:

1. Mengklaim telah mewawancarai narasumber atau menerima keterangan langsung padahal tidak pernah terjadi.
2. Mengklaim telah memverifikasi dokumen primer secara langsung ketika agen hanya membaca ringkasan media lain, menemui PDF terproteksi atau halaman berbayar, atau belum membuka berkas sumber utuhnya.
3. Menyajikan hasil inferensi, interpolasi angka, atau probabilitas model bahasa sebagai fakta yang sudah terkonfirmasi.
4. Mengarang pengalaman manusia, pengamatan lapangan, suasana cuaca, raut wajah, atau aktivitas reportase fisik (`FEATURE` maupun `NEWS`).
5. Mengisi `verificationNotes` dengan kalimat optimistis palsu atau templat salin-tempel yang menyiratkan uji fakta sudah selesai sempurna.
6. Menulis di dalam badan artikel, judul, *deck*, maupun catatan bahwa draf telah disetujui Pemimpin Redaksi atau layak langsung terbit.
7. Berusaha menerbitkan naskah secara langsung atau mengakali batasan kewenangan klien API (`submit-only`).

---

## 5. Templat Pelaporan `verificationNotes` dan `aiUsageNote`

### 5.1 Struktur Wajib `verificationNotes` (maksimal 3.000 karakter)

Susun catatan verifikasi dalam tiga penanda tetap agar `CHIEF_EDITOR` dapat melakukan audit celah dalam hitungan detik:

```text
[SUMBER DIPERIKSA] Daftar singkat dokumen utama yang naskah lengkapnya benar-benar dibaca dan dicocokkan URL-nya.
[BELUM TERVERIFIKASI / CELAH] Fakta, angka periode berjalan, tanggapan pihak terdampak, atau lampiran yang tidak dapat diakses atau belum tersedia.
[PERLU PEMERIKSAAN MANUSIA] Langkah verifikasi spesifik yang wajib dijalankan penyunting manusia sebelum FACT_CHECK atau PUBLISH (misalnya permintaan hak tanggapan, verifikasi status inkrah putusan, atau pengecekan izin aset visual).
```

### 5.2 Pola Penulisan `aiUsageNote` (`[CONTOH SIMULASI FIKTIF]`)

Catatan penggunaan AI menjelaskan lingkup kerja agen secara faktual tanpa membual dan layak baca jika ditampilkan pada pemberitahuan publik artikel:

```text
Contoh baik (Simulasi): "Draf awal disusun oleh agen AI berdasarkan salinan putusan resmi dan dokumen anggaran terlampir pada daftar sumber. Agen tidak melakukan wawancara maupun verifikasi lapangan di luar berkas tersebut; pemeriksaan kesesuaian teks sumber dan permintaan tanggapan pihak terkait dilakukan oleh redaksi manusia."
```
