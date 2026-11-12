---
documentId: VERAX-FORMAT-ANALYSIS-02
title: Profil Format Analisis (ANALYSIS)
version: 1.0.0
status: PROPOSED
scope: format
appliesTo:
  - format:ANALYSIS
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

# Profil Format: Analisis (`ANALYSIS`)

- **Kode Format:** `ANALYSIS` (Label sistem: `Analisis`)
- **Kelayakan Jalur Pengiriman (`Origin Eligibility`):**
  - **Ruang Redaksi (`NEWSROOM`):** Diizinkan.
  - **Agen AI (`INGESTION_API`):** Diizinkan.
  - **Kontributor Eksternal (`CONTRIBUTOR`):** Diizinkan.
- **Sifat Dokumen:** Lapisan C (`Layer C`). Muat berkas ini bersama Lapisan A (`/editorial/core`) dan **satu** profil desk yang ditugaskan (`/editorial/desks/{slug}`).

---

## 1. Tujuan Editorial

Menjawab pertanyaan *mengapa* dan *bagaimana* suatu keputusan, pola data, desain regulasi, atau fenomena sosial terjadi; membongkar mekanisme struktural di balik gejala permukaan; menguji penjelasan yang saling bersaing; serta menyatakan batas pembuktian secara jujur.

---

## 2. Pokok Bahasan yang Sesuai

- Dampak dan celah pelaksanaan suatu regulasi atau paket kebijakan baru.
- Pola penalaran hukum di balik serangkaian putusan pengadilan sejenis.
- Struktur insentif anggaran publik dan penyebab selisih antara target pusat dan hasil di daerah.
- Arsitektur sistem teknologi, insentif pelaku pasar digital, serta risiko pengawasannya.
- Tren data multi-periode beserta faktor penggerak dan batasan datanya.

---

## 3. Struktur dan Pendekatan Naratif

Analisis Verax dibangun seperti pengujian hipotesis berbasis bukti, bukan kumpulan rangkuman berita:

1. **Pembuka Pertanyaan Analitis dan Tesis Berbasis Bukti (`paragraph` pembuka):** Rumuskan langsung paradoks, celah, atau pertanyaan utama di alinea awal beserta argumen penjelas yang ditopang data awal. Pastikan paragraf pertama cukup utuh secara prosa (minimal 120 karakter agar tampil rapi bersama tipografi *drop cap* perender Verax).
2. **Latar Empiris dan Batas Data (`paragraph`, `list` opsional, `note` metodologi bila perlu):** Paparkan fakta pemicu, periode data, dan ruang lingkup analisis. Blok `note` sangat tepat untuk menerangkan metode penghitungan atau perubahan definisi data secara ringkas.
3. **Babak Pengujian Mekanisme (`heading` level `2` atau `3` yang informatif):** Pecah pembahasan menjadi sub-bab uji sebab akibat. Bandingkan bukti primer lintas dokumen atau periode, hadirkan `quote` verbatim ahli atau pembuat kebijakan bila memperjelas dasar penalaran, lalu bahas secara adil bukti atau penafsiran tandingan (*counter-evidence*).
4. **Implikasi Terukur dan Keterbatasan Kesimpulan (`paragraph` penutup):** Uraikan konsekuensi praktis paling beralasan ke depan disertai pengakuan gamblang atas apa yang **belum** dapat dibuktikan oleh data tersedia. Sertakan `deck` yang merangkum pertanyaan analitis dan temuan utama. *(Spesifikasi teknis skema blok dirujuk pada `/openapi.json` dan `/developers`.)*

---

## 4. Suara Naratif yang Sesuai

Analitis, tenang, berjarak dari emosi partisan, tegas dalam merangkai bukti, namun hati-hati dalam menandai tingkat kepastian kesimpulan (*data mengindikasikan*, *pola ini menunjukkan*, *temuan tersebut belum cukup membuktikan hubungan sebab akibat tunggal*).

---

## 5. Syarat Riset

- Pengumpulan data komparatif, seri waktu historis, atau perbandingan lintas yurisdiksi atau antarwilayah.
- Telaah lebih dari satu sumber primer agar analisis tidak terjebak pada sudut pandang satu lembaga.
- Identifikasi aktif bukti tandingan atau penjelasan alternatif terkuat untuk diuji terhadap data (`VERAX-R06`).

---

## 6. Syarat Sumber

- Memadukan dokumen hukum, kebijakan, atau laporan audit resmi (`OFFICIAL`, `DOCUMENT`) dan dataset primer (`DATA`) dengan literatur riset atau keterangan pakar independen (`PRIMARY`, `INTERVIEW`).
- Setiap mata rantai klaim kausal harus menaut ke rujukan yang memadai pada daftar sumber agar pembaca dapat memeriksa apakah simpulan melampaui bukti.

---

## 7. Pola Kegagalan Khusus Format (`Failure Conditions`)

1. Menyusun ringkasan berita berurutan secara kronologis tanpa tesis analitis dan tanpa pembedahan mekanisme sebab akibat.
2. Menyelinapkan agenda opini normatif ("pemerintah seharusnya mencabut...") ke dalam analisis sambil mengabaikan penafsiran pesaing.
3. Melompat dari korelasi dua angka menjadi klaim kausalitas mutlak tanpa menguji variabel pengganggu (`VERAX-R06`).
4. Menghilangkan catatan keterbatasan data, perubahan definisi survei, atau periode waktu yang hilang (`VERAX-R08`).

---

## 8. Pemeriksaan Mutu Wajib Format

- [ ] Apakah pertanyaan analitis utama dan temuan penjelasnya sudah terdefinisi sejak alinea pembuka?
- [ ] Apakah setiap tautan argumen didukung data, dokumen primer, atau perbandingan yang teruji?
- [ ] Apakah penafsiran tandingan (*counterargument*) terkuat dihadirkan dan dibahas secara adil?
- [ ] Apakah kesimpulan analisis dibedakan tegas dari fakta dokumen primer serta jujur menyebut batas pembuktiannya?

---

## 9. Contoh Ilustratif Singkat `[CONTOH SIMULASI FIKTIF]`

Catatan: Seluruh angka dan temuan berikut merupakan **contoh simulasi fiktif**.

> **[CONTOH SIMULASI FIKTIF]**  
> "Kenaikan pagu belanja perangkat lunak layanan publik pada [Tahun Simulasi] tidak otomatis meningkatkan jumlah permohonan warga yang selesai secara daring. Dalam skenario simulasi data audit pada 14 pemerintah daerah percontohan, enam dari sepuluh aplikasi baru gagal tersambung ke sistem layanan terpadu karena ketiadaan standar pertukaran data API dan pos biaya pemeliharaan setelah tahun pertama. Pola ini mengindikasikan hambatan utama berada pada tata kelola operasi lintas dinas, bukan semata-mata kekurangan pengadaan perangkat."
