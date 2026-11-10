# Kontrak API Verity (untuk UI — implementasi final)

Semua endpoint sudah terimplementasi & terlindungi server-side. UI tidak boleh mengandalkan
penyembunyian tombol sebagai pengaman — API selalu memvalidasi ulang role/ownership.

Format error konsisten:
```json
{ "error": "pesan", "code": "KODE", "details": [...] }  // 4xx/5xx
```

## Auth

- Login: `POST /api/auth/callback/credentials` (NextAuth credentials, form-encoded `email`, `password`, `csrfToken`).
  **Gunakan `signIn("credentials", { email, password, redirect: false })` dari `next-auth/react`** — sudah menangani CSRF.
- Session: `GET /api/auth/session` → `{ user: { id, name, email, role } }`.
- Logout: `POST /api/auth/signout` (pakai `signOut()` dari `next-auth/react`).
- Role: `CHIEF_EDITOR | EDITOR | INTERNAL_AUTHOR | VOLUNTEER`.
- Middleware `/studio/*` → redirect `/studio/login?next=…` bila belum login.

## Studio (semua butuh session)

### GET `/api/studio/dashboard`
Respons: `{ user, statusCounts: Record<string,number>, openComplaints: number|null, recentAudit: AuditEventDTO[], gateWarnings: {id,title,unverifiedKeySources}[], permissions: { canPublish, canReview, canVerifySources, canManageComplaints, canManageApiClients, canReadAudit } }`

### GET `/api/studio/articles?status=&desk=&format=&q=&scope=own`
Respons: `{ articles: ArticleListItemDTO[] }` (max 100, urut updatedAt desc).
- Internal Author otomatis hanya melihat naskahnya. `scope=own` memaksa filter milik sendiri.

### POST `/api/studio/articles`
Body: `{ title, deck?, deskSlug, format, aiInvolvement?, content? }` → `201 { id, slug }`.
Format: `NEWS|OPINION|ANALYSIS|EXPLAINER|FEATURE|INTERVIEW`; aiInvolvement: `none|assistive|substantive`; content: array block-JSON (lihat bawah).

### GET `/api/studio/articles/[id]`
Respons: `ArticleDetailDTO` — termasuk `content` (block-JSON), `sources[]`, `versions[]`,
`comments[]`, `reviews[]`, `availableTransitions[]` (sudah difilter per role+ownership —
render tombol transisi dari sini), `isOwn`, `unverifiedKeySourceCount`.

### PATCH `/api/studio/articles/[id]`
Body (semua opsional): `{ title?, deck?, deskSlug?, format?, byline?, aiInvolvement?,
aiDisclosurePublic?, aiDisclosureNote?, content?, changeReason?, versionType?, contributions? }`
- `content` berubah → versi baru otomatis (type `author` bila naskah sendiri, `editorial_copyedit` bila editor menyunting naskah orang lain).
- Editor/Chief boleh mengedit semua status non-terminal; Internal Author hanya naskah sendiri berstatus `DRAFT|REVISION_NEEDED`.
- `contributions`: `[{ personName, role: AUTHOR|EDITOR|REPORTER|REVIEWER|VISUAL, publicCredit }]` (editor+ saja).
- Respons: `ArticleDetailDTO` terbaru.

### POST `/api/studio/articles/[id]/transition`
Body: `{ action, reason? }` → `ArticleDetailDTO`. `reason` WAJIB untuk `REQUEST_REVISION|REJECT|WITHDRAW|RETRACT`.
Aksi: `SUBMIT_REVIEW|WITHDRAW|START_FACT_CHECK|REQUEST_REVISION|REJECT|SUBMIT_FOR_APPROVAL|RESUBMIT_REVIEW|PUBLISH|RETRACT|ARCHIVE`.
Gerbang PUBLISH (422 bila gagal, code `GATE_*`): semua sumber kunci VERIFIED, konten non-kosong, deck ada, AI substantif wajib disclosure publik. Hanya `CHIEF_EDITOR` yang bisa `PUBLISH`.

### POST `/api/studio/articles/[id]/sources`
Body: `{ title, publisher?, url, sourceType, publishedAt?, accessedAt?, supports?, isKeySource? }`
→ `201 ArticleDetailDTO`. `isKeySource` diabaikan bila pengirim bukan editor+. verificationStatus selalu mulai `UNVERIFIED`.

### PATCH `/api/studio/articles/[id]/sources/[sourceId]`
Body opsional: `{ title?, publisher?, url?, sourceType?, publishedAt?, accessedAt?, supports?,
isKeySource?, verificationStatus?, verificationNote? }` → `ArticleDetailDTO`.
`verificationStatus` (`UNVERIFIED|VERIFIED|DISPUTED`) hanya editor/chief. `isKeySource` hanya editor+.

### DELETE `/api/studio/articles/[id]/sources/[sourceId]` → `ArticleDetailDTO`

### GET|POST `/api/studio/articles/[id]/comments`
POST body: `{ body, authorVisible? }` (default false = internal note) → `{ comments: CommentDTO[] }`.

### GET `/api/studio/articles/[id]/audit` (editor+)
→ `{ events: AuditEventDTO[] }` (audit artikel+sumber terkait, 100 terbaru).

### GET `/api/studio/complaints?status=` (complaint:manage — chief; editor hanya jika grant)
→ `{ complaints: ComplaintDTO[] }`.

### PATCH `/api/studio/complaints/[id]` (complaint:manage)
Body: `{ status?: RECEIVED|IN_REVIEW|RESOLVED|REJECTED, decision? }`. `decision` wajib saat RESOLVED/REJECTED. Alur: RECEIVED→IN_REVIEW→RESOLVED|REJECTED.

### POST `/api/studio/corrections` (correction:create — chief / editor+grant)
Body: `{ articleId, summary, publicNote, correctedContent?, complaintId? }` → `201 { correctionId, article }`.
Efek server: CorrectionRecord + versi editorial + status artikel → `CORRECTED` + complaint (jika ada) → RESOLVED.

### GET `/api/studio/audit?action=&targetType=&limit=` (chief only)
→ `{ events: AuditEventDTO[], total }`.

### GET|POST `/api/studio/api-clients` (chief only)
POST body: `{ name, expiresInDays? }` → `201 { ...client, secret }` — **secret hanya tampil sekali**.
PATCH `/api/studio/api-clients/[id]` body `{ status: ACTIVE|REVOKED }`.

## Publik (tanpa auth)

### POST `/api/public/complaints` (rate-limit 5/jam/IP)
Body: `{ type: HAK_JAWAB|HAK_KOREKSI|KELUHAN|PERMINTAAN_PENGHAPUSAN, articleSlug?, senderName, senderEmail, senderPhone?, message }` → `201 { refCode, receivedAt }`.

## Ingestion (API client; TIDAK ADA endpoint publish)

### POST `/api/internal/v1/ai-submissions`
Header: `Authorization: Bearer vrtc_<clientId>.<secret>`. Body sesuai TA §9.1
(wajib `aiInvolvement`, `idempotencyKey`, `desk` (slug), `format` (selain NEWS), `content`
block-JSON, `sources[]` ber-URL, `agentId`). → `201 { submissionId, articleId, status:"DRAFT", receivedAt, idempotentReplay:false }`.
Replay idempotent → 200 sama; key sama + payload beda → 409; tanpa auth → 401; rate limit → 429.

## Block-JSON konten artikel

```ts
type Block =
  | { type: "paragraph"; text: string }                       // ≤20000 char
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "list"; style: "bullet" | "number"; items: string[] }
  | { type: "image"; url: string; alt?; caption?; credit? }
  | { type: "note"; label?: string; text: string }
  | { type: "qa"; question: string; answer: string };
```
Validator: `src/lib/domain/content.ts` (`articleContentSchema`, `parseContent`, `serializeContent`).

## Tipe DTO lengkap

Lihat `src/types/verity.ts` (satu-satunya sumber tipe untuk UI).
Label bahasa Indonesia: `src/lib/domain/constants.ts` (STATUS_LABELS, FORMAT_LABELS, dll).
Format tanggal: `src/lib/format.ts`.
