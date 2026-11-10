# **Verity — Laporan Tahap Pertama: Architecture Assessment, CMS PoC & ADR, dan MVP Roadmap**

| **DOCUMENT ID** | VRT-ARC-ADR-007 |
| --- | --- |
| **VERSION** | V1.0 (Phase 1 Assessment & PoC Report) |
| **STATUS** | WORKING PROPOSAL • AWAITING FOUNDER APPROVAL |
| **DATE** | 9 November 2026 |
| **BASELINE ACUAN** | `01_Verity_Editorial_Charter_V1.1.md`, `02_Verity_Contributor_Policy_Agreement_V1.1.md`, `03_Verity_Technical_Architecture_V1.1.md`, `05_Verity_Master_Prompt_Builder_Mode_V1.1.md`, `06_Verity_Launch_Plan_Operating_Model_V1.0.md` |

---

## 1. Architecture Assessment

### 1.1 Evaluasi Kesiapan Desain Baseline (V1.1)
Ketiga dokumen baseline (`VRT-ED-001`, `VRT-CP-002`, `VRT-TA-003`) dan Launch Plan (`VRT-LP-006`) telah memiliki koherensi yang sangat kuat setelah patch resolusi konflik V1.1:
- **Enam Keputusan Baseline (`LOCKED` D1–D6)** sudah konsisten di seluruh dokumen:
  - **D1 (`LOCKED`)**: Kontributor eksternal MVP wajib berusia 18+ (`adult_confirmed_at` tanpa pengumpulan KTP rutin).
  - **D2 (`LOCKED`)**: Format `News` dikunci khusus *newsroom-only*; kontributor Tahap B hanya dapat mengirimkan `Opinion`, `Analysis`, `Explainer`, `Feature`, dan `Interview`.
  - **D3 (`LOCKED`)**: Tidak ada status `Scheduled` pada MVP (ditunda ke P1).
  - **D4 (`LOCKED`)**: Peluncuran dua tahap yang tegas: **Tahap A** (*newsroom-only*) dan **Tahap B** (*curated contributor by invitation* setelah 6 gerbang hukum/tata kelola/kapasitas terpenuhi).
  - **D5 (`LOCKED`)**: Byline kolektif `Redaksi Verity` hanya sah untuk karya newsroom yang diverifikasi dan disunting secara bermakna oleh manusia; tidak boleh digunakan untuk menutupi draf AI `substantive` yang hanya diperiksa secara mekanis.
  - **D6 (`LOCKED`)**: Prosedur `risk_edit` 5 langkah yang non-destruktif (`version_type = 'risk_edit'`, `change_reason` wajib, notifikasi penulis `notified_author_at`, serta pencatatan `author_response` dan `audit_events`).

### 1.2 Temuan Gap & Potensi Konflik Arsitektural yang Perlu Dijelaskan (Tanpa Mengubah Baseline Secara Diam-diam)
Berdasarkan pemeriksaan silang antardokumen, terdapat **5 detail teknis/operasional** yang belum dirinci di level implementasi dan perlu disepakati sebelum atau saat Slice awal:
1. **GAP-01 — Polimorfisme Relasi `article_contributions.person_id`**:
   - Pada `03_Verity_Technical_Architecture_V1.1.md` §6, `staff_users` dan `contributors` dipisahkan menjadi dua tabel autentikasi yang berbeda, sementara `author_profiles` memiliki `account_ref`, dan `article_contributions` merujuk ke `person_id`.
   - **Solusi Arsitektural yang Diusulkan**: Gunakan `author_profiles.id` sebagai target foreign key dari `article_contributions.author_profile_id`, di mana `author_profiles` memiliki kolom opsional yang saling eksklusif (`staff_user_id` nullable, `contributor_id` nullable, dengan constraint `CHECK`). Dengan demikian, baik penulis internal, editor penyunting (`Disunting oleh [Nama]`), reporter, maupun kontributor eksternal pada Tahap B memiliki profil atribusi publik yang terpisah dari kredensial login privat mereka.
2. **GAP-02 — Relasi `articles` vs `submissions` pada Tahap A (Internal Newsroom vs AI Ingestion)**:
   - Pada `03_Verity_Technical_Architecture_V1.1.md` §6 & §9, endpoint `POST /api/internal/v1/ai-submissions` membuat record `submissions` dengan `origin = 'ai_agent'` dan `article_id`. Namun untuk naskah yang ditulis langsung oleh `Internal Author` di CMS pada Tahap A, apakah juga membuat baris di `submissions` atau langsung di `articles`?
   - **Solusi Arsitektural yang Diusulkan**: Untuk menjaga keseragaman `editorial_reviews` dan `review_comments` (yang merujuk pada `submission_id`), setiap intake dari `AI Agent API Client` (Tahap A) dan `External Contributor` (Tahap B) membuat `submissions` yang terhubung 1-ke-1 dengan draft `articles`. Sementara artikel internal newsroom murni menggunakan `articles` + `editorial_reviews.article_id` (`submission_id` nullable).
3. **GAP-03 — State Post-Publish (`Corrected`, `Retracted`, `Archived`) dan Visibilitas Publik**:
   - Pada §7.1 & §7.2 disebutkan bahwa artikel `Published` dapat berpindah ke `Corrected`, `Retracted`, atau `Archived`.
   - **Solusi Arsitektural yang Diusulkan**: Apabila artikel dikoreksi tetapi tetap tayang, status utama tetap `Published` dengan penanda `has_corrections = true` (atau sub-status `Published (Corrected)`) yang terhubung ke tabel `correction_records`, sehingga query artikel tayang tidak memutus URL publik. Sementara `Retracted` menampilkan halaman pemberitahuan pencabutan resmi (bukan 404 diam-diam, sesuai Pedoman Pemberitaan Media Siber), dan `Archived` menyembunyikan dari beranda namun tetap menjaga integritas arsip sesuai kebijakan.
4. **GAP-04 — Penyimpanan Kredensial dan Rate Limiting `Internal Ingestion API`**:
   - Baseline mewajibkan `secret_hash`, `scopes = ['submit']`, dan `idempotency_key`. Perlu disepakati bahwa format header menggunakan `Authorization: Bearer vrt_live_<client_id>.<secret>` di mana bagian `<secret>` di-hash menggunakan `SHA-256` / `Argon2id` di tabel `api_clients`, dan `idempotency_key` disimpan dalam tabel/kolom unik `submissions.idempotency_key` untuk mencegah *replay attack* lintas instance serverless.
5. **GAP-05 — Bukti Persetujuan Narasumber untuk Format `Feature` & `Interview`**:
   - Editorial Charter §2.2 dan Contributor Policy §3 mensyaratkan bukti izin/persetujuan narasumber bila relevan pada format `Feature` dan `Interview`. Pada skema database, `media_assets` sudah memiliki `permission_evidence`, namun `source_references` belum memiliki kolom khusus bukti persetujuan wawancara. Kami mengusulkan penambahan kolom opsional `consent_evidence_url` / `consent_notes` pada `source_references`.

---

## 2. Repository Assessment

Hasil pemeriksaan menyeluruh terhadap repository saat ini (`/app/applet`):
- **Framework & Runtime**: Next.js `15.4.9` (App Router), React `19.2.1`, TypeScript `5.9.3` (`strict: true`), `output: 'standalone'`.
- **Styling & UI**: Tailwind CSS `4.1.11` (`@tailwindcss/postcss`, `@tailwindcss/typography`), `lucide-react` (`^0.553.0`), `motion` (`^12.23.24`), `clsx`, `tailwind-merge`, `class-variance-authority`.
- **Validasi Form**: `@hookform/resolvers` (`^5.2.1`) sudah terpasang, tetapi `zod` dan `react-hook-form` belum terpasang di `package.json`.
- **Database & ORM**: **Belum ada** driver PostgreSQL (`pg` / `postgres`), belum ada ORM (`drizzle-orm` / `prisma`), dan belum ada CMS (`payload` / `@payloadcms/*`) di `package.json`.
- **Kondisi Kode Awal**: Sebelum pemeriksaan Tahap 1 ini, folder `/app` hanya berisi `layout.tsx` dan `globals.css` (bahkan belum memiliki `app/page.tsx`). Dokumentasi proyek ditemukan di `/public/assets/aistudio/Verity_Document_Set_V1.1_MD_752cdc74.zip` dan kini telah diekstrak secara utuh ke direktori `/docs/`.

**Kesimpulan Kesesuaian Repository vs Blueprint**:
Repository saat ini adalah *greenfield Next.js 15 App Router skeleton* yang sangat bersih dan sepenuhnya kompatibel dengan arah **Modular Monolith** (`03_Verity_Technical_Architecture_V1.1.md` §1 & §3), namun seluruh lapisan database (PostgreSQL), autentikasi, RBAC server-side, skema Tiptap/ProseMirror JSON, dan modul domain belum dibangun.

---

## 3. Technology Recommendation & CMS Proof of Concept (ADR-001)

### 3.1 Hasil Proof of Concept (PoC) Terukur: Payload CMS vs Ghost CMS
Kami telah membangun dan mengeksekusi mesin PoC terukur (`/lib/poc/verity-poc-engine.ts` dan endpoint `/api/poc/verify`) terhadap **12 skenario uji penerimaan (POC-01 s.d. POC-12)** yang diturunkan langsung dari `03_Verity_Technical_Architecture_V1.1.md` §3.1 & §12.2:

| Kriteria PoC Baseline (§3.1 & §12.2) | Ghost CMS 5.x | Payload CMS 3.x (Next.js Native) / Modular Monolith | Hasil Uji PoC Verity |
| --- | --- | --- | --- |
| **1. Koleksi Auth Terpisah (`staff_users` vs `contributors`) & Blokir Admin Panel** | **Gagal secara native**. Ghost memisahkan *Staff Users* dan *Members* (pembaca berbayar), tetapi *Members* tidak memiliki konsep pengiriman draft artikel terstruktur, dan memberi akun *Contributor* di Ghost berarti mengizinkan mereka masuk ke Ghost Admin (`/ghost`). | **Lulus penuh**. Mendukung dua koleksi auth yang terisolasi penuh; `contributors` tidak pernah diberi akses ke rute Admin CMS internal. | `POC-01 PASSED` |
| **2. Ownership Isolation (`submission:own`) di REST & GraphQL** | **Gagal pada Content/Admin API**. Ghost Content API bersifat publik, sedangkan Admin API berbasis role kasar; tidak mendukung pembatasan field/baris untuk skenario `Revision Requested` kontributor eksternal tanpa membangun aplikasi terpisah. | **Lulus penuh**. Access control function (`({ req: { user } }) => ({ contributor_id: { equals: user.id } })`) diterapkan seragam di Admin UI, Local API, REST, dan GraphQL. | `POC-02 PASSED` |
| **3. Kerahasiaan Internal Notes & `review_comments (author_visible=false)`** | **Tidak didukung**. Ghost tidak memiliki tabel komentar review berjenjang per-submission atau field-level access control untuk menyembunyikan catatan hukum internal dari penulis. | **Lulus penuh**. Field-level access control memastikan `internal_editorial_notes` dan komentar dengan `author_visible = false` di-strip di server sebelum dikirim ke kontributor/publik. | `POC-03 PASSED` |
| **4. Enforceable Source Verification Gate (`is_key_source` & `verification_status`)** | **Tidak didukung**. Ghost menyimpan artikel sebagai Lexical/HTML blob tanpa relasi tabel `source_references` yang memblokir transisi status `Approved`/`Published`. | **Lulus penuh** melalui `beforeChange` hook / server domain service yang menolak transisi ke `Pending Approval` / `Approved` / `Published` jika ada sumber kunci `unverified` atau `disputed`. | `POC-04 PASSED` |
| **5. Non-Destructive Versioning & Prosedur 5-Langkah `risk_edit`** | **Tidak didukung**. Revisi di Ghost bersifat snapshot otomatis tanpa metadata `version_type = 'risk_edit'`, `change_reason` wajib, `notified_author_at`, dan `author_response`. | **Lulus penuh** melalui tabel eksplisit `article_versions` + `audit_events` yang melarang silent overwrite. | `POC-07 PASSED` |
| **6. Draft-Only AI Ingestion API (`ai_involvement`, `idempotency_key`, No Auto-Publish)** | **Tidak didukung secara native** (Admin API key Ghost untuk integrasi memiliki izin tulis ke Posts tanpa validasi `ai_involvement` atau paksaan sumber `unverified`). | **Lulus penuh** melalui endpoint khusus `POST /api/internal/v1/ai-submissions` dengan validasi skema ketat dan scope `submit` saja. | `POC-08, POC-09, POC-12 PASSED` |

### 3.2 Rekomendasi Teknologi Final (ADR-001)
1. **Tolak Ghost CMS untuk Verity**: Ghost dirancang untuk penerbitan blog/newsletter satu arah dan tidak memenuhi minimal 4 dari 6 syarat keras tata kelola Verity (isolasi Admin Panel untuk kontributor, field-level privacy catatan internal, gerbang verifikasi sumber primer, dan alur `risk_edit`).
2. **Gunakan Arsitektur Next.js 15 Modular Monolith + PostgreSQL + Drizzle ORM + Tiptap JSON (dengan pola Access Control setara Payload CMS 3.x / Code-First Domain Services)**:
   - **Mengapa**: Memberikan kontrol 100% atas 15 tabel konseptual Verity di PostgreSQL, mendukung **Next.js 15 + React 19** yang sudah terpasang di repository tanpa konflik dependency, memungkinkan non-aktifkan GraphQL publik sepenuhnya (sehingga memperkecil permukaan serangan/kebocoran data internal), dan menjamin seluruh aturan `LOCKED` D1–D6 dieksekusi di satu lapisan domain server-side yang mudah diaudit dan diuji otomatis.
   - Apabila Founder tetap menginginkan **Payload CMS 3.x Admin UI bawaan** di atas PostgreSQL, skema Drizzle/PostgreSQL yang kami rancang 100% kompatibel dengan Payload 3.x (yang juga menggunakan Drizzle + PostgreSQL di balik layar).

---

## 4. Database Design Proposal (PostgreSQL — 15 Entitas Inti)

Seluruh 15 entitas dari `03_Verity_Technical_Architecture_V1.1.md` §6 dipetakan ke skema relasional PostgreSQL dengan penguatan integritas berikut:

1. `staff_users`: `id (UUID PK)`, `email (UNIQUE)`, `password_hash`, `role ('chief_editor' | 'editor' | 'internal_author' | 'volunteer')`, `explicit_grants (TEXT[])`, `status ('active' | 'suspended')`, `created_at`, `updated_at`.
2. `contributors` *(Aktif Tahap B)*: `id (UUID PK)`, `email (UNIQUE)`, `password_hash`, `legal_name_encrypted`, `adult_confirmed_at (TIMESTAMPTZ NOT NULL)`, `agreement_version_accepted`, `status ('invited' | 'active' | 'suspended')`, `created_at`.
3. `author_profiles`: `id (UUID PK)`, `staff_user_id (UUID NULL FK)`, `contributor_id (UUID NULL FK)`, `public_name`, `pen_name`, `anonymity_mode ('real_name' | 'pen_name' | 'anonymous_approved')`, `bio`, `avatar_url`, `created_at` — dilengkapi `CHECK ((staff_user_id IS NOT NULL AND contributor_id IS NULL) OR (staff_user_id IS NULL AND contributor_id IS NOT NULL))`.
4. `articles`: `id (UUID PK)`, `slug (UNIQUE)`, `title`, `deck`, `desk ('law-justice' | 'technology-policy' | 'national-public')`, `format ('news' | 'opinion' | 'analysis' | 'explainer' | 'feature' | 'interview')`, `content_json (JSONB NOT NULL)`, `status`, `byline`, `has_human_substantive_edit (BOOLEAN DEFAULT FALSE)`, `ai_involvement ('none' | 'assistive' | 'substantive')`, `ai_disclosure_public (BOOLEAN DEFAULT FALSE)`, `ai_disclosure_note (TEXT)`, `disclosure_decided_by (UUID FK staff_users)`, `disclosure_decided_at (TIMESTAMPTZ)`, `published_at (TIMESTAMPTZ NULL)`, `published_by (UUID NULL FK staff_users)`, `created_by (UUID NULL FK staff_users)`, `created_at`, `updated_at`.
5. `submissions`: `id (UUID PK)`, `origin ('internal' | 'contributor' | 'ai_agent')`, `contributor_id (UUID NULL FK contributors)`, `api_client_id (UUID NULL FK api_clients)`, `article_id (UUID NOT NULL FK articles)`, `status`, `ai_involvement_declared ('none' | 'assistive' | 'substantive')`, `ai_usage_note (TEXT NOT NULL)`, `conflict_statement (TEXT)`, `idempotency_key (VARCHAR(128) UNIQUE)`, `submitted_at (TIMESTAMPTZ)`.
6. `article_versions`: `id (UUID PK)`, `article_id (UUID NOT NULL FK articles)`, `version_no (INT NOT NULL)`, `title_snapshot`, `deck_snapshot`, `content_json (JSONB NOT NULL)`, `version_type ('author' | 'editorial_copyedit' | 'risk_edit')`, `risk_category ('legal' | 'privacy' | 'copyright' | 'safety' NULL)`, `change_reason (TEXT)`, `created_by_type ('staff' | 'contributor' | 'api_client')`, `created_by_id (UUID)`, `notified_author_at (TIMESTAMPTZ NULL)`, `notification_exception_reason (TEXT NULL)`, `author_response ('pending' | 'accepted' | 'revised' | 'withdrawn' NULL)`, `created_at (TIMESTAMPTZ)` — `UNIQUE(article_id, version_no)`.
7. `article_contributions`: `id (UUID PK)`, `article_id (UUID NOT NULL FK articles)`, `author_profile_id (UUID NOT NULL FK author_profiles)`, `role ('author' | 'collective_newsroom' | 'editor' | 'reporter' | 'expert_reviewer' | 'visual_creator')`, `display_order (INT)`, `public_credit_label (TEXT)`.
8. `source_references`: `id (UUID PK)`, `article_id (UUID NOT NULL FK articles)`, `title (TEXT NOT NULL)`, `publisher (TEXT NOT NULL)`, `url (TEXT NOT NULL)`, `source_type ('primary' | 'secondary')`, `published_at (DATE NULL)`, `accessed_at (DATE NOT NULL)`, `supports (TEXT NOT NULL)`, `consent_evidence_note (TEXT NULL)`, `is_key_source (BOOLEAN DEFAULT FALSE)`, `verification_status ('unverified' | 'verified' | 'disputed' DEFAULT 'unverified')`, `verified_by (UUID NULL FK staff_users)`, `verified_at (TIMESTAMPTZ NULL)`.
9. `editorial_reviews`: `id (UUID PK)`, `article_id (UUID NOT NULL FK articles)`, `submission_id (UUID NULL FK submissions)`, `reviewer_id (UUID NOT NULL FK staff_users)`, `decision ('request_fact_check' | 'revision_needed' | 'approve_for_chief' | 'final_approve' | 'reject')`, `internal_notes (TEXT)`, `author_feedback_summary (TEXT)`, `decided_at (TIMESTAMPTZ)`.
10. `review_comments`: `id (UUID PK)`, `submission_id (UUID NULL FK submissions)`, `article_id (UUID NOT NULL FK articles)`, `author_id (UUID NOT NULL)`, `author_visible (BOOLEAN NOT NULL DEFAULT FALSE)`, `comment (TEXT NOT NULL)`, `created_at (TIMESTAMPTZ)`.
11. `media_assets`: `id (UUID PK)`, `article_id (UUID NULL FK articles)`, `storage_key (TEXT NOT NULL)`, `public_url (TEXT NOT NULL)`, `creator (TEXT NOT NULL)`, `license (TEXT NOT NULL)`, `permission_evidence (TEXT)`, `is_ai_generated_illustration (BOOLEAN DEFAULT FALSE)`, `caption (TEXT NOT NULL)`, `source_url (TEXT)`, `uploaded_by (UUID NOT NULL)`, `created_at (TIMESTAMPTZ)`.
12. `complaints`: `id (UUID PK)`, `ticket_number (VARCHAR(32) UNIQUE)`, `type ('right_of_reply' | 'correction_request' | 'complaint' | 'takedown_request')`, `article_id (UUID NULL FK articles)`, `sender_name (TEXT NOT NULL)`, `sender_contact_encrypted (TEXT NOT NULL)`, `claim_summary (TEXT NOT NULL)`, `supporting_evidence_url (TEXT NULL)`, `received_at (TIMESTAMPTZ NOT NULL)`, `status ('received' | 'under_review' | 'resolved_with_correction' | 'resolved_right_of_reply' | 'rejected')`, `deadline (TIMESTAMPTZ NULL)` *(nullable sampai Legal Review selesai)*, `decision_notes (TEXT NULL)`, `correction_record_id (UUID NULL FK correction_records)`.
13. `correction_records`: `id (UUID PK)`, `article_id (UUID NOT NULL FK articles)`, `corrected_at (TIMESTAMPTZ NOT NULL)`, `summary (TEXT NOT NULL)`, `before_reference (TEXT)`, `after_reference (TEXT)`, `public_note (TEXT NOT NULL)`, `approved_by (UUID NOT NULL FK staff_users)`.
14. `api_clients`: `id (UUID PK)`, `client_id (VARCHAR(64) UNIQUE NOT NULL)`, `secret_hash (TEXT NOT NULL)`, `agent_name (TEXT NOT NULL)`, `scopes (TEXT[] DEFAULT ARRAY['submit'])`, `status ('active' | 'revoked')`, `expires_at (TIMESTAMPTZ NOT NULL)`, `last_used_at (TIMESTAMPTZ NULL)`, `created_at (TIMESTAMPTZ)`.
15. `audit_events` *(Append-Only Table — tanpa izin UPDATE/DELETE)*: `id (UUID PK)`, `actor_type ('staff' | 'contributor' | 'api_client' | 'system')`, `actor_id (TEXT NOT NULL)`, `action (VARCHAR(120) NOT NULL)`, `target_type (VARCHAR(64) NOT NULL)`, `target_id (TEXT NOT NULL)`, `reason (TEXT NULL)`, `metadata_redacted (JSONB)`, `correlation_id (VARCHAR(120) NOT NULL)`, `timestamp (TIMESTAMPTZ NOT NULL DEFAULT NOW())`.

---

## 5. Role and Permission Matrix

| Permission | Chief Editor | Editor | Internal Author | External Contributor *(Tahap B)* | Volunteer | AI Agent API Client | Public Reader |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `article:create` | **Yes** | **Yes** | **Assigned only** | No | **By assignment** | **Submit only** (via Ingestion API) | No |
| `article:read_internal` | **Yes** | **Yes** | **Own / Assigned** | No | No default | No | No |
| `article:edit_internal` | **Yes** | **Yes (by scope)** | **Own / Assigned** | No | No default | No | No |
| `article:review` | **Yes** | **Yes** | No | No | No default | No | No |
| `source:verify` | **Yes** | **Yes** | No | No | No default | No | No |
| `article:approve` | **Yes** | *Delegable later (No in Stage A default)* | No | No | No | No | No |
| `article:publish` | **Yes** | **No in MVP** | No | No | No | No | No |
| `article:risk_edit` | **Yes** | **By explicit grant** | No | No | No | No | No |
| `submission:own` | **Yes** | **Yes (by review)** | No | **Own only** *(18+ & Stage B active)* | No | **Create only** | No |
| `complaint:manage` | **Yes** | **By explicit grant** | No | No | No | No | Submit form only |

---

## 6. Editorial Workflow Design

### 6.1 Alur Tahap A — Internal Newsroom & AI Ingestion
```
[AI Agent API Client] ──(POST /api/internal/v1/ai-submissions)──► [Draft / Pending Review]
                                                                          │
[Internal Author] ──────(Create Draft)──────────────────────────► [Draft] ┴─► [Pending Review]
                                                                                     │
         ┌──────────────────────(Revision Needed)────────────────────────────────────┤
         ▼                                                                           ▼
[Revision Needed] ◄─────────────(Revision Needed)─────────────────────────── [Fact Check]
                                                                              (Editor menandai is_key_source
                                                                               & memverifikasi sumber primer)
                                                                                     │
                                                                 [Gate: Semua Key Sources = VERIFIED]
                                                                                     │
                                                                                     ▼
                                                                            [Pending Approval]
                                                                                     │
                                                                    (Hanya Chief Editor pada Tahap A;
                                                                     Cek Byline D5 & AI Disclosure)
                                                                                     │
                                                                                     ▼
                                                                                [Published]
                                                                                     │
                                                                      ┌──────────────┴──────────────┐
                                                                      ▼                             ▼
                                                           [Corrected + Log Publik]      [Retracted / Archived]
```

### 6.2 Alur Tahap B — Curated Contributor Publishing *(Terkunci sampai Gerbang Tahap B Terpenuhi)*
1. `Draft` (Kontributor 18+ menyusun naskah `Opinion` / `Analysis` / `Explainer` / `Feature` / `Interview` — format `News` diblokir).
2. `Submitted` → otomatis masuk `Editorial Review` (Target SLA respons awal: 7 hari kalender; kontributor terkunci dari mengedit versi yang sedang direview).
3. Keputusan Editor:
   - `Revision Requested`: Kontributor dapat membuat versi baru (`Resubmitted`) dengan melihat hanya komentar `author_visible = true`.
   - `Copyedit Ringan`: Disimpan sebagai `version_type = 'editorial_copyedit'`, penulis diberitahu sebelum publikasi.
   - `Risk-Edit Terbatas` (`article:risk_edit`): Disimpan sebagai `version_type = 'risk_edit'`, `change_reason` wajib, `notified_author_at` terekam, menunggu `author_response` (`pending` | `accepted` | `revised` | `withdrawn`).
   - `Approved` (setelah lulus *Source Verification Gate*) → diterbitkan menjadi `Published` oleh `Chief Editor` (otomatis menyertakan *Disclaimer Opini* untuk format `Opinion`).

---

## 7. MVP Implementation Roadmap (Vertical Slices)

Pendekatan pembangunan dibagi menjadi **6 Vertical Slices kecil yang dapat diuji secara independen** untuk **Tahap A (P0)**, diikuti oleh **Tahap B (P1)** hanya setelah gerbang hukum/operasional terpenuhi:

### Slice 1 (Langkah Pertama Terkecil & Dapat Diuji): Foundation, Schema, RBAC Policy Engine & Append-Only Audit Trail
- **Cakupan**: Setup skema database/repositori data inti (`staff_users`, `author_profiles`, `articles`, `article_versions`, `source_references`, `audit_events`), modul server-side RBAC (`evaluatePermission`), dan suite automated unit/integration test (`node:test`) untuk membuktikan isolasi permission dan pencatatan audit event.
- **Acceptance Criteria**:
  1. Seluruh 6 role MVP dievaluasi di server dengan prinsip *least privilege*.
  2. `Editor` ditolak saat memanggil `article:publish`; `External Contributor` dan `API Client` ditolak mengakses artikel internal.
  3. Setiap aksi sensitif menghasilkan baris append-only pada `audit_events` tanpa membocorkan secret/token.

### Slice 2: Newsroom Editorial Core, Structured Content & Source Verification Gate
- **Cakupan**: Pembuatan draft artikel internal (dengan validasi struktur JSON Tiptap/ProseMirror, 3 desk awal: `law-justice`, `technology-policy`, `national-public`), manajemen `source_references`, dan state machine Tahap A (`Draft` → `Pending Review` → `Fact Check` → `Pending Approval` → `Published`).
- **Acceptance Criteria**:
  1. Transisi ke `Pending Approval` atau `Published` gagal secara deterministik apabila ada `is_key_source = true` yang berstatus `unverified` atau `disputed`.
  2. Transisi ke status `Scheduled` ditolak di server (`Decision D3`).
  3. Validasi byline `Redaksi Verity` menolak publikasi jika `ai_involvement = 'substantive'` tanpa suntingan manusia yang bermakna (`Decision D5`).

### Slice 3: Internal Content Ingestion API (`POST /api/internal/v1/ai-submissions`)
- **Cakupan**: Endpoint khusus AI Agent internal dengan autentikasi `api_clients` (hashed secret, scope `submit` saja), validasi `ai_involvement`, `idempotency_key`, pembuatan `submissions` + draft `articles`, dan inisialisasi seluruh sumber sebagai `unverified`.
- **Acceptance Criteria**:
  1. Request tanpa `ai_involvement` atau `idempotency_key` ditolak (`422 Unprocessable Entity`).
  2. Request dengan `idempotency_key` duplikat ditolak (`409 Conflict`).
  3. Field `suggested_byline` atau `status: "Published"` dari payload diabaikan; API client tidak dapat membaca draft lain atau memicu publish.

### Slice 4: Public Publishing Website (Tahap A Reader Experience)
- **Cakupan**: Beranda Verity (3-tier editorial salience), halaman Desk (`Hukum & Keadilan`, `Teknologi & Kebijakan`, `Nasional & Publik`), halaman detail artikel (menampilkan kredit spesifik sesuai §5 Charter, catatan proses AI publik bila `substantive` atau diputuskan editor, daftar referensi sumber terverifikasi, serta Disclaimer Opini otomatis untuk format `Opinion`), profil penulis, dan SEO/sitemap dasar.
- **Acceptance Criteria**:
  1. Hanya artikel berstatus `Published` (atau pemberitahuan resmi untuk `Retracted`) yang dapat diakses di route publik.
  2. Catatan internal redaksi (`internal_notes`, `review_comments` dengan `author_visible = false`) terbukti tidak pernah muncul pada payload halaman publik.

### Slice 5: Public Correction Log & Complaints / Right-of-Reply Intake
- **Cakupan**: Formulir publik pengajuan Hak Jawab, Hak Koreksi, Keluhan, dan Permintaan Penurunan (`complaints`), panel manajemen keluhan (`complaint:manage`), serta halaman publik **Correction Log** (`correction_records`) yang terhubung langsung ke artikel yang dikoreksi.
- **Acceptance Criteria**:
  1. Publik dapat mengirim permohonan hak jawab/koreksi dan memperoleh nomor tiket pelacakan; data kontak privat pelapor tidak terekspos ke publik.
  2. Kolom `deadline` disimpan `nullable` sampai kajian hukum selesai (`LEGAL REVIEW REQUIRED`).
  3. Koreksi material pada artikel tayang otomatis mencatat ringkasan perubahan dan waktu pembaruan di Correction Log publik.

### Slice 6 (Ditahan untuk Tahap B setelah Gate Terpenuhi): Curated Contributor Portal & Risk-Edit Loop
- **Cakupan**: Autentikasi kontributor terpisah (undangan + konfirmasi 18+), form submission 5 format non-News, pemisahan komentar `author_visible`, dan alur 5 langkah `risk_edit` dengan notifikasi penulis.

---

## 8. Daftar Risiko dan Keputusan yang Membutuhkan Persetujuan Founder

### 8.1 Keputusan berstatus `OPEN` & `PROPOSED` (Butuh Konfirmasi Founder)
1. **Keputusan Stack & Database (`PROPOSED`)**: Apakah Anda menyetujui rekomendasi **ADR-001** (menggunakan **Next.js 15 Modular Monolith + PostgreSQL + Drizzle ORM + Tiptap JSON** dengan RBAC server-side yang telah teruji pada PoC ini, serta menolak Ghost CMS)?
   - *Catatan Infrastruktur*: Apakah Anda ingin kami melakukan provisioning database **PostgreSQL (Cloud SQL)** yang tersedia di environment ini pada tahap implementasi berikutnya?
2. **Keputusan Resolusi Gap Skema (`PROPOSED` GAP-01 s.d. GAP-05)**:
   - Penggunaan `author_profiles` sebagai jembatan atribusi publik antara `staff_users` dan `contributors`.
   - Penanganan status `Corrected` sebagai atribut/log di atas artikel `Published` agar URL publik tetap hidup, serta halaman pemberitahuan khusus untuk artikel `Retracted`.
3. **Input Operasional Founder (`OPEN` — dari Launch Plan §11)**:
   - Penetapan siapa yang memegang peran **Chief Editor** pada Tahap A dan kesiapan **Editor kedua** (syarat mutlak sebelum membuka Tahap B).
   - Konfirmasi kapasitas jam review mingguan (target awal Tahap A: 2–3 artikel/minggu atau 6–10 artikel dalam 30 hari pertama).
   - Clearance nama merek/domain **VERITY** (mengingat hasil penelusuran awal PDKI perlu ditindaklanjuti pada Kelas 41).

### 8.2 Isu Berstatus `LEGAL REVIEW REQUIRED` (Tidak Boleh Dianggap Selesai Secara Teknis Saja)
1. **Status Badan Hukum / Operator & UU No. 40/1999 tentang Pers**: Penentuan badan pengelola yang sah, penanggung jawab redaksi, dan batasan klaim publik (Verity tidak boleh mengklaim sebagai perusahaan pers terverifikasi Dewan Pers sebelum proses pendataan/verifikasi selesai).
2. **Kewajiban Pendaftaran PSE Lingkup Privat**: Telaah penerapan Permenkominfo 5/2020 jo. 10/2021, PP 28/2025, dan Permenkomdigi 15/2025 sebelum go-live publik dan sebelum membuka akun kontributor eksternal.
3. **Tenggat Operasional Hak Jawab & Keluhan**: Kolom `complaints.deadline` wajib tetap `nullable` / dapat dikonfigurasi sampai penasihat hukum menetapkan SLA yang selaras dengan Pedoman Hak Jawab Dewan Pers dan Pedoman Pemberitaan Media Siber.
4. **Kepatuhan UU No. 27/2022 (UU PDP)**: Penyusunan *Privacy Notice* publik, dasar pemrosesan data pelapor keluhan serta kontributor, dan retensi data.
5. **Finalisasi Contributor Agreement (Gerbang Tahap B)**: Tinjauan penasihat hukum atas klausul lisensi non-eksklusif, hak `risk_edit`, dan status perpajakan/relawan sebelum Tahap B dibuka.
6. **Kepatuhan Terms of Service Hosting (Vercel Hobby vs Commercial Plan)**: Memastikan paket hosting sesuai dengan sifat operasional/komersial Verity.
