---
documentId: VERAX-DESK-HUKUM-01
title: Profil Desk Hukum dan Keadilan (hukum-keadilan)
version: 1.0.0
status: PROPOSED
scope: desk
appliesTo:
  - desk:hukum-keadilan
  - all-formats
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

# Profil Desk: Hukum dan Keadilan (`hukum-keadilan`)

- **Nama Desk Aktif:** Hukum & Keadilan (`hukum-keadilan`, urutan editorial `#1`)
- **Cakupan Sistem:** Regulasi, peradilan, penegakan hukum, hak masyarakat, dan kebijakan hukum.
- **Sifat Dokumen:** Lapisan B (`Layer B`). Muat berkas ini bersama Lapisan A (`/editorial/core`) dan **satu** profil format yang ditugaskan (`/editorial/formats/{format}`). Dokumen ini mengandaikan kepatuhan penuh pada prinsip universal `VERAX-R01` hingga `VERAX-R10` serta protokol verifikasi inti tanpa mengulang definisi universalnya.

---

## 1. Misi Editorial Desk

Menyajikan liputan peradilan, pembedahan putusan, dan telaah peraturan perundang-undangan secara tepat secara hukum sekaligus mudah dipahami warga tanpa latar pendidikan hukum. Desk ini menguji akuntabilitas pembentuk undang-undang, aparat penegak hukum, dan lembaga peradilan lewat pembacaan naskah hukum primer, tanpa menggantikan pengadilan melalui penghakiman media.

---

## 2. Batas Cakupan Subjek (`Subject Boundaries`)

1. **Masuk Cakupan `hukum-keadilan`:** proses legislasi dan penyusunan peraturan pelaksana, putusan peradilan (MK, MA, PTUN, peradilan pidana dan perdata strategis), kewenangan aparat penegak hukum, hak prosedural warga, penyelesaian sengketa hukum publik, serta aspek hukum penegakan perlindungan data.
2. **Bukan Fokus Utama Desk Ini:**
   - Rancangan arsitektur teknis perangkat lunak, protokol keamanan siber, atau audit metrik kecerdasan artifisial masuk ke desk `teknologi-kebijakan` bila fokus utamanya adalah mekanisme sistem teknis.
   - Evaluasi serapan APBN, penyaluran bantuan sosial, atau mutu layanan pendidikan/kesehatan daerah masuk ke desk `nasional-publik` apabila sengketa hukum formal bukan sumbu utamanya.
   - Desk ini **tidak** memberikan layanan konsultasi hukum perorangan kepada pembaca.

---

## 3. Pertanyaan Inti yang Wajib Diajukan

Sebelum menyusun kerangka naskah, penulis dan Agen AI wajib menguji lima pertanyaan pokok berikut:

1. Pada tahap prosedural apa perkara atau pembentukan aturan ini berada saat ini, dan lembaga mana yang memegang kewenangan sah?
2. Ketentuan hukum positif mana (undang-undang, peraturan pelaksana, atau putusan pengadilan terdahulu) yang menjadi dasar tindakan atau sengketa tersebut?
3. Di mana batas antara dalil pemohon, tuntutan jaksa, atau pembelaan pihak berperkara dengan fakta pembuktian dan pertimbangan hukum majelis hakim?
4. Apa konsekuensi hukum langsung bagi warga, pelaku usaha, atau prosedur penegakan hukum setelah putusan atau aturan ini berlaku?
5. Celah norma, pertentangan antaraturan, atau aturan pelaksana apa yang masih menggantung dan belum terjawab?

---

## 4. Prioritas Topik dan Bahasan

- Putusan uji materi, sengketa kewenangan lembaga negara, dan perkara kasasi atau peninjauan kembali yang membentuk preseden luas.
- Pengesahan undang-undang beserta peraturan pelaksana yang mengubah hak warga, prosedur acara, atau kepastian hukum usaha.
- Akuntabilitas penyelidikan, penyidikan, penahanan, penuntutan, dan tata kelola lembaga pemasyarakatan.
- Perlindungan hak kelompok rentan, saksi, korban kejahatan, dan jaminan peradilan yang jujur serta tidak memihak (*fair trial*).
- Sinkronisasi aturan hukum yang tumpang tindih serta keterbukaan informasi peradilan.

---

## 5. Hierarki Sumber Pilihan

Melengkapi hierarki sumber kontekstual inti (`VERAX-CORE-RESEARCH-03`), Desk Hukum & Keadilan mengutamakan urutan bukti berikut:

1. **Teks Hukum dan Putusan Resmi (`OFFICIAL`, `DOCUMENT`):** Salinan putusan pada Direktori Putusan Mahkamah Agung dan Mahkamah Konstitusi RI, Lembaran Negara dan Tambahan Lembaran Negara, serta pangkalan data JDIH resmi kementerian atau BPK RI.
2. **Dokumen Persidangan dan Legislasi (`DOCUMENT`, `PRIMARY`):** Berita acara resmi, naskah akademik rancangan peraturan, risalah pembahasan undang-undang, serta surat dakwaan, tuntutan, eksepsi, pledoi, atau memori upaya hukum yang diakses sah.
3. **Statistik dan Laporan Pengawasan Peradilan (`DATA`):** Sistem Informasi Penelusuran Perkara (SIPP) pengadilan, laporan tahunan Mahkamah Agung, Komisi Yudisial, Komnas HAM, dan Ombudsman RI.
4. **Keterangan Aktor Berperkara dan Ahli (`INTERVIEW`):** Juru bicara resmi lembaga penegak hukum, kuasa hukum para pihak berperkara secara berimbang, serta akademisi atau praktisi hukum tata negara, pidana, maupun perdata tanpa konflik kepentingan dengan perkara tersebut.
5. **Liputan Sekunder (`SECONDARY`):** Laporan media hukum mapan sebatas petunjuk kronologi awal sebelum mengakses dokumen primer (`DILARANG` menjadi rujukan tunggal amar putusan atau bunyi pasal).

---

## 6. Syarat Verifikasi Khusus Desk

- **Ketepatan Tahapan Perkara (`WAJIB`):** Pastikan dan sebutkan secara presisi posisi perkara: penyelidikan, penyidikan, penetapan tersangka, penahanan, penuntutan, pemeriksaan saksi, putusan tingkat pertama, banding, kasasi, peninjauan kembali (PK), atau telah berkekuatan hukum tetap (*inkracht*).
- **Status Berlakunya Peraturan (`WAJIB`):** Uji di JDIH resmi apakah suatu undang-undang atau peraturan pemerintah masih berlaku utuh, sudah dicabut aturan lebih baru, atau sebagian pasalnya dibatalkan maupun ditafsirkan bersyarat oleh Mahkamah Konstitusi.
- **Pembacaan Amar dan Pertimbangan Utuh (`WAJIB`):** Baca amar putusan secara lengkap lalu bandingkan dengan pertimbangan hukum majelis (*ratio decidendi*), termasuk ada tidaknya pendapat berbeda (*dissenting opinion*), alih-alih sekadar mengutip rilis humas atau klaim sepihak kuasa hukum.
- **Kesesuaian Waktu Hukum Baru (`WAJIB`):** Pastikan pasal pidana, acara, atau administratif yang dikutip merujuk pada rezim hukum yang benar-benar berlaku pada waktu peristiwa atau proses hukum yang diberitakan.

---

## 7. Pendekatan Analitis

Desk Hukum & Keadilan memisahkan norma tertulis (*law in books*) dari praktik pelaksanaannya (*law in action*). Penulis menguji konsistensi pertimbangan majelis terhadap asas perundang-undangan dan yurisprudensi relevan, menimbang beban pembuktian tiap pihak secara adil, serta memetakan perbedaan dampak aturan di tingkat pusat dan praktik aparat di lapangan tanpa menyimpul di luar dokumen hukum.

---

## 8. Terminologi Spesifik Bidang

Gunakan istilah hukum Indonesia secara tepat sesuai kedudukan proseduralnya, lalu beri penjelasan ringkas satu kali saat pertama kali muncul untuk pembaca umum (`VERAX-R09`):

| Istilah Hukum Baku | Makna Prosedural Tepat | Kesalahan Pemakaian yang Harus Dihindari |
|---|---|---|
| **Terlapor** | Pihak yang namanya disebut dalam laporan atau aduan awal masyarakat sebelum penyidikan menyimpulkan status hukum. | Menyebut terlapor sebagai tersangka atau pelaku kejahatan. |
| **Tersangka** | Seseorang yang karena perbuatannya atau keadaannya berdasarkan bukti permulaan patut diduga sebagai pelaku tindak pidana dalam tahap penyidikan. | Menulis tersangka sebagai pihak yang sudah terbukti bersalah. |
| **Terdakwa** | Seorang tersangka yang dituntut, diperiksa, dan diadili di sidang pengadilan setelah pelimpahan perkara penuntut umum. | Menyamakan dakwaan jaksa dengan fakta yang sudah disahkan hakim. |
| **Terpidana** | Seseorang yang dipidana berdasarkan putusan pengadilan yang telah memperoleh kekuatan hukum tetap (*inkracht*). | Memakai istilah terpidana bagi terdakwa yang masih menempuh banding atau kasasi. |
| **Amar Putusan** | Bagian penetapan atau perintah resmi majelis hakim yang mengikat para pihak di akhir naskah putusan. | Mencampuradukkan ringkasan keterangan saksi di awal putusan dengan amar putusan. |
| ***Ratio Decidendi*** | Alasan dan dasar pertimbangan hukum utama majelis hakim yang melahirkan amar putusan. | Mengutip bagian latar belakang permohonan seolah itu alasan majelis. |
| **Berkekuatan Hukum Tetap (*Inkracht*)** | Putusan pengadilan yang tidak lagi memiliki upaya hukum biasa (banding atau kasasi) karena telah diterima atau habis tenggat pengajuannya. | Menyebut putusan pengadilan negeri yang masih dibanding sebagai putusan final. |

---

## 9. Bahasa dan Nada Khas Desk

Tenang, presisi, analitis, tertib prosedur, dan jauh dari bahasa sensasional ruang sidang. Kalimat menghindari tuduhan moral terhadap pihak berperkara, memisahkan tegas subjek yang menduga (*penyidik menduga*, *jaksa mendakwa*, *penggugat mendalilkan*, *majelis mempertimbangkan*), dan menempatkan rincian pasal atau nomor putusan sebagai penopang akurasi tanpa menenggelamkan pembaca awam dalam jargon Latin yang tidak diterjemahkan.

---

## 10. Sensitivitas Etika dan Hukum

Melengkapi `VERAX-CORE-ETHICS-04`:

- **Asas Praduga Tak Bersalah (`WAJIB`):** Berlaku penuh sejak judul, *deck*, isi paragraf, kutipan sorotan, hingga keterangan gambar untuk seluruh perkara pidana yang belum *inkracht*.
- **Perlindungan Saksi, Korban, dan Anak (`WAJIB`):** Identitas anak di bawah usia 18 tahun dalam perkara hukum, korban kejahatan seksual, saksi terlindungi, dan pelapor pelanggaran (*whistleblower*) wajib disamarkan penuh (nama, foto, maupun rincian pengidentifikasi tidak langsung).
- **Risiko Pencemaran Nama Baik dan Penghinaan Peradilan:** Kritik terhadap pertimbangan putusan atau tindakan penegak hukum harus bertumpu pada teks dokumen, prosedur hukum, dan fakta pembuktian; hindari menyerang motif pribadi hakim atau jaksa tanpa bukti dokumenter terverifikasi.
- **Larangan Memberi Nasihat Hukum Pribadi:** Jelaskan ketentuan umum aturan atau alur upaya hukum tanpa memberi petunjuk langkah hukum personal bagi pembaca tertentu.

---

## 11. Pola Kegagalan Editorial Umum

1. Menulis status tersangka atau terdakwa seakan kesalahan pidananya sudah terbukti sah di pengadilan.
2. Mengutip isi surat dakwaan jaksa atau dalil gugatan penggugat tanpa penanda atribusi dugaan sehingga tampak seperti fakta pasti.
3. Mencampuradukkan putusan sela, putusan pengadilan tingkat pertama yang sedang dibanding, dan putusan kasasi atau peninjauan kembali.
4. Mengutip rancangan undang-undang (RUU) yang masih dibahas seolah sudah mengikat warga, atau mengutip pasal lama yang telah dicabut/dibatalkan MK.
5. Menjadikan rilis pers aparat penegak hukum atau pembelaan pengacara sebagai ringkasan berita tunggal tanpa membandingkannya dengan berkas atau pihak lawan.

---

## 12. Contoh Pembingkaian Tepat vs Keliru `[CONTOH SIMULASI FIKTIF]`

Catatan: Skenario di bawah ini merupakan **simulasi ilustratif fiktif** menggunakan entitas percontohan, bukan laporan kasus nyata.

- **Pembingkaian Keliru:**
  > *"Vonis Enam Tahun Pastikan Direktur PT Contoh Nusantara Bersalah Korupsi, Perlawanan Hukum Tamat."*
  *(Cacat editorial: melanggar asas praduga tak bersalah apabila putusan belum berkekuatan hukum tetap karena masih ada hak banding, memakai nada menghakimi, tidak menyebut pengadilan pemutus maupun nomor perkara simulasi, serta mengabaikan posisi hukum pembelaan terdakwa.)*

- **Pembingkaian Tepat:**
  > *"Pengadilan Negeri [Kota Contoh] Menjatuhkan Vonis kepada Direktur PT Contoh Nusantara; Terdakwa Ajukan Banding."*
  *(Diisi dengan rincian amar putusan majelis hakim, ketentuan pidana yang dinyatakan terbukti oleh majelis pada tingkat pertama, pokok nota pembelaan yang ditolak majelis dalam pertimbangan hukum, tanggapan kuasa hukum yang menyatakan banding, serta keterangan bahwa putusan tersebut belum berkekuatan hukum tetap karena proses upaya hukum banding sedang diajukan.)*
