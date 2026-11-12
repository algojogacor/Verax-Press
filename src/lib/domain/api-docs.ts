// Sumber kebenaran tunggal untuk spesifikasi API dan dokumentasi mesin (Fase 3 + Remediasi Editorial).
// Menghasilkan OpenAPI 3.1.0, /.well-known/verax-agent.json, /llms.txt, dan /llms-full.txt.

import {
  AI_INVOLVEMENTS,
  AI_PLACEHOLDER_BYLINE,
  ARTICLE_FORMATS,
  ARTICLE_STATUSES,
  CONTRIBUTOR_ALLOWED_FORMATS,
  INGESTION_ALLOWED_FORMATS,
  INGESTION_CONDITIONAL_FORMAT_RULES,
  INGESTION_PENDING_FORMATS,
  SOURCE_TYPES,
  getPublicBaseUrl,
} from "@/lib/domain/constants";

const ALL_BLOCK_TYPES = ["paragraph", "heading", "quote", "list", "image", "note", "qa"] as const;

export function getOpenApiSpec(baseUrlOverride?: string) {
  const baseUrl = baseUrlOverride || getPublicBaseUrl();

  const error405Response = {
    description: "Metode HTTP tidak diizinkan pada endpoint ini. Header Allow mencantumkan metode yang valid.",
    headers: {
      Allow: {
        schema: { type: "string" },
        description: "Daftar metode HTTP yang diizinkan (misal: POST atau GET, HEAD).",
      },
      "x-request-id": {
        schema: { type: "string" },
        description: "Pengidentifikasi unik permintaan untuk pelacakan galat.",
      },
    },
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/ErrorResponse" },
      },
    },
  };

  const outputQueryParameter = {
    name: "output",
    in: "query",
    required: false,
    schema: { type: "string", enum: ["markdown", "md", "json"], default: "markdown" },
    description: "Format keluaran respons. Nilai di luar daftar mengembalikan HTTP 422 VALIDATION_ERROR.",
  };

  const conditionalIfNoneMatchParam = {
    name: "If-None-Match",
    in: "header",
    required: false,
    schema: { type: "string" },
    description: "ETag yang diterima sebelumnya; bila masih cocok mengembalikan HTTP 304 Not Modified tanpa isi.",
  };

  const error422SchemaRef = {
    description: "Parameter kueri atau permintaan tidak valid.",
    content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
  };

  const response304 = {
    description: "Konten belum berubah (If-None-Match cocok dengan ETag aktif); isi kosong.",
    headers: {
      ETag: { schema: { type: "string" } },
      Vary: { schema: { type: "string" } },
    },
  };

  const withHeadFromGet = (pathItem: { get: Record<string, unknown> }) => ({
    get: pathItem.get,
    head: {
      summary: `Header & validasi ${String(pathItem.get.summary ?? "endpoint")}`,
      ...(pathItem.get.security ? { security: pathItem.get.security } : {}),
      ...(pathItem.get.parameters ? { parameters: pathItem.get.parameters } : {}),
      responses: pathItem.get.responses,
    },
  });

  return {
    openapi: "3.1.0",
    info: {
      title: "Verax Press AI Agent Ingestion & Editorial Context API",
      version: "1.0.0",
      description:
        "Spesifikasi antarmuka pemrograman untuk penemuan standar editorial modular (berstatus PROPOSED / pratinjau non-mengikat) dan pengiriman draf artikel oleh agen kecerdasan buatan ke ruang redaksi Verax Press. Seluruh kiriman berstatus awal DRAFT, seluruh sumber berstatus UNVERIFIED, dan kendali publikasi mutlak di tangan editor manusia (CHIEF_EDITOR).",
    },
    servers: [
      {
        url: baseUrl,
        description: "Server Integrasi Verax Press",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description:
            "Kredensial integrasi dengan format: Bearer <CLIENT_ID>.<CLIENT_SECRET>. Contoh: Bearer vrtc_1234567890abcdef.vrtk_fedcba0987654321fedcba0987654321",
        },
      },
      schemas: {
        ParagraphBlock: {
          type: "object",
          required: ["type", "text"],
          properties: {
            type: { type: "string", const: "paragraph" },
            text: {
              type: "string",
              minLength: 1,
              maxLength: 20000,
              description: "Isi paragraf naskah. Jika menjadi blok pertama (>=120 karakter), dirender dengan inisial drop cap.",
            },
          },
        },
        HeadingBlock: {
          type: "object",
          required: ["type", "level", "text"],
          properties: {
            type: { type: "string", const: "heading" },
            level: {
              type: "integer",
              enum: [2, 3],
              description: "Tingkat subjudul (hanya 2 untuk H2 atau 3 untuk H3).",
            },
            text: { type: "string", minLength: 1, maxLength: 300 },
          },
        },
        QuoteBlock: {
          type: "object",
          required: ["type", "text"],
          properties: {
            type: { type: "string", const: "quote" },
            text: { type: "string", minLength: 1, maxLength: 5000 },
            attribution: {
              type: "string",
              maxLength: 300,
              description: "Nama, jabatan, atau sumber atribusi kutipan.",
            },
          },
        },
        ListBlock: {
          type: "object",
          required: ["type", "style", "items"],
          properties: {
            type: { type: "string", const: "list" },
            style: {
              type: "string",
              enum: ["bullet", "number"],
              description: "WAJIB diisi: bullet (daftar bertanda) atau number (daftar bernomor).",
            },
            items: {
              type: "array",
              minItems: 1,
              maxItems: 50,
              items: { type: "string", minLength: 1, maxLength: 2000 },
            },
          },
        },
        ImageBlock: {
          type: "object",
          required: ["type", "url"],
          properties: {
            type: { type: "string", const: "image" },
            url: {
              type: "string",
              maxLength: 2000,
              description: "URL http(s) atau path aset lokal diawali /.",
            },
            alt: { type: "string", maxLength: 500 },
            caption: { type: "string", maxLength: 500 },
            credit: { type: "string", maxLength: 300 },
          },
        },
        NoteBlock: {
          type: "object",
          required: ["type", "text"],
          properties: {
            type: { type: "string", const: "note" },
            label: { type: "string", maxLength: 120 },
            text: { type: "string", minLength: 1, maxLength: 3000 },
          },
        },
        QaBlock: {
          type: "object",
          required: ["type", "question", "answer"],
          properties: {
            type: { type: "string", const: "qa" },
            question: { type: "string", minLength: 1, maxLength: 1000 },
            answer: { type: "string", minLength: 1, maxLength: 10000 },
          },
        },
        ContentBlock: {
          oneOf: [
            { $ref: "#/components/schemas/ParagraphBlock" },
            { $ref: "#/components/schemas/HeadingBlock" },
            { $ref: "#/components/schemas/QuoteBlock" },
            { $ref: "#/components/schemas/ListBlock" },
            { $ref: "#/components/schemas/ImageBlock" },
            { $ref: "#/components/schemas/NoteBlock" },
            { $ref: "#/components/schemas/QaBlock" },
          ],
          discriminator: {
            propertyName: "type",
            mapping: {
              paragraph: "#/components/schemas/ParagraphBlock",
              heading: "#/components/schemas/HeadingBlock",
              quote: "#/components/schemas/QuoteBlock",
              list: "#/components/schemas/ListBlock",
              image: "#/components/schemas/ImageBlock",
              note: "#/components/schemas/NoteBlock",
              qa: "#/components/schemas/QaBlock",
            },
          },
          description: "Salah satu dari 7 tipe blok konten tervalidasi (tanpa HTML mentah).",
        },
        SourceReference: {
          type: "object",
          required: ["title", "url"],
          properties: {
            title: {
              type: "string",
              minLength: 3,
              maxLength: 300,
              description: "Nama atau judul dokumen rujukan.",
            },
            publisher: {
              type: "string",
              maxLength: 200,
              description: "Penerbit, lembaga, atau media asal rujukan.",
            },
            url: {
              type: "string",
              format: "uri",
              maxLength: 2000,
              description: "Tautan http:// atau https:// ke sumber yang dapat diperiksa redaksi.",
            },
            sourceType: {
              type: "string",
              enum: SOURCE_TYPES,
              default: "SECONDARY",
            },
            publishedAt: {
              type: "string",
              maxLength: 40,
              description: "Tanggal terbit dokumen dalam format ISO 8601: YYYY-MM-DD atau YYYY-MM-DDTHH:mm:ssZ.",
            },
            accessedAt: {
              type: "string",
              maxLength: 40,
              description: "Tanggal akses dokumen oleh agen dalam format ISO 8601: YYYY-MM-DD atau YYYY-MM-DDTHH:mm:ssZ.",
            },
            supports: {
              type: "string",
              maxLength: 600,
              description: "Klaim atau data spesifik beserta bagian dokumen (pasal/halaman) yang didukung sumber ini.",
            },
            isKeySource: {
              type: "boolean",
              default: false,
              description: "Usulan penanda sumber kunci. Seluruh sumber tetap masuk dengan verificationStatus UNVERIFIED hingga diperiksa penyunting.",
            },
          },
        },
        ImageMetadata: {
          type: "object",
          required: ["url"],
          properties: {
            url: {
              type: "string",
              maxLength: 2000,
              description: "URL http(s) atau path aset lokal yang diawali /.",
            },
            creator: {
              type: "string",
              maxLength: 200,
              description: "Pembuat, instansi pemilik aset, atau fotografer.",
            },
            license: {
              type: "string",
              maxLength: 200,
              description: "Lisensi penggunaan hak cipta (sertakan keterangan sintetis AI bila merupakan ilustrasi konseptual non-dokumenter).",
            },
            permissionEvidence: {
              type: "string",
              maxLength: 600,
              description: "Bukti izin atau rujukan ketentuan lisensi penggunaan aset visual.",
            },
            caption: {
              type: "string",
              maxLength: 500,
              description: "Keterangan gambar faktual yang jujur termasuk keterangan ilustrasi sintetis jika relevan.",
            },
          },
        },
        IngestionPayload: {
          type: "object",
          required: [
            "title",
            "desk",
            "format",
            "content",
            "sources",
            "aiInvolvement",
            "agentId",
            "idempotencyKey",
          ],
          description:
            `Payload pengiriman draf artikel dari Agen AI. Tidak menerima pengajuan bidang byline bebas; sistem menyetel penanda byline sementara '${AI_PLACEHOLDER_BYLINE}' sampai ditelaah dan ditetapkan editor manusia sebelum terbit.`,
          properties: {
            title: {
              type: "string",
              minLength: 8,
              maxLength: 200,
              description: "Judul naskah jurnalistik.",
            },
            deck: {
              type: "string",
              maxLength: 400,
              description: "Ringkasan naskah pendukung judul. Opsional saat intake awal, tetapi WAJIB ada sebelum editor menyetujui publikasi (GATE_NO_DECK).",
            },
            desk: {
              type: "string",
              minLength: 1,
              maxLength: 60,
              description: "Slug desk aktif (periksa daftar aktif via GET /api/internal/v1/capabilities atau GET /editorial/manifest.json).",
            },
            format: {
              type: "string",
              enum: INGESTION_ALLOWED_FORMATS,
              description:
                "Format aktif pada Ingestion API (OPINION, ANALYSIS, EXPLAINER, serta FEATURE/INTERVIEW secara bersyarat). Format NEWS sementara ditahan fail-closed (HTTP 422 FORMAT_PENDING_AUTHORIZATION) hingga pengesahan Pemimpin Redaksi.",
            },
            content: {
              type: "array",
              items: { $ref: "#/components/schemas/ContentBlock" },
              minItems: 1,
              maxItems: 300,
              description: "Isi naskah berupa array blok terstruktur (maksimal 300 blok).",
            },
            sources: {
              type: "array",
              items: { $ref: "#/components/schemas/SourceReference" },
              minItems: 1,
              maxItems: 40,
              description: "Daftar rujukan sumber faktual yang dapat diakses redaksi.",
            },
            images: {
              type: "array",
              items: { $ref: "#/components/schemas/ImageMetadata" },
              maxItems: 20,
            },
            tags: {
              type: "array",
              items: { type: "string", minLength: 2, maxLength: 40 },
              maxItems: 10,
            },
            verificationNotes: {
              type: "string",
              maxLength: 3000,
              description: "Catatan langkah verifikasi, batasan bukti, dan celah informasi. Wajib diisi minimal 20 karakter untuk format bersyarat FEATURE dan INTERVIEW.",
            },
            aiInvolvement: {
              type: "string",
              enum: AI_INVOLVEMENTS,
              description: "Deklarasi jujur tingkat keterlibatan model AI.",
            },
            aiUsageNote: {
              type: "string",
              maxLength: 1000,
              description:
                "Penjelasan peran AI dalam riset/penyusunan naskah. Tidak diperlukan bila aiInvolvement=none; opsional untuk assistive; sangat dianjurkan saat substantive. Batas validator API saat ini 1.000 karakter, tetapi disarankan ringkas <= 600 karakter agar selaras dengan batas catatan publik redaksi.",
            },
            agentId: {
              type: "string",
              minLength: 2,
              maxLength: 120,
              description: "Pengidentifikasi unik agen pemroses.",
            },
            idempotencyKey: {
              type: "string",
              minLength: 8,
              maxLength: 128,
              description: "Kunci idempoten persisten dan unik per pengiriman untuk mencegah duplikasi draf.",
            },
          },
        },
        SubmissionReceipt: {
          type: "object",
          required: [
            "submissionId",
            "articleId",
            "submissionStatus",
            "articleStatus",
            "status",
            "receivedAt",
            "idempotentReplay",
          ],
          properties: {
            submissionId: { type: "string" },
            articleId: { type: "string" },
            submissionStatus: {
              type: "string",
              enum: ["SUBMITTED", "EDITORIAL_REVIEW", "RESOLVED"],
              description: "Status tanda terima pengiriman pada antrean redaksi (selalu SUBMITTED saat pertama masuk).",
            },
            articleStatus: {
              type: "string",
              enum: ARTICLE_STATUSES,
              description: "Status siklus hidup artikel di ruang redaksi (selalu DRAFT saat pengiriman pertama).",
            },
            status: {
              type: "string",
              enum: ["SUBMITTED", "EDITORIAL_REVIEW", "RESOLVED"],
              description: "Bidang kompatibilitas yang mencerminkan submissionStatus secara konsisten pada 201 Created dan 200 idempotentReplay.",
            },
            receivedAt: { type: "string", format: "date-time" },
            idempotentReplay: { type: "boolean" },
            requestId: { type: "string" },
          },
        },
        ValidationResponse: {
          type: "object",
          required: ["valid"],
          properties: {
            valid: { type: "boolean" },
            desk: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                slug: { type: "string" },
              },
            },
            warnings: {
              type: "array",
              items: { type: "string" },
            },
            requestId: { type: "string" },
          },
        },
        SubmissionStatusResponse: {
          type: "object",
          required: [
            "submissionId",
            "articleId",
            "submissionStatus",
            "articleStatus",
            "editorialStatus",
            "format",
            "title",
            "receivedAt",
            "lastUpdatedAt",
            "editorialDecision",
          ],
          properties: {
            submissionId: { type: "string" },
            articleId: { type: "string" },
            submissionStatus: {
              type: "string",
              enum: ["SUBMITTED", "EDITORIAL_REVIEW", "RESOLVED"],
              description: "Status pemrosesan antrean submission API.",
            },
            articleStatus: {
              type: "string",
              enum: ARTICLE_STATUSES,
              description: "Status siklus hidup artikel aktual di ruang redaksi.",
            },
            editorialStatus: {
              type: "string",
              enum: ARTICLE_STATUSES,
              description: "Alias status editorial artikel di ruang redaksi.",
            },
            format: {
              type: "string",
              enum: ARTICLE_FORMATS,
            },
            title: { type: "string" },
            receivedAt: { type: "string", format: "date-time" },
            lastUpdatedAt: { type: "string", format: "date-time" },
            idempotencyKey: { type: "string", nullable: true },
            editorialDecision: {
              type: "object",
              required: ["status", "isPublished"],
              properties: {
                status: { type: "string", enum: ARTICLE_STATUSES },
                isPublished: { type: "boolean" },
              },
            },
            requestId: { type: "string" },
          },
        },
        ErrorResponse: {
          type: "object",
          required: ["error", "code", "requestId"],
          properties: {
            error: { type: "string" },
            code: {
              type: "string",
              enum: [
                "MALFORMED_JSON",
                "UNAUTHORIZED",
                "CREDENTIAL_REVOKED",
                "CREDENTIAL_EXPIRED",
                "CLIENT_INACTIVE",
                "FORBIDDEN_SCOPE",
                "NOT_FOUND",
                "EDITORIAL_DOCUMENT_NOT_FOUND",
                "DESK_NOT_FOUND",
                "FORMAT_NOT_FOUND",
                "METHOD_NOT_ALLOWED",
                "IDEMPOTENCY_CONFLICT",
                "VALIDATION_ERROR",
                "FORMAT_REJECTED",
                "DESK_REJECTED",
                "RATE_LIMITED",
                "INTERNAL_ERROR",
              ],
            },
            requestId: { type: "string" },
            standardId: { type: "string" },
            semanticVersion: { type: "string" },
            standardStatus: { type: "string" },
            isBindingEffectivePolicy: { type: "boolean" },
            details: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  path: { type: "string" },
                  code: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
            warnings: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      },
    },
    paths: {
      "/api/internal/v1/ai-submissions": {
        post: {
          summary: "Kirim naskah artikel baru",
          description:
            "Menerima naskah artikel dari agen kecerdasan buatan (rate limit 12 permintaan per menit per klien). Status awal naskah selalu DRAFT dan rujukan sumber selalu berstatus UNVERIFIED hingga ditelaah oleh penyunting meja redaksi.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/IngestionPayload" },
              },
            },
          },
          responses: {
            "201": {
              description: "Naskah berhasil diterima sebagai draf awal.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SubmissionReceipt" },
                },
              },
            },
            "200": {
              description: "Replay idempoten dari naskah yang sudah diterima sebelumnya.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SubmissionReceipt" },
                },
              },
            },
            "400": {
              description: "Payload bukan JSON yang valid (MALFORMED_JSON).",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "401": {
              description: "Autentikasi gagal (UNAUTHORIZED, CREDENTIAL_REVOKED, CREDENTIAL_EXPIRED, CLIENT_INACTIVE, atau FORBIDDEN_SCOPE).",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "405": error405Response,
            "409": {
              description: "Bentrok idempotency key dengan payload yang berbeda.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "422": {
              description:
                "Validasi skema, tanggal ISO, format (termasuk FORMAT_PENDING_AUTHORIZATION untuk NEWS dan FORMAT_PRECONDITION_FAILED untuk FEATURE/INTERVIEW), atau desk gagal.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "429": {
              description: "Batas laju pengiriman terlampaui (12/menit).",
              headers: { "Retry-After": { schema: { type: "string" } } },
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "500": {
              description: "Gangguan internal server.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
          },
        },
      },
      "/api/internal/v1/ai-submissions/validate": {
        post: {
          summary: "Uji validitas payload tanpa persistensi (Dry Run)",
          description:
            "Memvalidasi struktur dan konten naskah sebelum pengiriman sungguhan (rate limit 30 permintaan per menit per klien). Tidak membuat rekaman di basis data.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/IngestionPayload" },
              },
            },
          },
          responses: {
            "200": {
              description: "Payload valid dan siap dikirim.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ValidationResponse" } } },
            },
            "400": {
              description: "Payload bukan JSON yang valid (MALFORMED_JSON).",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "401": {
              description: "Autentikasi gagal (UNAUTHORIZED, CREDENTIAL_REVOKED, CREDENTIAL_EXPIRED, CLIENT_INACTIVE, atau FORBIDDEN_SCOPE).",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "405": error405Response,
            "422": {
              description: "Terdapat kesalahan skema atau prasyarat format pada payload.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "429": {
              description: "Batas laju validasi terlampaui (30/menit).",
              headers: { "Retry-After": { schema: { type: "string" } } },
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "500": {
              description: "Gangguan internal server.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
          },
        },
      },
      "/api/internal/v1/ai-submissions/{submissionId}": withHeadFromGet({
        get: {
          summary: "Periksa status pemrosesan naskah",
          description:
            "Mengambil status antrean submission serta status editorial artikel milik klien pengirim. Catatan telaah internal ruang redaksi dan endpoint kirim revisi AI belum diekspos melalui API publik ini.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "submissionId",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Pengidentifikasi unik submission.",
            },
          ],
          responses: {
            "200": {
              description: "Status naskah berhasil ditemukan.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/SubmissionStatusResponse" } } },
            },
            "401": {
              description: "Autentikasi gagal (UNAUTHORIZED, CREDENTIAL_REVOKED, CREDENTIAL_EXPIRED, CLIENT_INACTIVE, atau FORBIDDEN_SCOPE).",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "404": {
              description: "Naskah tidak ditemukan dalam akun integrasi pemohon.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "405": error405Response,
            "500": {
              description: "Gangguan internal server.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
          },
        },
      }),
      "/api/internal/v1/capabilities": withHeadFromGet({
        get: {
          summary: "Informasi metadata kapabilitas sistem dan standar editorial",
          description:
            "Menyajikan daftar desk aktif, format yang diizinkan vs ditahan/bersyarat, batas ukuran pengiriman, status standar editorial (PROPOSED), serta pemisahan kebijakan antarjalur.",
          responses: {
            "200": { description: "Metadata kapabilitas sistem." },
            "405": error405Response,
            "500": {
              description: "Gangguan internal server.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
          },
        },
      }),
      "/editorial/manifest.json": withHeadFromGet({
        get: {
          summary: "Manifest basis pengetahuan editorial modular (Status: PROPOSED)",
          description:
            "Menyajikan daftar modul inti universal (Layer A), profil desk aktif terurut (Layer B), profil format (Layer C), dokumen operasional, status persetujuan (PROPOSED / pratinjau non-mengikat), serta tautan resolver konteks selektif.",
          parameters: [
            conditionalIfNoneMatchParam,
            {
              name: "output",
              in: "query",
              required: false,
              schema: { type: "string", enum: ["json"], default: "json" },
              description: "Endpoint manifest hanya mendukung format json (nilai lain mengembalikan 422 VALIDATION_ERROR).",
            },
          ],
          responses: {
            "200": { description: "Manifest standar editorial Verax Press (JSON)." },
            "304": response304,
            "405": error405Response,
            "422": error422SchemaRef,
          },
        },
      }),
      "/editorial/core": withHeadFromGet({
        get: {
          summary: "Bundel identitas dan prinsip universal Verax Press (Layer A)",
          parameters: [
            conditionalIfNoneMatchParam,
            {
              name: "mode",
              in: "query",
              required: false,
              schema: { type: "string", enum: ["full", "compact"], default: "full" },
              description: "Mode full (seluruh 5 modul inti) atau compact (ringkasan terlacak).",
            },
            outputQueryParameter,
          ],
          responses: {
            "200": { description: "Dokumen Layer A (text/markdown atau application/json)." },
            "304": response304,
            "405": error405Response,
            "422": error422SchemaRef,
          },
        },
      }),
      "/editorial/core/{slug}": withHeadFromGet({
        get: {
          summary: "Satu modul prinsip universal Verax Press (Layer A)",
          parameters: [
            conditionalIfNoneMatchParam,
            {
              name: "slug",
              in: "path",
              required: true,
              schema: { type: "string", enum: ["identity", "principles", "verification", "ethics", "language"] },
            },
            outputQueryParameter,
          ],
          responses: {
            "200": { description: "Modul inti tunggal." },
            "304": response304,
            "404": { description: "Slug modul inti tidak ditemukan." },
            "405": error405Response,
            "422": error422SchemaRef,
          },
        },
      }),
      "/editorial/desks/{slug}": withHeadFromGet({
        get: {
          summary: "Profil satu desk editorial aktif (Layer B)",
          parameters: [
            conditionalIfNoneMatchParam,
            { name: "slug", in: "path", required: true, schema: { type: "string" } },
            outputQueryParameter,
          ],
          responses: {
            "200": { description: "Profil desk aktif." },
            "304": response304,
            "404": { description: "Slug desk tidak dikenal dalam manifest standar (DESK_NOT_FOUND)." },
            "405": error405Response,
            "422": { description: "Desk dikenal dalam manifest tetapi tidak aktif di sistem (DESK_REJECTED), atau nilai parameter output tidak valid (VALIDATION_ERROR)." },
          },
        },
      }),
      "/editorial/formats/{format}": withHeadFromGet({
        get: {
          summary: "Profil satu format artikel (Layer C)",
          parameters: [
            conditionalIfNoneMatchParam,
            {
              name: "format",
              in: "path",
              required: true,
              schema: { type: "string", enum: ["news", "analysis", "opinion", "explainer", "feature", "interview"] },
            },
            outputQueryParameter,
          ],
          responses: {
            "200": { description: "Profil format." },
            "304": response304,
            "404": { description: "Format tidak ditemukan." },
            "405": error405Response,
            "422": error422SchemaRef,
          },
        },
      }),
      "/editorial/operations/{slug}": withHeadFromGet({
        get: {
          summary: "Dokumen operasional agen AI, penilaian mutu, checklist review, atau integrasi API",
          parameters: [
            conditionalIfNoneMatchParam,
            {
              name: "slug",
              in: "path",
              required: true,
              schema: { type: "string", enum: ["ai-workflow", "quality-assessment", "review-checklist", "api-integration"] },
            },
            outputQueryParameter,
          ],
          responses: {
            "200": { description: "Dokumen operasional editorial." },
            "304": response304,
            "404": { description: "Dokumen tidak ditemukan." },
            "405": error405Response,
            "422": error422SchemaRef,
          },
        },
      }),
      "/editorial/context": withHeadFromGet({
        get: {
          summary: "Komposer konteks editorial selektif (Layer A + B + C + D)",
          description:
            "Merakit konteks editorial secara selektif: Identitas & Prinsip Universal + satu profil Desk aktif + satu profil Format + parameter konteks penugasan Layer D, tanpa mencampur profil desk atau format lain.",
          parameters: [
            conditionalIfNoneMatchParam,
            { name: "desk", in: "query", required: true, schema: { type: "string" }, description: "Slug desk aktif." },
            {
              name: "format",
              in: "query",
              required: true,
              schema: { type: "string", enum: ARTICLE_FORMATS },
              description: "Kode format. Catatan: NEWS sementara ditahan (422) di channel=INGESTION_API dan dilarang di channel=CONTRIBUTOR.",
            },
            { name: "channel", in: "query", required: false, schema: { type: "string", enum: ["INGESTION_API", "NEWSROOM", "CONTRIBUTOR"], default: "INGESTION_API" } },
            { name: "coreMode", in: "query", required: false, schema: { type: "string", enum: ["compact", "full"], default: "compact" } },
            outputQueryParameter,
            { name: "topic", in: "query", required: false, schema: { type: "string" } },
            { name: "mainEditorialQuestion", in: "query", required: false, schema: { type: "string" } },
            { name: "intendedAudience", in: "query", required: false, schema: { type: "string" } },
            { name: "proposedAngle", in: "query", required: false, schema: { type: "string" } },
            { name: "availableSources", in: "query", required: false, schema: { type: "string" } },
            { name: "currentnessAndChronology", in: "query", required: false, schema: { type: "string" } },
            { name: "geographicInstitutionalContext", in: "query", required: false, schema: { type: "string" } },
            { name: "requestedDepth", in: "query", required: false, schema: { type: "string" } },
            { name: "knownInformationGaps", in: "query", required: false, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Bundel konteks editorial selektif (status PROPOSED / non-mengikat)." },
            "304": response304,
            "405": error405Response,
            "422": { description: "Desk/format tidak valid, tidak aktif, ditahan sementara, atau parameter output/mode tidak valid." },
          },
        },
      }),
    },
  };
}

export function getWellKnownAgentMetadata(baseUrlOverride?: string) {
  const baseUrl = baseUrlOverride || getPublicBaseUrl();

  return {
    platform: "Verax Press",
    description:
      "Platform jurnalisme digital independen (nama kerja percontohan, moto Ex Fontibus Veritas) berbasis verifikasi sumber primer dan pengendalian editorial penuh oleh editor manusia.",
    apiVersion: "1.0.0",
    baseUrl,
    documentationUrl: `${baseUrl}/developers`,
    openApiUrl: `${baseUrl}/openapi.json`,
    llmsTxtUrl: `${baseUrl}/llms.txt`,
    llmsFullTxtUrl: `${baseUrl}/llms-full.txt`,
    capabilitiesUrl: `${baseUrl}/api/internal/v1/capabilities`,
    editorialStandard: {
      standardId: "VERAX-EDITORIAL-AI",
      semanticVersion: "1.0.0",
      status: "PROPOSED",
      effectiveDate: null,
      isBindingEffectivePolicy: false,
      approvalNotice:
        "Usulan standar editorial v1.0.0 berstatus PROPOSED (pratinjau teknis non-mengikat menunggu pengesahan CHIEF_EDITOR).",
      manifestUrl: `${baseUrl}/editorial/manifest.json`,
      coreBundleUrl: `${baseUrl}/editorial/core`,
      contextResolverUrl: `${baseUrl}/editorial/context`,
      contextTemplate: `${baseUrl}/editorial/context?desk={deskSlug}&format={FORMAT}&channel=INGESTION_API&coreMode=compact`,
    },
    authentication: {
      type: "bearer",
      format: "<CLIENT_ID>.<CLIENT_SECRET>",
      header: "Authorization",
    },
    endpoints: {
      submission: `${baseUrl}/api/internal/v1/ai-submissions`,
      validation: `${baseUrl}/api/internal/v1/ai-submissions/validate`,
      submissionStatus: `${baseUrl}/api/internal/v1/ai-submissions/{submissionId}`,
      capabilities: `${baseUrl}/api/internal/v1/capabilities`,
      editorialManifest: `${baseUrl}/editorial/manifest.json`,
      editorialCore: `${baseUrl}/editorial/core`,
      editorialContext: `${baseUrl}/editorial/context`,
    },
    constraints: {
      publicationRight: false,
      autoPublish: false,
      initialStatus: "DRAFT",
      initialSubmissionStatus: "SUBMITTED",
      initialSourceVerificationStatus: "UNVERIFIED",
      placeholderByline: AI_PLACEHOLDER_BYLINE,
      revisionSubmission: false,
      revisionFeedbackExposure: false,
      disallowedFormats: INGESTION_PENDING_FORMATS,
      pendingAuthorizationFormats: INGESTION_PENDING_FORMATS,
      conditionalFormats: Object.keys(INGESTION_CONDITIONAL_FORMAT_RULES),
      conditionalFormatRules: INGESTION_CONDITIONAL_FORMAT_RULES,
      allowedFormats: INGESTION_ALLOWED_FORMATS,
      contentBlockTypes: [...ALL_BLOCK_TYPES],
    },
    policySeparation: {
      contributorAllowedFormats: CONTRIBUTOR_ALLOWED_FORMATS,
      contributorDisallowedFormats: ["NEWS"],
      ingestionAllowedFormats: INGESTION_ALLOWED_FORMATS,
      ingestionPendingAuthorizationFormats: INGESTION_PENDING_FORMATS,
      ingestionConditionalFormats: Object.keys(INGESTION_CONDITIONAL_FORMAT_RULES),
    },
  };
}

// CATATAN PENTING: /llms.txt dan /llms-full.txt TIDAK BOLEH mengandung "--" atau "---" ataupun em dash "—"
// sesuai assertions integritas tanda pisah di tests/developer-portal.test.ts.

export function getLlmsTxt(baseUrlOverride?: string): string {
  const baseUrl = baseUrlOverride || getPublicBaseUrl();

  return `# Verax Press AI Agent Integration & Editorial Standards Summary

> Verax Press adalah media jurnalisme digital independen percontohan (Ex Fontibus Veritas) yang berpegang pada pembuktian sumber primer, transparansi AI, dan persetujuan mutlak editor manusia (CHIEF_EDITOR).

## Tautan Penemuan Mesin & Standar Editorial
- Base URL Aktif: ${baseUrl}
- Dokumentasi Lengkap Teknis: ${baseUrl}/llms-full.txt
- Dokumentasi Pengembang Web: ${baseUrl}/developers
- Spesifikasi OpenAPI 3.1.0: ${baseUrl}/openapi.json
- Metadata Penemuan Agen: ${baseUrl}/.well-known/verax-agent.json
- Kapabilitas Sistem Live: ${baseUrl}/api/internal/v1/capabilities
- Manifest Standar Editorial (Status PROPOSED): ${baseUrl}/editorial/manifest.json
- Bundel Prinsip Universal (Layer A): ${baseUrl}/editorial/core
- Resolver Konteks Selektif (Layer A + B + C + D): ${baseUrl}/editorial/context?desk={deskSlug}&format={FORMAT}&channel=INGESTION_API

## Status Persetujuan Standar Editorial
- Standar VERAX-EDITORIAL-AI v1.0.0 berstatus PROPOSED (effectiveDate: null, isBindingEffectivePolicy: false).
- Standar ini tersedia untuk pratinjau terstruktur dan uji coba integrasi, bukan kebijakan editorial yang telah disahkan sebagai aturan final mengikat sampai mendapat persetujuan CHIEF_EDITOR.

## Pemilihan Konteks Selektif (Hindari Memuat Seluruh Korpus)
1. Panggil GET ${baseUrl}/api/internal/v1/capabilities atau GET ${baseUrl}/editorial/manifest.json untuk melihat daftar desk aktif dan format sah.
2. Panggil GET ${baseUrl}/editorial/context?desk=<slug>&format=<FORMAT>&channel=INGESTION_API&coreMode=compact (tambahkan parameter query opsional topik/penugasan) agar agen hanya menerima prinsip universal Verax, profil satu desk tujuan, dan profil satu format tujuan.

## Protokol Autentikasi
Authorization: Bearer <CLIENT_ID>.<CLIENT_SECRET>
Content-Type: application/json

Kredensial integrasi berlingkup kirim-saja (submit-only) diterbitkan dan dicabut oleh Pemimpin Redaksi melalui Studio Verax Press.

## Titik Akhir Utama API
1. Validasi Draf (Dry Run, 30/menit):
   POST ${baseUrl}/api/internal/v1/ai-submissions/validate
2. Pengiriman Draf Naskah (12/menit):
   POST ${baseUrl}/api/internal/v1/ai-submissions
3. Pemantauan Status Pengiriman:
   GET ${baseUrl}/api/internal/v1/ai-submissions/{submissionId}

## Batasan dan Pemisahan Kebijakan Jalur
1. Tanpa Hak Publikasi Mandiri: Tidak ada endpoint publikasi atau persetujuan bagi Agen AI. Seluruh naskah masuk berstatus DRAFT dan seluruh sumber rujukan otomatis berstatus UNVERIFIED.
2. Kendali Manusia: Hanya CHIEF_EDITOR manusia yang dapat menandai sumber terverifikasi dan menyetujui publikasi setelah melewati enam gerbang server.
3. Blok Konten Valid: Mendukung 7 tipe blok (paragraph, heading level 2/3, quote, list dengan style wajib "bullet"|"number", image, note, qa).
4. Pemisahan Jalur Kebijakan:
   - Kontributor Eksternal Manusia (/kirim-tulisan): Menerima 5 format (OPINION, ANALYSIS, EXPLAINER, FEATURE, INTERVIEW); NEWS ditutup bagi kontributor luar; AI hanya sebagai alat bantu teknis.
   - Agen AI via Ingestion API (/developers): Mendukung OPINION, ANALYSIS, EXPLAINER serta FEATURE dan INTERVIEW secara bersyarat (wajib rujukan sumber peliputan/wawancara spesifik dan verificationNotes >= 20 karakter). Format NEWS ditahan sementara (HTTP 422 FORMAT_PENDING_AUTHORIZATION) hingga otorisasi Pemimpin Redaksi. Seluruh draf masuk sebagai DRAFT, submissionStatus SUBMITTED, sumber UNVERIFIED, dan byline sementara menunggu penetapan editor manusia (GATE_BYLINE_UNCONFIRMED).
5. Revisi dan Catatan Redaksi: Endpoint pengiriman ulang revisi oleh AI dan pembacaan catatan telaah internal redaksi belum diekspos melalui API publik; lihat /editorial/operations/api-integration untuk rincian teknis.
6. Verifikasi Integritas dan Cache: Setiap dokumen editorial mendukung header ETag / If-None-Match (HTTP 304) serta checksum SHA-256 UTF-8 dengan akhiran baris LF atas isi bodyMarkdown.
`;
}

export function getLlmsFullTxt(baseUrlOverride?: string): string {
  const baseUrl = baseUrlOverride || getPublicBaseUrl();

  return `# Dokumentasi Lengkap Integrasi Agen AI Verax Press

Dokumen ini menyediakan spesifikasi teknis dan panduan penemuan standar editorial bagi agen kecerdasan buatan yang berintegrasi dengan Verax Press.

## 1. Identitas Sistem, Otoritas Editorial, dan Status Kelembagaan

Verax Press adalah platform jurnalisme digital independen percontohan (moto Ex Fontibus Veritas). Integritas pemberitaan bertumpu pada verifikasi sumber primer yang dapat diuji publik dan kendali keputusan terbit mutlak di tangan editor manusia (CHIEF_EDITOR).
- Pengiriman melalui API merupakan usulan draf awal (DRAFT), bukan persetujuan penerbitan dan bukan layanan penerbitan mandiri.
- Seluruh klaim faktual wajib bertumpu pada sumber rujukan primer atau dokumen sah yang benar-benar terbaca dan dapat diperiksa oleh penyunting meja redaksi.
- Standar editorial modular VERAX-EDITORIAL-AI v1.0.0 saat ini berstatus PROPOSED (effectiveDate: null, isBindingEffectivePolicy: false) sebagai pratinjau kerja yang belum disahkan secara resmi.

## 2. Basis Pengetahuan Editorial Modular (Hanya-Baca)

Agen AI disarankan tidak mengunduh seluruh repositori. Gunakan endpoint terstruktur berikut sesuai kebutuhan:
- Manifest Editorial JSON (Status PROPOSED): GET ${baseUrl}/editorial/manifest.json
- Bundel Prinsip & Identitas Universal (Layer A): GET ${baseUrl}/editorial/core (mendukung ?mode=compact|full dan ?output=markdown|json)
- Modul Universal Tunggal: GET ${baseUrl}/editorial/core/{identity|principles|verification|ethics|language}
- Profil Satu Desk Aktif (Layer B): GET ${baseUrl}/editorial/desks/{hukum-keadilan|teknologi-kebijakan|nasional-publik}
- Profil Satu Format (Layer C): GET ${baseUrl}/editorial/formats/{news|analysis|opinion|explainer|feature|interview}
- Dokumen Operasional & Kontrak Teknis: GET ${baseUrl}/editorial/operations/{ai-workflow|quality-assessment|review-checklist|api-integration}
- Resolver Konteks Selektif Empat Lapis (Layer A + B + C + D):
  GET ${baseUrl}/editorial/context?desk={deskSlug}&format={FORMAT}&channel=INGESTION_API&coreMode=compact
  Parameter penugasan Layer D opsional: topic, mainEditorialQuestion, intendedAudience, proposedAngle, availableSources, currentnessAndChronology, geographicInstitutionalContext, requestedDepth, knownInformationGaps, serta output=json|markdown|md.
- Cache & Verifikasi Checksum: Semua endpoint /editorial/* mendukung header If-None-Match (mengembalikan 304 Not Modified dengan header Vary: Accept dan ETag). Nilai checksum.sha256 dihitung atas UTF-8 bodyMarkdown yang dinormalisasi akhiran baris LF (\\n), dan tersedia di JSON maupun frontmatter YAML.

## 3. Autentikasi, Lingkungan, dan Pemisahan Jalur

Format header HTTP wajib:
Authorization: Bearer <CLIENT_ID>.<CLIENT_SECRET>
Content-Type: application/json

Lingkungan:
- Base URL Aktif Saat Ini: ${baseUrl}
- Alamat Loopback Lokal Resmi: http://localhost:3000 dan http://127.0.0.1:3000
- Production (lingkungan terpisah, kredensial terpisah): https://veraxpress.vercel.app

Pemisahan Kebijakan Jalur Pengiriman:
- Ruang Redaksi Internal (NEWSROOM): Mengelola seluruh 6 format menuju verifikasi dan persetujuan CHIEF_EDITOR.
- Kontributor Eksternal Manusia (CONTRIBUTOR via /kirim-tulisan): Diizinkan mengajukan 5 format (OPINION, ANALYSIS, EXPLAINER, FEATURE, INTERVIEW); NEWS ditutup bagi kontributor luar. AI hanya boleh sebagai alat bantu teknis dengan pengungkapan wajib.
- Agen AI Eksternal (INGESTION_API via /developers): Kredensial bersifat kirim-saja (submit-only). Saat standar berstatus PROPOSED, format aktif adalah OPINION, ANALYSIS, EXPLAINER, serta FEATURE dan INTERVIEW secara bersyarat (422 FORMAT_PRECONDITION_FAILED bila tanpa rujukan wawancara/peliputan nyata dan verificationNotes >= 20 karakter); format NEWS sementara ditahan fail-closed (422 FORMAT_PENDING_AUTHORIZATION). Draf selalu masuk berstatus articleStatus DRAFT, submissionStatus SUBMITTED, sumber UNVERIFIED, dan placeholder byline "${AI_PLACEHOLDER_BYLINE}" sampai ditetapkan editor manusia.

## 4. Spesifikasi Skema Payload Naskah (IngestionPayload)

Payload dikirimkan dalam format JSON dengan bidang berikut:

### Bidang Wajib
- title (string, 8 sampai 200 karakter): Judul naskah jurnalistik yang akurat dan terukur.
- desk (string, 1 sampai 60 karakter): Slug desk aktif pada basis data (cek via /api/internal/v1/capabilities).
- format (string): Format aktif OPINION, ANALYSIS, EXPLAINER, FEATURE, atau INTERVIEW (NEWS sementara ditahan 422 pada jalur AI hingga disahkan Pemimpin Redaksi).
- content (array of ContentBlock, minimal 1 blok, maksimal 300 blok): Isi tulisan terstruktur tanpa HTML mentah.
- sources (array of SourceReference, minimal 1 sumber, maksimal 40 sumber): Daftar rujukan faktual yang dapat diakses.
- aiInvolvement (string): Tingkat keterlibatan model AI, salah satu dari none, assistive, substantive.
- agentId (string, 2 sampai 120 karakter): Pengidentifikasi unik agen pengirim.
- idempotencyKey (string, 8 sampai 128 karakter): Kunci unik persisten per pengiriman untuk mencegah duplikasi draf.

### Bidang Opsional (Dengan Catatan Penting)
- deck (string, maksimal 400 karakter): Ringkasan naskah. Opsional di intake awal, tetapi WAJIB ada sebelum publikasi (GATE_NO_DECK).
- images (array of ImageMetadata, maksimal 20 aset): url (http(s) atau path lokal /...), creator, license, permissionEvidence, caption. Catatan: bidang boolean isSynthetic belum tersedia di API ingestion, sehingga sifat ilustrasi sintetis AI wajib dicatat jujur pada license dan caption.
- tags (array of string, maksimal 10 tag, tiap tag 2 sampai 40 karakter): Disimpan pada rekaman pengiriman untuk kurasi redaksi.
- verificationNotes (string, maksimal 3000 karakter): Catatan metode pengujian fakta dan daftar celah informasi yang belum terjawab. Wajib minimal 20 karakter untuk format bersyarat FEATURE dan INTERVIEW.
- aiUsageNote (string, maksimal 1000 karakter): Penjelasan peran AI. Tidak diperlukan untuk none, opsional untuk assistive, dan sangat dianjurkan saat substantive (memicu peringatan non-blocking bila kosong). Validator API menerima hingga 1000 karakter, sedangkan penyuntingan catatan publik redaksi dibatasi maksimal 600 karakter sehingga sangat dianjurkan menyusunnya <= 600 karakter dan layak baca publik.

## 5. Struktur 7 Blok Konten yang Valid

Setiap elemen larik content wajib memakai salah satu dari 7 tipe berikut:
1. Paragraph (ParagraphBlock): { "type": "paragraph", "text": "Isi alinea (1..20000 karakter)..." }
2. Heading (HeadingBlock): { "type": "heading", "level": 2, "text": "Subjudul (level wajib 2 atau 3, maks 300 karakter)" }
3. Quote (QuoteBlock): { "type": "quote", "text": "Kutipan verbatim...", "attribution": "Nama Tokoh, Jabatan (opsional)" }
4. List (ListBlock): { "type": "list", "style": "bullet", "items": ["Butir pertama", "Butir kedua"] }
   PENTING: properti style WAJIB bernilai "bullet" atau "number" (1..50 butir, tiap butir 1..2000 karakter).
5. Image (ImageBlock): { "type": "image", "url": "https://contoh.id/foto.jpg", "alt": "...", "caption": "...", "credit": "..." }
6. Note (NoteBlock): { "type": "note", "label": "Catatan Metodologi (opsional)", "text": "Keterangan konteks..." }
7. Q&A (QaBlock): { "type": "qa", "question": "Pertanyaan...", "answer": "Jawaban..." }

## 6. Struktur Sumber Rujukan (SourceReference) & Tanggal ISO 8601

- title (string, 3 sampai 300 karakter): Judul dokumen resmi, putusan, laporan, atau sumber langsung.
- publisher (string, opsional, maks 200 karakter): Penerbit atau lembaga berwenang.
- url (string, URL http:// atau https:// valid, maks 2000 karakter).
- sourceType (string, default SECONDARY): PRIMARY, SECONDARY, DOCUMENT, INTERVIEW, DATA, OFFICIAL.
- publishedAt (string ISO 8601, opsional, maks 40 karakter): Format valid YYYY-MM-DD atau YYYY-MM-DDTHH:mm:ssZ.
- accessedAt (string ISO 8601, opsional, maks 40 karakter): Format valid YYYY-MM-DD atau YYYY-MM-DDTHH:mm:ssZ.
- supports (string, opsional, maks 600 karakter): Klaim spesifik dan rujukan bagian dokumen (pasal/ayat/halaman) yang ditopang.
- isKeySource (boolean, default false): Usulan sumber kunci; tetap masuk sebagai UNVERIFIED hingga diverifikasi penyunting manusia.

## 7. Alur Kerja API & Batasan Saat Ini

1. Panggil GET ${baseUrl}/api/internal/v1/capabilities dan GET ${baseUrl}/editorial/context?desk=<slug>&format=<FORMAT>&channel=INGESTION_API.
2. Uji validitas payload melalui POST ${baseUrl}/api/internal/v1/ai-submissions/validate (rate limit 30 req/menit).
3. Kirim naskah final ke POST ${baseUrl}/api/internal/v1/ai-submissions (rate limit 12 req/menit). Respons mengembalikan submissionStatus ("SUBMITTED"), articleStatus ("DRAFT"), dan status ("SUBMITTED"). Replay dengan idempotencyKey dan payload identik menghasilkan HTTP 200 (idempotentReplay: true); payload berbeda dengan kunci sama menghasilkan HTTP 409 IDEMPOTENCY_CONFLICT.
4. Pantau progres melalui GET/HEAD ${baseUrl}/api/internal/v1/ai-submissions/{submissionId} (memerlukan kepemilikan klien; submissionStatus bernilai SUBMITTED, EDITORIAL_REVIEW, atau RESOLVED; articleStatus dan editorialStatus mengikuti status artikel aktual di ruang redaksi).
5. Catatan keterbatasan: API publik belum menyediakan endpoint untuk mengirim revisi baru dari agen AI ke submission lama ataupun membaca catatan telaah internal redaksi. Sebelum artikel disetujui terbit oleh CHIEF_EDITOR, keenam gerbang keras wajib lolos (GATE_NO_KEY_SOURCES, GATE_SOURCE_VERIFICATION, GATE_EMPTY_CONTENT yang memeriksa teks non-kosong pada paragraph/quote/list/qa, GATE_NO_DECK, GATE_BYLINE_UNCONFIRMED, dan GATE_AI_DISCLOSURE).

## 8. Daftar Kode Status & Galat HTTP Standar

Setiap respons galat mengembalikan JSON berisi error, code, dan requestId (beserta header x-request-id):
- 400 MALFORMED_JSON: Payload bukan JSON yang valid.
- 401 UNAUTHORIZED / CREDENTIAL_REVOKED / CREDENTIAL_EXPIRED / CLIENT_INACTIVE / FORBIDDEN_SCOPE: Autentikasi Bearer gagal, dicabut, kedaluwarsa, atau tanpa lingkup izin.
- 404 NOT_FOUND / EDITORIAL_DOCUMENT_NOT_FOUND / DESK_NOT_FOUND / FORMAT_NOT_FOUND: Sumber daya tidak ada dalam indeks atau bukan milik klien Anda.
- 405 METHOD_NOT_ALLOWED: Metode HTTP tidak didukung pada endpoint ini (sertakan header Allow dan requestId).
- 409 IDEMPOTENCY_CONFLICT: Idempotency key sudah digunakan sebelumnya untuk payload berbeda.
- 422 VALIDATION_ERROR: Pelanggaran skema payload, parameter kueri (misal ?output atau ?mode tidak valid), format blok konten (misal list.style tidak diisi), atau tanggal non-ISO.
- 422 FORMAT_REJECTED: Format naskah tidak dikenali, ditahan sementara (detail.code: FORMAT_PENDING_AUTHORIZATION untuk NEWS), atau prasyarat bukti peliputan tidak terpenuhi (detail.code: FORMAT_PRECONDITION_FAILED untuk FEATURE/INTERVIEW).
- 422 DESK_REJECTED: Desk tidak aktif di basis data sistem.
- 429 RATE_LIMITED: Batas laju terlampaui (sertakan header Retry-After).
- 500 INTERNAL_ERROR: Gangguan internal server.
`;
}
