---
documentId: VERAX-FORMAT-EXPLAINER-04
title: Profil Format Penjelas (EXPLAINER)
version: 1.0.0
status: PROPOSED
scope: format
appliesTo:
  - format:EXPLAINER
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

# Profil Format: Penjelas (`EXPLAINER`)

- **Kode Format:** `EXPLAINER` (Label sistem: `Penjelas`)
- **Kelayakan Jalur Pengiriman (`Origin Eligibility`):**
  - **Ruang Redaksi (`NEWSROOM`):** Diizinkan.
  - **Agen AI (`INGESTION_API`):** Diizinkan.
  - **Kontributor Eksternal (`CONTRIBUTOR`):** Diizinkan.
- **Sifat Dokumen:** Lapisan C (`Layer C`). Muat berkas ini bersama Lapisan A (`/editorial/core`) dan **satu** profil desk yang ditugaskan (`/editorial/desks/{slug}`).

---

## 1. Tujuan Editorial

Mengurai persoalan publik, prosedur hukum, mekanisme anggaran, atau cara kerja teknologi yang rumit menjadi penjelasan yang runtut, akurat secara substantif, dan mudah dipahami pembaca umum yang belum memiliki pengetahuan khusus sebelumnya.

---

## 2. Pokok Bahasan yang Sesuai

- Alur prosedur hukum dan hak warga (misalnya cara kerja peninjauan kembali, tata cara pengajuan hak jawab, atau batas kewenangan lembaga penegak hukum).
- Cara membaca ketentuan peraturan baru yang memengaruhi masyarakat luas beserta pengecualian pasalnya.
- Mekanisme kerja teknologi yang kerap memicu salah kaprah publik (enkripsi data, sistem klasifikasi otomatis, infrastruktur identifikasi digital).
- Skema anggaran negara atau daerah, mekanisme perhitungan subsidi, dan pembagian wewenang antarinstansi.

---

## 3. Struktur dan Pendekatan Naratif

Penjelas Verax berangkat dari kebutuhan konkret pembaca, bukan dari definisi kamus yang kaku:

1. **Pemicu Pertanyaan Pembaca (`paragraph` pembuka):** Buka dengan celah pemahaman umum atau pertanyaan paling sering muncul di masyarakat (*mengapa aturan ini penting sekarang, dan bagian mana yang kerap disalahpahami?*). Pastikan paragraf pertama cukup utuh secara prosa (minimal sekitar 120 karakter agar bekerja selaras dengan *drop cap* cetak Verax).
2. **Pemetaan Aktor dan Definisi Istilah Kunci (`paragraph`, `note` opsional):** Perkenalkan lembaga berwenang dan definisikan istilah hukum atau teknis inti dalam bahasa praktis tepat saat istilah pertama muncul.
3. **Penjelasan Bertahap per Pertanyaan (`heading` level `2` dan `3`, `list` bernomor/butir):** Susun badan tulisan menjadi beberapa subjudul berbentuk pertanyaan nyata pembaca atau topik terurut. Pakai blok `list` (`style: "number"` untuk langkah prosedural berurutan; `"bullet"` untuk kriteria sejajar) guna menjaga kejelasan tanpa menjadikannya daftar klise tanpa alur. Gunakan blok `note` untuk menandai syarat pengecualian krusial.
4. **Pemisahan Kepastian dan Celah Terbuka (`heading`, `paragraph`):** Beri satu bagian khusus yang memilah tegas antara *"Apa yang sudah pasti secara aturan atau bukti"* dan *"Pertanyaan atau petunjuk teknis yang masih terbuka"*. Lengkapi `deck` yang menjelaskan cakupan panduan. *(Ketentuan JSON ketujuh blok dirujuk pada `/openapi.json` dan `/developers`.)*

---

## 4. Suara Naratif yang Sesuai

Edukatif, sabar, lugas, dan ramah pembaca tanpa terkesan menggurui ataupun menyederhanakan hingga merusak ketepatan hukum dan teknis. Jaga sikap netral: tugas penjelas adalah menerangkan mekanisme dan sengketa fakta secara jernih, bukan mendikte sikap moral pembaca.

---

## 5. Syarat Riset

- Memetakan **keseluruhan** aturan payung beserta aturan turunan dan pengecualiannya sebelum menulis ringkasan agar penyederhanaan bahasa tidak menimbulkan sesat pikir hukum atau kesalahan konsep teknis.
- Memverifikasi apakah aturan pelaksana atau petunjuk teknis sudah terbit atau masih tertunda pada tanggal penulisan (`VERAX-R08`).

---

## 6. Syarat Sumber

- Mengutamakan dokumen regulasi resmi, pedoman lembaga, putusan pengadilan rujukan, dokumentasi teknis baku, serta literatur atau glosarium otoritatif (`OFFICIAL`, `DOCUMENT`, `PRIMARY`, `DATA`).
- Penjelasan mengenai istilah atau mekanisme yang sedang diperdebatkan para ahli tetap wajib merujuk sumber yang memperlihatkan perbedaan penafsiran tersebut.

---

## 7. Pola Kegagalan Khusus Format (`Failure Conditions`)

1. Penyederhanaan berlebihan (*oversimplification*) yang menghilangkan syarat hukum, batas yurisdiksi, atau batasan teknis penting sehingga pembaca menarik kesimpulan keliru.
2. Membuka naskah dengan definisi ensiklopedia atau kamus (*"Menurut Kamus Besar Bahasa Indonesia..."*) alih-alih menjawab persoalan pembaca.
3. Menyusun daftar definisi istilah yang terputus-putus seperti glosarium kaku tanpa benang merah alur cerita atau pertanyaan pembaca.
4. Menyembunyikan fakta bahwa sebagian aturan memang belum jelas atau petunjuk pelaksanaannya belum diterbitkan.
5. Menyelipkan sikap opini sepihak pada topik yang semestinya netral secara mekanisme.

---

## 8. Pemeriksaan Mutu Wajib Format

- [ ] Apakah pertanyaan konkret pembaca dari alinea awal terjawab tuntas pada akhir bacaan?
- [ ] Apakah setiap istilah hukum atau teknis dijelaskan ringkas dalam bahasa sehari-hari pada kemunculan pertama?
- [ ] Apakah penyederhanaan bahasa tetap setia pada bunyi ketentuan asli maupun batas teknis sumbernya?
- [ ] Apakah artikel memilah secara terang hal yang sudah pasti berlaku dari pertanyaan yang masih menunggu aturan turunan atau pembuktian lanjutan?

---

## 9. Contoh Ilustratif Singkat `[CONTOH SIMULASI FIKTIF]`

Catatan: Skenario sistem pengadaan di bawah ini merupakan **contoh simulasi fiktif** untuk memperlihatkan struktur format penjelas.

> **[CONTOH SIMULASI FIKTIF]**  
> "Mulai tahun anggaran percontohan baru dalam skenario ini, pencatatan belanja barang pemerintah daerah beralih ke sistem katalog elektronik versi pembaruan. Apa bedanya bagi pengawasan warga? Perubahan terpenting bukan pada tampilan situs, melainkan kewajiban memisahkan komponen biaya pengiriman dari harga satuan barang agar selisih harga antarwilayah dapat dibandingkan langsung di dokumen pengadaan terbuka. Meski demikian, aturan teknis mengenai batas waktu unggah lampiran kontrak penuh di daerah masih menunggu surat edaran pelaksana dari lembaga pengadaan."
