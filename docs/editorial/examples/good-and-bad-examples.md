---
documentId: VERAX-EX-CONTRAST-01
title: Contoh Kontrastif Eksekusi Editorial Baik dan Buruk (Simulasi Fiktif)
version: 1.0.0
status: PROPOSED
scope: examples
appliesTo:
  - optional-reference
  - all-desks
  - all-formats
requiredDependencies:
  - docs/editorial/README.md
  - docs/editorial/core/VERAX_LANGUAGE_AND_STYLE.md
lastReviewed: 2026-11-12
---

# Contoh Kontrastif Eksekusi Editorial: Baik dan Buruk

> **Catatan Status Simulasi (`[CONTOH SIMULASI FIKTIF]`):** Seluruh skenario, angka anggaran, nama entitas usaha, instansi percontohan, rujukan pasal simulasi, tautan `example.go.id`, serta tanggapan pihak di berkas ini merupakan **contoh simulasi fiktif sepenuhnya** untuk latihan penerapan aturan editorial. Berkas ini bersifat **rujukan opsional** (`scope: examples`) dan tidak wajib dimuat pada penugasan yang hanya membutuhkan desk serta format spesifik.

---

## 1. Hukum & Keadilan + `NEWS`: Ketepatan Status Hukum dan Keberimbangan `[CONTOH SIMULASI FIKTIF]`

### Eksekusi Buruk

> **Judul:** Terbukti Lakukan Penggelapan Dana Proyek, Pengusaha M Akhirnya Resmi Ditangkap Aparat!  
> **Isi:** Penangkapan Pengusaha M oleh penyidik menandai keberhasilan penegakan hukum yang paling tegas tahun ini. Dengan ditahannya pelaku pada Selasa pagi, publik kini menantikan hukuman maksimal atas kejahatan yang telah terbukti merugikan keuangan negara tersebut.

**Alasan Gagal:**
- Melanggar `VERAX-R07` dan `VERAX-R09`: menuliskan kata *"terbukti"*, *"pelaku"*, dan *"kejahatan"* padahal status perkara baru pada tahap penyidikan/penangkapan sebelum ada putusan pengadilan berkekuatan hukum tetap (*inkracht*), sehingga memicu kondisi gagal `FAIL-03` dan `FAIL-05`.
- Memakai kalimat pembesar peristiwa berlebih (*"keberhasilan penegakan hukum yang paling tegas"*).
- Tidak mencantumkan dasar surat penyidikan, ketentuan pidana yang disangkakan, maupun tanggapan atau status upaya hukum dari kuasa hukum pihak terkait (`VERAX-R05`, `FAIL-04`).

### Eksekusi Baik

> **Judul:** Penyidik Tetapkan Direktur PT Contoh Karya sebagai Tersangka Dugaan Penggelapan Pengadaan  
> **Deck:** Tersangka ditahan setelah pemeriksaan saksi dan penyitaan dokumen rekening perusahaan; kuasa hukum mengajukan praperadilan.  
> **Isi:** Penyidik [Kepolisian Daerah Contoh] menetapkan Direktur Utama PT Contoh Karya, berinisial Sdr. X (inisial fiktif), sebagai tersangka dugaan penggelapan dalam jabatan terkait kontrak pengadaan perlengkapan sekolah tahun anggaran simulasi sebelumnya. Penetapan tersebut tertuang dalam surat pemberitahuan dimulainya penyidikan tertanggal [Tanggal Contoh] yang dikonfirmasi juru bicara [Kepolisian Daerah Contoh]. Penyidik menyangkakan [pasal penggelapan dalam jabatan sesuai ketentuan hukum pidana berlaku pada waktu peristiwa]. Kuasa hukum Sdr. X menyatakan kliennya mengajukan permohonan praperadilan karena menilai sengketa pembayaran tersebut merupakan wanprestasi perdata, bukan tindak pidana.

**Alasan Berhasil:**
- Menetapkan tahap prosedural tepat (*tersangka*, *dugaan*, *surat pemberitahuan dimulainya penyidikan*, *praperadilan*).
- Menyebutkan sangkaan tanpa menghakimi bersalah sebelum putusan hakim berkekuatan hukum tetap.
- Memuat secara berimbang keberatan hukum dari kuasa hukum tersangka pada bagian yang sejajar.

---

## 2. Teknologi & Kebijakan + `ANALYSIS`: Mekanisme Teknis Nyata vs Klaim Kosong `[CONTOH SIMULASI FIKTIF]`

### Eksekusi Buruk

> **Isi:** Di tengah kemajuan teknologi kota pintar, sistem kamera pengawas terbaru ini mengubah wajah penertiban lalu lintas secara total dan membuka cakrawala pengelolaan jalan modern. Banyak kalangan menilai algoritma canggih itu mampu membaca niat pelanggar secara otomatis dan sangat terpercaya.

**Alasan Gagal:**
- Memakai klaim promosi berlebih (*"mengubah wajah secara total"*, *"cakrawala pengelolaan modern"*), atribusi kabur (*"banyak kalangan menilai"*), dan bahasa antromorfis pada mesin (*"membaca niat pelanggar"*).
- Tidak menjelaskan input data, cara kerja sistem, peran verifikasi manusia, maupun kewajiban pelindungan data warga.

### Eksekusi Baik

> **Isi:** Sistem pemantauan kamera jalan yang dioperasikan [Dinas Perhubungan Contoh] di tiga ruas uji coba sejak [Bulan Contoh] bekerja menggunakan model deteksi objek untuk membaca pelat nomor dan pelanggaran marka garis jalan, tanpa pengenalan wajah pengemudi. Merujuk pada [dokumen spesifikasi teknis pengadaan simulasi], potongan gambar hanya diteruskan melalui koneksi terenkripsi ke peladen dinas untuk diperiksa secara manual oleh petugas sebelum surat tilang dikirim. Meski begitu, dokumen kebijakan privasi sistem tersebut belum menetapkan batas lama penyimpanan rekaman kendaraan warga yang tidak melanggar marka, suatu kewajiban transparansi pengendali data yang diatur dalam kerangka pelindungan data pribadi [ketentuan penyimpanan terbatas pada UU Pelindungan Data Pribadi].

**Alasan Berhasil:**
- Menguraikan fungsi teknis nyata dan batas kemampuan sistem (deteksi pelat dan marka, tanpa pengenalan wajah).
- Memisahkan tahap pemrosesan otomatis dari verifikasi petugas manusia.
- Menghubungkan celah dokumen operasional dengan kewajiban tata kelola regulasi yang relevan.

---

## 3. Pengisian `SourceReference.supports` & `verificationNotes` `[CONTOH SIMULASI FIKTIF]`

### Eksekusi Buruk

```json
{
  "title": "Laporan Keuangan Daerah Contoh",
  "url": "https://example.go.id/laporan-keuangan-contoh.pdf",
  "sourceType": "OFFICIAL",
  "isKeySource": true,
  "supports": "Data penting yang membuktikan kegagalan seluruh program pemerintah daerah."
}
```

**Alasan Gagal:** Menggeneralisasi simpulan melampaui isi berkas (*"membuktikan kegagalan seluruh program"*) dan tidak menunjuk bab, halaman, maupun tabel dokumen apa pun (`DIM-01` skor 1).

### Eksekusi Baik

```json
{
  "title": "Laporan Realisasi Anggaran [Pemkab Contoh] Semester I [Tahun Simulasi]",
  "publisher": "BPKAD [Kabupaten Contoh]",
  "url": "https://example.go.id/ppid/lra-sem1-contoh.pdf",
  "sourceType": "OFFICIAL",
  "publishedAt": "2026-08-15T00:00:00Z",
  "accessedAt": "2026-11-12T03:10:00Z",
  "isKeySource": true,
  "supports": "Tabel IV.2 halaman 18: realisasi belanja modal jaringan irigasi tercatat 31,4 persen dari pagu simulasi Rp42,1 miliar per akhir semester I."
}
```

Didampingi `verificationNotes`:

```text
[SUMBER DIPERIKSA] PDF Laporan Realisasi Anggaran Semester I resmi [Pemkab Contoh] (hlm. 18) serta publikasi statistik daerah [Kabupaten Contoh].
[BELUM TERVERIFIKASI / CELAH] Data realisasi triwulan III belum diunggah di portal PPID hingga tanggal pengajuan draf; tanggapan Kepala Dinas Pekerjaan Umum setempat belum diterima.
[PERLU PEMERIKSAAN MANUSIA] Konfirmasi apakah terdapat pergeseran pagu anggaran perubahan pada kuartal berikutnya serta hubungi Dinas Pekerjaan Umum sebelum tahap FACT_CHECK.
```

---

## 4. Nasional & Publik: Pemisahan `EXPLAINER` Netral vs `OPINION` Argumentatif `[CONTOH SIMULASI FIKTIF]`

Catatan: Skema persentase bagi hasil di bawah ini adalah **angka simulasi fiktif**, bukan rujukan nomor peraturan pemerintah atau persentase hukum nyata.

### `EXPLAINER` Tepat (Penjelas Netral Mekanisme)

> **[CONTOH SIMULASI FIKTIF]**  
> "Bagaimana skema simulasi dana bagi hasil kehutanan dibagi antara pemerintah pusat dan kabupaten penghasil? Dalam [skema peraturan contoh simulasi], iuran pemanfaatan hutan dialokasikan sebesar [porsi simulasi mayoritas] bagi daerah dan [porsi simulasi sisa] bagi pusat dengan penyaluran yang mempertimbangkan laporan kinerja perlindungan tutupan lahan tahun sebelumnya. Mengapa pencairan awal tahun kerap tertunda? Laporan audit kinerja dalam skenario ini mencatat perbedaan jadwal pencocokan data luas izin usaha aktif antara instansi pusat dan dinas provinsi sering menahan transfer triwulan pertama."

### `OPINION` Tepat (Argumen Berdasar Data dengan Kepemilikan Penulis)

> **[CONTOH SIMULASI FIKTIF]**  
> "Keterlambatan pencairan dana bagi hasil pada setiap awal tahun dalam skenario ini menunjukkan kelemahan rancangan verifikasi data berlapis antara pusat dan daerah. Pemerintah pusat memang beralasan kehati-hatian anggaran menuntut pencocokan penuh izin aktif sebelum dana ditransfer ke kas daerah. Namun, membiarkan kabupaten menalangi biaya patroli lapangan selama empat bulan pertama justru memperbesar risiko kerusakan kawasan hutan pada musim kemarau awal. Mekanisme transfer minimum triwulanan berbasis data historis dengan penyesuaian selisih pada akhir tahun jauh lebih masuk akal daripada menahan seluruh penyaluran sejak awal anggaran."
