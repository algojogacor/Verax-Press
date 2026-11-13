---
documentId: VERAX-CORE-STYLE-05
title: Bahasa Jurnalistik, Suara Naratif, dan Disiplin Anti-AI Verax Press
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

# Bahasa Jurnalistik, Suara Naratif, dan Disiplin Anti-AI Verax Press

Dokumen ini mengatur mutu prosa jurnalistik berbahasa Indonesia di Verax Press, kaidah penghapusan pola tulisan mekanis AI (*AI slop*), enam prinsip pedoman editorial anti-AI bagi draf naskah agen eksternal, serta tujuh batas keras agar disiplin bahasa tidak pernah merusak akurasi fakta. Ketentuan ini mengikat seluruh jurnalis redaksi, kontributor, dan secara eksplisit menjadi pedoman editorial wajib bagi Agen AI eksternal yang mengajukan draf naskah melalui Ingestion API. Aturan gaya pada Bagian 1 berstatus `DIANJURKAN` kecuali ditandai `WAJIB` atau `DILARANG`; enam prinsip anti-AI dan tujuh pembatasan pada Bagian 2 berstatus mutlak (`WAJIB` / `DILARANG`).

---

## 1. Sembilan Prinsip Prosa Jurnalistik Verax

Tulisan jurnalistik yang hidup dan berwibawa lahir dari ketajaman berpikir, kelengkapan riset, dan ketepatan diksi:

1. **Bahasa Indonesia Formal-Komunikatif yang Alami (`DIANJURKAN`):** Patuhi kaidah Ejaan Bahasa Indonesia yang Disempurnakan (EYD V). Gunakan kalimat efektif dengan subjek pelaku dan predikat tindakan yang nyata. Hindari kekakuan bahasa surat dinas birokrasi sekaligus hindari bahasa percakapan santai yang tidak selaras konteks berita atau analisis.
2. **Ekonomi Bahasa dan Penghapusan Basa-Basi (`DIANJURKAN`):** Pangkas kalimat pembuka klise yang menunda informasi, seperti *"Di era transformasi digital yang serba cepat saat ini..."*, *"Dalam lanskap hukum Indonesia..."*, atau *"Berikut beberapa hal yang perlu diketahui..."*. Masuk langsung ke inti peristiwa, pertanyaan, atau argumen sejak alinea pertama.
3. **Variasi Ritme Kalimat yang Wajar (`DIANJURKAN`):** Padukan kalimat deklaratif ringkas yang mengunci gagasan pokok dengan kalimat penjelas yang membawa syarat, tanggal, atau rincian dokumen. Perbedaan panjang kalimat harus lahir dari kebutuhan informasi, bukan hasil acakan mekanis.
4. **Pengembangan Paragraf yang Fokus dan Tidak Monoton (`DIANJURKAN`):** Satu paragraf memfokuskan satu ide utama. Hindari menulis rangkaian paragraf berpola kembar (misalnya berulang kali menaruh klaim abstrak, lalu contoh, lalu kalimat penyimpul signifikansi di tiap ujung paragraf). Untuk naskah yang dibuka dengan prosa naratif atau berita, alinea pertama sebaiknya berbentuk paragraf pembuka yang utuh dan substantif (minimal 120 karakter untuk kesesuaian tipografi *drop cap* halaman terbitan), bukan fragmen satu baris pendek.
5. **Ketepatan Istilah Teknis dan Hukum (`WAJIB`):** Gunakan istilah hukum, keuangan, medis, atau teknologi sesuai definisi otoritatifnya (`VERAX-R09`), lalu sertakan penjelasan praktis secara ringkas pada kemunculan pertama agar pembaca umum berpendidikan dapat mengikuti argumen tanpa salah paham.
6. **Disiplin Kutipan Langsung (`WAJIB`):** Kutipan langsung wajib sesuai kata demi kata (*verbatim*) dengan rekaman atau dokumen sumber disertai atribusi pengucapnya. Jangan mengulang kalimat persis sama di dalam paragraf lalu langsung menaruhnya ulang sebagai blok kutipan (*pull-quote*) persis di bawahnya, kecuali kutipan sorotan tersebut memang memetik ucapan langsung narasumber yang menonjol.
7. **Penutup yang Bermakna (`DILARANG` / `DIANJURKAN`):** Akhiri tulisan pada pembaruan prosedural terakhir, konsekuensi terukur bagi warga atau tata kelola, atau pertanyaan terbuka yang memang belum terjawab oleh bukti saat ini. `DILARANG` menutup naskah dengan ringkasan berulang klise (*"Sebagai penutup, dapat disimpulkan bahwa..."*) atau kalimat harapan optimis kosong (*"Semoga langkah ini membawa masa depan yang cerah"*).
8. **Penghindaran Pola Klise AI Umum (`DIANJURKAN`):** Saat menyunting draf sendiri maupun menelaah kiriman draf agen, periksa dan pangkas kebiasaan mekanis (rincian larangan wajib dipatuhi sesuai Bagian 2.1):
   - *Pembesaran signifikansi kosong:* menobatkan peristiwa biasa menjadi *"tonggak sejarah krusial"* atau *"bukti nyata transformasi"*.
   - *Pengelakan verba sederhana (*copula avoidance*):* mengganti verba biasa (*adalah*, *merupakan*, *memiliki*) secara berlebihan dengan *"berdiri sebagai wujud"*, *"berperan sebagai penanda"*, atau *"mengisi ruang strategis"*.
   - *Atribusi kabur (*weasel attributions*):* menulis *"para ahli sepakat"* atau *"sejumlah pengamat menilai"* tanpa menyebut nama pakar, lembaga, dan rujukan dokumen studinya.
   - *Paralelisme negatif dan aturan tiga buatan:* memaksakan susunan *"bukan sekadar X, melainkan juga Y"* atau selalu memaksa tiga kata sifat berirama meski bukti hanya menuntut dua atau empat hal.
   - *Daftar berpoin dengan kepala tebal tautologis:* memakai butir berformat `- **Akurasi:** Akurasi dijaga dengan ketat...` ketika satu paragraf prosa mengalir jauh lebih ringkas.
   - *Penanda transisi mekanis berulang:* menumpuk *"Selain itu,"*, *"Lebih lanjut,"*, *"Kendati demikian,"*, atau *"Penting untuk dicatat bahwa"* pada hampir setiap awal kalimat.
9. **Pembedaan Suara Antar-Format (`WAJIB`):** Pertahankan watak suara masing-masing format secara tegas. Berita melaporkan faktual tanpa opini penulis; Penjelas memandu runtut; Analisis menguji bukti dan batas simpulan; Kisah Khas memotret realitas sosial terverifikasi; Wawancara menjaga tutur asli narasumber; dan Opini memperlihatkan ketajaman posisi argumentatif penulisnya sendiri.

---

## 2. Disiplin Anti-AI: Enam Prinsip Pedoman Editorial dan Tujuh Batas Keras (`WAJIB` / `DILARANG`)

### 2.1 Enam Prinsip Pedoman Editorial Anti-AI untuk Agen Eksternal dan Penulis Draf

Seluruh naskah yang diajukan oleh agen AI eksternal melalui Ingestion API maupun yang ditulis oleh kontributor wajib mematuhi enam prinsip kebahasaan dan integritas berikut:

1. **Larangan Tanda Pisah Em Dash dan Tanda Hubung Ganda (`WAJIB` / `DILARANG`):**  
   Dilarang keras menggunakan tanda pisah em dash (U+2014) maupun tanda hubung ganda (dua tanda hubung berturut-turut) dalam seluruh bagian draf naskah editorial, mencakup judul naskah (*title*), ringkasan (*excerpt*), dan seluruh blok isi artikel (*body paragraphs, subheadings, pull-quotes*). Tanda pisah panjang adalah penanda paling kentara dari teks generatif mesin. Satu-satunya pengecualian yang sah adalah apabila tanda pisah tersebut termaktub secara autentik di dalam teks kutipan langsung narasumber yang terverifikasi kata demi kata (*verbatim quote*) dari dokumen atau rekaman sumber primer. Dalam narasi draf biasa, penulis dan agen AI wajib menggunakan tanda koma, titik dua, tanda kurung, atau memecah kalimat menjadi dua kalimat mandiri yang mengalir.

2. **Daftar Kosakata AI Terlarang dalam Bahasa Inggris dan Bahasa Indonesia (`DILARANG`):**  
   Agen AI eksternal dan kontributor dilarang menggunakan kosakata klise, abstrak, atau berlebihan yang lazim dihasilkan model bahasa buatan untuk menutupi ketiadaan data konkret:
   - *Kosakata Bahasa Inggris yang Dilarang:*
     - Kata kerja: *delve, unlock, elevate, empower, harness, foster, streamline, revolutionize, showcase, usher in, spearhead, navigate, transcend, leverage*.
     - Kata sifat dan benda: *seamless, cutting-edge, robust, next-level, game-changer, pivotal, testament, tapestry, beacon, paramount, bespoke, multifaceted, crucial, dynamic*.
     - Wadah metaforis abstrak: *journey, landscape (sebagai metafora), realm, sphere, arena, horizon*.
   - *Kosakata Bahasa Indonesia yang Dilarang:*
     - Frasa klise: *hadir untuk, merevolusi, menjembatani, ekosistem (apabila digunakan di luar konteks ilmiah biologi atau ekologi alam), menjadi bukti nyata, garda terdepan, wadah, wahana, penting untuk dicatat bahwa, tidak hanya... melainkan juga...*
     - Metafora abstrak: *lanskap (sebagai metafora situasi politik, ekonomi, atau regulasi; gunakan istilah nyata seperti situasi, sektor, atau lingkungan regulasi), perjalanan (sebagai metafora proses kerja, inisiatif kebijakan, atau proyek)*.
   Naskah wajib menggunakan kata kerja tindakan konkret, menunjuk pelaku atau lembaga secara nyata, dan memaparkan mekanisme operasional faktual tanpa kata sifat hiperbolis.

3. **Larangan Paralelisme Negatif dan Aturan Tiga Butir yang Dipaksakan (`DILARANG`):**  
   Dilarang menyusun kalimat dengan pola perbandingan artifisial seperti *"Bukan sekadar X, tapi Y"*, *"Bukan hanya X, melainkan Y"*, atau *"Not only X, but also Y"*. Tuliskan fakta, fungsi, dan peristiwa secara lugas dan deklaratif. Dilarang pula memaksakan formula retoris tiga kata sifat, tiga kata benda, atau tiga klausa berima (*forced rule-of-three*) hanya demi mengejar estetika mekanis jika data peliputan atau bukti dokumen sebenarnya hanya menyajikan dua atau empat poin.

4. **Variasi Ritme Kalimat (*Burstiness*) dan Larangan Struktur Monoton (`WAJIB`):**  
   Draf artikel wajib memiliki variasi ritme kalimat yang hidup dan alami (*burstiness*). Hindari susunan kalimat dengan panjang yang seragam atau pola susunan subjek-predikat yang monoton di seluruh alinea. Padukan kalimat pendek yang mengunci pokok bahasan dengan kalimat penjelas yang lebih panjang untuk memuat rincian tanggal, nama dokumen hukum, angka temuan, atau batasan metodologis. Hindari drama staccato buatan (rentetan kalimat satu-dua kata bergaya iklan promosi).

5. **Larangan Emoji Dekoratif (`DILARANG`):**  
   Dilarang mutlak menyematkan emoji dekoratif pada judul naskah (*headline*), subjudul editorial (heading h1, h2, h3, h4), maupun daftar butir teks jurnalistik. Tipografi Verax Press berakar pada wibawa jurnalisme cetak dan independensi pers; hierarki informasi ditegakkan melalui kekuatan struktur teks dan bobot informasi, bukan hiasan grafis atau ikon visual informal.

6. **Kejujuran Faktual dan Nol Toleransi Fabrikasi (`WAJIB` / `DILARANG`):**  
   Kejujuran faktual adalah batas integritas tertinggi. Dilarang keras mengarang metrik performa, persentase statistik, testimoni fiktif, status badan hukum pers, verifikasi regulator yang belum ada, kutipan narasumber rekaan, atau nama pakar anonim tanpa atribusi sumber. Jika data primer belum tersedia atau konfirmasi belum diperoleh, nyatakan keterbatasan tersebut secara transparan apa adanya atau jangan cantumkan klaim tersebut sama sekali. Setiap klaim dalam draf naskah wajib memiliki rujukan sumber primer yang terdaftar pada metadata artikel.

### 2.2 Tujuh Batas Keras Non-Evasion Disiplin Anti-AI (`WAJIB` / `DILARANG`)

Disiplin kebahasaan ditujukan untuk kejelasan bagi pembaca manusia, bukan untuk memanipulasi perangkat lunak pendeteksi teks. Ketujuh batas berikut mengikat seluruh penulis, penyunting, dan Agen AI:

1. **`DILARANG` mengoptimalkan naskah untuk mengakali alat pendeteksi AI (*AI-detector evasion*).** Mutu diukur dari akurasi fakta, ketertelusuran sumber, kekuatan logika, dan kejelasan prosa.
2. **`DILARANG` memerintahkan Agen AI atau penulis sengaja menyisipkan kesalahan ketik, cacat tata bahasa, atau kejanggalan kalimat buatan.**
3. **`DILARANG` memaksakan pengacakan panjang kalimat atau menyisipkan fragmen kalimat artifisial semata demi memenuhi metrik varians statistik.**
4. **`DILARANG` memberlakukan larangan kata secara buta apabila ketepatan makna atau konteks disiplin mewajibkannya.** Contoh: istilah kealaman (*ekosistem gambut*, *ekosistem terumbu karang*) sah dalam liputan lingkungan hidup, dan istilah teknis (*dinamis* pada mekanika teknik atau kutipan langsung) sah bila tepat makna. Yang ditolak adalah pemakaian kiasan kosong.
5. **`DILARANG` memaksakan pelarangan tanda baca secara buta hingga merusak kutipan atau kejelasan kalimat.** Untuk gaya rumah prosa naskah redaksi Verax, penulis diwajibkan mengutamakan koma, titik, titik dua, atau tanda kurung daripada menumpuk tanda pisah em dash atau tanda hubung ganda. Namun, bila kutipan verbatim narasumber, judul resmi buku atau peraturan, maupun kejelasan sintaksis tertentu memuat tanda baca tersebut secara sah dari sumber primer, tanda baca itu tidak boleh diubah secara paksa.
6. **`DILARANG` menjadikan pemolesan gaya bahasa sebagai pengganti peliputan atau verifikasi sumber.** Prosa yang rapi di atas fakta rekaan tetap merupakan pelanggaran integritas berat.
7. **`DILARANG` memaksa seluruh penulis dan desk terdengar seperti satu suara seragam.** Kekhasan penalaran disiplin hukum, teknologi, dan kebijakan publik harus tetap terasa nyata.

---

## 3. Prinsip Audit Kebahasaan Dua Tahap

Sebelum naskah diajukan, penulis dan Agen AI dianjurkan menjalankan pemeriksaan dua tahap berurutan:

1. **Tahap Pertama (Pembersihan Pengisi Hampa, Klise AI, dan Akurasi Klaim):** Singkirkan tanda pisah em dash, kosakata AI terlarang, paralelisme negatif, pemaksaan aturan tiga butir, pembesaran signifikansi kosong, pengelakan verba sederhana, atribusi kabur, serta tumpukan modalitas ragu-ragu tanpa mengubah angka, mengubah korelasi menjadi sebab akibat, atau melemahkan ketepatan klaim hukum dan ilmiah.
2. **Tahap Kedua (Kelancaran Alur, Variasi Ritme, dan Suara Khas):** Uji ulang koherensi antarparagraf dan variasi ritme kalimat agar naskah tidak terasa kering atau monoton setelah pemangkasan klise, dengan tetap menjaga kekhasan suara aktif setiap desk dan format (termasuk keabsahan konstruksi kalimat pasif dalam prosedur hukum Indonesia, seperti *permohonan diajukan* atau *putusan dibacakan*).
