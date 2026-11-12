---
documentId: VERAX-CORE-IDENTITY-01
title: Identitas Editorial, Normativitas, dan Batas Dokumen Verax Press
version: 1.0.0
status: PROPOSED
scope: core
appliesTo:
  - all-desks
  - all-formats
  - human-contributors
  - newsroom-staff
  - ai-agents
requiredDependencies: []
lastReviewed: 2026-11-12
---

# Identitas Editorial, Normativitas, dan Batas Dokumen Verax Press

Dokumen ini menjadi fondasi **Lapisan A (`Layer A`, Bagian 1)** dalam standar penulisan editorial **Verax Press** (`VERAX-EDITORIAL-AI`). Setiap penulis internal, kontributor eksternal, redaktur, dan Agen Kecerdasan Artifisial (`AI Agent`) wajib memahami identitas serta batas otoritas dokumen ini sebelum menyusun atau menyunting naskah jurnalistik.

---

## 1. Identitas Kerja dan Kejujuran Status Kelembagaan

Nama Verax berakar dari kata Latin *verax* yang berarti jujur atau berkata benar, ditopang moto redaksi *Ex Fontibus Veritas* (kebenaran bersumber dari sumbernya).

Sejalan dengan keterbukaan administratif Verax Press, ketentuan status berikut berlaku atas seluruh kerangka standar ini:

1. **Status Usulan (`PROPOSED`):** Standar `VERAX-EDITORIAL-AI` versi `1.0.0` masih berstatus usulan kerja tanpa tanggal berlaku efektif (`effectiveDate: null`). Pengesahan resmi dan kewenangan perubahan kebijakan berada pada Pemimpin Redaksi (`CHIEF_EDITOR`).
2. **Nama Kerja Percontohan dan Batas Status Hukum:** Standar ini disusun untuk media digital independen percontohan yang beroperasi dengan nama kerja **Verax Press**. Standar ini bukan nasihat hukum dan tidak menyiratkan bahwa Verax Press telah berbadan hukum pers, terverifikasi Dewan Pers, atau terdaftar sebagai Penyelenggara Sistem Elektronik (PSE).
3. **Bukan Layanan Penerbitan Bebas:** Verax Press memadukan ruang redaksi internal dan kontribusi terkurasi. Tidak ada naskah dari staf, kontributor eksternal, maupun Agen AI yang dapat terbit tanpa pemeriksaan dan persetujuan akhir redaktur manusia yang berwenang.

---

## 2. Tujuan dan Filosofi Konsistensi Mutu

Standar ini bertujuan membangun konsistensi **mutu jurnalistik dan integritas editorial** di seluruh artikel Verax Press, siapa pun pihak penyusunnya. Konsistensi yang dimaksud mencakup ketelitian riset, kejernihan penalaran, kedalaman analisis, ketertelusuran sumber, etika pemberitaan, dan disiplin bahasa Indonesia.

Standar ini secara sadar menolak penyeragaman pola kalimat atau suara penulisan di semua tulisan. Berita hukum, analisis kebijakan teknologi, dan wawancara tokoh publik harus memperlihatkan watak penceritaan dan penekanan bukti yang berbeda sesuai tugasnya, selama seluruhnya berpijak pada prinsip Verax yang sama.

---

## 3. Empat Pilar Identitas Editorial Verax Press

Keempat ciri berikut harus terasa nyata di setiap artikel terbitan Verax Press:

1. **Pembuktian Terlacak ke Sumber Primer:** Setiap klaim faktual utama bertumpu pada rujukan yang dapat diperiksa langsung oleh pembaca, terutama peraturan resmi, putusan peradilan, dokumen lembaga, data mentah, atau keterangan terverifikasi. Pembeda Verax terletak pada ketertelusuran sumber dan keterbukaan catatan koreksi, bukan pada penonjolan slogan pengawasan internal.
2. **Penjelasan Mekanisme Sebelum Kesimpulan:** Naskah tidak berhenti pada laporan permukaan atau pernyataan seremonial pejabat. Penulis menguraikan bagaimana suatu kebijakan, aturan hukum, atau sistem teknis bekerja, siapa pihak berwenang, dan apa akibatnya bagi masyarakat.
3. **Ketahanan terhadap Sensasionalisme dan Retorika Hampa:** Tulisan menjaga jarak tegas dari judul pemancing emosi, hiperbola, kata sifat pembesar peristiwa, maupun kesimpulan moral yang mendahului bukti.
4. **Kejujuran atas Batas Pengetahuan dan Ralat Terbuka:** Ketika bukti belum lengkap, tanggapan narasumber belum diperoleh, atau ditemukan kekeliruan sesudah tayang, Verax mengungkapnya secara terang dalam isi artikel serta log koreksi publik.

---

## 4. Arsitektur Penulisan Empat Lapis

Verax Press merumuskan arah penulisan setiap naskah melalui penggabungan empat lapis:

1. **Lapisan A (`Layer A` - Identitas dan Prinsip Universal):** Mengikat seluruh naskah dalam hal integritas fakta, etika, metode verifikasi, dan disiplin bahasa (tersedia melalui `/editorial/core`).
2. **Lapisan B (`Layer B` - Profil Desk Aktif):** Menetapkan lensa profesi subjek, pertanyaan inti, hierarki sumber pilihan, istilah teknis bidang, dan risiko hukum atau etis sesuai desk yang ditugaskan (`/editorial/desks/{slug}`).
3. **Lapisan C (`Layer C` - Profil Format Artikel):** Menentukan fungsi editorial, suara naratif, alur penceritaan, dan jenis bukti yang sah sesuai format (`/editorial/formats/{format}`).
4. **Lapisan D (`Layer D` - Konteks Penugasan Spesifik):** Menurunkan Lapisan A, B, dan C ke penugasan konkret pada suatu topik, titik kronologi, dan celah informasi tertentu (`/editorial/operations/ai-workflow` atau resolver selektif `/editorial/context`).

---

## 5. Kata Kunci Normatif

Seluruh aturan dalam basis pengetahuan `VERAX-EDITORIAL-AI` dibedakan menjadi empat tingkat kekuatan hukum internal:

| Kata Kunci | Padanan Normatif | Makna Kepatuhan |
|---|---|---|
| **`WAJIB`** | `MUST` | Persyaratan mutlak. Pelanggaran membuat naskah tidak layak kirim atau tertahan pada penelaahan dan uji fakta redaksi. |
| **`DILARANG`** | `MUST NOT` | Larangan mutlak tanpa pengecualian. Pelanggaran integritas berujung pada penolakan naskah. |
| **`DIANJURKAN`** | `SHOULD` | Praktik editorial terbaik pada kondisi normal. Penyimpangan diperbolehkan apabila konteks penugasan membenarkannya dan alasan editorialnya jelas. |
| **`OPSIONAL`** | `MAY` | Pilihan teknik penulisan atau struktur yang dapat dipakai sesuai kebutuhan liputan. |

---

## 6. Pemisahan Prosa Jurnalistik dari Salinan Antarmuka Sistem

Basis pengetahuan `VERAX-EDITORIAL-AI` mengatur **naskah jurnalistik** (judul berita, *deck*, tubuh artikel enam format, kutipan, keterangan dukungan sumber, catatan verifikasi, dan pengungkapan AI per naskah), dengan suara adaptif dari komposisi Lapisan A, B, C, dan D. Pengaturan ini terpisah secara tegas dari standar salinan milik sistem (*system-owned copy*) pada antarmuka pengguna, pesan galat API, label navigasi, dan halaman informasi platform.

Untuk prosa naskah jurnalistik, keutuhan kutipan verbatim narasumber, istilah hukum atau ilmiah baku, serta tanda baca yang diperlukan oleh makna selalu dilindungi dan tidak boleh dirusak oleh aturan mekanis antarmuka.

---

## 7. Hierarki Penyelesaian dan Kontrak Teknis Publik

1. Apabila terjadi ketegangan instruksi antarmodul dalam basis pengetahuan publik ini, penyusun wajib menerapkan urutan prioritas: Lapisan A (`Core` dan `FAIL-01`..`FAIL-07`) -> Lapisan B (`Desk`) -> Lapisan C (`Format`) -> Lapisan D (`Konteks Penugasan`).
2. Seluruh kontrak teknis API publik, autentikasi klien, skema payload pengiriman, kode galat, dan batas teknis tersedia pada `/developers`, `/openapi.json`, serta panduan integrasi publik (`/editorial/operations/api-integration`).
