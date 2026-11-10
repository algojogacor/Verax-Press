# Verity Document Set V1.1 — Edisi Markdown

**Tanggal penyusunan:** 9 November 2026  
**Status:** Dokumen kerja; perubahan yang berstatus usulan masih memerlukan persetujuan founder/pengelola.

## Daftar dokumen

1. `01_Verity_Editorial_Charter_V1.1.md` — Identitas editorial, ruang lingkup desk, standar pemberitaan, kebijakan AI, atribusi, koreksi, tata kelola, dan peluncuran bertahap.
2. `02_Verity_Contributor_Policy_Agreement_V1.1.md` — Kelayakan kontributor, format submission, proses review dan revisi, hak cipta, serta draf perjanjian. **Wajib ditinjau penasihat hukum sebelum digunakan atau ditandatangani.**
3. `03_Verity_Technical_Architecture_V1.1.md` — Tahap produk, role, model data, workflow, kontrak API, permission, gerbang verifikasi, kriteria PoC, dan acceptance tests.
4. `04_Verity_Master_Prompt_Reviewer_Mode_V1.1.md` — Prompt untuk review independen atas strategi, editorial, isu hukum, serta dokumen proyek.
5. `05_Verity_Master_Prompt_Builder_Mode_V1.1.md` — Prompt ringkas untuk coding agent.
6. `06_Verity_Launch_Plan_Operating_Model_V1.0.md` — Model operasi usulan: tim, kapasitas, rekrutmen kontributor, gerbang legal, distribusi, keberlanjutan, KPI, dan input founder.

## Cara menggunakan

- Tiga dokumen baseline (01–03) menjadi acuan kebijakan dan rancangan teknis.
- Launch Plan (06) berisi asumsi operasional. Nilai yang belum dikonfirmasi founder tetap berstatus `OPEN`.
- Gunakan Reviewer Mode untuk mengevaluasi, meneliti, dan merevisi konsep maupun dokumen.
- Gunakan Builder Mode untuk tugas implementasi di repository.
- AI coding agent tidak boleh menerbitkan konten atau melewati persetujuan manusia.
- Jangan membuka submission kontributor sebelum seluruh gerbang Tahap B terpenuhi.

## Istilah status

- `LOCKED`: keputusan baseline yang telah disepakati.
- `PROPOSED`: rekomendasi yang masih menunggu persetujuan.
- `OPEN`: belum diputuskan atau memerlukan input founder.
- `LEGAL REVIEW REQUIRED`: harus ditinjau penasihat hukum Indonesia atau otoritas yang relevan sebelum diterapkan.

## Pemeriksaan sumber regulasi

Sumber resmi berikut diperiksa pada **9 November 2026** untuk identifikasi isu awal. Daftar ini bukan nasihat hukum dan tidak memastikan bahwa setiap aturan pasti berlaku terhadap Verity. Periksa kembali sebelum go-live, penandatanganan perjanjian, kegiatan komersial, atau pendaftaran PSE.

- [UU No. 40 Tahun 1999 tentang Pers — BPK](https://peraturan.bpk.go.id/Details/45370)
- [UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi — BPK](https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022)
- [PP No. 71 Tahun 2019 tentang Penyelenggaraan Sistem dan Transaksi Elektronik — JDIH Komdigi](https://jdih.komdigi.go.id/produk_hukum/view/id/695/t/common)
- [Permenkominfo No. 5 Tahun 2020 — JDIH Komdigi](https://jdih.komdigi.go.id/produk_hukum/view/id/759/t/peraturan%2Bmenteri%2Bkomunikasi%2Bdan%2Binformatika%2Bnomor%2B5%2Btahun%2B2020)
- [Permenkominfo No. 10 Tahun 2021 — JDIH Komdigi](https://jdih.komdigi.go.id/produk_hukum/view/id/774/t/peraturan%2Bmenteri%2Bkomunikasi%2Bdan%2Binformatika%2Bnomor%2B10%2Btahun%2B2021)
- [PP No. 28 Tahun 2025 — BPK](https://peraturan.bpk.go.id/Details/319773/pp-no-28-tahun-2025) — status berlaku; mencabut PP No. 5 Tahun 2021.
- [Permenkomdigi No. 15 Tahun 2025 — JDIH Komdigi](https://jdih.komdigi.go.id/produk_hukum/view/id/985/t/peraturan%2Bmenteri%2Bkomunikasi%2Bdan%2Bdigital%2Bnomor%2B15%2Btahun%2B2025) — status berlaku.
- [Kriteria Pendaftaran PSE Lingkup Privat — Komdigi](https://pse.komdigi.go.id/panduan/kriteria-pendaftaran-pse-lingkup-privat)
- [Pedoman Pemberitaan Media Siber — Dewan Pers](https://www.dewanpers.or.id/assets/documents/pedoman/1907090253_-2012_PEDOMAN_PEMBERITAAN_MEDIA_SIBER.pdf)
- [Peraturan Dewan Pers No. 03/Peraturan-DP/IV/2024 — Pedoman Perilaku dan Standar Pers Profesional](https://jdih.dewanpers.or.id/dokumen/peraturan/peraturan-dewan-pers-nomor-03peraturan-dpiv2024-tentang-pedoman-perilaku-dan-standar-pers-pro)
- [Peraturan Dewan Pers No. 1/Peraturan-DP/I/2023 — Pendataan Perusahaan Pers](https://jdih.dewanpers.or.id/dokumen/peraturan/peraturan-dewan-pers-nomor-1peraturan-dpi2023-tentang-pendataan-perusahaan-pers)
- [Peraturan Dewan Pers No. 9/Peraturan-DP/X/2008 — Pedoman Hak Jawab](https://jdih.dewanpers.or.id/dokumen/peraturan/peraturan-dewan-pers-nomor-9peraturan-dpx2008-tentang-pedoman-hak-jawab)

## Catatan penting

1. VERITY masih merupakan nama kerja dan belum memperoleh clearance merek, domain, maupun akun media sosial.
2. Contributor Agreement adalah draf, bukan kontrak siap tanda tangan.
3. Status pengelola, kewajiban perusahaan pers, penerapan PSE, kewajiban privasi, dan syarat peluncuran harus dinilai sesuai model operasi nyata.
4. Tahap A adalah newsroom-only. Contributor intake Tahap B menunggu gerbang tata kelola, hukum, privasi, dan kapasitas tim.
5. Launch Plan masih berupa model usulan. Nama personel, jam kerja, anggaran, dan cadence perlu dikonfirmasi founder.
