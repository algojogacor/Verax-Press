---
documentId: VERAX-OPS-CHECKLIST-03
title: Daftar Periksa Kepatuhan Pra-Kirim dan Pra-Terbit Verax Press
version: 1.0.0
status: PROPOSED
scope: operations
appliesTo:
  - all-desks
  - all-formats
  - human-contributors
  - newsroom-staff
  - ai-agents
requiredDependencies:
  - docs/editorial/README.md
  - docs/editorial/core/VERAX_EDITORIAL_IDENTITY.md
  - docs/editorial/core/VERAX_JOURNALISTIC_PRINCIPLES.md
  - docs/editorial/core/VERAX_RESEARCH_AND_VERIFICATION.md
  - docs/editorial/core/VERAX_ETHICS_AND_RESPONSIBILITY.md
  - docs/editorial/core/VERAX_LANGUAGE_AND_STYLE.md
  - docs/editorial/operations/VERAX_EDITORIAL_QUALITY_ASSESSMENT.md
lastReviewed: 2026-11-12
---

# Daftar Periksa Kepatuhan Pra-Kirim dan Pra-Terbit Verax Press

Dokumen operasional ini menyediakan daftar periksa ringkas sesuai peran sebelum pengiriman draf (`pre-submit`) dan sebelum persetujuan tayang (`pre-publish`). Setiap butir terikat pada kaidah kanonik `core/`, profil desk dan format penugasan, serta rubrik mutu pada `VERAX_EDITORIAL_QUALITY_ASSESSMENT.md`.

---

## 1. Daftar Periksa Penulis Internal dan Kontributor Eksternal

Gunakan daftar ini sebelum mengajukan status penelaahan (`SUBMIT_REVIEW` / `PENDING_REVIEW`):

- [ ] **WAJIB (`Kelayakan Jalur`):** Naskah memakai salah satu desk aktif yang sesuai topik (`hukum-keadilan`, `teknologi-kebijakan`, atau `nasional-publik`) dan format yang diizinkan untuk peran saya (kontributor eksternal tidak mengirim format `NEWS`).
- [ ] **WAJIB (`Judul & Deck`):** Judul mencerminkan isi secara proporsional (`VERAX-R04`), tidak melompati pembuktian hukum, dan bidang `deck` sudah terisi padat serta akurat (`<= 400` karakter agar tidak tertahan saat publikasi).
- [ ] **WAJIB (`Topangan Klaim`):** Setiap klaim faktual utama bertaut ke `SourceReference` dengan URL sah yang telah dibaca penuh, `sourceType` akurat, dan keterangan `supports` menyebut klaim spesifik beserta pasal, halaman, atau tabel dokumen.
- [ ] **WAJIB (`Keutuhan Bukti`):** Kutipan langsung bersifat verbatim sesuai rekaman atau naskah asli; tidak ada tokoh gabungan, wawancara rekaan, maupun adegan lapangan yang dibuat-buat.
- [ ] **WAJIB (`Hak Tanggapan`):** Untuk setiap tuduhan pelanggaran atau kritik yang berpotensi merugikan pihak tertentu, tanggapan pihak terkait telah diminta atau status upayanya diuraikan jujur di dalam naskah (`VERAX-R05`).
- [ ] **WAJIB (`Keterbukaan`):** Tingkat keterlibatan AI (`none`, `assistive`, atau `substantive`) serta setiap konflik kepentingan yang relevan sudah diungkap secara jujur kepada redaksi (`VERAX-R02`).
- [ ] **DIANJURKAN (`Keterbacaan`):** Pembukaan langsung menjawab pokok persoalan tanpa basa-basi klise; alinea pembuka prosa cukup utuh (minimal sekitar 120 karakter bila berupa `paragraph` pengantar); istilah teknis diterangkan pada kemunculan awal; penutup bebas dari ringkasan berulang hampa.

---

## 2. Daftar Periksa Agen AI Sebelum Mengirim ke Internal Ingestion API

Selain mematuhi seluruh langkah `VERAX_AI_AGENT_WORKFLOW.md`, Agen AI wajib memeriksa butir berikut sebelum memanggil `POST /api/internal/v1/ai-submissions`:

- [ ] **WAJIB (`Pemuatan Selektif & Kapabilitas`):** Telah memanggil `GET /api/internal/v1/capabilities` dan memuat hanya berkas kebijakan yang relevan dengan `desk` dan `format` penugasan sesuai protokol `README.md`.
- [ ] **WAJIB (`Kontrak Blok & Deck`):** Payload mengikuti `VERAX_EDITORIAL_API_INTEGRATION.md`, memakai tujuh tipe blok valid (termasuk menyertakan `style: "bullet" | "number"` pada setiap blok `list`), serta melengkapi `deck`, `agentId`, dan `idempotencyKey` unik.
- [ ] **WAJIB (`Keabsahan Sumber & Tanggal`):** Seluruh URL sumber benar-benar diakses dan terverifikasi eksis; `publishedAt` dan `accessedAt` memakai format ISO 8601 yang sah; `supports` menunjuk klaim dan bagian dokumen spesifik (`<= 600` karakter); `isKeySource: true` diusulkan hanya untuk sumber inti.
- [ ] **WAJIB (`Batas Peran AI`):** Naskah bebas dari klaim wawancara, observasi fisik lapangan, maupun pernyataan seolah uji fakta manusia telah selesai (`7 Larangan Keras Agen AI`).
- [ ] **WAJIB (`Deklarasi & Celah`):** Nilai `aiInvolvement` jujur; bila `substantive`, `aiUsageNote` terisi jelas (dianjurkan `<= 600` karakter tanpa data rahasia internal); `verificationNotes` mengikuti tiga bagian `[SUMBER DIPERIKSA]`, `[BELUM TERVERIFIKASI / CELAH]`, dan `[PERLU PEMERIKSAAN MANUSIA]`.
- [ ] **WAJIB (`Dry-Run API`):** Payload telah lolos pemeriksaan skema `POST /api/internal/v1/ai-submissions/validate` tanpa galat validasi sebelum pengiriman nyata.
- [ ] **DIANJURKAN (`Swatelaah Dua Tahap`):** Naskah telah melewati pembersihan klise AI tahap pertama dan penelaahan alur logika tahap kedua sesuai `VERAX_LANGUAGE_AND_STYLE.md`, tanpa mengorbankan keutuhan kutipan, istilah disiplin, maupun perbedaan suara Desk x Format.

---

## 3. Daftar Periksa Pemimpin Redaksi (`CHIEF_EDITOR`) Sebelum `PUBLISH`

Hanya Pemimpin Redaksi yang berwenang mengubah status artikel ke `PUBLISHED`. Pastikan keempat lapisan pemeriksaan berikut tuntas:

- [ ] **WAJIB (`Gerbang Sistem CMS`):** Seluruh lima gerbang server pada `VERAX_EDITORIAL_API_INTEGRATION.md` terpenuhi: minimal satu `isKeySource: true`, **seluruh** sumber kunci telah diverifikasi langsung hingga berstatus `VERIFIED` (`0` berstatus `UNVERIFIED` atau `DISPUTED`), isi artikel tidak kosong, `deck` terisi lengkap, dan bila `aiInvolvement === "substantive"` maka `aiDisclosurePublic` diaktifkan beserta pemeriksaan redaksi atas `aiDisclosureNote`.
- [ ] **WAJIB (`Kepatuhan Rubrik Bagian A`):** Naskah lolos bersih dari ketujuh Kondisi Kegagalan Mutlak (`FAIL-01` hingga `FAIL-07`) pada `VERAX_EDITORIAL_QUALITY_ASSESSMENT.md`.
- [ ] **WAJIB (`Etika dan Kewaspadaan Hukum`):** Asas praduga tak bersalah, perlindungan privasi warga biasa serta anak/korban/pelapor, kejelasan hak tanggapan (`VERAX-R05`), hak jawab maupun potensi risiko pencemaran nama baik (`VERAX_ETHICS_AND_RESPONSIBILITY.md`), serta catatan izin dan keterangan sifat sintetis `MediaAsset` (`isSynthetic` bukan foto dokumenter) telah ditelaah.
- [ ] **WAJIB (`Byline dan Kredit Nyata`):** Penentuan baris nama (`byline`) dan kredit peran (`AUTHOR`, `EDITOR`, `REPORTER`, `VISUAL`) sesuai kontribusi nyata (`VERAX_ETHICS_AND_RESPONSIBILITY.md` Bagian 6). Byline kolektif `Redaksi Verax Press` hanya dipasang pada naskah newsroom yang benar-benar diverifikasi dan disunting secara substantif oleh manusia.
- [ ] **DIANJURKAN (`Kesiapan Mutu Bagian B`):** Keenam dimensi mutu rubrik (`DIM-01` hingga `DIM-06`) minimal mencapai skor `3` (*Memenuhi Standar*) sebelum persetujuan tayang diberikan.
