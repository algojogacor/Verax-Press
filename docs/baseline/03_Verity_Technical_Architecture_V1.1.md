<!-- Working document. Confirm all OPEN / PROPOSED / LEGAL REVIEW REQUIRED items before operational use. -->

# **Technical Architecture**

Arsitektur produk, data, permission, workflow, dan API ingestion

| **DOCUMENT ID** | VRT-TA-003 |
| --- | --- |
| **VERSION** | V1.1 |
| **STATUS** | WORKING ARCHITECTURE |
| **LAST UPDATED** | 9 November 2026 |

*Stack masih kandidat sampai PoC. Dokumen ini mendefinisikan kontrol minimum; bukan klaim bahwa sistem telah dibangun atau diuji.*

## 1. Tujuan dan prinsip arsitektur

Verity menggunakan arsitektur digital publishing dengan kendali editorial manusia. Fokus MVP adalah public website, newsroom CMS, internal API draft-only, dan kemampuan koreksi/keluhan yang dapat dilacak. Contributor Publishing baru aktif pada Tahap B.

| **Prinsip** | **Implikasi** |
| --- | --- |
| Human editorial control | Tidak ada publish otomatis oleh API, AI, atau scheduler pada MVP. |
| Least privilege | Setiap role hanya menerima permission minimum. |
| Server-side authorization | Semua ownership dan permission diperiksa di server, bukan hanya UI. |
| Auditability | Perubahan penting dan keputusan editorial disimpan sebagai event/version. |
| Structured content | Isi artikel disimpan sebagai JSON terstruktur yang divalidasi; bukan HTML mentah bebas. |
| Modular monolith | Pisahkan domain/modul secara logis tanpa microservices di awal. |

## 2. Tahap produk

| **Tahap** | **Cakupan** | **Batas** |
| --- | --- | --- |
| Tahap A — newsroom-only | Website, CMS internal, source checklist, correction log, form keluhan, Internal API, analytics dasar, distribusi manual. | Tidak ada akun kontributor publik atau submission eksternal. |
| Tahap B — contributor by invitation | Contributor auth terpisah, form submission, feedback, revision loop, author profile, version history dasar. | Hanya setelah gerbang hukum, privasi, perjanjian, Editor kedua, dan kajian PSE terpenuhi. |

## 3. Technology decision gate

Pilihan berikut adalah kandidat, bukan keputusan final. Lakukan PoC singkat sebelum mengunci stack.

| **Komponen** | **Kandidat awal** | **Catatan keputusan** |
| --- | --- | --- |
| Frontend | Next.js / React | Selaras dengan pengalaman pengembang; periksa repo dan versi aktual sebelum memulai. |
| CMS | Payload CMS (prioritas PoC) atau Ghost | Payload memberi kontrol skema dan access control berbasis kode; Ghost dapat lebih cepat untuk penerbitan standar. Uji kedua kandidat terhadap acceptance criteria. |
| Database | PostgreSQL | Direkomendasikan untuk relasi artikel, versi, kontribusi, sumber, review, dan audit. |
| Structured editor | Tiptap / ProseMirror JSON | Simpan dokumen terstruktur; sanitasi dan validasi node/marks yang diizinkan. |
| Deployment | Vercel atau hosting setara | Verifikasi Terms of Service, komersial/nonkomersial, lokasi data, backup, dan biaya. |
| Object storage | S3-compatible | Pisahkan file asli, thumbnail, dan metadata hak penggunaan. |

### 3.1 PoC Payload vs Ghost

- Uji role editor, author, contributor, dan API client pada setiap koleksi yang relevan.

- Uji semua endpoint REST dan GraphQL yang dihasilkan atau diaktifkan; jangan hanya menguji Admin UI.

- Gunakan koleksi autentikasi terpisah untuk staff dan contributor; contributor tidak boleh masuk Admin Panel.

- Pastikan internal notes, data privat, review feedback internal, dan token tidak muncul pada API publik atau respons kontributor.

- Uji versi, draft, access control, dan mekanisme risk-edit tanpa overwrite tersembunyi.

- Tulis Architecture Decision Record (ADR): pilihan, alasan, trade-off, risiko, biaya, hasil uji, dan kondisi untuk meninjau ulang.

## 4. Domain dan modul aplikasi

| **Modul** | **Tanggung jawab** |
| --- | --- |
| Public Publishing | Homepage, desk/category, article detail, author profile, SEO, sitemap. |
| Editorial CMS | Draft, review, fact-check, approval, publish, corrections. |
| Internal Ingestion API | Menerima draft dari AI Agent/alat internal; tidak memiliki hak publish. |
| Contributor Portal (Tahap B) | My submissions, feedback, revision, profile. |
| Identity & Access | Staff auth, contributor auth, API client credentials, roles, permissions. |
| Media & Rights | Asset, creator, license, caption, source, consent. |
| Complaints & Corrections | Hak jawab, hak koreksi, keluhan, penurunan, correction log. |
| Audit & Observability | Append-only audit events, security events, error monitoring. |

## 5. Roles dan permissions

| **Role** | **MVP scope** | **Catatan** |
| --- | --- | --- |
| Chief Editor | Full editorial authority, approve/publish, policy and complaint escalation. | Pada Tahap A approval terpusat; dapat didelegasikan di masa depan. |
| Editor | Review, editing, source verification, feedback, dan permission tertentu. | Tidak otomatis mendapat approve/publish pada Tahap A. |
| Internal Author | Create/update artikel internal miliknya atau yang ditugaskan. | Tidak publish. |
| External Contributor | Create/read/update submission miliknya sesuai status. | Aktif hanya Tahap B; 18+. |
| Volunteer | Akses terbatas berdasarkan penugasan. | Tidak melihat data kontributor atau internal notes tanpa kebutuhan. |
| AI Agent API Client | Submit draft via endpoint khusus. | Tidak login Admin Panel; tidak approve, publish, read internal notes, atau akses database. |

Managing Editor dan Desk Editor adalah label peran masa depan, bukan role aktif MVP. Tugasnya sementara dijalankan Chief Editor/Editor.

### 5.1 Permission minimum

| **Permission** | **Chief Editor** | **Editor** | **Internal Author** | **Contributor** | **Volunteer** | **API Client** |
| --- | --- | --- | --- | --- | --- | --- |
| article:create | Yes | Yes | Assigned | No | By assignment | Submit only |
| article:read_internal | Yes | Yes | Own/assigned | No | No default | No |
| article:edit_internal | Yes | Yes by scope | Own/assigned | No | No default | No |
| article:review | Yes | Yes | No | No | No default | No |
| source:verify | Yes | Yes | No | No | No default | No |
| article:approve | Yes | Delegable later | No | No | No | No |
| article:publish | Yes | No in MVP | No | No | No | No |
| article:risk_edit | Yes | By explicit grant | No | No | No | No |
| submission:own | Yes | Yes by review | No | Own only | No | Create only |
| complaint:manage | Yes | By explicit grant | No | No | No | No |

Permission sebenarnya harus dinyatakan sebagai policy server-side. Tabel ini merupakan baseline desain, bukan konfigurasi final.

## 6. Data model

Semua entitas dan relasi berikut adalah model konseptual. Penamaan tabel, foreign keys, indexing, dan migration ditetapkan saat PoC.

| **Entity** | **Field/relasi utama** | **Catatan kontrol** |
| --- | --- | --- |
| staff_users | id, email, role, status, created_at | Autentikasi internal; hanya role staff yang boleh akses CMS admin. |
| contributors | id, email, password/auth provider, adult_confirmed_at, status | Autentikasi eksternal terpisah; aktif Tahap B; 18+ declaration. |
| author_profiles | id, account_ref, public_name, pen_name, anonymity_mode, bio, avatar | Terpisah dari login account; data legal/private tidak otomatis public. |
| articles | id, slug, title, deck, desk, format, content_json, status, byline, ai_involvement, ai_disclosure_public, disclosure_decided_by/at | Sumber data artikel yang akan tayang; byline diset editor. |
| submissions | id, origin, contributor_id/agent_id, article_id, status, ai_involvement_declared, ai_usage_note, submitted_at | Mencatat intake internal/eksternal dan pemilik. |
| article_versions | id, article_id, version_no, content_json, version_type, change_reason, created_by, notified_author_at, author_response | version_type: author, editorial_copyedit, risk_edit. |
| article_contributions | article_id, person_id, role, display_order, public_credit | Model person-role; penulis/editor/reporter/fotografer dapat lebih dari satu. |
| source_references | article_id, title, publisher, url, source_type, published_at, accessed_at, supports, is_key_source, verification_status, verified_by, verified_at | verification_status: unverified, verified, disputed; hanya editor yang dapat mengubah. |
| editorial_reviews | article_id/submission_id, reviewer_id, decision, notes, decided_at | Keputusan review; pisahkan author-visible feedback. |
| review_comments | submission_id, author_visible, comment, author_id, created_at | Komentar internal tidak boleh terlihat kontributor. |
| media_assets | url/key, creator, license, permission_evidence, caption, source_url, uploaded_by | Atribusi dan hak penggunaan harus tercatat. |
| complaints | type, article_id, sender, received_at, status, deadline, decision, correction_record_id | Jenis: hak jawab, hak koreksi, keluhan, permintaan penghapusan; tenggat null sampai legal review. |
| correction_records | article_id, corrected_at, summary, before/after reference, public_note, approved_by | Menjadi log koreksi yang dapat dilihat publik. |
| api_clients | client_id, secret_hash, scopes, status, expires_at, last_used_at | Simpan hash credential; secret tidak disimpan/log dalam plaintext. |
| audit_events | actor_type, actor_id, action, target, timestamp, reason, correlation_id | Append-only untuk keputusan/perubahan penting. |

### 6.1 AI disclosure data

Pada articles simpan ai_involvement = none | assistive | substantive; ai_disclosure_public (boolean); disclosure_decided_by; disclosure_decided_at. Pada submissions simpan ai_involvement_declared dan ai_usage_note. Untuk Internal API, ai_involvement wajib dikirim. Nilai deklarasi dari agent tidak otomatis dianggap terverifikasi; editor mengonfirmasi atau memperbaikinya sebelum approval.

## 7. Workflow dan state transitions

### 7.1 Tahap A — internal newsroom

| **State** | **Allowed next state** | **Actor utama** |
| --- | --- | --- |
| Draft | Pending Review / Withdrawn | Internal Author / Editor |
| Pending Review | Fact Check / Revision Needed / Rejected | Editor |
| Fact Check | Pending Approval / Revision Needed / Rejected | Editor |
| Revision Needed | Pending Review | Internal Author |
| Pending Approval | Published / Rejected | Chief Editor |
| Published | Corrected / Retracted / Archived sesuai kebijakan | Chief Editor/Editor dengan hak khusus |

Tidak ada state Scheduled pada MVP. Hanya Chief Editor yang dapat memindahkan status ke Published pada Tahap A.

### 7.2 Tahap B — contributor

| **State** | **Allowed next state** | **Actor utama** |
| --- | --- | --- |
| Draft | Submitted / Withdrawn | Contributor |
| Submitted | Editorial Review | System |
| Editorial Review | Revision Requested / Approved / Rejected | Editor |
| Revision Requested | Resubmitted / Withdrawn | Contributor |
| Resubmitted | Editorial Review | System |
| Approved | Published / Rejected | Chief Editor |
| Published | Corrected / Retracted / Archived sesuai kebijakan | Chief Editor/Editor dengan hak khusus |

Contributor tidak dapat mengedit versi yang sedang direview. Mereka hanya dapat membuat versi baru setelah Revision Requested. Tidak ada state Scheduled pada MVP.

## 8. Editing, feedback, dan risk-edit

Internal articles dapat diedit oleh role yang berwenang. External articles: copyedit ringan disimpan sebagai version_type = editorial_copyedit dan diberitahukan; perubahan substansi kembali ke penulis; risk-edit memerlukan permission article:risk_edit, reason wajib, audit event, author notification, dan author_response (pending, accepted, revised, withdrawn). Sistem tidak menyediakan overwrite diam-diam.

Untuk risk-edit, simpan notified_author_at dan change_reason. Jika notifikasi secara hukum dilarang atau berisiko terhadap keselamatan, alasan pengecualian dicatat internal dan ditinjau Chief Editor.

## 9. Internal Content Ingestion API

Endpoint konseptual: POST /api/internal/v1/ai-submissions. API menerima draft dan membuat submission berstatus Draft/Pending Review. API client hanya mempunyai scope submit. Tidak ada endpoint publish yang dapat dipanggil agent.

### 9.1 Contoh payload konseptual

```json
{
  "title": "Judul artikel",
  "deck": "Ringkasan",
  "desk": "technology-policy",
  "format": "analysis",
  "content": { "type": "doc", "content": [] },
  "sources": [
    {
      "title": "Judul sumber",
      "publisher": "Penerbit",
      "url": "https://example.org/source",
      "source_type": "primary",
      "published_at": "2026-11-09",
      "accessed_at": "2026-11-09",
      "supports": "Klaim terkait",
      "is_key_source": true
    }
  ],
  "verification_notes": "Yang sudah/belum diverifikasi",
  "images": [
    {
      "url": "https://example.org/image",
      "creator": "Pencipta",
      "license": "Lisensi/izin",
      "permission_evidence": "Bukti izin",
      "caption": "Caption dan atribusi"
    }
  ],
  "tags": ["regulasi", "teknologi"],
  "ai_involvement": "substantive",
  "ai_usage_note": "Draft awal disusun agent",
  "agent_id": "external-agent-name",
  "idempotency_key": "unique-request-id"
}
```

Catatan: suggested_byline tidak diterima sebagai nilai final. Byline dan ai_disclosure_public diputuskan manusia di CMS. API wajib menolak request tanpa ai_involvement, format/desk yang tidak valid, sumber tanpa URL, atau idempotency key yang bentrok. verification_status sumber dimulai unverified; hanya editor manusia dapat mengubah menjadi verified/disputed.

### 9.2 Security requirements

- HTTPS, dedicated client credential, hashed secret storage, scope submit-only, expiry dan rotation.

- Validation schema, content length/file limits, rate limiting, idempotency, replay protection sesuai kebutuhan.

- Audit request metadata tanpa menyimpan secret, token, atau data pribadi yang tidak perlu.

- Tidak memberikan akses database, user management, internal review notes, approve, atau publish kepada API client.

- Tentukan kebijakan URL fetching yang aman; jangan membuat server mem-fetch URL arbitrer tanpa desain SSRF protection dan allowlist bila relevan.

- Response hanya mengembalikan submission receipt/status dan ID, bukan informasi privat lainnya.

## 10. Source verification gate

source_references harus memiliki verification_status: unverified, verified, disputed; verified_by; verified_at; is_key_source. Artikel tidak dapat berstatus Approved apabila ada sumber kunci yang unverified atau disputed. Penanda sumber kunci ditetapkan editor. Catatan verifikasi agent merupakan petunjuk, bukan pengganti pemeriksaan manusia.

## 11. Complaints dan correction workflow

Sediakan public form untuk hak jawab, hak koreksi, keluhan, dan permintaan penghapusan. Form menghasilkan complaint record dengan ID, jenis, artikel, pengirim, tanggal, status, keputusan, dan relasi correction record. Deadline disimpan nullable sampai legal review menetapkan tenggat yang berlaku. Permission khusus: complaint:manage.

Correction Log publik memuat tanggal koreksi, artikel, ringkasan perubahan, serta tautan artikel. Internal correspondence dan data pribadi pelapor tidak ditampilkan.

## 12. P0 / P1 / P2 dan acceptance criteria

| **Prioritas** | **Fitur** |
| --- | --- |
| P0 — Tahap A | Public website; newsroom CMS minimal; roles/permissions; draft → review → fact check → approval → publish; source verification gate; internal API draft-only; correction log; complaints form; SEO dasar/sitemap; audit log; basic version history. |
| P1 — Tahap B / setelah gerbang | Contributor intake undangan; contributor portal lebih lengkap; feedback/revision; risk-edit workflow untuk kontributor; visual version diff; scheduled publishing; Instagram automation; custom analytics; media library lanjutan. |
| P2 — jangka panjang | Newsletter, produk editorial baru, monetisasi, ekspansi desk, volunteer management lengkap, forum/community hanya jika diputuskan ulang. |

### 12.1 Acceptance criteria P0

- API menolak submission tanpa ai_involvement dan idempotency key.

- API client tidak dapat membaca draft lain, mengedit, approve, atau publish.

- Tidak ada route publik yang dapat mengubah status ke Published.

- Approve gagal jika ada sumber kunci unverified atau disputed.

- Hanya role yang sah dapat memverifikasi source reference.

- Internal notes tidak muncul di public API atau contributor response.

- Correction log dan complaints form menyimpan record yang dapat ditelusuri.

- Setiap perubahan artikel dan keputusan approval menghasilkan audit event.

- Tidak ada secret/token dalam log; access tests membuktikan least privilege.

### 12.2 Acceptance criteria PoC CMS

- Uji pembatasan akses pada setiap collection dan endpoint REST serta GraphQL yang aktif.

- Uji bahwa contributor tidak dapat mengakses Admin Panel (Tahap B).

- Uji bahwa contributor hanya dapat read/update submission miliknya sendiri.

- Uji bahwa internal editorial notes tidak dapat dibaca melalui endpoint publik maupun contributor.

- Uji versi, draft, ownership checks, state transitions, dan risk-edit audit trail.

- Buat ADR dengan hasil PoC, trade-off, biaya, risiko, dan keputusan stack.

## 13. Legal, vendor, dan deployment gates

Verity tidak menyatakan telah memenuhi kewajiban PSE atau perusahaan pers. Sebelum publikasi publik dan terutama sebelum contributor intake, lakukan legal issue-spotting atas UU Pers, Kode Etik Jurnalistik, Pedoman Pemberitaan Media Siber, pendataan/verifikasi Dewan Pers, PSE Lingkup Privat, PP 28/2025, Permenkomdigi 15/2025, UU PDP, hak cipta, lisensi kontributor, hubungan volunteer/honorarium, dan ketentuan vendor. Semua applicability questions diberi label LEGAL REVIEW REQUIRED.

Vercel Hobby Terms membatasi penggunaan pada personal/non-commercial. Jika model Verity menjadi komersial atau aktivitas operasinya tidak sesuai definisi penggunaan personal, pilih paket/host lain setelah mengecek ketentuan terkini. Payload versions/access control/REST/GraphQL adalah fitur teknis yang tetap harus diuji dalam konfigurasi Verity.

## 14. Roadmap dan gerbang

| **Tahap** | **Output** | **Go / no-go gate** |
| --- | --- | --- |
| PoC | Bandingkan Payload dan Ghost; uji PostgreSQL; uji RBAC, versions, REST/GraphQL, API. | Tidak lanjut coding utama jika ownership isolation atau internal note privacy gagal. |
| Tahap A | Newsroom-only site; CMS minimal; API draft-only; correction log; complaints form; 20–30 artikel sebagai target kumulatif/stretch, bukan syarat teknis. | Legal screening model operator/PSE/press; privacy and public policies; source verification; editorial sign-off. |
| Gerbang Tahap B | Badan/pengelola sah dan penandatangan berwenang; perjanjian counsel-reviewed; privacy notice; editor kedua; PSE review selesai. | Semua bukti gerbang disimpan dalam launch checklist. |
| Tahap B | Contributor portal, intake by invitation, feedback, revision, versioning dasar. | Pilot terukur sebelum submission dibuka lebih luas. |

## 15. Riwayat versi dan sumber

| **Versi** | **Tanggal** | **Perubahan** |
| --- | --- | --- |
| V1.0 | 9 Nov 2026 | Baseline awal arsitektur. |
| V1.1 | 9 Nov 2026 | AI fields; payload lengkap; source verification gate; complaints; risk-edit; role alignment; no Scheduled MVP; adult confirmation; Payload/Ghost PoC criteria; two-stage launch; acceptance criteria. |

### Sumber yang diperiksa pada 9 November 2026

**[1] UU No. 40 Tahun 1999 tentang Pers — BPK RI. **Status pada halaman BPK: Berlaku; diperiksa 9 Nov 2026. [Sumber resmi](https://peraturan.bpk.go.id/Details/45370/uu-no-40-tahun-1999) — Dasar isu badan hukum perusahaan pers, penanggung jawab, hak jawab, dan hak koreksi; penerapan pada model Verity perlu telaah hukum.

**[2] Pedoman Pemberitaan Media Siber (2012) — Dewan Pers. **Dokumen primer tersedia pada repositori Dewan Pers; status konsolidasi tidak ditandai eksplisit pada halaman unduh yang diperiksa. [Sumber resmi](https://www.dewanpers.or.id/assets/documents/pedoman/1907090253_-2012_PEDOMAN_PEMBERITAAN_MEDIA_SIBER.pdf) — Memuat antara lain isi buatan pengguna, koreksi, pencabutan, iklan, hak cipta, dan sengketa. Konfirmasi relevansi terkini.

**[3] Peraturan Dewan Pers No. 9/Peraturan-DP/X/2008 — Pedoman Hak Jawab. **JDIH Dewan Pers menampilkan status Berlaku; diperiksa 9 Nov 2026. [Sumber resmi](https://jdih.dewanpers.or.id/dokumen/peraturan/peraturan-dewan-pers-nomor-9peraturan-dpx2008-tentang-pedoman-hak-jawab) — Dasar untuk merancang kanal hak jawab; tenggat operasional harus diperiksa secara hukum.

**[4] Peraturan Dewan Pers No. 1/Peraturan-DP/I/2023 — Pendataan Perusahaan Pers. **JDIH Dewan Pers menampilkan status Berlaku; diperiksa 9 Nov 2026. [Sumber resmi](https://jdih.dewanpers.or.id/dokumen/peraturan/peraturan-dewan-pers-nomor-1peraturan-dpi2023-tentang-pendataan-perusahaan-pers) — Mengatur pendataan/verifikasi perusahaan pers; bukan bukti bahwa Verity telah terdata.

**[5] Peraturan Dewan Pers No. 03/Peraturan-DP/IV/2024 — Pedoman Perilaku dan Standar Pers Profesional. **JDIH Dewan Pers menampilkan status Berlaku; diperiksa 9 Nov 2026. [Sumber resmi](https://jdih.dewanpers.or.id/dokumen/peraturan/peraturan-dewan-pers-nomor-03peraturan-dpiv2024-tentang-pedoman-perilaku-dan-standar-pers-pro) — Memuat standar perusahaan pers, pers profesional, hak publik, perlindungan hukum, dan sengketa.

**[6] Permenkominfo No. 5 Tahun 2020 — PSE Lingkup Privat. **Basis data BPK menampilkan status Berlaku dan menyatakan diubah oleh Permenkominfo No. 10 Tahun 2021; diperiksa 9 Nov 2026. [Sumber resmi](https://jdih.komdigi.go.id/produk_hukum/view/id/759/t/peraturan%2Bmenteri%2Bkomunikasi%2Bdan%2Binformatika%2Bnomor%2B5%2Btahun%2B2020) — Jangan dibaca sendirian; telaah bersama perubahan 2021 dan aturan perizinan berbasis risiko 2025.

**[7] Permenkominfo No. 10 Tahun 2021 — Perubahan atas Permenkominfo No. 5 Tahun 2020. **Basis data BPK menampilkan status Berlaku; diperiksa 9 Nov 2026. [Sumber resmi](https://jdih.komdigi.go.id/produk_hukum/view/id/774/t/peraturan%2Bmenteri%2Bkomunikasi%2Bdan%2Binformatika%2Bnomor%2B10%2Btahun%2B2021) — Perubahan atas rezim PSE privat.

**[8] PP No. 28 Tahun 2025 — Penyelenggaraan Perizinan Berusaha Berbasis Risiko. **Basis data BPK menampilkan status Berlaku dan mencabut PP No. 5 Tahun 2021; diperiksa 9 Nov 2026. [Sumber resmi](https://peraturan.bpk.go.id/Details/319773/pp-no-28-tahun-2025) — Penting untuk menilai prosedur perizinan terkini.

**[9] Permenkomdigi No. 15 Tahun 2025 — Standar Kegiatan Usaha dan Standar Produk/Jasa. **JDIH Komdigi menampilkan status Berlaku; ditetapkan 20 Okt 2025 dan diundangkan 22 Okt 2025; diperiksa 9 Nov 2026. [Sumber resmi](https://jdih.komdigi.go.id/produk_hukum/view/id/985/t/peraturan%2Bmenteri%2Bkomunikasi%2Bdan%2Bdigital%2Bnomor%2B15%2Btahun%2B2025) — Lampiran memuat standar pendaftaran PSE Lingkup Privat untuk seluruh KBLI; penentuan apakah layanan Verity termasuk dan jalur OSS yang tepat memerlukan LEGAL REVIEW REQUIRED.

**[10] UU No. 27 Tahun 2022 — Pelindungan Data Pribadi. **Basis data BPK menampilkan status Berlaku; diperiksa 9 Nov 2026. [Sumber resmi](https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022) — Perhatikan juga putusan MK yang dicantumkan pada halaman BPK terkait Pasal 53.

**[11] Google Search guidance — Generative AI content. **Dokumentasi Google Search Central; diperiksa 9 Nov 2026. [Sumber resmi](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content/) — Mengutamakan akurasi, kualitas, relevansi, pemeriksaan fakta manual, dan konteks penggunaan otomatisasi.

**[12] Google Search spam policies — Scaled content abuse. **Dokumentasi Google Search Central; diperiksa 9 Nov 2026. [Sumber resmi](https://developers.google.com/search/docs/essentials/spam-policies) — Konten otomatis skala besar yang tidak memberi nilai tambah dapat masuk kategori penyalahgunaan.

**[13] Payload CMS — Access Control. **Dokumentasi vendor; diperiksa 9 Nov 2026. [Sumber resmi](https://payloadcms.com/docs/access-control/overview) — Acuan PoC; bukan bukti bahwa konfigurasi Verity aman tanpa pengujian.

**[14] Payload CMS — Versions. **Dokumentasi vendor; diperiksa 9 Nov 2026. [Sumber resmi](https://payloadcms.com/docs/versions/overview) — Menjelaskan version history dan diff; uji kesesuaian dengan workflow Verity.

**[15] Payload CMS — GraphQL API. **Dokumentasi vendor; diperiksa 9 Nov 2026. [Sumber resmi](https://payloadcms.com/docs/graphql/overview) — Koleksi dapat terekspos melalui API; semua endpoint perlu access control.

**[16] Vercel Terms of Service. **Ketentuan vendor; halaman menunjukkan pembaruan 19 Okt 2026; diperiksa 9 Nov 2026. [Sumber resmi](https://vercel.com/legal/terms) — Hobby plan dibatasi untuk penggunaan personal/nonkomersial. Verifikasi ulang sebelum pemilihan paket.
