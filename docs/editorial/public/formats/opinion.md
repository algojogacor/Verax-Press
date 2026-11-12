---
documentId: VERAX-FORMAT-OPINION-03
title: Profil Format Opini (OPINION)
version: 1.0.0
status: PROPOSED
scope: format
appliesTo:
  - format:OPINION
  - all-desks
  - human-contributors
  - newsroom-staff
  - ai-agents
requiredDependencies:
  - core/VERAX_EDITORIAL_IDENTITY.md
  - core/VERAX_JOURNALISTIC_PRINCIPLES.md
  - core/VERAX_RESEARCH_AND_VERIFICATION.md
  - core/VERAX_ETHICS_AND_RESPONSIBILITY.md
  - core/VERAX_LANGUAGE_AND_STYLE.md
lastReviewed: 2026-11-12
---

# Profil Format: Opini (`OPINION`)

- **Kode Format:** `OPINION` (Label sistem: `Opini`)
- **Kelayakan Jalur Pengiriman (`Origin Eligibility`):**
  - **Ruang Redaksi (`NEWSROOM`):** Diizinkan.
  - **Agen AI (`INGESTION_API`):** Diizinkan (hanya bila ditugaskan menyusun draf posisi terstruktur dengan premis terverifikasi serta pengungkapan AI penuh).
  - **Kontributor Eksternal (`CONTRIBUTOR`):** Diizinkan.
- **Penanda Sistem Wajib:** Artikel berformat `OPINION` otomatis menampilkan `OPINION_DISCLAIMER` di halaman publik Verax Press bahwa isi tulisan merupakan pandangan penulis dan tidak otomatis mewakili sikap kelembagaan Redaksi Verax Press.
- **Sifat Dokumen:** Lapisan C (`Layer C`). Muat berkas ini bersama Lapisan A (`/editorial/core`) dan **satu** profil desk yang ditugaskan (`/editorial/desks/{slug}`).

---

## 1. Tujuan Editorial

Menyediakan ruang bagi penulis yang memiliki kapasitas pengetahuan atau pengalaman relevan untuk mengajukan argumen normatif, kritik kebijakan, atau usulan arah perbaikan publik yang tersusun secara logis, berlandaskan fakta terverifikasi, dan dapat dipertanggungjawabkan secara intelektual.

---

## 2. Pokok Bahasan yang Sesuai

- Perdebatan arah reformasi hukum atau kritik doktrin suatu putusan hukum (*lex lata* menuju *lex ferenda*).
- Evaluasi prioritas anggaran publik dan desain program sosial.
- Sikap kebijakan mengenai batas etis, pengawasan risiko, serta tata kelola teknologi dan data warga.
- Refleksi publik atas isu aktual yang memang masih terbuka diperdebatkan secara sah di masyarakat.

---

## 3. Struktur dan Pendekatan Naratif

Esai opini Verax mengedepankan alur argumentasi yang mengalir tanpa terlihat seperti laporan teknis kaku, namun tetap tertib secara logika:

1. **Konteks Perdebatan dan Posisi Penulis (`paragraph` pembuka):** Tetapkan isu yang diperselisihkan lalu nyatakan sikap atau tesis normatif penulis secara lugas sejak awal. Perhatikan alinea pembuka yang cukup panjang (minimal sekitar 120 karakter) agar menyatu baik dengan tipografi *drop cap* halaman publik.
2. **Rangkaian Argumen Pendukung Berjenjang (`paragraph`, `heading` level `2` opsional untuk opini panjang, `list` secukupnya):** Bangun alasan demi alasan di atas premis faktual yang dikutip akurat. Hindari menjejali opini dengan subjudul berlebihan apabila alur esai mengalir lebih kuat dalam paragraf berkesinambungan.
3. **Pengujian Sanggahan Utama (*Steelman Counterargument*, `paragraph`):** Hadapi keberatan terkuat dari pihak yang berseberangan secara adil, lalu jelaskan mengapa argumen penulis tetap lebih meyakinkan atau bagaimana risiko dari sanggahan tersebut dapat dijawab.
4. **Penutup Konsekuensi atau Usulan Konkret (`paragraph` penutup):** Rumuskan pilihan kebijakan, tolok ukur keberhasilan, atau akibat nyata dari pilihan sikap yang diajukan. Pastikan `deck` meringkas inti tesis tanpa mencampur suara pribadi dengan sikap kelembagaan Verax Press. *(Rincian teknis blok dan penanda disclaimer tersedia pada `/openapi.json` dan `/developers`.)*

---

## 4. Suara Naratif yang Sesuai

Berpendapat secara jelas, persuasif, tertib, dan berwibawa. Berbeda dengan format berita, opini individual diperbolehkan memakai sudut pandang orang pertama (*"saya"*) bila tepat secara retoris serta menampilkan kekhasan suara intelektual penulisnya. Meski tajam mengkritik kebijakan atau argumen, tulisan `WAJIB` bebas caci maki, serangan pribadi (*ad hominem*), maupun kebencian.

---

## 5. Syarat Riset

- Kebebasan berpendapat **tidak** mengecualikan kewajiban verifikasi fakta (`VERAX-R01`). Seluruh angka anggaran, bunyi pasal, tanggal peristiwa, atau ringkasan pernyataan pejabat yang dijadikan premis argumen wajib diperiksa akurasinya seperti halnya berita.
- Untuk kritik kebijakan yang menyebut lembaga atau pejabat secara spesifik, pahami posisi resmi terbaru lembaga tersebut agar tidak menyerang posisi keliru (*strawman*, `VERAX-R06`).

---

## 6. Syarat Sumber

- Setiap klaim atau premis faktual yang menopang argumen `WAJIB` memiliki rujukan yang valid dalam daftar sumber (`OFFICIAL`, `DOCUMENT`, `DATA`, `PRIMARY`).
- Opini dilarang dibangun di atas fakta karangan, anekdot tanpa dasar verifikasi, atau kutipan yang dipelintir keluar konteks.

---

## 7. Pola Kegagalan Khusus Format (`Failure Conditions`)

1. Sekadar meluapkan kemarahan, keluhan pribadi, atau selera tanpa rantai argumen dan bukti pembanding.
2. Menggunakan fakta keliru atau aturan yang sudah dicabut sebagai pijakan kesimpulan normatif (`VERAX-R01`, `FAIL-03`).
3. Menyamarkan opini penulis seolah-olah pernyataan resmi Redaksi Verax Press (*"Redaksi menilai..."*).
4. Mengkarikaturkan atau meremehkan argumen pihak lawan sebelum menjawabnya (*strawman*).
5. Menutup esai dengan seruan moral hampa (*"Saatnya kita semua bersatu demi kebaikan bersama..."*) tanpa usulan konsekuensi atau langkah kebijakan terukur.

---

## 8. Pemeriksaan Mutu Wajib Format

- [ ] Apakah posisi atau tesis normatif penulis jelas sejak paragraf awal?
- [ ] Apakah seluruh premis faktual yang dipakai sebagai fondasi argumen bertaut ke sumber sah dan akurat?
- [ ] Apakah argumen tandingan utama disajikan secara jujur dan ditanggapi langsung?
- [ ] Apakah pembaca dapat membedakan mana fakta yang mapan dan mana penilaian penulis?
- [ ] Apakah naskah tetap menghormati batas pencemaran nama baik dan tidak mengatasnamakan sikap resmi Redaksi Verax?

---

## 9. Contoh Ilustratif Singkat `[CONTOH SIMULASI FIKTIF]`

Catatan: Skenario kebijakan di bawah ini merupakan **contoh simulasi fiktif** untuk memperlihatkan suara dan struktur format opini.

> **[CONTOH SIMULASI FIKTIF]**  
> "Wacana mewajibkan pendaftaran awal seluruh pengembang model AI sumber terbuka pada kategori penyelenggara layanan umum berisiko menghambat riset universitas tanpa menyentuh sumber masalah penyalahgunaan data. Alih-alih memperluas izin administratif berdasarkan ukuran entitas pembuat kode, otoritas digital semestinya menetapkan kewajiban uji dampak dan audit sistem hanya pada penerapan berisiko tinggi seperti penilaian kredit warga dan penyaringan layanan medis. Pendekatan pengawasan berbasis risiko pemakaian ini menjaga perlindungan pengguna tanpa membebani kegiatan penelitian akademis."
