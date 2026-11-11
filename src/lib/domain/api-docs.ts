// Sumber kebenaran tunggal untuk spesifikasi API dan dokumentasi mesin (Fase 3).
// Menghasilkan OpenAPI 3.1.0, /.well-known/verax-agent.json, /llms.txt, dan /llms-full.txt.

import {
  INGESTION_ALLOWED_FORMATS,
  AI_INVOLVEMENTS,
  SOURCE_TYPES,
  getPublicBaseUrl,
} from "@/lib/domain/constants";

export function getOpenApiSpec(baseUrlOverride?: string) {
  const baseUrl = baseUrlOverride || getPublicBaseUrl();

  return {
    openapi: "3.1.0",
    info: {
      title: "Verax Press AI Agent Ingestion API",
      version: "1.0.0",
      description:
        "Spesifikasi antarmuka pemrograman untuk pengiriman draf artikel jurnalistik oleh agen kecerdasan buatan ke ruang redaksi Verax Press. Seluruh kiriman diproses sebagai draf awal dan wajib melewati pemeriksaan editorial manusia.",
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
        ContentBlock: {
          type: "object",
          required: ["type"],
          properties: {
            type: {
              type: "string",
              enum: ["paragraph", "heading", "quote", "list"],
            },
            text: {
              type: "string",
              description: "Teks untuk blok paragraf, heading, atau kutipan.",
            },
            level: {
              type: "integer",
              enum: [2, 3],
              description: "Tingkat judul (H2 atau H3) bila type adalah heading.",
            },
            attribution: {
              type: "string",
              description: "Nama narasumber atau atribusi bila type adalah quote.",
            },
            items: {
              type: "array",
              items: { type: "string" },
              description: "Daftar butir bila type adalah list.",
            },
          },
        },
        SourceReference: {
          type: "object",
          required: ["title", "url"],
          properties: {
            title: {
              type: "string",
              minLength: 3,
              maxLength: 300,
              description: "Nama atau judul dokumen rujukan primer.",
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
              description: "Tautan sumber yang dapat diakses publik.",
            },
            sourceType: {
              type: "string",
              enum: SOURCE_TYPES,
              default: "SECONDARY",
            },
            publishedAt: {
              type: "string",
              format: "date-time",
              description: "Tanggal terbit dokumen rujukan dalam format ISO 8601.",
            },
            accessedAt: {
              type: "string",
              format: "date-time",
              description: "Waktu pengaksesan dokumen oleh agen.",
            },
            supports: {
              type: "string",
              maxLength: 600,
              description: "Klaim atau data spesifik yang didukung oleh sumber ini.",
            },
            isKeySource: {
              type: "boolean",
              default: false,
              description: "Penanda apakah rujukan merupakan sumber primer utama.",
            },
          },
        },
        ImageMetadata: {
          type: "object",
          required: ["url"],
          properties: {
            url: {
              type: "string",
              format: "uri",
              maxLength: 2000,
            },
            creator: {
              type: "string",
              maxLength: 200,
              description: "Pembuat atau fotografer.",
            },
            license: {
              type: "string",
              maxLength: 200,
              description: "Jenis lisensi penggunaan hak cipta.",
            },
            permissionEvidence: {
              type: "string",
              maxLength: 600,
              description: "Bukti izin penggunaan aset visual.",
            },
            caption: {
              type: "string",
              maxLength: 500,
              description: "Keterangan gambar faktual.",
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
              description: "Ringkasan naskah pendukung judul.",
            },
            desk: {
              type: "string",
              description: "Slug rubrik aktif (misal: hukum-keadilan, teknologi-kebijakan, nasional-publik).",
            },
            format: {
              type: "string",
              enum: INGESTION_ALLOWED_FORMATS,
              description: "Format artikel jurnalistik (NEWS, OPINION, ANALYSIS, EXPLAINER, FEATURE, INTERVIEW).",
            },
            content: {
              type: "array",
              items: { $ref: "#/components/schemas/ContentBlock" },
              minItems: 1,
              description: "Isi naskah dalam format array blok terstruktur.",
            },
            sources: {
              type: "array",
              items: { $ref: "#/components/schemas/SourceReference" },
              minItems: 1,
              maxItems: 40,
              description: "Daftar rujukan sumber primer faktual.",
            },
            images: {
              type: "array",
              items: { $ref: "#/components/schemas/ImageMetadata" },
              maxItems: 20,
            },
            tags: {
              type: "array",
              items: { type: "string" },
              maxItems: 10,
            },
            verificationNotes: {
              type: "string",
              maxLength: 3000,
              description: "Catatan metodologi pengujian fakta oleh agen.",
            },
            aiInvolvement: {
              type: "string",
              enum: AI_INVOLVEMENTS,
              description: "Tingkat keterlibatan model AI.",
            },
            aiUsageNote: {
              type: "string",
              maxLength: 1000,
              description: "Penjelasan keterlibatan AI bila berstatus substantive.",
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
              description: "Kunci idempoten untuk mencegah pembuatan duplikat pada pengulangan request.",
            },
          },
        },
        SubmissionReceipt: {
          type: "object",
          required: ["submissionId", "articleId", "status", "receivedAt", "idempotentReplay"],
          properties: {
            submissionId: { type: "string" },
            articleId: { type: "string" },
            status: { type: "string", example: "DRAFT" },
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
            submissionStatus: { type: "string" },
            editorialStatus: { type: "string" },
            format: { type: "string" },
            title: { type: "string" },
            receivedAt: { type: "string", format: "date-time" },
            lastUpdatedAt: { type: "string", format: "date-time" },
            idempotencyKey: { type: "string", nullable: true },
            editorialDecision: {
              type: "object",
              properties: {
                status: { type: "string" },
                isPublished: { type: "boolean" },
              },
            },
            requestId: { type: "string" },
          },
        },
        ErrorResponse: {
          type: "object",
          required: ["error", "code"],
          properties: {
            error: { type: "string" },
            code: { type: "string" },
            requestId: { type: "string" },
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
          },
        },
      },
    },
    paths: {
      "/api/internal/v1/ai-submissions": {
        post: {
          summary: "Kirim naskah artikel baru",
          description:
            "Menerima naskah artikel dari agen kecerdasan buatan. Status awal naskah selalu DRAFT dan rujukan sumber berstatus UNVERIFIED hingga ditelaah oleh tim editorial manusia.",
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
            "401": {
              description: "Autentikasi gagal atau kredensial dicabut.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "409": {
              description: "Bentrok idempotency key dengan payload yang berbeda.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "422": {
              description: "Validasi format naskah atau desk gagal.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "429": {
              description: "Batas laju pengiriman terlampaui.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/internal/v1/ai-submissions/validate": {
        post: {
          summary: "Uji validitas payload tanpa persistensi (Dry Run)",
          description:
            "Memvalidasi struktur dan konten naskah sebelum pengiriman sungguhan. Tidak membuat rekaman apa pun di basis data.",
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
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ValidationResponse" },
                },
              },
            },
            "422": {
              description: "Terdapat kesalahan spesifikasi pada payload.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/internal/v1/ai-submissions/{submissionId}": {
        get: {
          summary: "Periksa status pemrosesan naskah",
          description:
            "Mengambil status editorial terkini dari naskah yang dikirimkan. Hanya dapat diakses oleh pemilik naskah bersangkutan.",
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
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SubmissionStatusResponse" },
                },
              },
            },
            "404": {
              description: "Naskah tidak ditemukan dalam akun integrasi pemohon.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/internal/v1/capabilities": {
        get: {
          summary: "Informasi metadata kapabilitas sistem",
          description:
            "Menyajikan daftar format yang diizinkan, rubrik desk yang aktif, dan batas ukuran pengiriman.",
          responses: {
            "200": {
              description: "Metadata kapabilitas sistem.",
            },
          },
        },
      },
    },
  };
}

export function getWellKnownAgentMetadata(baseUrlOverride?: string) {
  const baseUrl = baseUrlOverride || getPublicBaseUrl();

  return {
    platform: "Verax Press",
    description: "Media jurnalisme digital independen dan terverifikasi.",
    apiVersion: "1.0.0",
    documentationUrl: `${baseUrl}/developers`,
    openApiUrl: `${baseUrl}/openapi.json`,
    llmsTxtUrl: `${baseUrl}/llms.txt`,
    llmsFullTxtUrl: `${baseUrl}/llms-full.txt`,
    capabilitiesUrl: `${baseUrl}/api/internal/v1/capabilities`,
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
    },
    constraints: {
      publicationRight: false,
      autoPublish: false,
      initialStatus: "DRAFT",
      initialSourceVerificationStatus: "UNVERIFIED",
      disallowedFormats: [],
      allowedFormats: INGESTION_ALLOWED_FORMATS,
    },
  };
}

export function getLlmsTxt(baseUrlOverride?: string): string {
  const baseUrl = baseUrlOverride || getPublicBaseUrl();

  return `# Verax Press AI Agent Integration Summary

> Verax Press adalah media jurnalisme digital independen yang berpegang pada fakta, verifikasi sumber primer, dan transparansi proses editorial.

## Tautan Cepat
- Base URL: ${baseUrl}
- Dokumentasi Lengkap Mesin: ${baseUrl}/llms-full.txt
- Dokumentasi Pengembang Web: ${baseUrl}/developers
- Spesifikasi OpenAPI: ${baseUrl}/openapi.json
- Metadata Penemuan: ${baseUrl}/.well-known/verax-agent.json
- Kapabilitas Terkini: ${baseUrl}/api/internal/v1/capabilities

## Protokol Autentikasi
Gunakan format Bearer token gabungan:
Authorization: Bearer <CLIENT_ID>.<CLIENT_SECRET>
Content-Type: application/json

Kredensial resmi diperoleh melalui Pemimpin Redaksi di Meja Redaksi Studio Verax Press.

## Titik Akhir Utama
1. Validasi Draf (Dry Run):
   POST ${baseUrl}/api/internal/v1/ai-submissions/validate
   Uji validitas payload tanpa persistensi atau efek samping.
2. Pengiriman Naskah:
   POST ${baseUrl}/api/internal/v1/ai-submissions
   Kirim naskah artikel baru. Masuk sebagai draf awal di ruang redaksi.
3. Status Naskah:
   GET ${baseUrl}/api/internal/v1/ai-submissions/{submissionId}
   Pantau perkembangan telaah editorial naskah yang dikirim.

## Batasan dan Ketentuan Mutlak
1. Tanpa Hak Publikasi Mandiri: Agen AI tidak memiliki hak mempublikasikan naskah secara langsung.
2. Status Awal Selalu DRAFT: Seluruh naskah masuk ke meja redaksi sebagai draf awal.
3. Verifikasi Sumber Manusia: Seluruh sumber rujukan otomatis berstatus UNVERIFIED sampai diverifikasi redaktur manusia.
4. Format Naskah yang Didukung: Seluruh format standar Verax Press didukung (NEWS, OPINION, ANALYSIS, EXPLAINER, FEATURE, INTERVIEW). Format berita (NEWS) diproses dengan pengamanan editorial yang sama persis seperti format lainnya.
5. Idempotensi Wajib: Selalu sertakan idempotencyKey acak (minimal 8 karakter) untuk mencegah naskah duplikat.
`;
}

export function getLlmsFullTxt(baseUrlOverride?: string): string {
  const baseUrl = baseUrlOverride || getPublicBaseUrl();

  return `# Dokumentasi Lengkap Integrasi Agen AI Verax Press

Dokumen ini menyediakan spesifikasi teknis lengkap untuk agen kecerdasan buatan yang berinteraksi dengan API Ingestion Verax Press.

## 1. Identitas Sistem dan Otoritas Editorial

Verax Press adalah platform jurnalisme independen. Integritas naskah berada sepenuhnya di bawah kendali Pemimpin Redaksi.
- Pengiriman naskah melalui API adalah usulan editorial, bukan persetujuan penerbitan.
- Seluruh klaim wajib didukung sumber primer yang dapat diperiksa oleh editor manusia.

## 2. Autentikasi dan Lingkungan

Format header HTTP wajib:
Authorization: Bearer <CLIENT_ID>.<CLIENT_SECRET>
Content-Type: application/json

Contoh:
Authorization: Bearer vrtc_a1b2c3d4e5f60718.vrtk_1029384756abcdef1029384756abcdef

Lingkungan:
- Base URL Integrasi: ${baseUrl}
- Production: https://veraxpress.vercel.app
- Development: http://localhost:3000

## 3. Spesifikasi Skema Payload Naskah (IngestionPayload)

Payload dikirimkan dalam format JSON dengan bidang-bidang berikut:

### Bidang Wajib
- title (string, 8-200 karakter): Judul naskah jurnalistik yang padat dan akurat.
- desk (string): Slug rubrik aktif tempat naskah bernaung (misal: hukum-keadilan, teknologi-kebijakan, nasional-publik).
- format (string): Salah satu format artikel yang didukung: NEWS, OPINION, ANALYSIS, EXPLAINER, FEATURE, INTERVIEW.
- content (array of BlockContent): Isi tulisan terstruktur, minimal 1 blok.
- sources (array of SourceReference): Daftar rujukan, minimal 1 sumber, maksimal 40 sumber.
- aiInvolvement (string): Tingkat keterlibatan model AI. Pilihan: none, assistive, substantive.
- agentId (string, 2-120 karakter): Nama atau identitas unik agen pemroses.
- idempotencyKey (string, 8-128 karakter): Kunci unik per pengiriman untuk mencegah pembuatan ganda saat transmisi ulang.

### Bidang Opsional
- deck (string, maksimal 400 karakter): Teks pendukung atau ringkasan pembuka.
- images (array of ImageMetadata, maksimal 20 gambar): Rujukan aset visual berlisensi jelas.
- tags (array of string, maksimal 10 tag): Kata kunci tematik.
- verificationNotes (string, maksimal 3000 karakter): Catatan metode verifikasi atau langkah penelusuran fakta yang telah dilakukan agen.
- aiUsageNote (string, maksimal 1000 karakter): Penjelasan metodologi jika aiInvolvement bernilai substantive.

## 4. Struktur Blok Konten (BlockContent)

Setiap blok naskah adalah objek JSON dengan tipe:
- Paragraph: { "type": "paragraph", "text": "Isi alinea naskah..." }
- Heading: { "type": "heading", "level": 2, "text": "Subjudul Bagian" } (level 2 untuk H2, level 3 untuk H3)
- Quote: { "type": "quote", "text": "Kutipan pernyataan narasumber...", "attribution": "Nama Tokoh, Jabatan" }
- List: { "type": "list", "items": ["Poin pertama", "Poin kedua"] }

## 5. Struktur Sumber Rujukan (SourceReference)

Setiap naskah wajib menyertakan rujukan yang dapat diakses publik:
- title (string, minimal 3 karakter): Nama dokumen, judul laporan, atau undang-undang rujukan.
- publisher (string, opsional): Lembaga penerbit rujukan.
- url (string, URL valid): Tautan langsung ke dokumen sumber.
- sourceType (string): Salah satu dari PRIMARY, SECONDARY, DOCUMENT, INTERVIEW, DATA, OFFICIAL.
- publishedAt (string, opsional): Tanggal publikasi dokumen (ISO 8601).
- accessedAt (string, opsional): Tanggal penelusuran oleh agen.
- supports (string, opsional): Klaim faktual spesifik yang didukung oleh sumber ini.
- isKeySource (boolean, default false): Tandai true jika dokumen ini merupakan pilar pembuktian utama naskah.

## 6. Alur Kerja Rekomendasi untuk Agen AI

1. Penemuan Kapabilitas:
   Panggil GET ${baseUrl}/api/internal/v1/capabilities untuk memastikan rubrik aktif dan format yang diterima.
2. Validasi Draf (Dry Run):
   Panggil POST ${baseUrl}/api/internal/v1/ai-submissions/validate dengan payload draf Anda.
   Jika terdapat kesalahan skema atau format terlarang, respons akan memberikan perincian pada bidang details.
3. Pengiriman Naskah:
   Panggil POST ${baseUrl}/api/internal/v1/ai-submissions dengan menyertakan idempotencyKey unik.
   Simpan submissionId yang dikembalikan pada respons receipt.
4. Pemantauan Status:
   Secara berkala, panggil GET ${baseUrl}/api/internal/v1/ai-submissions/{submissionId} untuk memeriksa apakah naskah telah ditelaah oleh tim redaksi.

## 7. Format Galat Standar (Error Handling)

Setiap respons galat memiliki format seragam:
\`\`\`json
{
  "error": "Keterangan pesan galat yang manusiawi.",
  "code": "KODE_GALAT",
  "requestId": "req_...",
  "details": [
    {
      "path": "sources.0.url",
      "code": "INVALID_URL",
      "message": "URL sumber harus berupa format URL valid."
    }
  ]
}
\`\`\`

Daftar Kode Galat Umum:
- 400 MALFORMED_JSON: Payload bukan JSON yang valid.
- 401 UNAUTHORIZED: Token autentikasi salah atau kredensial telah dicabut.
- 404 NOT_FOUND: Sumber daya tidak ditemukan atau bukan milik klien Anda.
- 409 IDEMPOTENCY_CONFLICT: Idempotency key sudah pernah digunakan untuk naskah berbeda.
- 422 VALIDATION_ERROR: Pelanggaran batas karakter atau skema data.
- 422 FORMAT_REJECTED: Format artikel tidak dikenali oleh sistem.
- 422 DESK_REJECTED: Rubrik naskah tidak aktif atau tidak ditemukan.
- 429 RATE_LIMITED: Terlalu banyak permintaan dalam jendela 60 detik.
- 500 INTERNAL_ERROR: Gangguan internal server.
`;
}
