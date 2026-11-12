---
documentId: VERAX-OPS-QUALITY-02
title: Standar Kedalaman Substansi dan Rubrik Penilaian Mutu Editorial Verax Press
version: 1.0.0
status: PROPOSED
scope: operations
appliesTo:
  - all-desks
  - all-formats
  - newsroom-staff
  - ai-agents
  - quality-reviewers
requiredDependencies:
  - core/VERAX_EDITORIAL_IDENTITY.md
  - core/VERAX_JOURNALISTIC_PRINCIPLES.md
  - core/VERAX_RESEARCH_AND_VERIFICATION.md
  - core/VERAX_ETHICS_AND_RESPONSIBILITY.md
  - core/VERAX_LANGUAGE_AND_STYLE.md
lastReviewed: 2026-11-12
---

# Standar Kedalaman Substansi dan Rubrik Penilaian Mutu Editorial Verax Press

Dokumen ini menjadi tolok ukur tunggal pemeriksaan mutu naskah oleh Pemimpin Redaksi (`CHIEF_EDITOR`), penyunting manusia, dan mekanisme penelaahan mutu redaksi. **Rubrik ini semata alat triase dan diagnosis editorial; skor atau hasil penilaian apa pun TIDAK PERNAH menjadi izin publikasi otomatis.**

---

## 1. Penolakan Kuota Jumlah Kata

Verax Press **menolak jumlah kata sebagai ukuran utama mutu editorial**. Rentang jumlah kata yang tercantum pada beberapa profil format (berkisar antara `600` hingga `1.800` kata bergantung format) hanya berfungsi sebagai ancar-ancar orientasi kedalaman, bukan kuota pengisi ruang.

Artikel 750 kata yang menjawab pertanyaan pokok secara padat, akurat, dan bertaut jelas ke sumber primer jauh lebih bermutu daripada artikel 1.800 kata yang penuh pengulangan paragraf dan basa-basi pembuka.

---

## 2. Sembilan Dimensi Kedalaman dan Substansi Naskah

Sebelum memasuki penilaian rubrik, setiap naskah dinilai apakah memenuhi sembilan unsur substansi berikut:

1. **Relevansi Pertanyaan Utama:** Berangkat dari persoalan nyata yang penting bagi pemahaman publik atas hukum, teknologi, atau tata kelola kebijakan, bukan topik remeh yang dibesar-besarkan.
2. **Kecukupan Riset:** Tidak berhenti pada satu rujukan atau satu rilis pers; dokumen primer dan pihak kunci yang relevan sudah ditelusuri sesuai tuntutan format.
3. **Kekuatan Topangan Faktual:** Setiap klaim faktual pokok terikat ke rujukan spesifik yang sah, mutakhir, dan dapat diperiksa ulang.
4. **Kelengkapan Kontekstual (`VERAX-R03`):** Pembaca memperoleh latar kronologi, cakupan serta pengecualian aturan, batas wilayah, dan angka pembanding yang cukup.
5. **Kedalaman Analisis:** Terutama pada `ANALYSIS` dan `OPINION`, naskah menembus gejala permukaan untuk menguji sebab akibat, struktur insentif, bukti tandingan, dan batas simpulan.
6. **Keberimbangan (`VERAX-R05`):** Pihak terdampak atau pandangan lawan terkuat diperlakukan adil dan terwakili proporsional.
7. **Koherensi Logika:** Alur antarbagian runut tanpa kontradiksi internal dan tanpa lompatan kesimpulan di luar premis bukti.
8. **Relevansi Implikasi:** Menjelaskan konsekuensi praktis yang beralasan bagi warga maupun penyelenggara kebijakan tanpa meramal secara spekulatif.
9. **Kejelasan Bahasa:** Bahasa Indonesia tertib, presisi dalam istilah disiplin, hemat kata, dan nyaman dibaca tanpa kesan mekanis.

---

## 3. Rubrik Bagian A: Kondisi Kegagalan Mutlak (`FAIL-01` sampai `FAIL-07`)

Bagian A bersifat mengikat mutlak. Apabila **satu saja** kondisi di bawah ini terbukti terjadi pada sebuah naskah, naskah `WAJIB` gagal melewati gerbang mutu (ditolak final `REJECTED` untuk pelanggaran integritas atau fabrikasi, atau ditahan ke `REVISION_NEEDED` maupun `FACT_CHECK` bila berupa kekurangan verifikasi/konfirmasi tanpa niat memalsukan):

| Kode | Kondisi Kegagalan Mutlak | Tindakan Editorial Wajib |
|---|---|---|
| `FAIL-01` | **Sumber atau URL Rekaan:** Rujukan tidak pernah ada, URL tebakan/fiktif, atau tautan tidak mengarah ke dokumen yang diklaim. | `REJECTED` jika fabrikasi sengaja; `REVISION_NEEDED` hanya bila murni salah salin tautan yang dibuktikan berkas aslinya. |
| `FAIL-02` | **Kutipan, Wawancara, atau Adegan Rekaan:** Kutipan langsung tidak cocok dengan teks/rekaman sumber atau dikarang; wawancara fiktif; adegan lapangan imajinatif. | `REJECTED` mutlak. |
| `FAIL-03` | **Kekeliruan Fakta Material:** Kesalahan angka pokok, identitas pihak, tanggal kunci, status hukum tersangka/terpidana, atau bunyi aturan pokok yang mengubah makna naskah. | Tahan ke `REVISION_NEEDED` hingga terverifikasi dan diperbaiki; `REJECTED` jika penulis gagal membuktikan dasar klaimnya. |
| `FAIL-04` | **Tuduhan Serius Tanpa Pembuktian dan Hak Tanggapan:** Menuduh pelanggaran hukum atau etik yang merugikan pihak tertentu tanpa bukti primer memadai dan tanpa upaya permintaan tanggapan (`VERAX-R05`). | Tahan publikasi (`REVISION_NEEDED` atau `FACT_CHECK`); wajib lengkapi bukti primer dan konfirmasi pihak terkait. |
| `FAIL-05` | **Penyajian Keliru Dokumen Resmi atau Peradilan:** Memelintir amar atau pertimbangan hakim, mengutip peraturan yang sudah dicabut seolah masih berlaku, atau menyebut RUU sebagai hukum mengikat. | Kembalikan (`REVISION_NEEDED`) atau tolak (`REJECTED`) bila disengaja untuk menyesatkan. |
| `FAIL-06` | **Plagiarisme atau Pelanggaran Hak Cipta:** Salin-tempel maupun saduran mekanis naskah media lain (*spinning*) tanpa nilai tambah analisis dan rujukan sah, atau pemuatan aset visual tanpa izin/lisensi. | `REJECTED` mutlak untuk plagiarisme; tahan aset visual tanpa bukti izin. |
| `FAIL-07` | **Penyamaran Keterlibatan AI atau Catatan Verifikasi Palsu:** Naskah yang disusun substansial oleh AI dideklarasikan sebagai `none`, atau `verificationNotes` mengeklaim uji fakta telah tuntas padahal dokumen inti belum diperiksa. | `REJECTED` mutlak untuk pemalsuan disengaja; wajib perbaiki deklarasi dan verifikasi ulang sebelum penelaahan lanjutan. |

### Aturan Keras Anti-Kompensasi (`WAJIB`)
Skor tinggi atau nilai sempurna pada seluruh dimensi Bagian B **sama sekali tidak dapat menebus, menutup, atau mengkompensasi** satu pun pelanggaran Bagian A.

---

## 4. Rubrik Bagian B: Enam Dimensi Penilaian Mutu (`DIM-01` sampai `DIM-06`, Skala 1 hingga 4)

Hanya naskah yang **lolos bersih dari seluruh kondisi Bagian A** yang dinilai pada enam dimensi kuantitatif-kualitatif berikut:

| Kode | Dimensi Mutu | Skor 1 (Tidak Memadai) | Skor 2 (Perlu Revisi Substansial) | Skor 3 (Memenuhi Standar) | Skor 4 (Kuat dan Matang) |
|---|---|---|---|---|---|
| `DIM-01` | **Akurasi dan Keterlacakan Sumber** | Klaim utama tanpa rujukan atau bertumpu pada sumber sekunder lemah; keterangan `supports` kosong atau samar. | Sumber tersedia tetapi sebagian klaim material belum bertaut ke dokumen primer spesifik atau `supports` masih terlalu umum. | Klaim inti bertumpu pada rujukan primer/sah yang tepat, dan `supports` menunjuk klaim serta bagian dokumen dengan jelas. | Seluruh klaim material terlacak presisi ke sumber terkuat, versi dan tanggal dokumen teruji, serta batas sumber dijelaskan jujur. |
| `DIM-02` | **Kedalaman dan Kelengkapan Kontekstual** | Dangkal, hanya mengulang rilis berita atau judul peristiwa tanpa latar maupun penjelasan mekanisme kerja. | Memiliki latar dasar, namun mengabaikan konteks aturan yang berlaku, pembanding data, atau dampak lintas wilayah dan pihak. | Menjawab pertanyaan utama dengan latar kronologi, mekanisme kerja, dan konteks pembanding yang memadai. | Mengurai akar mekanisme struktural, konteks sejarah/geografis, serta implikasi praktis secara utuh tanpa bertele-tele. |
| `DIM-03` | **Keberimbangan dan Proporsionalitas** | Sepihak, sensasional, atau mencampurkan dugaan dengan kepastian hukum. | Ada upaya menyeimbangkan tetapi porsi tanggapan atau penanda batas kepastian masih pincang, atau judul melebihi bukti isi. | Pihak relevan terwakili wajar, judul dan *deck* proporsional, serta fakta terpisah tegas dari interpretasi maupun opini. | Penanganan sengketa sangat berimbang, mengakui ketidakpastian secara terang, dan menanggapi argumen lawan terkuat secara proporsional. |
| `DIM-04` | **Struktur dan Koherensi Logika** | Alur melompat-lompat, tidak selaras dengan profil format, atau kesimpulan bertentangan dengan bukti yang disajikan. | Bentuk format dikenali tetapi pembuka berputar-putar, terdapat celah logika antarbagian, atau penutup sekadar mengulang ringkasan. | Susunan mematuhi profil desk dan format yang ditugaskan dengan alur argumen atau kronologi logis dari awal sampai akhir. | Struktur kokoh sesuai fungsi format, blok konten Verax dipakai tepat guna, dan penalaran koheren tanpa lompatan logika. |
| `DIM-05` | **Bahasa, Presisi Istilah, dan Kejelasan** | Penuh klise AI, jargon tanpa penjelasan, keliru terminologi hukum/teknis, atau dipenuhi frasa mubazir. | Masih muncul pola paragraf mekanis seragam, penanda transisi berulang, atau istilah disiplin dibiarkan mentah tanpa penjelasan praktis. | Bahasa Indonesia tertib, lugas, ritme kalimat wajar, serta istilah teknis akurat dan dijelaskan ringan bagi pembaca umum. | Prosa tajam, hemat kata, variasi ritme alami sesuai karakter format, dan bersih dari retorika hampa tanpa mengorbankan akurasi. |
| `DIM-06` | **Transparansi AI dan Kejujuran Batasan** | Deklarasi keterlibatan AI meragukan atau celah data ditutup-tutupi memakai bahasa seolah pasti. | Level `aiInvolvement` terisi benar, tetapi `aiUsageNote` atau `verificationNotes` terlalu minim sehingga editor sulit melacak batas pemeriksaan awal. | Deklarasi jujur dan catatan verifikasi mengakui secara terang batas dokumen yang berhasil maupun gagal diperiksa. | Keterlibatan AI, metode penelusuran, celah data yang tersisa, serta daftar titik uji manusia tercatat transparan dan siap diaudit. |

---

## 5. Batasan Penilaian Numerik dan Larangan Publikasi Otomatis

1. **Fungsi Triase Antrean, Bukan Vonis Terbit:** Penjumlahan atau rata-rata skor `DIM-01` hingga `DIM-06` hanya boleh digunakan untuk memprioritaskan antrean penyuntingan atau menunjukkan dimensi mana yang perlu dibenahi penulis (misalnya mengarahkan revisi khusus pada `DIM-02` apabila konteks masih lemah).
2. **Keterbatasan Bawaan Sistem Skor:** Angka rubrik rentan terhadap bias panjang teks dan tidak mampu menilai penuh dinamika risiko hukum pencemaran nama baik Indonesia terkini, bahaya keselamatan narasumber di lapangan, maupun sensitivitas krisis sosial mendadak.
3. **Kewenangan Mutlak Redaktur Manusia:** Naskah yang memperoleh nilai `4` di keenam dimensi tetap **dilarang diterbitkan otomatis**. Penerbitan baru dapat diputuskan setelah Pemimpin Redaksi (`CHIEF_EDITOR`) memverifikasi langsung seluruh sumber kunci menjadi `VERIFIED`, memastikan byline serta atribusi manusia sah, dan mengeksekusi persetujuan akhir.
