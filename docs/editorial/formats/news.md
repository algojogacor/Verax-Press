---
documentId: VERAX-FORMAT-NEWS-01
title: Profil Format Berita (NEWS)
version: 1.0.0
status: PROPOSED
scope: format
appliesTo:
  - format:NEWS
  - all-desks
  - newsroom-staff
  - ai-agents
requiredDependencies:
  - docs/editorial/README.md
  - docs/editorial/core/VERAX_EDITORIAL_IDENTITY.md
  - docs/editorial/core/VERAX_JOURNALISTIC_PRINCIPLES.md
  - docs/editorial/core/VERAX_RESEARCH_AND_VERIFICATION.md
  - docs/editorial/core/VERAX_ETHICS_AND_RESPONSIBILITY.md
  - docs/editorial/core/VERAX_LANGUAGE_AND_STYLE.md
lastReviewed: 2026-11-12
---

# Profil Format: Berita (`NEWS`)

- **Kode Format:** `NEWS` (Label sistem: `Berita`)
- **Kelayakan Jalur Pengiriman (`Origin Eligibility`):**
  - **Ruang Redaksi (`NEWSROOM`):** Diizinkan.
  - **Agen AI (`INGESTION_API`):** Diizinkan dalam validator API berjalan dengan status awal `DRAFT` dan seluruh sumber `UNVERIFIED` (`DILARANG` mengarang peliputan atau konfirmasi fiktif; lihat catatan konflik kebijakan `D2` pada `VERAX_EDITORIAL_API_INTEGRATION.md`).
  - **Kontributor Eksternal (`CONTRIBUTOR`):** **Tidak diizinkan** (ditolak API kontributor sesuai keputusan Charter `D2`).
- **Sifat Dokumen:** Lapisan C (`Layer C`). Muat berkas ini bersama berkas `core/` dan **satu** profil desk yang ditugaskan.

---

## 1. Tujuan Editorial

Menyampaikan perkembangan peristiwa, keputusan resmi lembaga, putusan pengadilan, penerbitan peraturan, atau temuan terverifikasi terbaru secara cepat, akurat, utuh, dan berimbang tanpa menyisipkan pendapat pribadi penulis.

---

## 2. Pokok Bahasan yang Sesuai

- Putusan pengadilan terbaru beserta amar dan pertimbangan pokoknya.
- Pengesahan undang-undang, peraturan pelaksana, atau pengumuman kebijakan resmi yang membawa akibat langsung bagi publik.
- Rilis data berkala lembaga statistik atau laporan hasil audit resmi baru.
- Penetapan status hukum dalam perkara berdampak publik, gangguan layanan publik luas, atau tanggapan resmi baru dalam sengketa yang sedang berjalan.

---

## 3. Struktur dan Pendekatan Naratif

Berita Verax Press menempatkan inti kabar di bagian paling atas lalu melengkapi bukti, tanggapan berimbang, dan latar yang terpisah tegas dari kabar terbaru:

1. **Alinea Pembuka (*Lead* Faktual via blok `paragraph`):** Jawab unsur paling menentukan (*apa yang baru terjadi atau diputuskan, siapa aktor utamanya, kapan tepatnya, di mana atau lembaga mana, serta mengapa/bagaimana* bila terverifikasi) dalam satu atau dua paragraf pembuka. Bila blok pertama berjenis `paragraph` sepanjang minimal 120 karakter, perender Verax menampilkan inisial *drop cap* cetak klasik.
2. **Bukti Kunci dan Rincian Segera (`paragraph`, `list` bernomor/butir opsional):** Uraikan pasal, angka utama, atau amar putusan yang menopang alinea pembuka. Blok `list` dipakai hanya jika merinci tiga atau lebih poin putusan atau syarat aturan secara padat.
3. **Kronologi dan Kutipan Verbatim (`heading` level `2` secukupnya, `quote`):** Pecah berita panjang dengan subjudul ringkas. Sisipkan blok `quote` ber-`attribution` lengkap hanya ketika pernyataan langsung narasumber atau bunyi dokumen menambah bobot langsung yang tidak terwakili parafrase.
4. **Keberimbangan dan Tanggapan Pihak Terkait (`paragraph` / `quote`):** Muat respons pihak terdampak, tergugat, tersangka melalui kuasa hukum, atau regulator berwenang, serta jelaskan status upaya konfirmasi bila tanggapan belum diterima.
5. **Latar Belakang Singkat (`heading` atau `paragraph` penutup, `note` opsional):** Pisahkan secara eksplisit informasi lama (*sebelumnya*, *ketentuan sebelumnya*) dari perkembangan terbaru. Sediakan selalu ringkasan `deck` yang akurat sebelum mengajukan ke penelaahan agar tidak tertahan gerbang publikasi. *(Rincian teknis JSON ketujuh blok konten dirujuk pada `VERAX_EDITORIAL_API_INTEGRATION.md`.)*

---

## 4. Suara Naratif yang Sesuai

Objektif, langsung, padat informasi, dan tidak berpendapat (`VERAX-R07`). Hindari kata ganti orang pertama (*saya*, *kami*) sebagai pengamat, hindari kata sifat dramatis, dan biarkan angka, tanggal, serta kutipan dokumen berbicara lebih kuat daripada penilaian retoris penulis.

---

## 5. Syarat Riset

- Pastikan **kebaruan dan status terakhir** (*currentness*): cek apakah ada putusan lanjutan, revisi pengumuman, atau pencabutan dokumen setelah tanggal rilis awal.
- Verifikasi ketepatan tanggal kejadian, nomor surat/putusan/peraturan, serta status prosedural para pihak.
- Telusuri tanggapan awal dari pihak yang berpotensi dirugikan pemberitaan (`VERAX-R05`), bukan sekadar menyalin siaran pers satu instansi.

---

## 6. Syarat Sumber

- Minimal menyertakan sumber primer atau dokumen resmi yang menetapkan peristiwa/keputusan baru (`OFFICIAL`, `PRIMARY`, atau `DOCUMENT`), ditambah sumber tanggapan berimbang atau laporan konfirmasi (`INTERVIEW`, `DOCUMENT`, atau dokumen pernyataan resmi).
- Untuk naskah `NEWS` dari Agen AI, seluruh fakta, angka, dan kutipan `WAJIB` berasal langsung dari dokumen atau tautan sah yang benar-benar terbaca penuh pada saat pengiriman, disertai penandaan jujur pada `verificationNotes` jika konfirmasi lanjutan kepada narasumber masih harus dilakukan redaksi manusia.

---

## 7. Pola Kegagalan Khusus Format (`Failure Conditions`)

1. Menyisipkan kesimpulan opini normatif atau seruan moral penulis di paragraf penutup berita.
2. Menunda informasi inti dengan satu hingga dua paragraf latar belakang umum atau pengantar klise.
3. Menulis ulang peristiwa atau pengumuman lama seolah-olah berita baru tanpa penanda tanggal dan pembaruan prosedural.
4. Menyebut dugaan penyidik atau tuntutan jaksa seolah fakta terbukti sah di pengadilan (`VERAX-R07`).
5. Menulis kutipan hasil rekonstruksi atau menyimpulkan tanggapan pejabat tanpa dokumen atau keterangan nyata.

---

## 8. Pemeriksaan Mutu Wajib Format

- [ ] Apakah informasi paling baru dan paling menentukan sudah hadir di alinea pertama?
- [ ] Apakah fakta terverifikasi terpisah tegas dari dugaan, dalil gugatan, dan komentar narasumber?
- [ ] Apakah seluruh tanggal, angka, nomor dokumen, dan status prosedural cocok dengan sumber primer?
- [ ] Apakah pihak terdampak atau yang dikritik sudah dimintai tanggapan atau dijelaskan upaya konfirmasinya secara jujur?
- [ ] Apakah berita bebas dari sisipan opini penulis?

---

## 9. Contoh Ilustratif Singkat `[CONTOH SIMULASI FIKTIF]`

Catatan: Seluruh nama entitas, lokasi, nomor putusan, tanggal, dan angka berikut merupakan **contoh simulasi fiktif**.

> **[CONTOH SIMULASI FIKTIF]**  
> *Lead (`paragraph`):* "Mahkamah Agung menolak permohonan kasasi PT Contoh Tirta dalam sengketa pencemaran sungai di [Kabupaten Contoh] pada [Tanggal Simulasi]. [Putusan Nomor XXXX K/Pdt/20XX] tersebut menguatkan putusan [Pengadilan Tinggi Contoh] yang mewajibkan perusahaan memulihkan daerah terdampak dengan estimasi biaya pemulihan sebesar [nilai simulasi] Rp18,4 miliar. Kuasa hukum perusahaan menyatakan baru menerima petikan amar dan akan mempelajari salinan lengkap pertimbangan hakim sebelum memutuskan pengajuan peninjauan kembali."
