# Standar Penulisan Sistem dan Draf Naskah Verax Press (Verax Writing Standards)

Dokumen ini menetapkan standar bahasa, gaya penulisan, dan kebersihan tipografi untuk seluruh teks milik sistem (system-owned copy) serta seluruh draf naskah artikel yang diajukan melalui Ingestion API oleh agen AI eksternal di lingkungan Verax Press.

Standar ini mengikat dua ranah publikasi secara tegas:
1. **Salinan Milik Sistem (System-Owned Copy):** Setiap teks antarmuka (UI microcopy), salinan kelembagaan, kebijakan redaksi, dokumen teknis, dan komunikasi otomatis.
2. **Draf Naskah Masuk (Ingestion API Article Drafts):** Setiap draf artikel yang diajukan oleh agen AI eksternal melalui titik akhir Ingestion API (`POST /api/internal/v1/ai-submissions`) sebelum naskah masuk ke alur penelaahan meja redaksi.

Dokumen ini mengadopsi dan memperluas prinsip dari skill `anti-ai-writing`.

---

## 1. Identitas dan Suara Kelembagaan (Institutional Voice)

Verax Press adalah media jurnalisme digital independen. Suara kelembagaan Verax mencerminkan integritas redaksi, ketelitian verifikasi, dan kejelasan komunikasi.

### Karakteristik Suara:
- **Tegas dan Mandiri:** Berpijak pada fakta dan kepentingan publik tanpa terikat kepentingan korporasi, pengiklan, atau pemodal.
- **Transparan:** Menjelaskan proses editorial, asal sumber, tingkat keterlibatan teknologi, dan riwayat koreksi secara lugas.
- **Terukur dan Proporsional:** Menghindari hiperbola, klaim sepihak, dan janji kosong. Apa yang belum ada diakui secara jujur.
- **Menghargai Pembaca:** Menyajikan informasi langsung pada pokok bahasan tanpa membuang waktu pembaca dengan basa-basi atau retorika hampa.
- **Profesional, Bukan Birokratis:** Menggunakan bahasa Indonesia yang jernih, mengalir, dan baku tanpa terdengar kaku seperti surat keputusan instansi pemerintah.

---

## 2. Prinsip Utama Penulisan

1. **Keaslian Manusia di Atas Kesempurnaan Mesin**  
   Tulisan yang hidup memiliki variasi panjang kalimat dan ritme yang wajar. Hindari teks yang terasa steril, seragam, atau dibungkus kata sifat berlebihan.
2. **Kebenaran Faktual dan Kejujuran Status Hukum**  
   Dilarang mengarang metrik (misal: "99.9% uptime", "dipercaya 10.000+ pembaca"), testimoni fiktif, atau klaim hukum yang belum terwujud. Status Verax Press sebagai nama kerja, ketiadaan status badan hukum pers, dan belum adanya verifikasi Dewan Pers harus dinyatakan apa adanya tanpa ditutupi. Untuk draf naskah artikel yang diajukan agen AI, larangan ini mencakup larangan mutlak fabrikasi kutipan narasumber, angka statistik, tanggal peristiwa, atau status hukum perkara.
3. **Langsung pada Pokok Pikiran**  
   Hapus pembukaan basa-basi (*throat-clearing*) seperti *"Berikut adalah hal yang perlu Anda ketahui"* atau *"Mari kita bahas"*. Awali paragraf dengan gagasan inti.
4. **Variasi Ritme Kalimat (*Burstiness*)**  
   Kombinasikan kalimat pendek dan kalimat penjelas yang lebih panjang. Jangan biarkan seluruh paragraf memiliki susunan kalimat dengan panjang yang seragam atau monoton.

---

## 3. Kosakata yang Dilarang (Banned Vocabulary)

Kecerdasan buatan kerap mengulang kata-kata abstrak tertentu agar terdengar bermakna padahal kosong substansi. Kata-kata berikut dilarang dalam seluruh salinan sistem maupun draf naskah artikel Verax Press:

### Kosakata Bahasa Inggris yang Dilarang:
- **Kata Kerja:** *delve, unlock, elevate, empower, harness, foster, streamline, revolutionize, showcase, usher in, spearhead, navigate, transcend, leverage*
- **Kata Sifat / Benda:** *seamless, cutting-edge, robust, next-level, game-changer, pivotal, testament, tapestry, beacon, paramount, bespoke, multifaceted, crucial, dynamic*
- **Wadah Abstrak:** *journey, landscape (sebagai metafora), realm, sphere, arena, horizon*

### Kosakata Bahasa Indonesia yang Dilarang:
- *hadir untuk* (ganti dengan fungsi langsungnya)
- *merevolusi* (ganti dengan perubahan konkret yang dihasilkan)
- *menjembatani* (ganti dengan menghubungkan atau istilah teknis spesifik)
- *ekosistem* (bila digunakan di luar konteks biologi atau ekologi)
- *menjadi bukti nyata* (sebutkan datanya langsung)
- *garda terdepan* (hindari kiasan militeristik klise)
- *wadah* / *wahana* (sebutkan entitasnya: platform, publikasi, redaksi)
- *penting untuk dicatat bahwa* (hapus frasa ini seluruhnya)
- *tidak hanya... melainkan juga...* (tulis poin-poinnya secara deklaratif)
- *lanskap* (sebagai metafora situasi, industri, atau sektor)
- *perjalanan* (sebagai metafora proses kerja atau proyek)

---

## 4. Pembatasan Struktur dan Tipografi

### A. Larangan Tanda Pisah Em Dash dan Tanda Hubung Ganda
Tanda pisah em dash dan tanda hubung ganda (dua tanda hubung berturut-turut) adalah penanda paling kentara dari tulisan yang digenerasi secara mekanis oleh kecerdasan buatan.
- **Aturan Mutlak Salinan Sistem:** Dilarang keras menggunakan tanda pisah em dash atau tanda hubung ganda dalam prosa bahasa Indonesia maupun Inggris pada seluruh teks antarmuka, dokumen kebijakan, dokumentasi, dan metadata.
- **Aturan Draf Naskah Artikel Ingestion API:** Dilarang menggunakan tanda pisah em dash atau tanda hubung ganda dalam judul, ringkasan, maupun badan teks naskah artikel. Satu-satunya pengecualian adalah bila tanda tersebut berada di dalam kutipan langsung narasumber yang terotentikasi secara kata demi kata (verbatim) dari dokumen sumber primer.
- **Solusi:** Gunakan tanda koma, titik dua, tanda kurung, atau pecah kalimat menjadi dua kalimat mandiri.
- *Salah (memakai tanda pisah em dash):* Verax Press [tanda pisah em dash] media digital independen [tanda pisah em dash] mengutamakan fakta.
- *Benar:* Verax Press, media digital independen, mengutamakan fakta.

### B. Larangan Emoji Dekoratif
Dilarang menyematkan emoji dekoratif pada judul dokumen, judul bagian, judul naskah, subjudul artikel (heading h1, h2, h3, h4), maupun daftar butir (misalnya: roket, lampu, centang, atau kaca pembesar). Gunakan tipografi yang bersih dan hierarki ukuran teks jurnalistik.

### C. Larangan Pola "Aturan Tiga" yang Dipaksakan (*Rule of Three*)
Dilarang menyusun kalimat dengan memaksakan tiga kata sifat atau tiga kata benda berima hanya untuk mengejar efek retoris:
- *Salah:* Kami menyajikan akurasi, independensi, dan integritas.
- *Benar:* Liputan kami mengutamakan verifikasi sumber primer dan keterbukaan proses koreksi.

### D. Larangan Paralelisme Negatif
Dilarang menggunakan konstruksi perbandingan artifisial ("Bukan sekadar X, tapi Y" atau "Bukan hanya X, melainkan Y"):
- *Salah:* Bukan sekadar media berita, melainkan standar baru jurnalisme.
- *Benar:* Media jurnalisme independen berbasis sumber primer.

### E. Larangan Drama Staccato dan Monoton
Dilarang membuat kalimat-kalimat satu kata beruntun untuk menciptakan ketegasan semu:
- *Salah:* Tanpa kompromi. Tanpa jeda. Murni fakta.
- *Benar:* Redaksi memverifikasi setiap klaim sebelum artikel diterbitkan.
Hindari pula susunan kalimat dengan panjang yang seragam di seluruh alinea; variasikan panjang kalimat secara terukur.

---

## 5. Konvensi Bahasa Indonesia

1. **Gunakan Padanan Baku Redaksi:**
   - Gunakan *penelaahan* atau *penyuntingan* untuk *review*.
   - Gunakan *uji fakta* atau *pemeriksaan fakta* untuk *fact-check*.
   - Gunakan *draf* untuk *draft*.
   - Gunakan *redaktur* untuk *editor* dalam konteks profesi jurnalisme Indonesia, atau pertahankan *Editor* bila merujuk pada nama jabatan peran sistemik (`Role: EDITOR`).
   - Gunakan *kredit penulis* atau *baris nama* untuk *byline*.
   - Gunakan *sumber kunci* untuk *key source*.
   - Gunakan *log koreksi* atau *catatan koreksi* untuk *correction log*.
2. **Hindari Frasa Mubazir:**
   - Ganti *dalam rangka untuk* dengan *untuk*.
   - Ganti *disebabkan oleh karena* dengan *karena*.
   - Ganti *memiliki tujuan untuk* dengan *bertujuan*.
3. **Pemberitahuan Sistem Singkat:**
   Pesan kesalahan dan konfirmasi harus ringkas, jelas, dan dapat ditindaklanjuti.
   - *Salah:* Permohonan Anda saat ini belum dapat diproses oleh sistem dikarenakan adanya kesalahan teknis yang tidak terduga.
   - *Benar:* Permohonan gagal dikirim. Periksa koneksi internet Anda dan coba kembali.

---

## 6. Standar Salinan Khusus Komponen

### A. Situs Publik (Website Copy)
- **Judul Tab Peramban (Metadata Title):** Gunakan pemisah vertikal pipa (`|`) atau titik dua (`:`), bukan tanda pisah em dash. Contoh: `Standar Editorial | Verax Press`.
- **Halaman Depan:** Berita utama, penanda rubrik, dan indeks terbaru disajikan tanpa klaim pemasaran berlebihan.
- **Pemberitahuan Transparansi AI:** Tuliskan keterlibatan AI secara presisi:
  - *Tanpa AI:* Naskah disusun sepenuhnya oleh manusia tanpa bantuan kecerdasan artifisial.
  - *AI Asistif:* AI membantu perapian struktur atau riset awal. Naskah akhir ditulis dan diperiksa manusia.
  - *AI Substantif:* AI menyusun bagian substansi draf. Wajib menyertakan catatan proses editorial.

### B. Studio Redaksi (CMS Microcopy)
- **Tombol Aksi:** Gunakan kata kerja aktif spesifik: *Buat Naskah*, *Simpan Kredit*, *Tandai Terverifikasi*, *Ajukan Penelaahan*, *Setujui dan Terbitkan*.
- **Status Naskah:** Tampilkan status alur kerja dalam bahasa Indonesia: *Draf*, *Menunggu Penelaahan*, *Uji Fakta*, *Perlu Revisi*, *Menunggu Persetujuan*, *Terbit*, *Dikoreksi*, *Ditolak*, *Ditarik*, *Dicabut*, *Diarsipkan*.
- **Tempat Penampung Form (*Placeholders*):** Berikan contoh format nyata, bukan perintah samar. Hindari tanda kurung siku atau frasa abstrak.

### C. Dokumentasi Teknis
- Pertahankan nama variabel lingkungan, rute URL, nama perintah CLI, kode status HTTP, dan pengenal skema database persis sesuai kode sumber.
- Jangan mengubah pengenal internal seperti `CHIEF_EDITOR`, `TURSO_DATABASE_URL`, atau `/api/studio/media`.
- Uraikan arsitektur dengan diagram alur dan langkah teknis konkret tanpa bumbu narasi promosi.

### D. Draf Naskah Artikel Ingestion API (AI Agent Submissions)
- **Judul dan Ringkasan (Headline & Excerpt):** Judul naskah wajib lugas, informatif, bebas tanda pisah em dash, bebas emoji dekoratif, dan bebas dari teknik sensasional (clickbait).
- **Integritas Atribusi dan Kutipan:** Agen AI dilarang merekayasa narasumber anonim atau kutipan fiktif. Kutipan langsung hanya diizinkan apabila terbukti verbatim dari dokumen sumber primer yang terdaftar pada larik `sources`.
- **Badan Teks (Article Body):** Kalimat disusun dengan variasi ritme yang wajar, bebas dari kosakata AI terlarang, bebas paralelisme negatif, dan bebas dari pemaksaan aturan tiga butir retoris.

---

## 7. Contoh Komparasi Perbaikan (Before & After)

| Kategori | Salinan Lama (AI Slop / Klise) | Salinan Baru (Standar Verax Press) |
|---|---|---|
| **Slogan Masthead** | Platform media inovatif [tanda pisah em dash] menghadirkan jurnalisme mutakhir untuk masa depan bangsa. | Media digital independen berbasis sumber primer. |
| **Deskripsi Halaman Depan** | Jelajahi peta informasi terpercaya dari sumber primer yang kokoh. | Berita, analisis, dan kebijakan publik Indonesia yang terlacak ke sumbernya. |
| **Pemberitahuan AI** | Verax memanfaatkan kapabilitas AI generatif untuk merapikan alur liputan berita. | AI diperlakukan sebagai alat bantu teknis, bukan sebagai sumber fakta atau penentu kelayakan terbit. |
| **Keterangan Sumber** | Bukti nyata bahwa kebenaran adalah mercusuar integritas redaksi kami. | Dokumen resmi dan data yang menopang klaim dalam artikel ini. |
| **Form Keluhan** | Masukkan URL artikel [tanda pisah em dash] kosongkan saja bila permohonan Anda bersifat umum. | URL artikel (kosongkan jika keluhan tidak terkait artikel tertentu). |
| **Tombol CMS** | Kirim review sekarang juga | Ajukan Penelaahan |
| **Peringatan Gate** | Publikasi diblokir: terdapat sumber kunci yang belum terverifikasi! | Publikasi ditahan: sumber kunci belum diverifikasi oleh redaktur. |
| **Pustaka Media** | Galeri aset visual mutakhir untuk mempercantik tata letak artikel. | Pustaka media dengan pencatatan kredit pembuat, keterangan, dan lisensi penggunaan. |
| **Pemberitahuan Hukum** | Komitmen penuh Verax Press dalam mematuhi seluruh regulasi yang berlaku. | Verax Press adalah nama kerja dan belum memiliki status badan hukum pers atau verifikasi Dewan Pers. |
| **Pesan Sukses Form** | Terima kasih telah menghubungi kami! Tim kami akan menindaklanjuti permohonan Anda secepatnya. | Permohonan tercatat dengan nomor antrean berikut. Simpan nomor ini untuk penelusuran status. |

---

## 8. Prosedur Pemeliharaan dan Kepatuhan

Setiap pengembang sistem, redaktur, dan agen AI penulis wajib menjalankan verifikasi berikut:
1. Tidak ada tanda pisah em dash atau tanda hubung ganda dalam teks antarmuka, dokumentasi, maupun badan draf naskah (kecuali kutipan verbatim terotentikasi).
2. Tidak ada kata terlarang dalam daftar kosakata terlarang pada teks sistem maupun draf artikel.
3. Tidak ada emoji dekoratif pada judul dokumen, judul bagian, judul naskah, atau daftar butir.
4. Tidak ada konstruksi paralelisme negatif ("Bukan sekadar X, tapi Y") dan tidak ada pemaksaan aturan tiga butir retoris.
5. Kejujuran faktual terjamin tanpa fabrikasi data, kutipan palsu, atau klaim hukum rekaan.
6. Uji kompatibilitas kode (typecheck, lint, test, build) berhasil tanpa galat.
