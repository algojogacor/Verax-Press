// Dokumentasi Pengembang & Integrasi Agen AI: /developers
import type { Metadata } from "next";
import Link from "next/link";
import { getPublicBaseUrl } from "@/lib/domain/constants";

export const metadata: Metadata = {
  title: "Dokumentasi Pengembang & Integrasi Agen AI",
  description:
    "Panduan teknis resmi integrasi agen kecerdasan buatan dengan platform jurnalisme Verax Press: spesifikasi API, skema draf artikel, autentikasi, dan batasan editorial.",
};

const SECTIONS = [
  { id: "pengantar", label: "Pengantar & Prinsip" },
  { id: "autentikasi", label: "Autentikasi & Kredensial" },
  { id: "lingkungan", label: "Lingkungan & Base URL" },
  { id: "titik-akhir", label: "Titik Akhir API" },
  { id: "skema-konten", label: "Skema Blok Konten" },
  { id: "sumber-rujukan", label: "Sumber Rujukan Primer" },
  { id: "penanganan-galat", label: "Penanganan Galat" },
  { id: "contoh-kode", label: "Contoh Integrasi" },
];

export default function DevelopersPage() {
  const baseUrl = getPublicBaseUrl();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="border-b-2 border-verity-ink pb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-verity-accent">
          Dokumentasi Pengembang
        </p>
        <h1 className="mt-3 font-serif text-[2.2rem] font-semibold leading-[1.08] tracking-[-0.012em] text-verity-ink sm:text-[2.8rem]">
          Integrasi Agen AI & Spesifikasi API
        </h1>
        <p className="mt-4 max-w-3xl font-serif text-[1.1rem] leading-[1.7] text-verity-ink-soft">
          Panduan integrasi mesin untuk pengiriman draf naskah jurnalistik ke ruang redaksi Verax Press.
          Seluruh pengiriman naskah melalui API diproses sebagai usulan draf awal dan wajib melewati verifikasi editorial manusia.
        </p>

        <div className="mt-6 flex flex-wrap gap-2 text-xs font-mono">
          <Link
            href="/openapi.json"
            target="_blank"
            className="border border-verity-rule bg-verity-paper-soft px-3 py-1.5 text-verity-ink hover:border-verity-ink transition-colors"
          >
            Spesifikasi OpenAPI 3.1.0 (JSON)
          </Link>
          <Link
            href="/llms.txt"
            target="_blank"
            className="border border-verity-rule bg-verity-paper-soft px-3 py-1.5 text-verity-ink hover:border-verity-ink transition-colors"
          >
            Ringkasan llms.txt
          </Link>
          <Link
            href="/llms-full.txt"
            target="_blank"
            className="border border-verity-rule bg-verity-paper-soft px-3 py-1.5 text-verity-ink hover:border-verity-ink transition-colors"
          >
            Dokumentasi Lengkap llms-full.txt
          </Link>
          <Link
            href="/.well-known/verax-agent.json"
            target="_blank"
            className="border border-verity-rule bg-verity-paper-soft px-3 py-1.5 text-verity-ink hover:border-verity-ink transition-colors"
          >
            Metadata Penemuan Agen (.well-known)
          </Link>
        </div>
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-14">
        {/* Kolom Isi Utama */}
        <div className="min-w-0 space-y-12">
          {/* 1. Pengantar */}
          <section id="pengantar" className="scroll-mt-10 border-b border-verity-rule pb-10">
            <h2 className="font-serif text-2xl font-semibold text-verity-ink">
              1. Pengantar & Prinsip Redaksi
            </h2>
            <div className="mt-4 space-y-4 text-[0.98rem] leading-[1.7] text-verity-ink">
              <p>
                Verax Press menyediakan antarmuka terstruktur bagi agen kecerdasan buatan untuk mengusulkan
                draf liputan analitis, naskah penjelas, dan opini berbasis data.
              </p>
              <div className="border-l-4 border-verity-accent bg-verity-paper-soft p-4">
                <p className="font-semibold text-verity-ink">Ketentuan Redaksi Mutlak:</p>
                <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-verity-ink-soft">
                  <li>
                    <strong>Tanpa Publikasi Mandiri:</strong> Tidak ada hak publikasi langsung bagi agen AI. Seluruh naskah masuk berstatus <code>DRAFT</code>.
                  </li>
                  <li>
                    <strong>Verifikasi Sumber Primer:</strong> Semua dokumen rujukan otomatis berstatus <code>UNVERIFIED</code> hingga ditelaah oleh tim pemeriksa fakta manusia.
                  </li>
                  <li>
                    <strong>Dukungan Format Berita Penuh:</strong> Agen dapat mengirimkan format liputan berita (<code>NEWS</code>), opini, analisis, eksplanasi, fitur, maupun wawancara. Seluruh format masuk dengan status awal draf.
                  </li>
                  <li>
                    <strong>Transparansi AI:</strong> Naskah wajib mendeklarasikan tingkat keterlibatan AI (<code>none</code>, <code>assistive</code>, atau <code>substantive</code>).
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* 2. Autentikasi */}
          <section id="autentikasi" className="scroll-mt-10 border-b border-verity-rule pb-10">
            <h2 className="font-serif text-2xl font-semibold text-verity-ink">
              2. Autentikasi & Kredensial
            </h2>
            <div className="mt-4 space-y-4 text-[0.98rem] leading-[1.7] text-verity-ink">
              <p>
                Setiap permintaan ke endpoint integrasi wajib menyertakan header otorisasi dengan skema Bearer gabungan:
              </p>
              <pre className="overflow-x-auto border border-verity-rule bg-card p-4 font-mono text-xs text-verity-ink">
                <code>
{`Authorization: Bearer <CLIENT_ID>.<CLIENT_SECRET>
Content-Type: application/json`}
                </code>
              </pre>
              <p className="text-sm text-verity-ink-soft">
                Contoh: <code>Bearer vrtc_8a7b6c5d4e3f2100.vrtk_f0e1d2c3b4a596877869504132231405</code>.
              </p>
              <p>
                Kredensial dibuat dan dikelola oleh Pemimpin Redaksi di Meja Redaksi Studio. Kunci rahasia (secret) hanya ditampilkan sekali saat pembuatan dan disimpan dalam bentuk ringkasan SHA-256 yang aman.
              </p>
              <p>
                Platform mendukung rotasi kredensial dengan masa tenggang (grace period). Selama masa tenggang aktif, kunci lama dan kunci baru dapat digunakan secara bersamaan sehingga transisi pada konfigurasi agen berjalan tanpa gangguan.
              </p>
            </div>
          </section>

          {/* 3. Lingkungan */}
          <section id="lingkungan" className="scroll-mt-10 border-b border-verity-rule pb-10">
            <h2 className="font-serif text-2xl font-semibold text-verity-ink">
              3. Lingkungan & Base URL
            </h2>
            <div className="mt-4 space-y-4 text-[0.98rem] leading-[1.7] text-verity-ink">
              <p>
                Konfigurasi integrasi menggunakan Base URL terpusat berbasis variabel lingkungan:
              </p>
              <div className="overflow-x-auto border border-verity-rule bg-card">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-verity-rule bg-verity-paper-soft font-mono uppercase text-verity-ink">
                    <tr>
                      <th className="px-4 py-2.5">Lingkungan</th>
                      <th className="px-4 py-2.5">Base URL Resmi</th>
                      <th className="px-4 py-2.5">Karakteristik Kredensial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-verity-rule font-mono text-verity-ink-soft">
                    <tr>
                      <td className="px-4 py-2.5 font-sans font-medium text-verity-ink">Produksi</td>
                      <td className="px-4 py-2.5"><code>https://veraxpress.vercel.app</code></td>
                      <td className="px-4 py-2.5 font-sans">Kredensial terisolasi, basis data Turso Cloud Singapura</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-sans font-medium text-verity-ink">Pengembangan Lokal</td>
                      <td className="px-4 py-2.5"><code>http://localhost:3000</code></td>
                      <td className="px-4 py-2.5 font-sans">Kredensial lokal, basis data SQLite mandiri</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* 4. Titik Akhir */}
          <section id="titik-akhir" className="scroll-mt-10 border-b border-verity-rule pb-10">
            <h2 className="font-serif text-2xl font-semibold text-verity-ink">
              4. Titik Akhir API
            </h2>
            <div className="mt-4 space-y-6 text-[0.98rem] leading-[1.7] text-verity-ink">
              <div className="border border-verity-rule bg-card p-4">
                <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                  <span className="rounded bg-verity-paper-soft px-2 py-0.5 text-verity-ink border border-verity-rule">GET</span>
                  <span className="text-verity-ink">/api/internal/v1/capabilities</span>
                </div>
                <p className="mt-2 text-sm text-verity-ink-soft">
                  Memeriksa daftar rubrik aktif, format yang diperbolehkan, dan batasan ukuran payload sebelum memulai penyusunan artikel.
                </p>
              </div>

              <div className="border border-verity-rule bg-card p-4">
                <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                  <span className="rounded bg-verity-paper-soft px-2 py-0.5 text-verity-ink border border-verity-rule">POST</span>
                  <span className="text-verity-ink">/api/internal/v1/ai-submissions/validate</span>
                </div>
                <p className="mt-2 text-sm text-verity-ink-soft">
                  Uji coba skema (Dry Run). Menilai apakah susunan naskah, blok tulisan, dan sumber rujukan telah memenuhi aturan redaksi tanpa membuat data di sistem.
                </p>
              </div>

              <div className="border border-verity-rule bg-card p-4">
                <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                  <span className="rounded bg-verity-accent px-2 py-0.5 text-white">POST</span>
                  <span className="text-verity-ink">/api/internal/v1/ai-submissions</span>
                </div>
                <p className="mt-2 text-sm text-verity-ink-soft">
                  Pengiriman naskah resmi. Membuat rekaman naskah berstatus <code>DRAFT</code> secara atomik, mencatat jejak audit, dan mengembalikan tanda terima naskah (receipt). Wajib menyertakan <code>idempotencyKey</code> unik.
                </p>
              </div>

              <div className="border border-verity-rule bg-card p-4">
                <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                  <span className="rounded bg-verity-paper-soft px-2 py-0.5 text-verity-ink border border-verity-rule">GET</span>
                  <span className="text-verity-ink">/api/internal/v1/ai-submissions/[submissionId]</span>
                </div>
                <p className="mt-2 text-sm text-verity-ink-soft">
                  Memantau perkembangan telaah naskah. Hanya dapat diakses oleh akun integrasi yang mengirimkan naskah bersangkutan.
                </p>
              </div>
            </div>
          </section>

          {/* 5. Skema Konten */}
          <section id="skema-konten" className="scroll-mt-10 border-b border-verity-rule pb-10">
            <h2 className="font-serif text-2xl font-semibold text-verity-ink">
              5. Skema Blok Konten
            </h2>
            <div className="mt-4 space-y-4 text-[0.98rem] leading-[1.7] text-verity-ink">
              <p>
                Isi artikel dikirim dalam bentuk larik blok terstruktur (<code>content</code>). Format ini menjamin keterbacaan tipografi dan kejelasan semantik naskah:
              </p>
              <pre className="overflow-x-auto border border-verity-rule bg-card p-4 font-mono text-xs text-verity-ink">
                <code>
{`[
  {
    "type": "paragraph",
    "text": "Paragraf pembuka yang memaparkan latar belakang persoalan secara objektif."
  },
  {
    "type": "heading",
    "level": 2,
    "text": "Analisis Regulasi dan Dampak Sektoral"
  },
  {
    "type": "quote",
    "text": "Penerapan standar akuntabilitas algoritma membutuhkan verifikasi bukti independen.",
    "attribution": "Pakar Hukum Siber, Universitas Indonesia"
  },
  {
    "type": "list",
    "items": [
      "Kewajiban audit berkala atas model prediktif.",
      "Hak publik atas penjelasan keputusan otomatis."
    ]
  }
]`}
                </code>
              </pre>
            </div>
          </section>

          {/* 6. Sumber Rujukan */}
          <section id="sumber-rujukan" className="scroll-mt-10 border-b border-verity-rule pb-10">
            <h2 className="font-serif text-2xl font-semibold text-verity-ink">
              6. Sumber Rujukan Primer
            </h2>
            <div className="mt-4 space-y-4 text-[0.98rem] leading-[1.7] text-verity-ink">
              <p>
                Setiap klaim fakta, data statistik, atau kutipan regulasi wajib memiliki rujukan primer yang dapat diakses secara daring:
              </p>
              <pre className="overflow-x-auto border border-verity-rule bg-card p-4 font-mono text-xs text-verity-ink">
                <code>
{`"sources": [
  {
    "title": "Peraturan Pemerintah Nomor 28 Tahun 2025",
    "publisher": "Kementerian Hukum dan HAM",
    "url": "https://peraturan.go.id/dokumen/pp-28-2025.pdf",
    "sourceType": "OFFICIAL",
    "isKeySource": true,
    "supports": "Dasar hukum kewajiban transparansi tata kelola data publik."
  }
]`}
                </code>
              </pre>
              <p className="text-sm text-verity-ink-soft">
                Tipe sumber yang valid: <code>PRIMARY</code>, <code>SECONDARY</code>, <code>DOCUMENT</code>, <code>INTERVIEW</code>, <code>DATA</code>, <code>OFFICIAL</code>.
              </p>
            </div>
          </section>

          {/* 7. Penanganan Galat */}
          <section id="penanganan-galat" className="scroll-mt-10 border-b border-verity-rule pb-10">
            <h2 className="font-serif text-2xl font-semibold text-verity-ink">
              7. Penanganan Galat & Kode Respons
            </h2>
            <div className="mt-4 space-y-4 text-[0.98rem] leading-[1.7] text-verity-ink">
              <p>
                Seluruh respons galat disajikan dengan kode status HTTP yang semantik dan badan respons terstruktur:
              </p>
              <pre className="overflow-x-auto border border-verity-rule bg-card p-4 font-mono text-xs text-verity-ink">
                <code>
{`{
  "error": "Payload naskah tidak memenuhi spesifikasi skema.",
  "code": "VALIDATION_ERROR",
  "requestId": "req_84f932e180cd",
  "details": [
    {
      "path": "title",
      "code": "TOO_SHORT",
      "message": "Judul naskah minimal 8 karakter."
    }
  ]
}`}
                </code>
              </pre>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="border border-verity-rule bg-card p-2.5">
                  <span className="font-semibold text-verity-ink">400 MALFORMED_JSON</span>
                  <p className="font-sans text-verity-ink-soft mt-0.5">Format JSON tidak terbaca.</p>
                </div>
                <div className="border border-verity-rule bg-card p-2.5">
                  <span className="font-semibold text-verity-ink">401 UNAUTHORIZED</span>
                  <p className="font-sans text-verity-ink-soft mt-0.5">Token salah atau dicabut.</p>
                </div>
                <div className="border border-verity-rule bg-card p-2.5">
                  <span className="font-semibold text-verity-ink">404 NOT_FOUND</span>
                  <p className="font-sans text-verity-ink-soft mt-0.5">Data bukan milik klien.</p>
                </div>
                <div className="border border-verity-rule bg-card p-2.5">
                  <span className="font-semibold text-verity-ink">409 IDEMPOTENCY_CONFLICT</span>
                  <p className="font-sans text-verity-ink-soft mt-0.5">Kunci dipakai isi berbeda.</p>
                </div>
                <div className="border border-verity-rule bg-card p-2.5">
                  <span className="font-semibold text-verity-ink">422 FORMAT_REJECTED</span>
                  <p className="font-sans text-verity-ink-soft mt-0.5">Format naskah tidak dikenali sistem.</p>
                </div>
                <div className="border border-verity-rule bg-card p-2.5">
                  <span className="font-semibold text-verity-ink">429 RATE_LIMITED</span>
                  <p className="font-sans text-verity-ink-soft mt-0.5">Batas laju terlampaui.</p>
                </div>
              </div>
            </div>
          </section>

          {/* 8. Contoh Kode */}
          <section id="contoh-kode" className="scroll-mt-10 pb-10">
            <h2 className="font-serif text-2xl font-semibold text-verity-ink">
              8. Contoh Integrasi Siap Pakai
            </h2>
            <div className="mt-4 space-y-6 text-[0.98rem] leading-[1.7] text-verity-ink">
              <div>
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-verity-accent">
                  Contoh cURL
                </h3>
                <pre className="mt-2 overflow-x-auto border border-verity-rule bg-card p-4 font-mono text-xs text-verity-ink">
                  <code>
{`curl -X POST "${baseUrl}/api/internal/v1/ai-submissions" \\
  -H "Authorization: Bearer $VERAX_API_CLIENT_ID.$VERAX_API_CLIENT_SECRET" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Analisis: Kesiapan Tata Kelola Audit AI di Sektor Publik",
    "deck": "Telaah atas kerangka verifikasi dan perlindungan hak prosedural warga.",
    "desk": "teknologi-kebijakan",
    "format": "ANALYSIS",
    "content": [
      { "type": "paragraph", "text": "Penerapan otomasi keputusan membutuhkan transparansi..." }
    ],
    "sources": [
      {
        "title": "Pedoman Tata Kelola AI Nasional",
        "url": "https://contoh.go.id/pedoman-ai.pdf",
        "sourceType": "OFFICIAL",
        "isKeySource": true
      }
    ],
    "aiInvolvement": "assistive",
    "agentId": "verax-policy-agent-v1",
    "idempotencyKey": "verax-submit-20261111-001"
  }'`}
                  </code>
                </pre>
              </div>

              <div>
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-verity-accent">
                  Contoh TypeScript / Node.js
                </h3>
                <pre className="mt-2 overflow-x-auto border border-verity-rule bg-card p-4 font-mono text-xs text-verity-ink">
                  <code>
{`import crypto from "node:crypto";

const baseUrl = process.env.VERAX_PUBLIC_BASE_URL || "${baseUrl}";
const clientId = process.env.VERAX_API_CLIENT_ID;
const clientSecret = process.env.VERAX_API_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  throw new Error("Kredensial VERAX_API_CLIENT_ID dan VERAX_API_CLIENT_SECRET wajib disetel.");
}

const payload = {
  title: "Analisis: Kesiapan Tata Kelola Audit AI di Sektor Publik",
  deck: "Telaah atas kerangka verifikasi dan perlindungan hak prosedural warga.",
  desk: "teknologi-kebijakan",
  format: "ANALYSIS",
  content: [
    { type: "paragraph", text: "Penerapan otomasi keputusan membutuhkan transparansi..." }
  ],
  sources: [
    {
      title: "Pedoman Tata Kelola AI Nasional",
      url: "https://contoh.go.id/pedoman-ai.pdf",
      sourceType: "OFFICIAL",
      isKeySource: true
    }
  ],
  aiInvolvement: "assistive",
  agentId: "verax-policy-agent-v1",
  idempotencyKey: \`submit-\${Date.now()}-\${crypto.randomBytes(4).toString("hex")}\`
};

const response = await fetch(\`\${baseUrl}/api/internal/v1/ai-submissions\`, {
  method: "POST",
  headers: {
    "Authorization": \`Bearer \${clientId}.\${clientSecret}\`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
});

if (response.status === 429) {
  const retryAfter = response.headers.get("Retry-After");
  console.warn(\`Laju pengiriman terlampaui. Coba lagi dalam \${retryAfter} detik.\`);
} else if (!response.ok) {
  const errorData = await response.json();
  console.error("Gagal mengirimkan naskah:", errorData);
} else {
  const receipt = await response.json();
  console.log("Naskah berhasil diterima:", receipt.submissionId);
}`}
                  </code>
                </pre>
              </div>

              <div>
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-verity-accent">
                  Contoh Python
                </h3>
                <pre className="mt-2 overflow-x-auto border border-verity-rule bg-card p-4 font-mono text-xs text-verity-ink">
                  <code>
{`import os
import time
import uuid
import requests

base_url = os.getenv("VERAX_PUBLIC_BASE_URL", "${baseUrl}")
client_id = os.getenv("VERAX_API_CLIENT_ID")
client_secret = os.getenv("VERAX_API_CLIENT_SECRET")

if not client_id or not client_secret:
    raise RuntimeError("Kredensial VERAX_API_CLIENT_ID dan VERAX_API_CLIENT_SECRET wajib disetel.")

payload = {
    "title": "Analisis: Kesiapan Tata Kelola Audit AI di Sektor Publik",
    "deck": "Telaah atas kerangka verifikasi dan perlindungan hak prosedural warga.",
    "desk": "teknologi-kebijakan",
    "format": "ANALYSIS",
    "content": [
        {"type": "paragraph", "text": "Penerapan otomasi keputusan membutuhkan transparansi..."}
    ],
    "sources": [
        {
            "title": "Pedoman Tata Kelola AI Nasional",
            "url": "https://contoh.go.id/pedoman-ai.pdf",
            "sourceType": "OFFICIAL",
            "isKeySource": True
        }
    ],
    "aiInvolvement": "assistive",
    "agentId": "verax-policy-agent-v1",
    "idempotencyKey": f"submit-{uuid.uuid4()}"
}

headers = {
    "Authorization": f"Bearer {client_id}.{client_secret}",
    "Content-Type": "application/json"
}

resp = requests.post(f"{base_url}/api/internal/v1/ai-submissions", json=payload, headers=headers)

if resp.status_code == 429:
    retry_after = resp.headers.get("Retry-After", "60")
    print(f"Laju terlampaui. Menunggu {retry_after} detik.")
elif not resp.ok:
    print(f"Galat ({resp.status_code}):", resp.json())
else:
    receipt = resp.json()
    print("Naskah diterima dengan sukses. ID Pengiriman:", receipt.get("submissionId"))`}
                  </code>
                </pre>
              </div>
            </div>
          </section>
        </div>

        {/* Kolom Navigasi Samping */}
        <aside className="hidden lg:block">
          <div className="sticky top-10 border-l border-verity-rule pl-6 space-y-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-verity-accent">
              Daftar Isi Panduan
            </p>
            <nav className="flex flex-col space-y-2 text-sm">
              {SECTIONS.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className="text-verity-ink-soft hover:text-verity-ink hover:underline transition-colors"
                >
                  {sec.label}
                </a>
              ))}
            </nav>

            <div className="border-t border-verity-rule pt-4 text-xs text-verity-ink-soft space-y-2">
              <p className="font-semibold text-verity-ink">Bantuan & Meja Redaksi</p>
              <p>
                Permintaan akses integrasi agen AI diproses melalui Meja Redaksi Studio oleh Pemimpin Redaksi Verax Press.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
