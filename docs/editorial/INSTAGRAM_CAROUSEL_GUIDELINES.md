# Panduan Editorial Karosel Instagram Verax Press

Dokumen ini mengatur standar penulisan naskah dan penyusunan slide karosel Instagram untuk worker AI maupun redaktur Verax Press.

---

## 1. Filosofi dan Fungsi Karosel (Revisi Arah v7)

Karosel Instagram Verax Press berfungsi sebagai **pemantik diskusi kritis dan etalase investigasi** yang mendorong publik membaca laporan mendalam berbasis bukti autentik di situs web utama (`veraxpress.vercel.app`).

### Koreksi Arah dari Iterasi Sebelumnya:
- **Koreksi Pemotongan Naskah (v6):** Memaksa isi slide menjadi satu kalimat pendek tajam (di bawah 20 kata seperti judul telegram) adalah kekeliruan arah. Pemotongan ekstrem menghilangkan substansi dan rantai logika investigasi.
- **Akar Masalah Sebenarnya (v2-v4):** Masalah pada iterasi awal bukan panjang teks, melainkan kekacauan tata letak karena teks dikepung oleh terlalu banyak elemen dekoratif berulang (kotak dossier bergaris batas kiri merah marun, lencana klasifikasi A1, tabel metadata tiga kolom).
- **Prinsip Solusi (v7):** Narasi argumentatif investigasi dibiarkan tetap utuh (konteks, temuan, implikasi), disajikan dengan tipografi bersih dan hierarki visual yang tegas melalui kontras ukuran huruf dan spasi, tanpa kotak dekoratif berulang.

---

## 2. Fleksibilitas Jumlah Slide dan Panduan untuk AI Worker

Jumlah slide per karosel **tidak dikunci pada angka tertentu**:
- Worker AI bebas menyusun 4 hingga 10 slide (batas teknis platform Instagram) sesuai tingkat kompleksitas materi investigasi.
- Jenis slide `content` boleh dan dianjurkan digunakan berkali-kali secara berurutan (`content 1`, `content 2`, `content 3`, dan seterusnya) dalam satu karosel yang sama.
- **Protokol AI Worker untuk Memecah Argumen Kompleks:**
  Jika suatu temuan investigasi terlalu kaya data atau memiliki rantai sebab-akibat panjang, AI worker **dilarang memotong naskah menjadi satu kalimat kosong**, dan juga **dilarang menjejalkan seluruh data ke dalam satu slide hingga sesak**.
  AI worker wajib memecah materi liputan ke beberapa slide `content` berurutan dengan pembagian peran tematis yang jelas:
  1. *Slide Content A (Konteks & Latar):* Latar belakang kebijakan, lonjakan alokasi anggaran, atau disposisi darurat tanpa izin.
  2. *Slide Content B (Temuan Inti & Pelanggaran):* Surat perintah kerja mendahului jadwal lelang, spesifikasi yang dikunci, atau penunjukan rekanan sepihak.
  3. *Slide Content C (Implikasi Hukum & Aliran Dana):* Pencairan termin tanpa jaminan bank yang sah, potensi kerugian negara, atau pengalihan rekening penampung.
- Setiap slide `content` harus berdiri sebagai satu kesatuan argumen yang utuh dengan kalimat-kalimat konkret (menyebut nama lembaga, konsorsium, nomor berkas audit, tanggal, dan nilai rupiah).

---

## 3. Struktur dan Format Tiap Slide

Setiap karosel memadukan struktur slide berikut sesuai kebutuhan liputan:

### Slide 1: Cover (Laporan Khusus)
- **Peran:** Menghentikan scroll pembaca seketika melalui judul investigasi yang berwibawa dan bernas.
- **Kicker:** Label huruf kapital (contoh: `LAPORAN KHUSUS`, `INVESTIGASI UTAMA`).
- **Judul Utama:** Pernyataan tajam yang langsung menunjuk pokok perkara (Newsreader Bold 68px hingga 96px).
- **Deck Ringkasan:** Konteks pengantar pembuka (Inter 28px).
- **Byline & Navigasi:** Kredit redaksi bersih tanpa kotak, disertai indikator `GESER BACA →`.

### Slide 2 hingga N-2: Temuan dan Rantai Argumen (Content)
- **Peran:** Membangun narasi investigasi yang utuh dan meyakinkan secara bertahap.
- **Hierarki Dua Tingkat:**
  * **Pukulan Pertama (Lead Punch):** Kalimat pembuka berukuran lebih besar dan tebal (42px hingga 52px) sebagai tesis temuan.
  * **Garis Pemisah Broadsheet:** Garis horizontal bersih pemisah judul dan naskah.
  * **Narasi Penjelas:** Rangkaian kalimat konkret yang mengalir nyaman (26px hingga 31px) menguraikan konteks, angka, tanggal, dan implikasi perkara.
- **Rujukan Sumber Primer:** Ditempatkan bersahaja sebagai teks kecil biasa (Inter 15px) di atas garis pemisah tipis di bagian bawah slide, tanpa wadah kartu dan tanpa garis batas kiri tebal.

### Slide N-1: Kesaksian Kunci (Quote, Opsional bila Ada Kesaksian Relevan)
- **Peran:** Menghadirkan kesaksian langsung atau pengakuan narasumber yang menguatkan temuan dokumen.
- **Format:** Kutipan verbatim dalam Newsreader Italic elegan (46px hingga 64px) tanpa kotak berlatar warna dan tanpa garis batas kiri merah marun.
- **Atribusi:** Nama narasumber (Newsreader Bold 32px) dan jabatan atau dasar dokumen pemeriksaan (Inter 18px) diletakkan rapi di bawah kutipan.
- **Catatan Redaksi:** Konfirmasi verifikasi satu baris di atas footer.

### Slide Terakhir: Closing (Ajakan Baca dan Diskusi Kritis)
- **Peran:** Mengajak publik memeriksa bukti primer serta memantik percakapan kritis.
- **Kicker:** `BACA INVESTIGASI LENGKAP`.
- **Pertanyaan Kritis atau Ajakan:** Kalimat pemantik yang menantang akuntabilitas publik (Newsreader Bold 50px hingga 58px).
- **Domain Web:** `veraxpress.vercel.app` dalam tipografi Newsreader Bold monumental (86px).
- **Jaminan Transparansi:** Penegasan etos jurnalisme independen tanpa paywall dan akses dokumen lengkap untuk publik.

---

## 4. Standar Penulisan Teks

Worker AI dan tim redaksi wajib menerapkan disiplin penulisan berikut:

1. **Dilarang Keras Menggunakan Tanda Pisah Em Dash (karakter tanda pisah panjang):**  
   Gunakan tanda koma, titik dua, tanda kurung, atau pisahkan menjadi kalimat mandiri. Larangan ini berlaku mutlak pada teks kanvas, naskah caption, maupun dokumentasi.
2. **Dilarang Menggunakan Kata Klise AI:**  
   Hindari kata-kata artifisial seperti *delve, unlock, elevate, seamless, robust, tapestry, game-changer, landscape, wadah, menjembatani*, dan padanannya.
3. **Konkret dan Spesifik:**  
   Sebutkan nama lembaga resmi, nama konsorsium atau perusahaan rekanan, angka rupiah yang tepat, tanggal kejadian, dan nomor surat keputusan atau hasil pemeriksaan. Dilarang menggunakan kalimat generik yang dapat ditempelkan pada sembarang kasus.
4. **Alur Mengalir untuk Layar Ponsel:**  
   Hindari nada birokratis seperti notula rapat instansi pemerintah. Gunakan kalimat aktif, lugas, dan bertenaga yang nyaman dipindai dengan cepat di layar sentuh.
5. **Caption Instagram Wajib Mengundang Diskusi Kritis:**  
   Teks caption tidak boleh sekadar ringkasan netral yang datar. Akhiri caption dengan pertanyaan kritis atau refleksi retoris yang menantang pembaca untuk menanggapi di kolom komentar, serta tautkan ke artikel lengkap di `veraxpress.vercel.app`.
