---
documentId: VERAX-CORE-RESEARCH-03
title: Protokol Riset, Hierarki Sumber, dan Verifikasi Verax Press
version: 1.0.0
status: PROPOSED
scope: core
appliesTo:
  - all-desks
  - all-formats
  - human-contributors
  - newsroom-staff
  - ai-agents
requiredDependencies:
  - core/VERAX_EDITORIAL_IDENTITY.md
  - core/VERAX_JOURNALISTIC_PRINCIPLES.md
lastReviewed: 2026-11-12
---

# Protokol Riset, Hierarki Sumber, dan Verifikasi Verax Press

Dokumen ini menetapkan standar editorial tunggal mengenai mutu bukti, pemetaan dukungan klaim, protokol pemeriksaan keabsahan sumber, larangan fabrikasi, penanganan ketidakpastian, dan keabsahan aset visual. Spesifikasi teknis bidang skema payload, batas karakter API, dan gerbang status sistem didokumentasikan pada `/openapi.json`, `/developers`, dan `/editorial/operations/api-integration`.

---

## 1. Hierarki Sumber Kontekstual

Verax Press mengelompokkan rujukan menjadi enam jenis sumber konseptual: dokumen resmi instansi (`OFFICIAL`), dokumen naskah/putusan/arsip (`DOCUMENT`), himpunan data atau statistik (`DATA`), sumber primer langsung atau riset asli (`PRIMARY`), keterangan wawancara (`INTERVIEW`), serta pelaporan sekunder (`SECONDARY`).

Urutan keutamaan di bawah ini bersifat **kontekstual**: kedudukan suatu sumber di tingkat teratas tidak otomatis membuat isinya netral, lengkap, atau cukup untuk membuktikan semua jenis klaim.

| Tingkat | Kategori Sumber | Kegunaan Pembuktian Utama | Batas dan Peringatan Kritis |
|---|---|---|---|
| **Tingkat 1** | **Dokumen Hukum dan Catatan Resmi Primer** (`OFFICIAL`, `DOCUMENT`) | Membuktikan bunyi peraturan perundang-undangan, amar dan pertimbangan putusan pengadilan, risalah sidang, laporan resmi BPK atau Ombudsman, serta dokumen kebijakan tertandatangani. | Dokumen resmi membuktikan keputusan atau sikap tertulis lembaga, tetapi belum membuktikan pelaksanaan atau efektivitas di lapangan. Siaran pers pemerintah (`OFFICIAL`) membuktikan pernyataan pejabat, bukan bukti netral kondisi lapangan. |
| **Tingkat 2** | **Himpunan Data Asli dan Riset Primer** (`DATA`, `PRIMARY`) | Membuktikan besaran statistik, tren anggaran, metrik kinerja teknis, hasil audit independen, atau temuan riset ilmiah (*peer-reviewed*). | Penulis `WAJIB` memeriksa tahun pengambilan data, definisi operasional, metodologi, ukuran sampel, dan potensi konflik kepentingan penyandang dana. Pra-cetak (*preprint*) atau ringkasan vendor bukan riset terverifikasi sejawat. |
| **Tingkat 3** | **Keterangan Langsung dan Wawancara** (`INTERVIEW`, `PRIMARY`) | Membuktikan sikap narasumber berwenang, kesaksian langsung peristiwa, keahlian teknis spesifik, dan pemenuhan hak tanggapan pihak terdampak. | Kesaksian lisan mengenai angka, kronologi hukum, atau spesifikasi teknis `DIANJURKAN` ditriangulasi terhadap catatan tertulis apabila dokumennya tersedia. Agen AI `DILARANG` mengeklaim telah melakukan wawancara. |
| **Tingkat 4** | **Pelaporan Sekunder Kredibel** (`SECONDARY`) | Memberi konteks kronologi awal, petunjuk keberadaan dokumen primer, atau perbandingan liputan media mapan. | Sumber sekunder `DILARANG` menjadi rujukan tunggal untuk klaim hukum, angka kebijakan, atau kutipan putusan bila dokumen aslinya dapat diakses. Kutipan berantai dari media lain `WAJIB` ditelusuri hingga ke sumber asal. |
| **Tingkat 5** | **Sumber Terbatas Lainnya** (`SECONDARY` dengan catatan keterbatasan) | Dipakai hanya apabila sumber primer tidak tersedia (misalnya arsip terhapus atau laporan awal lapangan masyarakat) dan nilainya tinggi bagi kepentingan publik. | Penulis `WAJIB` menyatakan status keterbatasan sumber secara terbuka dalam isi naskah maupun catatan verifikasi, serta menahannya apabila menyangkut tuduhan serius. |

---

## 2. Disiplin Pemetaan Dukungan Klaim (`Claim-Level Support`)

Setiap klaim faktual utama dalam naskah harus dapat ditautkan ke rujukan yang jelas sehingga penyunting manusia maupun pembaca dapat menguji pertanggungjawabannya:

1. **Spesifik ke Klaim dan Bagian Dokumen (`WAJIB`):** Keterangan dukungan sumber harus menyebut secara presisi klaim apa di dalam naskah yang ditopang sumber tersebut beserta lokasi bagian dokumennya (pasal, ayat, halaman, tabel, atau tanggal pernyataan) sejauh tersedia. Penjelasan umum seperti *"Referensi utama artikel"* tidak memenuhi standar.
2. **Penandaan Sumber Kunci (`isKeySource`):** Sumber yang menopang klaim inti judul, *deck*, angka utama, atau tuduhan pokok layak diusulkan sebagai sumber kunci oleh penulis atau Agen AI. Dalam mekanisme tata kelola redaksi, seluruh sumber yang baru masuk berstatus `UNVERIFIED`, dan hanya Pemimpin Redaksi (`CHIEF_EDITOR`) yang berwenang menetapkan daftar akhir sumber kunci serta menyatakan tiap sumber kunci berstatus `VERIFIED` sebelum terbit.
3. **Ketepatan Tanggal Terbit dan Tanggal Akses (`WAJIB`):** Tanggal penerbitan asli dokumen dan tanggal pengaksesan aktual wajib dicatat akurat dalam format ISO 8601 sesuai sumber yang diperiksa, bukan perkiraan atau tanggal otomatis ketika dokumen sebenarnya belum dibaca penuh.

---

## 3. Protokol Verifikasi Tujuh Titik (`WAJIB`)

Sebelum menyatakan sebuah sumber mendukung klaim naskah, penulis maupun Agen AI wajib memeriksa ketujuh titik berikut:

1. **Keaslian Sumber:** Pastikan tautan berasal dari domain resmi lembaga, basis data hukum sah (misalnya JDIH resmi atau BPK RI), penerbit akademik, atau kanal resmi terkonfirmasi, bukan situs kloningan, blog anonim, atau salinan terpotong.
2. **Tanggal dan Versi Dokumen:** Periksa apakah suatu peraturan telah dicabut atau diubah oleh ketentuan yang lebih baru pada pangkalan data perundang-undangan resmi, atau apakah putusan pengadilan telah berubah pada tingkat banding maupun kasasi.
3. **Konteks Utuh:** Baca pasal sebelum dan sesudah, ketentuan peralihan, serta catatan kaki tabel data agar angka atau norma tidak berlaku bersyarat.
4. **Redaksi Asli (*Original Wording*):** Periksa bunyi teks asli kata per kata sebelum mengutip atau memparafrase. Ringkasan atau terjemahan yang mengubah cakupan kewajiban atau sanksi hukum `DILARANG`.
5. **Metodologi dan Batasan:** Untuk data survei atau pengujian teknis, catat periode pengumpulan, populasi, definisi metrik, dan batas generalisasi kesimpulannya.
6. **Kontradiksi Relevan:** Telusuri apakah ada dokumen resmi tandingan, revisi statistik, putusan berbeda dari lembaga sejajar, atau pendapat berbeda (*dissenting opinion*) yang mengubah tafsir.
7. **Kesesuaian Pembuktian (*Claim-Source Entailment*):** Uji langsung apakah isi dokumen rujukan benar-benar menyatakan klaim yang ditulis pada naskah, jangan mengandalkan kemiripan topik semata.

---

## 4. Delapan Larangan Mutlak atas Fabrikasi (`DILARANG`)

Seluruh kontributor manusia, staf redaksi, dan Agen AI dilarang mutlak melakukan delapan bentuk fabrikasi berikut:

1. Mengarang sumber rujukan atau menciptakan URL palsu, URL tebakan, maupun tautan ke halaman yang belum pernah dibuka dan dibaca.
2. Membuat dokumen, nomor peraturan, nomor putusan, tabel statistik, atau himpunan data fiktif.
3. Membuat wawancara palsu, tokoh gabungan (*composite character*), atau kutipan langsung yang tidak pernah diucapkan narasumber.
4. Menyatakan klaim tentang tindakan penyidikan, audit, sanksi, atau keputusan institusi tanpa dasar dokumen atau konfirmasi berwenang.
5. Melakukan atribusi palsu, seperti menuliskan tafsiran pengamat atau berita media lain seolah merupakan sikap resmi instansi.
6. Memelintir temuan riset (misalnya menyulap korelasi statistik menjadi sebab akibat mutlak atau menyembunyikan margin kesalahan).
7. Menyusun kronologi secara menyesatkan dengan menggeser urutan waktu sehingga sebab dan akibat tampak terbalik.
8. Menyajikan spekulasi, proyeksi model bahasa, atau dugaan penulisan sebagai fakta yang sudah terjadi.

---

## 5. Penanganan Ketidakpastian, Informasi Kurang, dan Perubahan Pasca-Terbit (`WAJIB`)

| Situasi Ketidakpastian | Protokol Penanganan Editorial Wajib |
|---|---|
| **1. Sumber saling bertentangan** | Jelaskan kedua posisi beserta perbedaan angka atau metodenya secara terbuka dalam tubuh artikel. Jangan memilih satu pihak secara diam-diam. |
| **2. Laporan belum terkonfirmasi** | Tahan klaim hingga terverifikasi sumber independen, atau nyatakan secara terang bahwa informasi baru berupa laporan awal yang belum dikonfirmasi otoritas berwenang dengan syarat kepentingan publik mendesak dan tidak menuduh sepihak. |
| **3. Tanggapan pihak terkait belum diperoleh** | Muat hanya bila bukti inti lain telah kuat; cantumkan nama pihak yang dihubungi, kanal permintaan konfirmasi, serta status terakhir (*belum menjawab hingga naskah ini diterbitkan*). |
| **4. Fakta kunci belum diketahui** | Akui secara lugas bahwa rincian tertentu belum dipublikasikan atau belum diketahui. Dilarang menambal celah informasi dengan asumsi wajar atau perkiraan. |
| **5. Himpunan data tidak lengkap** | Sebutkan periode, wilayah, atau variabel yang hilang. Batasi kesimpulan sebatas cakupan data yang benar-benar tersedia. |
| **6. Temuan sementara (*provisional*)** | Beri penanda status waktu dan tahapan yang tegas (misalnya *data sementara kuartal berjalan*, *putusan tingkat pertama yang masih dapat dibanding*). |
| **7. Perubahan atau kekeliruan setelah terbit** | Dilarang menghapus atau menimpa diam-diam. Kesalahan fakta material diperbaiki melalui mekanisme koreksi resmi agar catatan publik tetap terlihat terbuka; cacat integritas mendasar diproses melalui pencabutan artikel. |

---

## 6. Atribusi Pihak Ketiga dan Asal-Usul Aset Visual (`WAJIB` / `DILARANG`)

1. Materi tertulis pihak ketiga hanya boleh dikutip sesuai batas kutipan wajar dengan atribusi jelas atau izin tertulis yang sah.
2. Setiap aset visual (foto, ilustrasi, diagram, atau salinan dokumen visual) `WAJIB` mencatat pembuat (*creator*), status lisensi, bukti izin penggunaan jika diperlukan, serta keterangan gambar (*caption*) faktual yang menjelaskan konteks waktu, tempat, atau isi visual.
3. Gambar hasil generasi AI atau gambar sintetis `DILARANG` disajikan seolah-olah foto dokumentasi peristiwa nyata. Penggunaannya hanya dapat dipertimbangkan sebagai ilustrasi konseptual non-dokumenter atas persetujuan redaktur penanggung jawab, disertai keterangan eksplisit sifat sintetisnya pada bidang `license` dan `caption`, serta tidak menggambarkan tokoh nyata secara menyesatkan.
