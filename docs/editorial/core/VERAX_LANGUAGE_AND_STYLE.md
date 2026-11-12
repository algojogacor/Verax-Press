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
  - docs/editorial/core/VERAX_EDITORIAL_IDENTITY.md
  - docs/editorial/core/VERAX_JOURNALISTIC_PRINCIPLES.md
lastReviewed: 2026-11-12
---

# Bahasa Jurnalistik, Suara Naratif, dan Disiplin Anti-AI Verax Press

Dokumen ini mengatur mutu prosa jurnalistik berbahasa Indonesia di Verax Press, kaidah penghapusan pola tulisan mekanis AI (*AI slop*), tujuh batas keras agar disiplin bahasa tidak pernah merusak akurasi fakta, serta atribusi dan catatan penggunaan skill lokal yang diinspeksi. Aturan gaya pada Bagian 1 berstatus `DIANJURKAN` kecuali ditandai `WAJIB` atau `DILARANG`; tujuh pembatasan pada Bagian 2 berstatus mutlak (`WAJIB` / `DILARANG`).

---

## 1. Sembilan Prinsip Prosa Jurnalistik Verax

Tulisan jurnalistik yang hidup dan berwibawa lahir dari ketajaman berpikir, kelengkapan riset, dan ketepatan diksi:

1. **Bahasa Indonesia Formal-Komunikatif yang Alami (`DIANJURKAN`):** Patuhi kaidah Ejaan Bahasa Indonesia yang Disempurnakan (EYD V). Gunakan kalimat efektif dengan subjek pelaku dan predikat tindakan yang nyata. Hindari kekakuan bahasa surat dinas birokrasi sekaligus hindari bahasa percakapan santai yang tidak selaras konteks berita atau analisis.
2. **Ekonomi Bahasa dan Penghapusan Basa-Basi (`DIANJURKAN`):** Pangkas kalimat pembuka klise yang menunda informasi, seperti *"Di era transformasi digital yang serba cepat saat ini..."*, *"Dalam lanskap hukum Indonesia..."*, atau *"Berikut beberapa hal yang perlu diketahui..."*. Masuk langsung ke inti peristiwa, pertanyaan, atau argumen sejak alinea pertama.
3. **Variasi Ritme Kalimat yang Wajar (`DIANJURKAN`):** Padukan kalimat deklaratif ringkas yang mengunci gagasan pokok dengan kalimat penjelas yang membawa syarat, tanggal, atau rincian dokumen. Perbedaan panjang kalimat harus lahir dari kebutuhan informasi, bukan hasil acakan mekanis.
4. **Pengembangan Paragraf yang Fokus dan Tidak Monoton (`DIANJURKAN`):** Satu paragraf memfokuskan satu ide utama. Hindari menulis rangkaian paragraf berpola kembar (misalnya berulang kali menaruh klaim abstrak, lalu contoh, lalu kalimat penyimpul signifikansi di tiap ujung paragraf). Untuk naskah yang dibuka dengan prosa naratif atau berita, alinea pertama sebaiknya berbentuk paragraf pembuka yang utuh dan substantif, bukan fragmen satu baris pendek (lihat catatan rendering tipografi di `VERAX_EDITORIAL_API_INTEGRATION.md`).
5. **Ketepatan Istilah Teknis dan Hukum (`WAJIB`):** Gunakan istilah hukum, keuangan, medis, atau teknologi sesuai definisi otoritatifnya (`VERAX-R09`), lalu sertakan penjelasan praktis secara ringkas pada kemunculan pertama agar pembaca umum berpendidikan dapat mengikuti argumen tanpa salah paham.
6. **Disiplin Kutipan Langsung (`WAJIB`):** Kutipan langsung wajib sesuai kata demi kata (*verbatim*) dengan rekaman atau dokumen sumber disertai atribusi pengucapnya. Jangan mengulang kalimat persis sama di dalam paragraf lalu langsung menaruhnya ulang sebagai blok kutipan (*pull-quote*) persis di bawahnya, kecuali kutipan sorotan tersebut memang memetik ucapan langsung narasumber yang menonjol.
7. **Penutup yang Bermakna (`DILARANG` / `DIANJURKAN`):** Akhiri tulisan pada pembaruan prosedural terakhir, konsekuensi terukur bagi warga atau tata kelola, atau pertanyaan terbuka yang memang belum terjawab oleh bukti saat ini. `DILARANG` menutup naskah dengan ringkasan berulang klise (*"Sebagai penutup, dapat disimpulkan bahwa..."*) atau kalimat harapan optimis kosong (*"Semoga langkah ini membawa masa depan yang cerah"*).
8. **Penghindaran Enam Pola Klise AI Umum (`DIANJURKAN`):** Saat menyunting draf sendiri maupun menelaah kiriman, periksa dan pangkas kebiasaan berikut:
   - *Pembesaran signifikansi kosong:* menobatkan peristiwa biasa menjadi *"tonggak sejarah krusial"* atau *"bukti nyata transformasi"*.
   - *Pengelakan verba sederhana (*copula avoidance*):* mengganti verba biasa (*adalah*, *merupakan*, *memiliki*) secara berlebihan dengan *"berdiri sebagai wujud"*, *"berperan sebagai penanda"*, atau *"hadir untuk menjembatani"*.
   - *Atribusi kabur (*weasel attributions*):* menulis *"para ahli sepakat"* atau *"sejumlah pengamat menilai"* tanpa menyebut nama pakar, lembaga, dan rujukan dokumen studinya.
   - *Paralelisme negatif dan aturan tiga buatan:* memaksakan susunan *"bukan sekadar X, melainkan juga Y"* atau selalu memaksa tiga kata sifat berirama meski bukti hanya menuntut dua atau empat hal.
   - *Daftar berpoin dengan kepala tebal tautologis:* memakai butir berformat `- **Akurasi:** Akurasi dijaga dengan ketat...` ketika satu paragraf prosa mengalir jauh lebih ringkas.
   - *Penanda transisi mekanis berulang:* menumpuk *"Selain itu,"*, *"Lebih lanjut,"*, *"Kendati demikian,"*, atau *"Penting untuk dicatat bahwa"* pada hampir setiap awal kalimat.
9. **Pembedaan Suara Antar-Format (`WAJIB`):** Pertahankan watak suara masing-masing format secara tegas. Berita melaporkan faktual tanpa opini penulis; Penjelas memandu runtut; Analisis menguji bukti dan batas simpulan; Kisah Khas memotret realitas sosial terverifikasi; Wawancara menjaga tutur asli narasumber; dan Opini memperlihatkan ketajaman posisi argumentatif penulisnya sendiri.

---

## 2. Tujuh Pembatasan Keras Disiplin Anti-AI (`WAJIB` / `DILARANG`)

Disiplin kebahasaan ditujukan untuk kejelasan bagi pembaca manusia, bukan untuk memanipulasi perangkat lunak pendeteksi teks. Ketujuh batas berikut mengikat seluruh penulis, penyunting, dan Agen AI:

1. **`DILARANG` mengoptimalkan naskah untuk mengakali alat pendeteksi AI (*AI-detector evasion*).** Mutu diukur dari akurasi fakta, ketertelusuran sumber, kekuatan logika, dan kejelasan prosa.
2. **`DILARANG` memerintahkan Agen AI atau penulis sengaja menyisipkan kesalahan ketik, cacat tata bahasa, atau kejanggalan kalimat buatan.**
3. **`DILARANG` memaksakan pengacakan panjang kalimat atau menyisipkan fragmen kalimat artifisial semata demi memenuhi metrik varians statistik.**
4. **`DILARANG` memberlakukan larangan kata secara buta apabila ketepatan makna atau konteks disiplin mewajibkannya.** Contoh: kata *ekosistem* sah digunakan dalam liputan lingkungan hidup dan ekologi (*ekosistem gambut dan terumbu karang*), dan istilah *dinamis* sah dalam analisis mekanika teknik atau kutipan langsung narasumber. Yang ditolak adalah pemakaian kiasan kosong.
5. **`DILARANG` memaksakan pelarangan tanda baca secara buta hingga merusak kutipan atau kejelasan kalimat.** Untuk gaya rumah prosa naskah redaksi Verax, penulis dianjurkan mengutamakan koma, titik, titik dua, atau tanda kurung daripada menumpuk tanda pisah panjang (em dash, U+2014) sebagai sisipan retoris bergaya iklan. Namun, bila kutipan verbatim narasumber, judul resmi buku atau peraturan, maupun kejelasan sintaksis tertentu memuat tanda baca tersebut secara sah, tanda baca itu tidak boleh diubah secara paksa. *(Catatan: larangan mutlak tanda pisah panjang pada `VERAX_WRITING_STANDARDS.md` tetap berlaku untuk salinan milik sistem dan antarmuka UI.)*
6. **`DILARANG` menjadikan pemolesan gaya bahasa sebagai pengganti peliputan atau verifikasi sumber.** Prosa yang rapi di atas fakta rekaan tetap merupakan pelanggaran integritas berat.
7. **`DILARANG` memaksa seluruh penulis dan desk terdengar seperti satu suara seragam.** Kekhasan penalaran disiplin hukum, teknologi, dan kebijakan publik harus tetap terasa nyata.

---

## 3. Atribusi dan Catatan Eksekusi Skill Lokal

Bagian kebahasaan dan swatelaah dua tahap dalam standar ini disusun setelah membaca langsung dan mengevaluasi dua skill lokal yang terpasang di repositori:

### 3.1 `anti-ai-writing`
- **Lokasi Terverifikasi:** `d:\Projects\verax\.agents\skills\anti-ai-writing\SKILL.md` (150 baris; tidak ada berkas referensi eksternal wajib pada direktori tersebut).
- **Prinsip yang Diadopsi:** Kejujuran faktual dan larangan mengarang metrik maupun klaim tak teruji; pembukaan langsung pada inti persoalan tanpa basa-basi; penyebutan aktor konkret dan mekanisme kerja alih-alih kata kerja abstrak kosong; penghapusan pola paralelisme negatif, aturan tiga buatan, atribusi kabur, kepala tebal tautologis, dan artefak percakapan bot.
- **Prinsip yang Tidak Diadopsi:** Penerapan larangan mutlak kosakata maupun larangan mutlak em dash lintas konteks ke dalam seluruh prosa jurnalistik, karena naskah berita dan analisis memerlukan perlindungan atas keutuhan kutipan verbatim serta ketepatan istilah ilmiah dan hukum.

### 3.2 `slopbuster` (Lisensi MIT)
- **Lokasi Terverifikasi:** `d:\Projects\verax\.agents\skills\slopbuster\SKILL.md` (versi `1.0.0`, penulis `gabelul`, sumber hulu `https://github.com/gabelul/slopbuster`, lisensi MIT di `d:\Projects\verax\.agents\skills\slopbuster\LICENSE`), beserta seluruh berkas referensi yang dibaca penuh: `scoring.md`, `guides/voice-and-soul.md`, `guides/style-template.md`, `rules/academic.md`, `rules/text-content.md`, `rules/text-language.md`, `rules/text-style.md`, `rules/text-communication.md`, dan `rules/text-structure.md`.
- **Prinsip yang Diadopsi:**
  1. Disiplin audit dua tahap (*two-pass audit*): tahap pertama membersihkan pengisi hampa, pembesaran signifikansi, *copula avoidance*, *weasel words*, dan tumpukan modalitas ragu-ragu (*"mungkin berpotensi bisa saja"*); tahap kedua memeriksa ulang alur logika dan keterbacaan agar naskah tidak menjadi kering atau kaku setelah pembersihan pola.
  2. Seluruh batas keras integritas *Group A* pada `rules/academic.md` (tidak mengubah makna, tidak mengubah angka, tidak mengubah korelasi menjadi sebab akibat, melemahkan kata kausal apabila data baru bersifat observasional).
  3. Daftar pengecualian *What NOT to Change* yang melindungi istilah teknis disiplin, bahasa kehati-hatian atas ketidakpastian nyata, dan teks kutipan pihak kedua.
- **Prinsip yang Ditolak untuk Verax Press:**
  1. Skala skor kealamian `0-10` beserta orientasi target mengelabui editor pada uji buta (`scoring.md`) bertentangan dengan prinsip non-evasion Bagian 2 dokumen ini.
  2. Penolakan menyeluruh atas kalimat pasif (`rules/text-language.md` dan `guides/voice-and-soul.md`) tidak sesuai untuk jurnalisme hukum Indonesia di mana fokus prosedural sering berada pada tindakan hukumnya (*permohonan diajukan*, *putusan dibacakan*).
  3. Anjuran `guides/voice-and-soul.md` untuk menyuntikkan opini pribadi, kata ganti orang pertama (*"saya"*), reaksi emosional personal, fragmen kalimat sengaja, serta kekacauan struktur ditolak keras untuk format berita (`NEWS`), penjelas (`EXPLAINER`), dan analisis (`ANALYSIS`), dan hanya boleh disesuaikan secara tertib pada bagian argumen personal di format opini (`OPINION`) bila tepat secara retoris.
- **Pemberitahuan Atribusi MIT:** Konsep audit dua tahap serta prinsip pembersihan pengisi hampa dari `gabelul/slopbuster` (Copyright 2026 Gabi @ Booplex, Lisensi MIT) diadaptasi secara substantif ke konteks standar editorial jurnalistik bahasa Indonesia tanpa menyalin mentah materi berlisensi.
