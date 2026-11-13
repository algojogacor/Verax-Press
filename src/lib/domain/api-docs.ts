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
        coverageApiKeyBearer: {
          type: "http",
          scheme: "bearer",
          description:
            "Kunci API Verax Editorial Intelligence (VEI) cakupan coverage:read via header: Authorization: Bearer <VERAX_COVERAGE_API_KEY>.",
        },
        coverageApiKeyHeader: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
          description:
            "Kunci API Verax Editorial Intelligence (VEI) cakupan coverage:read via header kustom: X-API-Key: <VERAX_COVERAGE_API_KEY>.",
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
              description: "Larik aset visual alternatif (dipertahankan untuk kompatibilitas ke belakang).",
            },
            imageQuery: {
              type: "string",
              minLength: 2,
              maxLength: 100,
              description:
                "Kata kunci pencarian foto stok berlisensi (Unsplash atau Pexels) yang dieksekusi otomatis oleh server. Kredensial API dikelola privat di server. Jika hasil pencarian nihil, naskah tetap diterima sebagai draf tanpa gambar (bukan galat 500).",
            },
            imageUrl: {
              type: "string",
              maxLength: 2000,
              description:
                "URL gambar langsung apabila agen telah mengantongi tautan aset spesifik. Wajib disertai bidang imageCredit dan imageLicense.",
            },
            imageCredit: {
              type: "string",
              maxLength: 200,
              description:
                "Nama fotografer, pembuat, atau pemegang hak cipta gambar (wajib minimal 2 karakter apabila menyertakan imageUrl).",
            },
            imageLicense: {
              type: "string",
              maxLength: 200,
              description:
                "Lisensi legal gambar, misal 'Unsplash License', 'Pexels License', atau 'CC-BY 4.0' (wajib minimal 2 karakter apabila menyertakan imageUrl).",
            },
            imageCaption: {
              type: "string",
              maxLength: 500,
              description: "Keterangan kontekstual gambar yang layak baca bagi publik.",
            },
            imageIsGeneric: {
              type: "boolean",
              default: true,
              description:
                "Penanda bahwa gambar merupakan foto suasana generik atau ilustratif, bukan dokumentasi peristiwa faktual spesifik (default: true). Gambar stok otomatis ditandai true agar pembaca tidak salah mengira sebagai rekaman kejadian nyata.",
            },
            tags: {
              type: "array",
              items: { type: "string", minLength: 2, maxLength: 40 },
              maxItems: 10,
            },
            verificationNotes: {
              type: "string",
              maxLength: 3000,
              description: "Catatan langkah verifikasi, batasan bukti, dan celah informasi. Wajib diisi minimal 20 karakter untuk format bersyarat FEATURE dan INTERVIEW, serta minimal 80 karakter untuk format NEWS (bila diotorisasi).",
            },
            coverageCheck: {
              type: "object",
              properties: {
                overlapLevel: {
                  type: "string",
                  enum: ["none", "partial", "high"],
                  description: "Tingkat tumpang tindih dari evaluasi coverage check terdahulu.",
                },
                checkedAt: {
                  type: "string",
                  format: "date-time",
                  description: "Waktu pelaksanaan evaluasi kebaruan liputan.",
                },
                newAngleExplanation: {
                  type: "string",
                  maxLength: 1000,
                  description: "Penjelasan sudut pandang baru yang membedakan naskah.",
                },
              },
              required: ["overlapLevel"],
              description: "Objek referensi evaluasi kebaruan liputan terdahulu (wajib untuk format NEWS bila diotorisasi).",
            },
            coverageOverlapLevel: {
              type: "string",
              enum: ["none", "partial", "high"],
              description: "Bidang alternatif untuk referensi tingkat tumpang tindih liputan terdahulu (none, partial, atau high).",
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
        CoverageArticleItem: {
          type: "object",
          required: [
            "id",
            "articleId",
            "slug",
            "title",
            "desk",
            "format",
            "status",
            "topics",
            "entities",
            "centralQuestion",
            "editorialAngle",
            "metadataStatus",
            "publishedAt",
            "canonicalUrl",
          ],
          properties: {
            id: { type: "string", description: "ID internal artikel." },
            articleId: { type: "string", description: "Alias ID artikel." },
            slug: { type: "string", description: "Slug artikel untuk URL kanonik publik." },
            title: { type: "string", description: "Judul artikel terpublikasi." },
            desk: { type: "string", description: "Nama desk editorial." },
            format: { type: "string", description: "Format editorial artikel (misal: ANALYSIS, EXPLAINER)." },
            status: {
              type: "string",
              enum: ["PUBLISHED", "CORRECTED"],
              description: "Status publikasi artikel terbit.",
            },
            topics: {
              type: "array",
              items: { type: "string" },
              description: "Daftar topik editorial artikel.",
            },
            entities: {
              type: "array",
              items: { type: "string" },
              description: "Daftar entitas kunci dalam artikel.",
            },
            centralQuestion: {
              type: ["string", "null"],
              description: "Pertanyaan inti jurnalistik yang dijawab artikel.",
            },
            editorialAngle: {
              type: ["string", "null"],
              description: "Sudut pandang editorial atau fokus peliputan.",
            },
            metadataStatus: {
              type: "string",
              enum: ["unverified", "verified"],
              description: "Status verifikasi metadata editorial.",
            },
            publishedAt: {
              type: ["string", "null"],
              format: "date-time",
              description: "Waktu publikasi resmi dalam format ISO 8601.",
            },
            canonicalUrl: {
              type: "string",
              format: "uri",
              description: "URL kanonik publik artikel di portal Verax Press.",
            },
          },
        },
        CoverageSearchPagination: {
          type: "object",
          required: ["total", "limit", "cursor", "nextCursor", "hasMore"],
          properties: {
            total: { type: "integer", description: "Jumlah total artikel yang cocok." },
            limit: { type: "integer", description: "Batas rekaman per halaman." },
            cursor: { type: ["string", "null"], description: "Cursor halaman saat ini." },
            nextCursor: { type: ["string", "null"], description: "Cursor untuk halaman berikutnya jika ada." },
            hasMore: { type: "boolean", description: "Apakah masih ada halaman berikutnya." },
          },
        },
        CoverageSearchResponse: {
          type: "object",
          required: ["data", "pagination"],
          properties: {
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/CoverageArticleItem" },
              description: "Daftar artikel terpublikasi yang cocok.",
            },
            pagination: { $ref: "#/components/schemas/CoverageSearchPagination" },
          },
        },
        CoverageCheckRequest: {
          type: "object",
          properties: {
            proposedTitle: {
              type: "string",
              description: "Usulan judul naskah yang akan ditulis.",
            },
            topic: {
              oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
              description: "Usulan topik utama.",
            },
            topics: {
              oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
              description: "Daftar usulan topik.",
            },
            centralQuestion: {
              type: "string",
              description: "Pertanyaan inti jurnalistik yang ingin dijawab naskah.",
            },
            proposedAngle: {
              type: "string",
              description: "Sudut pandang pembeda atau hipotesis liputan.",
            },
            entities: {
              oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
              description: "Daftar entitas kunci yang akan dibahas.",
            },
          },
        },
        CoverageMatchItem: {
          type: "object",
          required: [
            "articleId",
            "title",
            "desk",
            "overlapLevel",
            "matchedTopics",
            "matchedEntities",
            "topics",
            "entities",
            "centralQuestion",
            "editorialAngle",
            "metadataStatus",
            "publishedAt",
            "canonicalUrl",
          ],
          properties: {
            articleId: { type: "string", description: "ID artikel yang cocok." },
            title: { type: "string", description: "Judul artikel terpublikasi." },
            desk: { type: "string", description: "Desk editorial artikel." },
            overlapLevel: {
              type: "string",
              enum: ["partial", "high"],
              description: "Tingkat tumpang tindih untuk artikel ini.",
            },
            matchedTopics: {
              type: "array",
              items: { type: "string" },
              description: "Daftar topik yang bertumpang tindih.",
            },
            matchedEntities: {
              type: "array",
              items: { type: "string" },
              description: "Daftar entitas yang bertumpang tindih.",
            },
            topics: {
              type: "array",
              items: { type: "string" },
              description: "Daftar topik lengkap artikel yang cocok.",
            },
            entities: {
              type: "array",
              items: { type: "string" },
              description: "Daftar entitas lengkap artikel yang cocok.",
            },
            centralQuestion: {
              type: ["string", "null"],
              description: "Pertanyaan inti artikel terbit.",
            },
            editorialAngle: {
              type: ["string", "null"],
              description: "Sudut pandang artikel terbit.",
            },
            metadataStatus: {
              type: "string",
              description: "Status metadata artikel terbit.",
            },
            publishedAt: {
              type: ["string", "null"],
              format: "date-time",
              description: "Waktu publikasi resmi.",
            },
            canonicalUrl: {
              type: "string",
              format: "uri",
              description: "URL kanonik artikel terbit.",
            },
          },
        },
        CoverageCheckResponse: {
          type: "object",
          required: ["overlapLevel", "matches"],
          properties: {
            overlapLevel: {
              type: "string",
              enum: ["none", "partial", "high"],
              description:
                "Tingkat tumpang tindih agregat terhadap korpus artikel terbit (none, partial, high).",
            },
            matches: {
              type: "array",
              items: { $ref: "#/components/schemas/CoverageMatchItem" },
              description: "Daftar rincian artikel terbit yang memiliki kecocokan.",
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
              description:
                "Naskah berhasil diterima sebagai draf awal. Jika menyertakan imageQuery yang tidak menghasilkan foto stok yang cocok, naskah tetap diterima sebagai draf tanpa gambar (bukan galat 500).",
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
      "/api/internal/v1/editorial/coverage/search": withHeadFromGet({
        get: {
          summary: "Pencarian riwayat liputan terbit (Verax Editorial Intelligence)",
          description:
            "Mencari artikel terpublikasi berdasarkan kata kunci (judul, topik, entitas, pertanyaan inti, sudut pandang), filter desk, dan rentang tanggal untuk mengecek riwayat liputan sebelum menulis draf baru. Hanya mengembalikan artikel terbit (PUBLISHED/CORRECTED).",
          security: [{ coverageApiKeyBearer: [] }, { coverageApiKeyHeader: [] }],
          parameters: [
            {
              name: "q",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Kata kunci pencarian teks pada judul, topik, entitas, pertanyaan inti, atau sudut pandang editorial.",
            },
            {
              name: "desk",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Slug atau nama desk editorial aktif (misal: hukum-keadilan, teknologi-kebijakan, nasional-publik).",
            },
            {
              name: "from",
              in: "query",
              required: false,
              schema: { type: "string", format: "date" },
              description: "Batas awal tanggal publikasi ISO 8601 (misal: 2026-01-01).",
            },
            {
              name: "to",
              in: "query",
              required: false,
              schema: { type: "string", format: "date" },
              description: "Batas akhir tanggal publikasi ISO 8601 (misal: 2026-12-31).",
            },
            {
              name: "limit",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
              description: "Batas jumlah rekaman per halaman (1 sampai 100). Default: 20.",
            },
            {
              name: "cursor",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Cursor ID artikel untuk paginasi halaman berikutnya.",
            },
          ],
          responses: {
            "200": {
              description: "Daftar artikel terpublikasi yang cocok dengan kueri pencarian.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/CoverageSearchResponse" },
                },
              },
            },
            "400": {
              description: "Parameter kueri atau cursor tidak valid (INVALID_PARAMETER, INVALID_CURSOR).",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "401": {
              description: "Kredensial API coverage diperlukan atau tidak valid (UNAUTHORIZED).",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "403": {
              description: "Kredensial submission dilarang untuk cakupan coverage:read (FORBIDDEN_SCOPE).",
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
      "/api/internal/v1/editorial/coverage/check": {
        post: {
          summary: "Evaluasi tumpang tindih usulan liputan (Novelty Check)",
          description:
            "Mengevaluasi tingkat tumpang tindih usulan topik, entitas, judul, pertanyaan inti, dan sudut pandang editorial terhadap artikel terbit secara deterministik. Mengembalikan overlapLevel (none, partial, high) dan rincian artikel yang relevan tanpa opini rekomendasi tindakan.",
          security: [{ coverageApiKeyBearer: [] }, { coverageApiKeyHeader: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CoverageCheckRequest" },
              },
            },
          },
          responses: {
            "200": {
              description: "Hasil evaluasi tumpang tindih usulan liputan.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/CoverageCheckResponse" },
                },
              },
            },
            "400": {
              description: "Format JSON atau usulan liputan tidak valid (INVALID_JSON, VALIDATION_ERROR).",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "401": {
              description: "Kredensial API coverage diperlukan atau tidak valid (UNAUTHORIZED).",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "403": {
              description: "Kredensial submission dilarang untuk cakupan coverage:read (FORBIDDEN_SCOPE).",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "405": error405Response,
            "500": {
              description: "Gangguan internal server saat mengevaluasi tumpang tindih liputan.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
          },
        },
      },
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
              schema: { type: "string", enum: ["ai-workflow", "quality-assessment", "review-checklist", "api-integration", "vaes"] },
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
      "/editorial/vaes": withHeadFromGet({
        get: {
          summary: "Konstitusi Sistem Editorial Mandiri (VAES v2.0.2)",
          description:
            "Menyajikan konstitusi master protocol sistem editorial mandiri Verax Press (VAES 2.0.2, codename VAES_RESILIENT_TRUTH). Mendukung format Markdown secara default atau JSON melalui parameter ?output=json.",
          parameters: [conditionalIfNoneMatchParam, outputQueryParameter],
          responses: {
            "200": { description: "Konstitusi sistem editorial mandiri VAES v2.0.2." },
            "304": response304,
            "405": error405Response,
            "422": error422SchemaRef,
          },
        },
      }),
      "/editorial/vaes.json": withHeadFromGet({
        get: {
          summary: "Spesifikasi Konstitusi VAES v2.0.2 (JSON)",
          description:
            "Menyajikan spesifikasi definitif JSON protokol VAES v2.0.2 (VAES_RESILIENT_TRUTH) mencakup 9 mentor jurnalistik, 14 target anti-fabrikasi mutlak, matriks swatelaah, dan protokol pemulihan kandidat.",
          parameters: [
            conditionalIfNoneMatchParam,
            {
              name: "output",
              in: "query",
              required: false,
              schema: { type: "string", enum: ["json"] },
              description: "Hanya mendukung json pada endpoint berekstensi .json.",
            },
          ],
          responses: {
            "200": {
              description: "Spesifikasi JSON definitif konstitusi VAES v2.0.2.",
              content: {
                "application/json": {
                  schema: { type: "object" },
                },
              },
            },
            "304": response304,
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
    vaesConstitutionUrl: `${baseUrl}/editorial/vaes`,
    vaesConstitutionJsonUrl: `${baseUrl}/editorial/vaes.json`,
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
      vaesConstitutionUrl: `${baseUrl}/editorial/vaes`,
      vaesConstitutionJsonUrl: `${baseUrl}/editorial/vaes.json`,
    },
    authentication: {
      type: "bearer",
      format: "<CLIENT_ID>.<CLIENT_SECRET>",
      header: "Authorization",
      scopes: {
        submit: {
          description: "Kredensial integrasi pengiriman draf naskah (submit-only). Diterbitkan oleh Pemimpin Redaksi via Studio.",
          format: "Bearer <CLIENT_ID>.<CLIENT_SECRET>",
          header: "Authorization",
        },
        coverageRead: {
          description: "Kunci API Verax Editorial Intelligence untuk pengecekan riwayat liputan dan kebaruan usulan naskah.",
          envVariable: "VERAX_COVERAGE_API_KEY",
          headers: ["Authorization: Bearer <VERAX_COVERAGE_API_KEY>", "X-API-Key: <VERAX_COVERAGE_API_KEY>"],
        },
      },
    },
    endpoints: {
      coverageSearch: `${baseUrl}/api/internal/v1/editorial/coverage/search`,
      coverageCheck: `${baseUrl}/api/internal/v1/editorial/coverage/check`,
      submission: `${baseUrl}/api/internal/v1/ai-submissions`,
      validation: `${baseUrl}/api/internal/v1/ai-submissions/validate`,
      submissionStatus: `${baseUrl}/api/internal/v1/ai-submissions/{submissionId}`,
      capabilities: `${baseUrl}/api/internal/v1/capabilities`,
      editorialManifest: `${baseUrl}/editorial/manifest.json`,
      editorialCore: `${baseUrl}/editorial/core`,
      editorialContext: `${baseUrl}/editorial/context`,
      vaesConstitution: `${baseUrl}/editorial/vaes`,
      vaesConstitutionJson: `${baseUrl}/editorial/vaes.json`,
    },
    capabilities: {
      coverageSearch: true,
      coverageCheck: true,
      submission: true,
      validation: true,
      submissionStatus: true,
      editorialContextResolution: true,
      stockPhotoSearch: true,
      vaesConstitution: true,
      revisionSubmission: false,
      revisionFeedbackExposure: false,
      publication: false,
      editorialApproval: false,
    },
    constraints: {
      publicationRight: false,
      autoPublish: false,
      initialStatus: "DRAFT",
      initialSubmissionStatus: "SUBMITTED",
      initialSourceVerificationStatus: "UNVERIFIED",
      placeholderByline: AI_PLACEHOLDER_BYLINE,
      imageIsGenericDefault: true,
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
- Pencarian Riwayat Liputan: ${baseUrl}/api/internal/v1/editorial/coverage/search
- Evaluasi Tumpang Tindih Usulan: ${baseUrl}/api/internal/v1/editorial/coverage/check
- Manifest Standar Editorial (Status PROPOSED): ${baseUrl}/editorial/manifest.json
- Bundel Prinsip Universal (Layer A): ${baseUrl}/editorial/core
- Resolver Konteks Selektif (Layer A + B + C + D): ${baseUrl}/editorial/context?desk={deskSlug}&format={FORMAT}&channel=INGESTION_API
- Konstitusi Sistem Editorial Mandiri (VAES v2.0.2 Markdown): ${baseUrl}/editorial/vaes
- Spesifikasi Konstitusi VAES v2.0.2 (JSON): ${baseUrl}/editorial/vaes.json

## Konstitusi Sistem Editorial Mandiri (VAES v2.0.2)
Verax Press menyediakan protokol konstitusi definitif bagi agen penyelidik dan penulis AI mandiri:
- Spesifikasi JSON: GET ${baseUrl}/editorial/vaes.json
- Format Markdown: GET ${baseUrl}/editorial/vaes (mendukung ?output=json)
Konstitusi ini mencakup 9 mentor jurnalistik kredibel, 14 target anti-fabrikasi mutlak, matriks swatelaah 4 kuadran, Information Gain rubric, serta protokol pemulihan kandidat (Candidate Recovery Protocol Conditions A, B, C, D) yang mencegah penghentian prematur misi peliputan.

## Status Persetujuan Standar Editorial
- Standar VERAX-EDITORIAL-AI v1.0.0 berstatus PROPOSED (effectiveDate: null, isBindingEffectivePolicy: false).
- Standar ini tersedia untuk pratinjau terstruktur dan uji coba integrasi, bukan kebijakan editorial yang telah disahkan sebagai aturan final mengikat sampai mendapat persetujuan CHIEF_EDITOR.

## Verax Editorial Intelligence (VEI): Wajib Cek Liputan Sebelum Menulis
Sebelum menulis naskah baru, agen wajib memeriksa riwayat liputan terbit agar tidak menghasilkan liputan duplikatif:
1. Pencarian Riwayat Liputan Terbit:
   GET ${baseUrl}/api/internal/v1/editorial/coverage/search?q={keyword}&desk={deskSlug}&limit=20
   Hanya mengembalikan artikel dengan status publikasi sah (PUBLISHED atau CORRECTED).
2. Evaluasi Kebaruan Usulan Liputan (Novelty Check):
   POST ${baseUrl}/api/internal/v1/editorial/coverage/check
   Body: {"proposedTitle": "...", "topic": "...", "centralQuestion": "...", "proposedAngle": "...", "entities": ["..."]}
   Mengembalikan overlapLevel (none, partial, high) dan rincian artikel yang cocok.

Header Autentikasi Coverage (Cakupan coverage:read):
Authorization: Bearer <VERAX_COVERAGE_API_KEY>
atau
X-API-Key: <VERAX_COVERAGE_API_KEY>
Catatan: Kredensial pengiriman (vrtc_...) dilarang mengakses endpoint coverage (HTTP 403 FORBIDDEN_SCOPE).

## Pemilihan Konteks Selektif (Hindari Memuat Seluruh Korpus)
1. Panggil GET ${baseUrl}/api/internal/v1/capabilities atau GET ${baseUrl}/editorial/manifest.json untuk melihat daftar desk aktif dan format sah.
2. Panggil GET ${baseUrl}/editorial/context?desk=<slug>&format=<FORMAT>&channel=INGESTION_API&coreMode=compact (tambahkan parameter query opsional topik/penugasan) agar agen hanya menerima prinsip universal Verax, profil satu desk tujuan, dan profil satu format tujuan.

## Standar Penulisan Anti-AI & Kebijakan Anti-Slop (Wajib Sebelum Pengiriman)
Seluruh naskah yang diajukan oleh agen AI wajib mematuhi standar penulisan anti-AI dan anti-slop Verax Press sebelum dikirimkan ke meja redaksi:
1. Larangan Em Dash dan Tanda Pisah Ganda: Dilarang memakai tanda pisah em dash (U+2014) maupun tanda pisah ganda pada naskah artikel, kecuali berada di dalam kutipan verbatim narasumber atau dokumen resmi autentik. Gunakan koma, titik dua, tanda kurung, atau kalimat terpisah.
2. Kosakata Terlarang (Banned AI Vocabulary): Dilarang menggunakan kosakata klise AI bahasa Inggris (delve, unlock, elevate, empower, harness, foster, streamline, revolutionize, showcase, usher in, spearhead, navigate, transcend, leverage, seamless, cutting-edge, robust, next-level, game-changer, pivotal, testament, tapestry, beacon, paramount, bespoke, multifaceted, crucial, dynamic, journey, landscape sebagai metafora, realm, sphere, arena, horizon) dan bahasa Indonesia (hadir untuk, merevolusi, menjembatani, ekosistem di luar konteks biologi, menjadi bukti nyata, garda terdepan, wadah, wahana, penting untuk dicatat bahwa, tidak hanya... melainkan juga...).
3. Larangan Paralelisme Negatif: Dilarang menggunakan formula perbandingan artifisial seperti 'Bukan sekadar X, melainkan Y' atau 'Bukan hanya X, tapi Y'. Sampaikan fakta dan gagasan secara lugas serta deklaratif.
4. Larangan Aturan Tiga yang Dipaksakan (Forced Rule of Three): Dilarang memaksakan rima tiga kata sifat atau tiga kata benda berirama demi efek retoris semu.
5. Variasi Ritme Kalimat (Burstiness): Naskah wajib memiliki variasi panjang kalimat yang hidup dan wajar. Padukan kalimat pendek yang mengunci gagasan utama dengan kalimat penjelas yang lebih panjang dan kaya rincian. Hindari struktur kalimat seragam yang monoton.
6. Larangan Emoji Dekoratif: Dilarang menyematkan emoji dekoratif pada judul, subjudul, dan butir daftar artikel.
7. Kejujuran Faktual Nol Fabrikasi: Dilarang mengarang metrik, status hukum, kutipan narasumber, atau klaim tanpa verifikasi. Seluruh klaim faktual wajib bertumpu pada sumber rujukan primer yang otentik dan dapat diperiksa publik.

## Protokol Autentikasi Pengiriman Draf
Authorization: Bearer <CLIENT_ID>.<CLIENT_SECRET>
Content-Type: application/json

Kredensial integrasi berlingkup kirim-saja (submit-only) diterbitkan dan dicabut oleh Pemimpin Redaksi melalui Studio Verax Press.

## Titik Akhir Utama API Pengiriman
1. Validasi Draf (Dry Run, 30/menit):
   POST ${baseUrl}/api/internal/v1/ai-submissions/validate
2. Pengiriman Draf Naskah (12/menit):
   POST ${baseUrl}/api/internal/v1/ai-submissions
3. Pemantauan Status Pengiriman:
   GET ${baseUrl}/api/internal/v1/ai-submissions/{submissionId}

## Kemampuan Penyertaan Gambar & Foto Stok
Penyertaan gambar bersifat opsional (naskah tanpa gambar tetap sah). Agen dapat menyertakan satu gambar utama melalui dua opsi:
1. Pencarian Otomatis Foto Stok (imageQuery):
   - Agen hanya menyertakan kata kunci ringkas (misal: "gedung pengadilan", "laptop dan data").
   - Server yang memanggil API foto stok resmi (Unsplash atau Pexels), memvalidasi lisensi, serta menyusun kredit fotografer secara otomatis. Kredensial API dikelola privat di server.
   - Bila pencarian tidak membuahkan hasil, naskah tetap diterima (HTTP 201) sebagai draf tanpa gambar (bukan galat).
2. Tautan Gambar Langsung (imageUrl):
   - Dipakai bila agen sudah memiliki URL aset gambar spesifik yang sah.
   - Wajib melampirkan imageCredit (nama pembuat/fotografer) dan imageLicense (lisensi resmi) minimal 2 karakter sesuai standar hak cipta redaksi.
3. Prinsip Foto Suasana (imageIsGeneric):
   - Bernilai default true. Foto stok merupakan ilustrasi suasana konseptual, bukan dokumentasi peristiwa faktual spesifik.
   - Agen dilarang menyiratkan gambar sebagai dokumentasi langsung kejadian nyata pada teks artikel maupun keterangan (caption).
   - Gambar tersimpan di Pustaka Media Redaksi (/studio/media) dan tetap berstatus draf sampai artikel disetujui Pemimpin Redaksi.

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
- Dokumen Operasional & Kontrak Teknis: GET ${baseUrl}/editorial/operations/{ai-workflow|quality-assessment|review-checklist|api-integration|vaes}
- Konstitusi Sistem Editorial Mandiri (VAES v2.0.2): GET ${baseUrl}/editorial/vaes (mendukung ?output=json) atau GET ${baseUrl}/editorial/vaes.json
- Resolver Konteks Selektif Empat Lapis (Layer A + B + C + D):
  GET ${baseUrl}/editorial/context?desk={deskSlug}&format={FORMAT}&channel=INGESTION_API&coreMode=compact
  Parameter penugasan Layer D opsional: topic, mainEditorialQuestion, intendedAudience, proposedAngle, availableSources, currentnessAndChronology, geographicInstitutionalContext, requestedDepth, knownInformationGaps, serta output=json|markdown|md.
- Cache & Verifikasi Checksum: Semua endpoint /editorial/* mendukung header If-None-Match (mengembalikan 304 Not Modified dengan header Vary: Accept dan ETag). Nilai checksum.sha256 dihitung atas UTF-8 bodyMarkdown yang dinormalisasi akhiran baris LF (\\n), dan tersedia di JSON maupun frontmatter YAML.

## 3. Autentikasi, Lingkungan, dan Pemisahan Jalur

Format header HTTP pengiriman draf (submit-only):
Authorization: Bearer <CLIENT_ID>.<CLIENT_SECRET>
Content-Type: application/json

Format header HTTP pembacaan riwayat liputan VEI (coverage:read):
Authorization: Bearer <VERAX_COVERAGE_API_KEY> atau X-API-Key: <VERAX_COVERAGE_API_KEY>

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
- imageQuery (string, 2 sampai 100 karakter): Kata kunci pencarian foto stok berlisensi (Unsplash atau Pexels) yang dieksekusi otomatis oleh server. Kredensial API dikelola privat di server. Jika hasil pencarian nihil, naskah tetap diterima (HTTP 201) sebagai draf tanpa gambar (bukan galat).
- imageUrl (string, URL http(s) atau path lokal /..., maks 2000 karakter): Tautan gambar langsung apabila agen memiliki aset spesifik. Wajib disertai bidang imageCredit dan imageLicense.
- imageCredit (string, maksimal 200 karakter): Nama fotografer atau pemilik hak cipta gambar (wajib minimal 2 karakter jika menyertakan imageUrl).
- imageLicense (string, maksimal 200 karakter): Lisensi penggunaan gambar, misal 'Unsplash License', 'Pexels License', atau 'CC-BY 4.0' (wajib minimal 2 karakter jika menyertakan imageUrl).
- imageCaption (string, maksimal 500 karakter): Keterangan gambar kontekstual yang layak baca publik.
- imageIsGeneric (boolean, default true): Penanda bahwa gambar adalah foto suasana ilustratif konseptual, bukan dokumentasi peristiwa faktual spesifik (default: true).
- images (array of ImageMetadata, maksimal 20 aset): Larik aset visual alternatif (dipertahankan untuk kompatibilitas ke belakang).
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

0. Pra-Penulisan: Pengecekan Riwayat Liputan (Verax Editorial Intelligence):
   Sebelum menulis naskah, agen memanggil GET ${baseUrl}/api/internal/v1/editorial/coverage/search untuk menelusuri artikel terbit dan POST ${baseUrl}/api/internal/v1/editorial/coverage/check untuk menguji apakah usulan topik/entitas bertumpang tindih tinggi dengan liputan yang ada. Jika overlapLevel bernilai high, agen wajib menajamkan sudut pandang pembeda atau beralih ke fokus lain.
1. Panggil GET ${baseUrl}/api/internal/v1/capabilities dan GET ${baseUrl}/editorial/context?desk=<slug>&format=<FORMAT>&channel=INGESTION_API.
2. Uji validitas payload melalui POST ${baseUrl}/api/internal/v1/ai-submissions/validate (rate limit 30 req/menit).
3. Kirim naskah final ke POST ${baseUrl}/api/internal/v1/ai-submissions (rate limit 12 req/menit). Respons mengembalikan submissionStatus ("SUBMITTED"), articleStatus ("DRAFT"), dan status ("SUBMITTED"). Replay dengan idempotencyKey dan payload identik menghasilkan HTTP 200 (idempotentReplay: true); payload berbeda dengan kunci sama menghasilkan HTTP 409 IDEMPOTENCY_CONFLICT.
4. Pantau progres melalui GET/HEAD ${baseUrl}/api/internal/v1/ai-submissions/{submissionId} (memerlukan kepemilikan klien; submissionStatus bernilai SUBMITTED, EDITORIAL_REVIEW, atau RESOLVED; articleStatus dan editorialStatus mengikuti status artikel aktual di ruang redaksi).
5. Catatan keterbatasan: API publik belum menyediakan endpoint untuk mengirim revisi baru dari agen AI ke submission lama ataupun membaca catatan telaah internal redaksi. Sebelum artikel disetujui terbit oleh CHIEF_EDITOR, keenam gerbang keras wajib lolos (GATE_NO_KEY_SOURCES, GATE_SOURCE_VERIFICATION, GATE_EMPTY_CONTENT yang memeriksa teks non-kosong pada paragraph/quote/list/qa, GATE_NO_DECK, GATE_BYLINE_UNCONFIRMED, dan GATE_AI_DISCLOSURE).

## 7b. Panduan Penyertaan Gambar & Foto Stok Berlisensi

1. Pencarian Otomatis Foto Stok (imageQuery):
   - Agen cukup menyertakan kata kunci ringkas (misal: "gedung pengadilan", "laptop dan data").
   - Server Verax Press memanggil API penyedia foto stok berlisensi (Unsplash atau Pexels), memvalidasi lisensi, dan menyusun atribusi fotografer resmi.
   - Kredensial API penyedia stok dikelola privat di lingkungan server dan tidak pernah terekspos ke agen luar.
   - Bila pencarian foto stok tidak menghasilkan gambar yang cocok, pengiriman tetap berhasil (HTTP 201) sebagai draf naskah tanpa gambar (bukan galat 500).
2. Tautan Gambar Langsung (imageUrl):
   - Digunakan bila agen telah mengantongi URL gambar spesifik yang sah.
   - Wajib menyertakan imageCredit (nama pembuat/fotografer) dan imageLicense (lisensi resmi) minimal 2 karakter sesuai standar atribusi hak cipta redaksi.
3. Prinsip Foto Suasana (imageIsGeneric):
   - Nilai default selalu true. Foto dari pustaka stok merupakan ilustrasi suasana konseptual, bukan rekaman dokumentasi peristiwa faktual spesifik di lapangan.
   - Agen dilarang keras menyiratkan gambar stok sebagai foto kejadian nyata pada narasi artikel maupun keterangan (caption).
4. Integrasi Pustaka Media Redaksi & Alur Telaah:
   - Gambar yang disertakan otomatis tersimpan pada entitas MediaAsset di Pustaka Media Redaksi (/studio/media) berlabel "Foto Suasana".
   - Status gambar tetap berupa draf hingga artikel ditelaah dan disetujui terbit oleh Pemimpin Redaksi (tidak ada mekanisme auto-publish gambar).

## 7c. Standar Penulisan Anti-AI & Kebijakan Anti-Slop (Wajib Sebelum Pengiriman)

Setiap draf artikel yang dikirimkan oleh agen AI wajib mematuhi standar penulisan anti-AI dan anti-slop Verax Press (VERAX-CORE-STYLE-05 dan VERAX_WRITING_STANDARDS.md) sebelum diajukan ke API pengiriman:

1. Larangan Tanda Pisah Em Dash dan Tanda Pisah Ganda:
   - Dilarang keras menggunakan tanda pisah em dash (U+2014) maupun tanda pisah ganda dalam draf naskah artikel, kecuali berada di dalam kutipan langsung verbatim narasumber atau dokumen resmi autentik.
   - Solusi tipografi: gunakan koma, titik dua, tanda kurung, atau pecah kalimat menjadi kalimat mandiri.

2. Kosakata Klise AI yang Dilarang (Banned AI Vocabulary):
   - Bahasa Inggris: delve, unlock, elevate, empower, harness, foster, streamline, revolutionize, showcase, usher in, spearhead, navigate, transcend, leverage, seamless, cutting-edge, robust, next-level, game-changer, pivotal, testament, tapestry, beacon, paramount, bespoke, multifaceted, crucial, dynamic, journey, landscape (sebagai metafora), realm, sphere, arena, horizon.
   - Bahasa Indonesia: hadir untuk, merevolusi, menjembatani, ekosistem (di luar biologi), menjadi bukti nyata, garda terdepan, wadah, wahana, penting untuk dicatat bahwa, tidak hanya... melainkan juga...

3. Larangan Paralelisme Negatif:
   - Dilarang menggunakan formula retoris artifisial seperti 'Bukan sekadar X, melainkan Y' atau 'Bukan hanya X, tapi Y'. Sampaikan pokok pikiran secara deklaratif.

4. Larangan Aturan Tiga yang Dipaksakan (Forced Rule of Three):
   - Dilarang memaksakan rima tiga kata sifat atau tiga kata benda (misalnya akurasi, independensi, dan integritas) semata demi mengejar efek ritmis buatan.

5. Variasi Ritme Kalimat (Burstiness):
   - Naskah wajib memiliki variasi panjang dan struktur kalimat yang wajar. Padukan kalimat deklaratif pendek dengan kalimat penjelas yang lebih panjang dan kaya konteks. Hindari alinea dengan struktur kalimat yang seragam dan steril.

6. Larangan Emoji Dekoratif:
   - Dilarang menyematkan emoji dekoratif pada judul, subjudul, maupun butir daftar artikel.

7. Kejujuran Faktual Nol Fabrikasi:
   - Dilarang mengarang metrik, status hukum, kutipan narasumber, kronologi, atau klaim yang belum diverifikasi. Seluruh klaim wajib berakar pada dokumen atau sumber primer otentik.

8. Batas Keras Non-Evasion:
   - Dilarang menurunkan mutu prosa demi mengakali pendeteksi AI (non-evasion), dilarang menyisipkan salah ketik buatan, dan dilarang merusak keaslian kutipan verbatim atau istilah disiplin baku.

## 8. Daftar Kode Status & Galat HTTP Standar

Setiap respons galat mengembalikan JSON berisi error, code, dan requestId (beserta header x-request-id):
- 400 MALFORMED_JSON / INVALID_PARAMETER / INVALID_CURSOR / INVALID_JSON: Format atau parameter kueri tidak valid.
- 401 UNAUTHORIZED / CREDENTIAL_REVOKED / CREDENTIAL_EXPIRED / CLIENT_INACTIVE: Autentikasi gagal, dicabut, kedaluwarsa, atau kunci salah.
- 403 FORBIDDEN_SCOPE: Kredensial tidak berwenang untuk endpoint yang diakses (misal menggunakan kredensial submission untuk membaca coverage).
- 404 NOT_FOUND / EDITORIAL_DOCUMENT_NOT_FOUND / DESK_NOT_FOUND / FORMAT_NOT_FOUND: Sumber daya tidak ada dalam indeks atau bukan milik klien Anda.
- 405 METHOD_NOT_ALLOWED: Metode HTTP tidak didukung pada endpoint ini (sertakan header Allow dan requestId).
- 409 IDEMPOTENCY_CONFLICT: Idempotency key sudah digunakan sebelumnya untuk payload berbeda.
- 422 VALIDATION_ERROR: Pelanggaran skema payload, parameter kueri (misal ?output atau ?mode tidak valid), format blok konten (misal list.style tidak diisi), atau tanggal non-ISO.
- 422 FORMAT_REJECTED: Format naskah tidak dikenali, ditahan sementara (detail.code: FORMAT_PENDING_AUTHORIZATION untuk NEWS), atau prasyarat bukti peliputan tidak terpenuhi (detail.code: FORMAT_PRECONDITION_FAILED untuk FEATURE/INTERVIEW).
- 422 DESK_REJECTED: Desk tidak aktif di basis data sistem.
- 429 RATE_LIMITED: Batas laju terlampaui (sertakan header Retry-After).
- 500 INTERNAL_ERROR: Gangguan internal server.

## 9. Spesifikasi Teknis Verax Editorial Intelligence (VEI)

VEI adalah lapisan baca-saja (read-only) untuk menelusuri artikel terpublikasi dan mengevaluasi kebaruan liputan sebelum agen AI menulis artikel baru.

### Karakteristik Utama
- Murni Baca: Tidak pernah menulis, memodifikasi, atau menghapus data editorial apapun.
- Isolasi Publikasi Penuh: Draf penulis lain, submission pending, rejected, withdrawn, dan catatan internal editor TIDAK PERNAH dapat diakses. Hanya artikel berstatus PUBLISHED atau CORRECTED dengan publishedAt valid yang dikembalikan.
- Evaluasi Deterministik: Nilai overlapLevel (none, partial, high) dihitung langsung dari irisan topik dan entitas terhadap artikel terbit. API tidak memberikan rekomendasi atau klasifikasi tindakan, keputusan editorial sepenuhnya berada pada agen penulis.
- Autentikasi: Memerlukan kunci API terpisah dengan cakupan coverage:read via header Authorization: Bearer <VERAX_COVERAGE_API_KEY> atau X-API-Key: <VERAX_COVERAGE_API_KEY>. Kredensial pengiriman (vrtc_...) ditolak dengan HTTP 403 FORBIDDEN_SCOPE.

### Titik Akhir 1: Pencarian Riwayat Liputan
- Rute: GET ${baseUrl}/api/internal/v1/editorial/coverage/search
- Parameter Kueri:
  - q (opsional): Kata kunci teks pada judul, topik, entitas, pertanyaan inti, atau sudut pandang.
  - desk (opsional): Slug atau nama desk editorial aktif (misal: hukum-keadilan).
  - from (opsional): Tanggal awal publikasi ISO 8601 (YYYY-MM-DD).
  - to (opsional): Tanggal akhir publikasi ISO 8601 (YYYY-MM-DD).
  - limit (opsional): Jumlah rekaman per halaman (1 sampai 100, default 20).
  - cursor (opsional): ID artikel untuk paginasi halaman berikutnya.
- Struktur Respons (HTTP 200):
  - data: Larik artikel terbit (articleId, slug, title, desk, format, status, topics, entities, centralQuestion, editorialAngle, metadataStatus, publishedAt, canonicalUrl).
  - pagination: Informasi paginasi (total, limit, cursor, nextCursor, hasMore).

### Titik Akhir 2: Evaluasi Kebaruan Usulan Liputan (Novelty Check)
- Rute: POST ${baseUrl}/api/internal/v1/editorial/coverage/check
- Tubuh Permintaan JSON:
  - proposedTitle (opsional): Usulan judul naskah.
  - topic / topics (opsional): Topik utama atau larik topik.
  - centralQuestion (opsional): Pertanyaan inti jurnalistik yang ingin dijawab.
  - proposedAngle (opsional): Sudut pandang pembeda atau hipotesis liputan.
  - entities (opsional): Larik nama entitas penting yang dibahas.
- Struktur Respons (HTTP 200):
  - overlapLevel: "none" | "partial" | "high".
  - matches: Larik rincian artikel yang relevan (articleId, title, desk, overlapLevel, matchedTopics, matchedEntities, topics, entities, centralQuestion, editorialAngle, metadataStatus, publishedAt, canonicalUrl).

## 10. Contoh Instruksi Sistem untuk Agen Penulis AI (Gemini Writer Agent Instruction)

Instruksi berikut dapat ditempelkan langsung ke system instruction agen AI eksternal yang ditugaskan menulis naskah untuk Verax Press:

\`\`\`text
Peran: Agen Jurnalis AI Mandiri untuk Verax Press
Sebelum mulai menulis naskah artikel baru, Anda WAJIB menjalankan protokol pra-penulisan Verax Editorial Intelligence:

Langkah 1: Periksa Riwayat Liputan
Kirim permintaan POST ke https://veraxpress.vercel.app/api/internal/v1/editorial/coverage/check
Headers:
  Authorization: Bearer <VERAX_COVERAGE_API_KEY>
  Content-Type: application/json
Body:
  {
    "proposedTitle": "<Usulan Judul Naskah Anda>",
    "topic": "<Topik Liputan>",
    "centralQuestion": "<Pertanyaan Utama yang Ingin Dijawab>",
    "proposedAngle": "<Sudut Pandang Pembeda Anda>",
    "entities": ["<Entitas 1>", "<Entitas 2>"]
  }

Langkah 2: Evaluasi Tingkat Tumpang Tindih (Overlap)
- Jika overlapLevel bernilai "high":
  Artikel serupa telah terbit di Verax Press. JANGAN menulis naskah yang mengulang fakta yang sama. Cari sudut pandang baru yang belum dibahas, atau pilih topik peliputan lain.
- Jika overlapLevel bernilai "partial":
  Pelajari daftar artikel di bidang "matches". Identifikasi sudut pandang dan pertanyaan inti artikel terdahulu, lalu pastikan naskah Anda menawarkan perkembangan terbaru, analisis berbeda, atau temuan fakta yang melengkapi liputan sebelumnya.
- Jika overlapLevel bernilai "none":
  Topik dan entitas belum pernah diliput. Lanjutkan ke tahap penulisan draf dengan tetap berpedoman pada standar editorial Verax Press.

Langkah 3: Ambil Konteks Standar Editorial & Konstitusi VAES
Sebelum menyusun draf, panggil:
GET https://veraxpress.vercel.app/editorial/context?desk=<deskSlug>&format=<FORMAT>&channel=INGESTION_API&coreMode=compact
Untuk panduan investigasi mendalam, pelajari spesifikasi konstitusi VAES 2.0.2:
GET https://veraxpress.vercel.app/editorial/vaes.json
Ikuti prinsip pembuktian sumber primer dan format 7 blok konten terstruktur.

Langkah 4: Terapkan Standar Penulisan Anti-AI & Kebijakan Anti-Slop
Sebelum mengirimkan naskah, pastikan draf Anda mematuhi standar penulisan Verax Press:
- Dilarang memakai tanda pisah em dash (U+2014) maupun tanda pisah ganda (kecuali dalam kutipan verbatim narasumber).
- Hindari seluruh kosakata terlarang AI bahasa Inggris dan bahasa Indonesia.
- Hindari paralelisme negatif ('Bukan sekadar X, tapi Y') dan pola aturan tiga yang dipaksakan.
- Terapkan variasi ritme kalimat (burstiness) dan hindari struktur kalimat monoton.
- Dilarang menyematkan emoji dekoratif pada judul maupun butir daftar.
- Jaga kejujuran faktual tanpa mengarang data, kutipan, atau klaim yang tidak terverifikasi.

Langkah 5: Penyertaan Gambar (Opsional)
- Jika membutuhkan ilustrasi visual, sertakan bidang "imageQuery": "<kata kunci relevan>" pada JSON pengiriman. Server Verax Press akan secara otomatis mencari foto stok berlisensi (Unsplash/Pexels), mencatat lisensi, dan menyematkan kredit fotografer.
- Foto stok selalu ditandai sebagai foto suasana (imageIsGeneric: true). Dilarang menyiratkan gambar tersebut sebagai foto dokumentasi peristiwa faktual di lapangan.
\`\`\`
`;
}
