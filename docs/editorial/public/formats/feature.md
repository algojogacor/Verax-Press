---
documentId: VERAX-FORMAT-FEATURE-05
title: Profil Format Kisah Khas (FEATURE)
version: 1.0.0
status: PROPOSED
scope: format
appliesTo:
  - format:FEATURE
  - all-desks
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

# Profil Format: Kisah Khas (`FEATURE`)

- **Kode Format:** `FEATURE` (Label sistem: `Kisah Khas`)
- **Kelayakan Jalur Pengiriman (`Origin Eligibility`):**
  - **Ruang Redaksi (`NEWSROOM`):** Diizinkan.
  - **Agen AI (`INGESTION_API`):** Diizinkan **secara bersyarat** (`conditional`) hanya apabila Agen AI menyusun draf berbasis arsip sejarah atau berkas dokumentasi peliputan nyata yang disediakan penuh dalam penugasan. Validator API menegakkan prasyarat keras (`HTTP 422 FORMAT_REJECTED` / `FORMAT_PRECONDITION_FAILED`): payload `WAJIB` menyertakan minimal satu sumber rujukan bertipe `INTERVIEW` atau `PRIMARY` dengan keterangan `supports` spesifik (`>= 20` karakter) yang menunjuk transkrip atau catatan observasi manusia, serta mengisi `verificationNotes` (`>= 20` karakter). **Agen AI `DILARANG` menulis adegan lapangan, suasana cuaca, raut wajah, atau dialog rekaan.**
  - **Kontributor Eksternal (`CONTRIBUTOR`):** Diizinkan (dengan kelengkapan izin narasumber dan aset visual bila relevan).
- **Sifat Dokumen:** Lapisan C (`Layer C`). Muat berkas ini bersama Lapisan A (`/editorial/core`) dan **satu** profil desk yang ditugaskan (`/editorial/desks/{slug}`).

---

## 1. Tujuan Editorial

Menggali dimensi kemanusiaan, perjalanan kelembagaan, sejarah suatu peristiwa, atau dampak jangka panjang kebijakan dan sistem teknologi terhadap kehidupan warga melalui penceritaan faktual mendalam berbasis peliputan lapangan nyata atau arsip dokumenter sah.

---

## 2. Pokok Bahasan yang Sesuai

- Perjalanan panjang warga atau komunitas menempuh prosedur hukum atau memperjuangkan hak publik.
- Potret keseharian layanan dasar (pendidikan, kesehatan, transportasi kepulauan) di wilayah yang menghadapi hambatan struktural.
- Pertemuan nyata antara rancangan sistem otomatis (platform kerja digital, algoritma verifikasi bantuan) dan keseharian penggunanya.
- Rekonstruksi sejarah peristiwa publik atau kebijakan terdahulu berbasis arsip terverifikasi dan kesaksian hidup narasumber.

---

## 3. Struktur dan Pendekatan Naratif

Kisah khas memadukan kedalaman fakta jurnalistik dengan alur penceritaan yang terukur:

1. **Pembuka Adegan atau Potret Arsip Terverifikasi (`paragraph` pembuka):** Mulailah dengan satu adegan pengamatan reporter nyata atau peristiwa dokumenter spesifik dari arsip (bukan rekonstruksi imajinatif). Paragraf pertama sepanjang minimal sekitar 120 karakter memicu tampilan *drop cap* klasik Verax.
2. **Paragraf Penjelas Kaitan Struktural (*Nut Graf*, `paragraph`):** Sambungkan kisah spesifik di pembuka dengan isu kebijakan, norma hukum, angka anggaran, atau persoalan sistemik berskala luas sehingga pembaca memahami mengapa kisah satu tokoh atau tempat ini bermakna publik.
3. **Babak-Babak Cerita Berjenjang (`heading` level `2`, `quote`, `image` berizin):** Kembangkan cerita dalam beberapa babak tematik atau kronologis. Sisipkan blok `quote` verbatim narasumber dengan atribusi jelas, serta blok `image` dokumenter dengan keterangan waktu, tempat, fotografer, dan status izin lengkap. Blok `note` dapat dipakai untuk menjelaskan catatan metode peliputan atau latar arsip.
4. **Penutup Bermakna Tanpa Menggurui (`paragraph` penutup):** Tutup cerita pada pengamatan lapangan nyata, konsekuensi prosedural terakhir, atau kenyataan yang masih berlangsung di masyarakat tanpa menyelipkan khotbah moral penutup. Sertakan `deck` yang menggambarkan inti kisah dan konteks strukturalnya. *(Rincian teknis blok dan metadata aset visual tersedia pada `/openapi.json` dan `/developers`.)*

---

## 4. Suara Naratif yang Sesuai

Hidup, observasional, peka terhadap pengalaman manusia, dan tetap berdisiplin penuh pada fakta (`VERAX-R01`, `VERAX-R09`). Hindari melodrama, kata sifat sentimental berlebihan, dramatisasi suasana hati tokoh yang tidak terobservasi, maupun gaya sastra fiksi.

---

## 5. Syarat Riset

- Peliputan langsung di lapangan, pengamatan terstruktur dengan catatan tanggal serta tempat, atau riset arsip historis yang lengkap.
- Wawancara mendalam berulang dengan tokoh utama dan pihak pembanding, disertai pengecekan silang klaim lisan terhadap dokumen atau data statistik terkait.

---

## 6. Syarat Sumber

- Gabungan catatan wawancara lapangan sah (`INTERVIEW`), dokumen atau arsip resmi (`DOCUMENT`, `OFFICIAL`), serta data konteks pembanding (`DATA`).
- Foto atau dokumen visual pendamping wajib dilengkapi bukti izin atau lisensi sah serta persetujuan narasumber apabila memuat warga rentan atau lingkungan privat (`VERAX-R10`, `VERAX-CORE-ETHICS-04`).
- **Prasyarat Wajib Agen AI:** Pengiriman `FEATURE` via API hanya diproses bila menyertakan sumber berjenis `INTERVIEW` atau `PRIMARY` yang menunjuk berkas catatan peliputan/transkrip manusia secara spesifik beserta `verificationNotes` yang menerangkan asal berkas penugasan tersebut. Jika materi lapangan tidak tersedia, Agen AI `DILARANG` menyusun `FEATURE`.

---

## 7. Pola Kegagalan Khusus Format (`Failure Conditions`)

1. Mengarang detail sensoris (*"embun pagi menetes di kaca jendela saat ia termenung"*) atau dialog rekonstruksi yang tidak pernah tercatat dalam catatan lapangan atau rekaman (`FAIL-02`).
2. Menggabungkan pengalaman dua atau tiga orang berbeda ke dalam satu "tokoh gabungan" fiktif tanpa pelaporan eksplisit (praktik *composite character* dilarang di Verax, `VERAX-CORE-RESEARCH-03` Bagian 4).
3. Menulis kisah yang emosional dan panjang namun tidak memiliki *nut graf* maupun pijakan data struktural.
4. Mengambil kisah pribadi warga biasa lalu mengabaikan perlindungan privasi atau risiko intimidasi administratif (`VERAX-R10`).

---

## 8. Pemeriksaan Mutu Wajib Format

- [ ] Apakah seluruh rincian tempat, waktu, percakapan, dan pengamatan benar-benar tercatat dari peliputan lapangan nyata atau arsip dokumenter sah?
- [ ] Apakah terdapat *nut graf* jelas yang menautkan kisah manusia dengan isu kebijakan, hukum, atau data makro?
- [ ] Apakah tokoh utama dipotret secara utuh dan bermartabat tanpa eksploitasi kesedihan ataupun penggabungan tokoh fiktif?
- [ ] Apakah izin publikasi narasumber dan hak pakai seluruh foto/aset visual sudah terdokumentasi sah?

---

## 9. Contoh Ilustratif Singkat `[CONTOH SIMULASI FIKTIF]`

Catatan: Nama tokoh, lokasi, sekolah, dan angka berikut merupakan **contoh simulasi fiktif sepenuhnya** untuk mengilustrasikan perpaduan adegan tercatat dengan konteks kebijakan (*nut graf*).

> **[CONTOH SIMULASI FIKTIF]**  
> "[Tokoh Pengajar Fiktif] menambatkan perahu kayu di [Dermaga Kabupaten Kepulauan Contoh] setiap Senin pagi untuk mengambil paket modul cetak kiriman kapal perintis. Di [Desa Pesisir Contoh], jaringan seluler kerap terputus saat cuaca buruk, sehingga guru di [Sekolah Dasar Contoh] itu mengandalkan salinan kertas untuk mengajar murid kelas lima. Potret peliputan terverifikasi di wilayah contoh ini memperlihatkan selisih antara target platform pembelajaran daring nasional dan kesiapan listrik serta sinyal di daerah kepulauan."
