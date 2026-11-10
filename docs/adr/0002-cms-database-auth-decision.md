# **ADR-002: Keputusan Final CMS, Database (SQLite → PostgreSQL), dan Sistem Autentikasi**

| **DOCUMENT ID** | VRT-ARC-ADR-008 |
| --- | --- |
| **VERSION** | V1.0 (Final Architecture Decision Record) |
| **STATUS** | ACCEPTED & LOCKED FOR IMPLEMENTATION |
| **DATE** | 9 November 2026 |
| **DECISION MAKER** | Principal Software Architect (Berdasarkan Mandat Otorisasi Founder) |

---

## 1. Konteks dan Mandat Evaluasi

Founder memberikan otorisasi penuh untuk mengevaluasi secara empiris **Payload CMS** versus **Custom Next.js Modular Monolith**, menggunakan **SQLite** untuk PoC dan implementasi awal (dengan rencana migrasi yang jelas ke PostgreSQL sebelum skala produksi penuh), serta mengimplementasikan seluruh fondasi **Phase 1 (Editorial Core Foundation)** dan **Phase 2 (Remaining MVP P0)** beserta pengujian integrasi **Phase 3** dan kesiapan **Phase 4 (Stage A Readiness)**.

---

## 2. Hasil Pengujian Empiris: Payload CMS 3.x vs Custom Next.js 15 Modular Monolith

### 2.1 Pemeriksaan Kompatibilitas Aktual di Repository
Repository saat ini menggunakan `next@15.4.9` dan `react@19.2.1`. Pemeriksaan registri paket (`npm view @payloadcms/next version peerDependencies` pada 9 November 2026) menunjukkan:
- `@payloadcms/next@3.93.0` mensyaratkan:
  `next: ">=15.2.9 <15.3.0 || >=15.3.9 <15.4.0 || >=15.4.11 <15.5.0 || >=16.3.3 <17.0.0"`
- Versi `next@15.4.9` pada repository berada di luar rentang `peerDependencies` resmi `@payloadcms/next@3.93.0`, sehingga instalasi Payload memicu konflik dependency atau memaksa modifikasi versi core framework.

### 2.2 Evaluasi 9 Kriteria Teknis terhadap Kebutuhan Verity

| Kriteria Evaluasi | Payload CMS 3.x (`@payloadcms/next` + `@payloadcms/db-sqlite`) | Custom Next.js 15 Modular Monolith + SQLite (`node:sqlite` + Domain Services) |
| --- | --- | --- |
| **1. Next.js 15.4.9 Compatibility** | **Konflik `peerDependencies`** (`15.4.9` dikecualikan oleh `@payloadcms/next@3.93.0`). | **100% Native** tanpa modifikasi versi Next.js atau bundler. |
| **2. Admin Panel Integration** | Memerlukan route group `(payload)` tersendiri, lexical/slate editor bawaan, dan regenerasi importMap. | Terintegrasi langsung di `/cms` dengan desain editorial grayscale/stone (`VERITY`) yang konsisten dengan situs publik. |
| **3. Authentication** | Built-in auth per collection, namun menggabungkan sesi cookie Payload dengan custom contributor gate memerlukan override mendalam. | **Signed HTTP-Only Session Cookie (`HMAC-SHA256`)** untuk `staff_users` + autentikasi header `Bearer` ter-hash (`SHA-256`) untuk `api_clients`. |
| **4. Access Control (RBAC & Ownership)** | Deklaratif per collection/field, tetapi setiap koleksi baru otomatis membuka REST & GraphQL kecuali ditutup satu per satu. | **Deny-by-default**: hanya route API yang didefinisikan secara eksplisit yang aktif; tidak ada endpoint GraphQL yang terekspos. |
| **5. Draft & Publishing Workflow** | Sistem draft bawaan Payload hanya mengenal `_status: 'draft' | 'published'`, sehingga tetap harus di-bypass untuk mendukung 6 state Tahap A Verity. | Mendukung penuh state machine Tahap A (`Draft` → `Pending Review` → `Fact Check` → `Pending Approval` → `Published` / `Corrected` / `Retracted`) dan memblokir `Scheduled` (`LOCKED D3`). |
| **6. Version History & `risk_edit`** | Tabel `_v` bawaan Payload menyimpan snapshot dokumen penuh tanpa skema native untuk `version_type = 'risk_edit'`, `change_reason` wajib, `notified_author_at`, dan `author_response`. | Tabel eksplisit `article_versions` dalam transaksi ACID yang menjamin *non-destructive versioning* dan penegakan 5 langkah `risk_edit` (`LOCKED D6`). |
| **7. SQLite Adapter Compatibility** | `@payloadcms/db-sqlite` membawa Drizzle + libsql client tambahan. | Menggunakan modul standar `node:sqlite` (`DatabaseSync` pada Node v22.23.2) dengan `PRAGMA journal_mode = WAL`, `PRAGMA foreign_keys = ON`, dan **SQLite Triggers** untuk memblokir `UPDATE`/`DELETE` pada `audit_events`. |
| **8. REST & GraphQL Access Control** | Harus mengamankan puluhan auto-generated endpoints & GraphQL resolver agar `internal_notes` tidak bocor. | GraphQL dinonaktifkan sepenuhnya; setiap endpoint REST memanggil `projectArticleForViewer()` dan `evaluatePermission()` di server. |
| **9. Single Data Layer Discipline** | Menggabungkan Payload ORM dengan query custom berisiko menciptakan dua lapisan akses data. | Satu lapisan repositori SQLite transaksional terpusat (`/lib/db/database.ts`) dengan tipe TypeScript ketat. |

---

## 3. Keputusan Arsitektur Final

1. **CMS & Application Architecture**: Memilih **Custom Next.js 15 Modular Monolith** dengan lapisan domain eksplisit (`/lib/db/`, `/lib/auth/`, `/lib/domain/`) dibandingkan Payload CMS maupun Ghost CMS.
2. **Database Engine (PoC & MVP Awal)**: Menggunakan **SQLite (`node:sqlite` `DatabaseSync`)** yang disimpan pada file persisten `.data/verity.sqlite` (beserta utilitas backup otomatis sebelum migrasi skema).
   - Dilengkapi constraint `FOREIGN KEY`, `CHECK` constraints untuk enum status/format/desk/AI involvement, serta **SQLite Database Triggers (`prevent_audit_update`, `prevent_audit_delete`)** yang menjamin tabel `audit_events` bersifat *append-only* bahkan di level database engine.
3. **Authentication & Session Security**:
   - Satu sistem autentikasi terpadu berbasis **Signed HTTP-Only Cookie (`verity_staff_session`)** menggunakan `HMAC-SHA256` (`node:crypto`) untuk `staff_users` (`Chief Editor`, `Editor`, `Internal Author`, `Volunteer`), ditambah fitur **Demo Role Switcher** yang tercatat di audit log khusus untuk mempermudah pengujian RBAC di environment development.
   - Autentikasi terpisah berbasis **API Key (`X-Verity-API-Key`)** yang diverifikasi terhadap `api_clients.secret_hash` (`SHA-256`) dengan scope terkunci pada `submit` untuk endpoint `POST /api/internal/v1/ai-submissions`.
4. **Rencana Migrasi dari SQLite ke PostgreSQL (Pre-Production Gate)**:
   - Seluruh tipe kolom pada SQLite dirancang kompatibel 1:1 dengan PostgreSQL (`TEXT` UUID, `TEXT` ISO-8601 timestamps, `TEXT` JSON tervalidasi untuk `content_json`, dan `INTEGER` 0/1 untuk boolean).
   - Saat berpindah ke PostgreSQL produksi, hanya adapter koneksi di `/lib/db/database.ts` yang diganti ke driver PostgreSQL (`pg` / Drizzle Postgres) tanpa mengubah logika bisnis, state machine, maupun kontrak API.
