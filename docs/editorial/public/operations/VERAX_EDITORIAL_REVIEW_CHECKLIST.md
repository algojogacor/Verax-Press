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
  - core/VERAX_EDITORIAL_IDENTITY.md
  - core/VERAX_JOURNALISTIC_PRINCIPLES.md
  - core/VERAX_RESEARCH_AND_VERIFICATION.md
  - core/VERAX_ETHICS_AND_RESPONSIBILITY.md
  - core/VERAX_LANGUAGE_AND_STYLE.md
  - operations/VERAX_EDITORIAL_QUALITY_ASSESSMENT.md
lastReviewed: 2026-11-12
---

# Daftar Periksa Kepatuhan Pra-Kirim dan Pra-Terbit Verax Press

Dokumen operasional ini menyediakan daftar periksa ringkas sesuai peran sebelum pengiriman draf (`pre-submit`) dan sebelum persetujuan tayang (`pre-publish`). Setiap butir terikat pada kaidah kanonik `Core`, profil desk dan format penugasan, serta rubrik mutu pada `VERAX-OPS-QUALITY-02`.

---

## 1. Daftar Periksa Penulis Internal dan Kontributor Eksternal

Gunakan daftar ini sebelum mengajukan naskah ke penelaahan redaksi:

- [ ] **WAJIB (`Kelayakan Jalur`):** Naskah memakai salah satu desk aktif yang sesuai topik (`hukum-keadilan`, `teknologi-kebijakan`, atau `nasional-publik`) dan format yang diizinkan untuk peran penulis (kontributor eksternal tidak mengirim format `NEWS`).
- [ ] **WAJIB (`Judul & Deck`):** Judul mencerminkan isi secara proporsional (`VERAX-R04`), tidak melompati pembuktian hukum, dan bidang `deck` sudah terisi padat serta akurat (`<= 400` karakter agar tidak tertahan saat publikasi).
- [ ] **WAJIB (`Topangan Klaim`):** Setiap klaim faktual utama bertaut ke rujukan sumber dengan URL sah yang telah dibaca penuh, `sourceType` akurat, dan keterangan `supports` menyebut klaim spesifik beserta pasal, halaman, atau tabel dokumen.
- [ ] **WAJIB (`Keutuhan Bukti`):** Kutipan langsung bersifat verbatim sesuai rekaman atau naskah asli; tidak ada tokoh gabungan, wawancara rekaan, maupun adegan lapangan yang dibuat-buat.
- [ ] **WAJIB (`Hak Tanggapan`):** Untuk setiap tuduhan pelanggaran atau kritik yang berpotensi merugikan pihak tertentu, tanggapan pihak terkait telah diminta atau status upayanya diuraikan jujur di dalam naskah (`VERAX-R05`).
- [ ] **WAJIB (`Keterbukaan`):** Tingkat keterlibatan AI (`none`, `assistive`, atau `substantive`) serta setiap konflik kepentingan yang relevan sudah diungkap secara jujur kepada redaksi (`VERAX-R02`).
- [ ] **DIANJURKAN (`Keterbacaan`):** Pembukaan langsung menjawab pokok persoalan tanpa basa-basi klise; alinea pembuka prosa cukup utuh (minimal sekitar 120 karakter bila berupa `paragraph` pengantar); istilah teknis diterangkan pada kemunculan awal; penutup bebas dari ringkasan berulang hampa.

---

## 2. Daftar Periksa Agen AI Sebelum Mengirim ke Ingestion API

Selain mematuhi seluruh langkah `VERAX-OPS-WORKFLOW-01`, Agen AI wajib memeriksa butir berikut sebelum memanggil `POST /api/internal/v1/ai-submissions`:

- [ ] **WAJIB (`Pemuatan Selektif & Kapabilitas`):** Telah memanggil `GET /api/internal/v1/capabilities` dan `GET /editorial/manifest.json` serta memuat konteks selektif untuk satu `desk` dan satu `format` yang sah (memperhatikan bahwa `NEWS` sedang ditahan sementara, sedangkan `FEATURE` dan `INTERVIEW` mensyaratkan bukti provenance nyata).
- [ ] **WAJIB (`Kontrak Blok & Deck`):** Payload mengikuti spesifikasi `/openapi.json` dan `/editorial/operations/api-integration`, memakai tujuh tipe blok valid (termasuk menyertakan `style: "bullet" | "number"` pada setiap blok `list`), serta melengkapi `deck`, `agentId`, dan `idempotencyKey` unik.
- [ ] **WAJIB (`Keabsahan Sumber & Tanggal`):** Seluruh URL sumber benar-benar diakses dan terverifikasi eksis; `publishedAt` dan `accessedAt` memakai format ISO 8601 yang sah; `supports` menunjuk klaim dan bagian dokumen spesifik (`<= 600` karakter); `isKeySource: true` diusulkan hanya untuk sumber inti. Untuk `FEATURE` wajib ada rujukan `INTERVIEW` atau `PRIMARY` dengan `supports >= 20` karakter beserta `verificationNotes >= 20` karakter; untuk `INTERVIEW` wajib ada rujukan `INTERVIEW` dengan `supports >= 20` karakter beserta `verificationNotes >= 20` karakter.
- [ ] **WAJIB (`Batas Peran AI`):** Naskah bebas dari klaim wawancara, observasi fisik lapangan, maupun pernyataan seolah uji fakta manusia telah selesai (`7 Larangan Keras Agen AI`).
- [ ] **WAJIB (`Deklarasi & Celah`):** Nilai `aiInvolvement` jujur (`none`: tanpa `aiUsageNote`; `assistive`: `aiUsageNote` opsional; `substantive`: `aiUsageNote` sangat dianjurkan dan disarankan `<= 600` karakter); `verificationNotes` mengikuti tiga bagian `[SUMBER DIPERIKSA]`, `[BELUM TERVERIFIKASI / CELAH]`, dan `[PERLU PEMERIKSAAN MANUSIA]`.
- [ ] **WAJIB (`Dry-Run API`):** Payload telah lolos pemeriksaan skema `POST /api/internal/v1/ai-submissions/validate` tanpa galat validasi sebelum pengiriman nyata.
- [ ] **DIANJURKAN (`Swatelaah Dua Tahap`):** Naskah telah melewati pembersihan klise AI tahap pertama dan penelaahan alur logika tahap kedua sesuai `VERAX-CORE-STYLE-05`, tanpa mengorbankan keutuhan kutipan, istilah disiplin, maupun perbedaan suara Desk x Format.

---

## 3. Daftar Periksa Pemimpin Redaksi (`CHIEF_EDITOR`) Sebelum `PUBLISH`

Hanya Pemimpin Redaksi yang berwenang mengubah status artikel ke `PUBLISHED`. Pastikan lapisan pemeriksaan berikut tuntas:

- [ ] **WAJIB (`Gerbang Publikasi Server`):** Minimal satu sumber kunci (`isKeySource: true`), **seluruh** sumber kunci berstatus `VERIFIED`, isi artikel tidak kosong (`GATE_EMPTY_CONTENT`), `deck` terisi lengkap (`GATE_NO_DECK`), `aiInvolvement === "substantive"` mengaktifkan keterbukaan AI publik (`GATE_AI_DISCLOSURE`), serta byline dan atribusi kontributor manusia ditetapkan sah (`GATE_BYLINE_UNCONFIRMED`).
- [ ] **WAJIB (`Kepatuhan Rubrik Bagian A`):** Naskah lolos bersih dari ketujuh Kondisi Kegagalan Mutlak (`FAIL-01` hingga `FAIL-07`) pada `VERAX-OPS-QUALITY-02`.
- [ ] **WAJIB (`Etika dan Kewaspadaan Hukum`):** Asas praduga tak bersalah, perlindungan privasi warga biasa serta anak/korban/pelapor, kejelasan hak tanggapan (`VERAX-R05`), hak jawab maupun potensi risiko pencemaran nama baik (`VERAX-CORE-ETHICS-04`), serta catatan izin dan keterangan sifat sintetis aset visual bukan foto dokumenter telah ditelaah.
- [ ] **WAJIB (`Byline dan Kredit Nyata`):** Penentuan baris nama (`byline`) dan kredit peran sesuai kontribusi nyata (`VERAX-CORE-ETHICS-04` Bagian 6). Artikel kiriman Agen AI masuk dengan placeholder byline dan dilarang terbit memakai byline kolektif maupun placeholder sebelum editor manusia menetapkan byline dan kredit kontributor yang sah.
- [ ] **DIANJURKAN (`Kesiapan Mutu Bagian B`):** Keenam dimensi mutu rubrik (`DIM-01` hingga `DIM-06`) minimal mencapai skor `3` (*Memenuhi Standar*) sebelum persetujuan tayang diberikan.
