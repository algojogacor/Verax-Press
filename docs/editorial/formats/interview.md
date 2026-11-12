---
documentId: VERAX-FORMAT-INTERVIEW-06
title: Profil Format Wawancara (INTERVIEW)
version: 1.0.0
status: PROPOSED
scope: format
appliesTo:
  - format:INTERVIEW
  - all-desks
  - human-contributors
  - newsroom-staff
  - ai-agents
requiredDependencies:
  - docs/editorial/README.md
  - docs/editorial/core/VERAX_EDITORIAL_IDENTITY.md
  - docs/editorial/core/VERAX_JOURNALISTIC_PRINCIPLES.md
  - docs/editorial/core/VERAX_RESEARCH_AND_VERIFICATION.md
  - docs/editorial/core/VERAX_ETHICS_AND_RESPONSIBILITY.md
  - docs/editorial/core/VERAX_LANGUAGE_AND_STYLE.md
lastReviewed: 2026-11-12
---

# Profil Format: Wawancara (`INTERVIEW`)

- **Kode Format:** `INTERVIEW` (Label sistem: `Wawancara`)
- **Kelayakan Jalur Pengiriman (`Origin Eligibility`):**
  - **Ruang Redaksi (`NEWSROOM`):** Diizinkan.
  - **Agen AI (`INGESTION_API`):** Diizinkan **hanya** untuk menyusun, menata blok tanya jawab, dan menyunting draf keringkasan dari **transkrip atau rekaman wawancara nyata milik redaksi yang tersedia lengkap** dalam penugasan. **Agen AI `DILARANG` keras mengarang tanya jawab atau mengeklaim telah mewawancarai siapa pun.**
  - **Kontributor Eksternal (`CONTRIBUTOR`):** Diizinkan (wajib menyertakan bukti persetujuan wawancara untuk terbit serta catatan/rekaman asli bila diminta redaksi).
- **Sifat Dokumen:** Lapisan C (`Layer C`). Muat berkas ini bersama berkas `core/` dan **satu** profil desk yang ditugaskan.

---

## 1. Tujuan Editorial

Menghadirkan keterangan langsung, alasan pengambilan keputusan publik, kesaksian fakta, atau kepakaran teknis seorang narasumber secara utuh melalui percakapan terstruktur yang diuji dengan pertanyaan kritis dan konteks pembuktian memadai.

---

## 2. Pokok Bahasan yang Sesuai

- Pertanggungjawaban pejabat publik atau pengambil keputusan saat peluncuran kebijakan besar, revisi anggaran, atau krisis layanan.
- Penjelasan ahli hukum, mantan hakim, atau praktisi hukum mengenai implikasi putusan strategis dan celah aturan.
- Pengujian asumsi teknis terhadap perancang sistem, auditor keamanan siber, atau peneliti teknologi independen.
- Kesaksian langsung perwakilan warga terdampak kebijakan atau saksi kunci yang memahami persoalan lapangan secara mendalam.

---

## 3. Struktur dan Pendekatan Naratif

Format Wawancara Verax Press memakai blok tanya jawab khusus agar pembaca selalu dapat membedakan suara pewawancara, jawaban asli narasumber, dan catatan uji fakta redaksi:

1. **Pengantar Konteks (`paragraph` pembuka):** Jelaskan siapa narasumbernya, jabatan serta keterkaitannya dengan isu aktual, mengapa keterangan ini penting sekarang, serta tanggal dan metode wawancara (tatap muka langsung, panggilan video, atau jawaban tertulis). Paragraf pembuka minimal 120 karakter merender *drop cap* klasik Verax.
2. **Catatan Penyuntingan dan Konteks Teknis (`note`):** Cantumkan keterangan metode dan aturan penyuntingan transkrip, misalnya penjelasan bahwa naskah dirapikan untuk keringkasan tanpa mengubah makna maupun urutan argumen narasumber.
3. **Rangkaian Tanya Jawab (`qa`):** Susun inti wawancara menggunakan blok khusus `qa` (`question` dan `answer`) yang dirender Verax dengan penanda huruf `T` dan `J`. Bila narasumber menyebut angka statistik atau isi pasal yang bertentangan dengan dokumen resmi saat wawancara berlangsung, sisipkan blok `note` berisi rujukan data resmi pembanding tepat setelah jawaban terkait.
4. **Informasi Lanjutan Opsional (`paragraph` penutup):** Tutup dengan pembaruan status atau keterangan apakah redaksi juga meminta tanggapan pihak lain terkait klaim narasumber. Pastikan `deck` meringkas pokok pernyataan narasumber tanpa melebih-lebihkan. *(Skema teknis blok `qa` dan `note` dirujuk pada `VERAX_EDITORIAL_API_INTEGRATION.md`.)*

---

## 4. Suara Naratif yang Sesuai

- Bagian pengantar memakai suara jurnalistik netral dan faktual.
- Pertanyaan pewawancara terdengar kritis, langsung pada persoalan, sopan, dan bertumpu pada data (`VERAX-R06`).
- Bagian jawaban `WAJIB` mempertahankan suara, cara berpikir, dan pilihan diksi autentik narasumber; jangan meratakan kalimat narasumber menjadi prosa AI yang seragam.

---

## 5. Syarat Riset

- Pelajari rekam jejak narasumber, dokumen kebijakan, putusan pengadilan, atau laporan audit yang menyangkut kewenangan narasumber **sebelum** wawancara agar pertanyaan menguji substansi dan tidak mudah dipatahkan oleh klaim sepihak.
- Siapkan dokumen pembanding resmi untuk memverifikasi angka atau klaim fakta yang diucapkan narasumber selama wawancara (`VERAX-R01`).

---

## 6. Syarat Sumber

- Wajib menautkan atau menyimpan rujukan rekaman asli maupun transkrip tertulis yang sah (`INTERVIEW`) beserta dokumen pembanding (`OFFICIAL`, `DOCUMENT`, `DATA`) untuk setiap klaim faktual sensitif atau angka yang dikemukakan dalam tanya jawab.
- Persetujuan narasumber atas wawancara untuk publikasi (atau keterangan status tertulis *on the record*) wajib tercatat sebelum penayangan.

---

## 7. Pola Kegagalan Khusus Format (`Failure Conditions`)

1. Pertanyaan lunak yang berfungsi sekadar menjadi panggung kehumasan atau promosi narasumber (*puff piece*).
2. Memotong jawaban atau menempelkan kalimat jawaban dari pertanyaan ketiga ke pertanyaan pertama sehingga makna pernyataan narasumber berubah (`FAIL-02`).
3. Menulis ulang kalimat narasumber secara bebas hingga keluar dari maksud tuturnya.
4. Membiarkan angka salah atau klaim hukum keliru dari mulut narasumber tayang begitu saja tanpa catatan koreksi atau pembanding redaksi.
5. **Untuk Agen AI:** Mengarang tanya jawab simulasi seolah-olah wawancara benar-benar terjadi (`FAIL-02`, Larangan Keras AI #1).

---

## 8. Pemeriksaan Mutu Wajib Format

- [ ] Apakah pengantar sudah mencatat tanggal, tempat atau metode wawancara, serta relevansi narasumber?
- [ ] Apakah rekaman atau transkrip sah tersedia untuk diverifikasi penyunting manusia (`CHIEF_EDITOR`)?
- [ ] Apakah penyuntingan transkrip demi keterbacaan tetap menjaga utuh maksud dan konteks asli jawaban?
- [ ] Apakah blok `qa` terpisah jelas dari catatan pengantar dan catatan koreksi data redaksi?
- [ ] Apakah setiap klaim angka atau tuduhan pihak ketiga di dalam jawaban sudah diuji terhadap sumber pembanding atau dimintakan hak tanggapan?

---

## 9. Contoh Ilustratif Singkat `[CONTOH SIMULASI FIKTIF]`

Catatan: Narasumber, jabatan, tanggal, dan topik percakapan berikut merupakan **contoh simulasi fiktif sepenuhnya** untuk mengilustrasikan susunan blok format wawancara.

- **Pengantar (`paragraph`):** *"[Pejabat Pusat Data Instansi Contoh] menjelaskan hambatan pemadanan nomor identitas calon penerima program bantuan sosial di wilayah kepulauan dalam wawancara daring tercatat pada [Tanggal Wawancara Contoh]."*
- **Catatan Penyuntingan (`note`):** *"Wawancara berlangsung secara daring pada [Tanggal Wawancara Contoh] dan diringkas sebatas pemadatan bahasa tutur tanpa mengubah makna jawaban."*
- **Tanya Jawab (`qa`):**
  - Question (`T`): *"Berdasarkan laporan evaluasi tahap awal, mengapa sejumlah keluarga di wilayah kepulauan belum masuk pemadanan otomatis bulan lalu?"*
  - Answer (`J`): *"Sebagian besar kendala berada pada perbedaan penulisan nama antara dokumen kependudukan lama dan data rekening penyalur, ditambah keterlambatan unggah berita acara verifikasi dari unit kecamatan ketika sambungan internet terganggu."*
