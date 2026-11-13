// Dokumentasi Pengembang & Integrasi Agen AI: /developers
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { AI_PLACEHOLDER_BYLINE, resolveBaseUrlFromHeaders } from "@/lib/domain/constants";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { canonicalUrl } from "@/lib/seo/constants";
import { buildPublicMetadata } from "@/lib/seo/metadata";
import { buildBreadcrumbJsonLd } from "@/lib/seo/structured-data";

export const metadata: Metadata = buildPublicMetadata({
  title: "Dokumentasi Pengembang & Integrasi Agen AI",
  description:
    "Panduan teknis resmi integrasi agen kecerdasan buatan dengan Verax Press: penemuan standar editorial modular, konteks selektif, spesifikasi API, blok konten, dan batasan redaksi.",
  path: "/developers",
});

const SECTIONS = [
  { id: "pengantar", label: "Pengantar & Pemisahan Kebijakan" },
  { id: "standar-editorial", label: "Standar Editorial Modular" },
  { id: "autentikasi", label: "Autentikasi & Kredensial" },
  { id: "lingkungan", label: "Lingkungan & Base URL" },
  { id: "vei-coverage", label: "Verax Editorial Intelligence (VEI)" },
  { id: "titik-akhir", label: "Titik Akhir API Ingestion" },
  { id: "skema-konten", label: "Skema 7 Blok Konten" },
  { id: "sumber-rujukan", label: "Sumber, Gambar & AI Disclosure" },
  { id: "penanganan-galat", label: "Penanganan Galat & Gerbang" },
  { id: "contoh-kode", label: "Contoh Integrasi & Prompt Agen" },
];

export default async function DevelopersPage() {
  const baseUrl = resolveBaseUrlFromHeaders(await headers());

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Beranda", url: canonicalUrl("/") },
          { name: "Dokumentasi Pengembang", url: canonicalUrl("/developers") },
        ])}
      />
      <Breadcrumbs items={[{ label: "Beranda", href: "/" }, { label: "Dokumentasi Pengembang" }]} />
      <header className="border-b-2 border-verity-ink pb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-verity-accent">
          Dokumentasi Pengembang
        </p>
        <h1 className="mt-3 font-serif text-[2.2rem] font-semibold leading-[1.08] tracking-[-0.012em] text-verity-ink sm:text-[2.8rem]">
          Integrasi Agen AI &amp; Spesifikasi API
        </h1>
        <p className="mt-4 max-w-3xl font-serif text-[1.1rem] leading-[1.7] text-verity-ink-soft">
          Panduan integrasi mesin untuk mengambil konteks editorial selektif serta mengirimkan draf naskah jurnalistik ke ruang redaksi Verax Press.
          Seluruh kiriman melalui API diproses sebagai usulan draf awal (<code>DRAFT</code>) dan wajib melewati penelaahan editor manusia.
        </p>

        <div className="mt-6 flex flex-wrap gap-2 text-xs font-mono">
          <Link
            href="/openapi.json"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-verity-rule bg-verity-paper-soft px-3 py-1.5 text-verity-ink hover:border-verity-ink transition-colors"
          >
            OpenAPI 3.1.0 (JSON)
          </Link>
          <Link
            href="/api/internal/v1/capabilities"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-verity-rule bg-verity-paper-soft px-3 py-1.5 text-verity-ink hover:border-verity-ink transition-colors"
          >
            Capabilities JSON
          </Link>
          <Link
            href="/api/internal/v1/editorial/coverage/search"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-verity-rule bg-verity-paper-soft px-3 py-1.5 text-verity-ink hover:border-verity-ink transition-colors"
          >
            Coverage Search (VEI)
          </Link>
          <Link
            href="/editorial/manifest.json"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-verity-rule bg-verity-paper-soft px-3 py-1.5 text-verity-ink hover:border-verity-ink transition-colors"
          >
            Editorial Manifest (PROPOSED)
          </Link>
          <Link
            href="/editorial/context?desk=hukum-keadilan&format=ANALYSIS"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-verity-rule bg-verity-paper-soft px-3 py-1.5 text-verity-ink hover:border-verity-ink transition-colors"
          >
            Contoh Context Resolver
          </Link>
          <Link
            href="/llms.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-verity-rule bg-verity-paper-soft px-3 py-1.5 text-verity-ink hover:border-verity-ink transition-colors"
          >
            llms.txt
          </Link>
          <Link
            href="/llms-full.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-verity-rule bg-verity-paper-soft px-3 py-1.5 text-verity-ink hover:border-verity-ink transition-colors"
          >
            llms-full.txt
          </Link>
          <Link
            href="/.well-known/verax-agent.json"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-verity-rule bg-verity-paper-soft px-3 py-1.5 text-verity-ink hover:border-verity-ink transition-colors"
          >
            .well-known/verax-agent.json
          </Link>
        </div>
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-14">
        {/* Kolom Isi Utama */}
        <div className="min-w-0 space-y-12">
          {/* 1. Pengantar & Pemisahan Kebijakan */}
          <section id="pengantar" className="scroll-mt-10 border-b border-verity-rule pb-10">
            <h2 className="font-serif text-2xl font-semibold text-verity-ink">
              1. Pengantar, Otoritas &amp; Pemisahan Kebijakan
            </h2>
            <div className="mt-4 space-y-4 text-[0.98rem] leading-[1.7] text-verity-ink">
              <p>
                Verax Press adalah platform jurnalisme digital independen percontohan (<em>Ex Fontibus Veritas</em>).
                API integrasi eksternal disediakan bagi agen kecerdasan buatan untuk mengirim usulan draf terstruktur, bukan untuk menerbitkan artikel secara otomatis.
              </p>
              <div className="border-l-4 border-verity-accent bg-verity-paper-soft p-4">
                <p className="font-semibold text-verity-ink">Ketentuan Redaksi Mutlak:</p>
                <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-verity-ink-soft">
                  <li>
                    <strong>Tanpa Publikasi Mandiri:</strong> Tidak ada endpoint publikasi atau persetujuan bagi Agen AI. Seluruh naskah masuk berstatus <code>DRAFT</code>.
                  </li>
                  <li>
                    <strong>Verifikasi Sumber oleh Manusia:</strong> Semua rujukan otomatis masuk berstatus <code>UNVERIFIED</code> hingga diperiksa oleh penyunting meja redaksi. Keputusan <code>PUBLISH</code> hanya dimiliki oleh <code>CHIEF_EDITOR</code>.
                  </li>
                  <li>
                    <strong>Byline Kerja Sementara:</strong> Payload tidak menerima pengisian byline bebas untuk mencegah penyamaran atribusi. Sistem menyetel penanda sementara <code>{AI_PLACEHOLDER_BYLINE}</code> sampai editor manusia menetapkan atribusi sah sebelum terbit (<code>GATE_BYLINE_UNCONFIRMED</code>).
                  </li>
                  <li>
                    <strong>Keterbatasan Revisi API Saat Ini:</strong> API publik belum menyediakan endpoint untuk mengirimkan draf revisi ulang atas <code>submissionId</code> lama ataupun membaca catatan telaah internal ruang redaksi.
                  </li>
                </ul>
              </div>

              <div className="overflow-x-auto border border-verity-rule bg-card">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-verity-rule bg-verity-paper-soft font-mono uppercase text-verity-ink">
                    <tr>
                      <th className="px-4 py-2.5">Jalur Pengiriman</th>
                      <th className="px-4 py-2.5">Format Diterima</th>
                      <th className="px-4 py-2.5">Kebijakan AI &amp; Hak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-verity-rule text-verity-ink-soft">
                    <tr>
                      <td className="px-4 py-2.5 font-medium text-verity-ink">Ruang Redaksi (<code>NEWSROOM</code>)</td>
                      <td className="px-4 py-2.5 font-mono">NEWS, OPINION, ANALYSIS, EXPLAINER, FEATURE, INTERVIEW</td>
                      <td className="px-4 py-2.5">Seluruh 6 format tersedia untuk tim redaksi internal; publikasi tetap dikunci gerbang <code>CHIEF_EDITOR</code>.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-medium text-verity-ink">Kontributor Manusia (<Link href="/kirim-tulisan" className="underline">/kirim-tulisan</Link>)</td>
                      <td className="px-4 py-2.5 font-mono">OPINION, ANALYSIS, EXPLAINER, FEATURE, INTERVIEW</td>
                      <td className="px-4 py-2.5">Format <code>NEWS</code> ditutup (422). AI hanya diizinkan sebagai alat bantu teknis dengan pengungkapan jujur; revisi dilakukan di Portal Kontributor.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-medium text-verity-ink">Agen AI API (<code>INGESTION_API</code>)</td>
                      <td className="px-4 py-2.5 font-mono">OPINION, ANALYSIS, EXPLAINER, FEATURE (bersyarat), INTERVIEW (bersyarat); NEWS ditahan sementara (422)</td>
                      <td className="px-4 py-2.5">Selama standar berstatus <code>PROPOSED</code>, <code>NEWS</code> ditahan fail-closed (<code>FORMAT_PENDING_AUTHORIZATION</code>), sedangkan <code>FEATURE</code> dan <code>INTERVIEW</code> wajib menyertakan sumber <code>INTERVIEW</code>/<code>PRIMARY</code> berspesifikasi <code>supports</code> dan <code>verificationNotes</code> (&ge; 20 karakter). Wajib deklarasi <code>aiInvolvement</code> (<code>none</code>, <code>assistive</code>, <code>substantive</code>); masuk sebagai <code>articleStatus=DRAFT</code>, <code>submissionStatus=SUBMITTED</code>, sumber <code>UNVERIFIED</code>.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* 2. Standar Editorial Modular */}
          <section id="standar-editorial" className="scroll-mt-10 border-b border-verity-rule pb-10">
            <h2 className="font-serif text-2xl font-semibold text-verity-ink">
              2. Standar Editorial Modular &amp; Konteks Selektif
            </h2>
            <div className="mt-4 space-y-4 text-[0.98rem] leading-[1.7] text-verity-ink">
              <div className="border border-verity-ink bg-verity-paper-soft p-4 text-sm">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-verity-accent">
                  Status Standar: PROPOSED (Pratinjau Non-Mengikat)
                </p>
                <p className="mt-1.5 text-verity-ink-soft leading-relaxed">
                  Standar modular <code>VERAX-EDITORIAL-AI</code> versi <code>1.0.0</code> saat ini berstatus <code>PROPOSED</code> (<code>effectiveDate: null</code>, <code>isBindingEffectivePolicy: false</code>).
                  Dokumen disajikan terbuka dalam format baca-saja untuk kebutuhan pratinjau teknis dan pengujian integrasi, dan belum merupakan kebijakan editorial yang disahkan final oleh <code>CHIEF_EDITOR</code>.
                </p>
              </div>
              <p>
                Agen AI tidak perlu mengunduh seluruh repositori. Gunakan endpoint konteks selektif untuk memuat komposisi empat lapis:
                <strong> Prinsip Universal Verax (Layer A) + Profil Satu Desk Aktif (Layer B) + Profil Satu Format (Layer C) + Parameter Penugasan (Layer D)</strong>.
              </p>
              <div className="space-y-3 text-xs font-mono">
                <div className="border border-verity-rule bg-card p-3">
                  <div className="font-semibold text-verity-ink">GET /editorial/manifest.json</div>
                  <p className="font-sans text-verity-ink-soft mt-1">Indeks JSON standar, status persetujuan, daftar modul Layer A, desk aktif, format sah, dan template URL konteks.</p>
                </div>
                <div className="border border-verity-rule bg-card p-3">
                  <div className="font-semibold text-verity-ink">GET /editorial/context?desk=&#123;slug&#125;&amp;format=&#123;FORMAT&#125;&amp;channel=INGESTION_API&amp;coreMode=compact</div>
                  <p className="font-sans text-verity-ink-soft mt-1">
                    Merakit bundel konteks selektif (<code>text/markdown</code> bawaan atau <code>?output=json</code>) tanpa mencampur profil desk/format lain. Mendukung parameter opsional Layer D: <code>topic</code>, <code>mainEditorialQuestion</code>, <code>intendedAudience</code>, <code>proposedAngle</code>, <code>availableSources</code>, <code>currentnessAndChronology</code>, <code>geographicInstitutionalContext</code>, <code>requestedDepth</code>, <code>knownInformationGaps</code>.
                  </p>
                </div>
                <div className="border border-verity-rule bg-card p-3">
                  <div className="font-semibold text-verity-ink">GET /editorial/core | /editorial/core/&#123;identity|principles|verification|ethics|language&#125;</div>
                  <p className="font-sans text-verity-ink-soft mt-1">Akses bundel atau modul tunggal Layer A (<code>text/markdown</code> atau <code>?output=json</code>).</p>
                </div>
                <div className="border border-verity-rule bg-card p-3">
                  <div className="font-semibold text-verity-ink">GET | HEAD /editorial/desks/&#123;slug&#125; &amp; /editorial/formats/&#123;format&#125; &amp; /editorial/operations/&#123;slug&#125;</div>
                  <p className="font-sans text-verity-ink-soft mt-1">
                    Profil satu desk aktif, profil satu format, atau dokumen operasional (<code>ai-workflow</code>, <code>quality-assessment</code>, <code>review-checklist</code>, <code>api-integration</code>). Seluruh endpoint <code>/editorial/*</code> mendukung <code>?output=json|markdown|md</code> (nilai lain <code>422 VALIDATION_ERROR</code>), header <code>If-None-Match</code> (<code>304 Not Modified</code> dengan <code>Vary: Accept</code>), dan checksum <code>sha256</code> atas UTF-8 <code>bodyMarkdown</code> berakhiran baris LF.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Autentikasi */}
          <section id="autentikasi" className="scroll-mt-10 border-b border-verity-rule pb-10">
            <h2 className="font-serif text-2xl font-semibold text-verity-ink">
              3. Autentikasi &amp; Kredensial
            </h2>
            <div className="mt-4 space-y-4 text-[0.98rem] leading-[1.7] text-verity-ink">
              <p>
                Verax Press menerapkan pemisahan kredensial yang tegas antara jalur pembacaan riwayat liputan (VEI) dan jalur pengiriman naskah (Ingestion API):
              </p>

              <div className="space-y-4">
                <div className="border border-verity-rule bg-card p-4">
                  <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-verity-accent">
                    A. Kunci API Verax Editorial Intelligence (VEI): Cakupan coverage:read
                  </h3>
                  <p className="mt-1 text-sm text-verity-ink">
                    Digunakan untuk membaca riwayat artikel terbit dan menguji kebaruan usulan liputan sebelum agen mulai menulis. Mendukung format header Bearer maupun header kustom:
                  </p>
                  <pre className="mt-2 overflow-x-auto border border-verity-rule bg-verity-paper-soft p-3 font-mono text-xs text-verity-ink">
                    <code>
{`Authorization: Bearer <VERAX_COVERAGE_API_KEY>
# atau
X-API-Key: <VERAX_COVERAGE_API_KEY>`}
                    </code>
                  </pre>
                  <p className="mt-2 text-xs text-verity-ink-soft">
                    Kunci ini dikonfigurasi melalui variabel lingkungan <code>VERAX_COVERAGE_API_KEY</code>. Kredensial pengiriman (<code>vrtc_...</code>) dilarang mengakses endpoint coverage dan ditolak dengan status HTTP 403 <code>FORBIDDEN_SCOPE</code>.
                  </p>
                </div>

                <div className="border border-verity-rule bg-card p-4">
                  <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-verity-accent">
                    B. Kredensial Pengiriman Naskah (Ingestion API): Cakupan submit
                  </h3>
                  <p className="mt-1 text-sm text-verity-ink">
                    Digunakan untuk validasi pra-kirim dan pengiriman draf artikel ke meja redaksi. Memerlukan header otorisasi Bearer gabungan:
                  </p>
                  <pre className="mt-2 overflow-x-auto border border-verity-rule bg-verity-paper-soft p-3 font-mono text-xs text-verity-ink">
                    <code>
{`Authorization: Bearer <CLIENT_ID>.<CLIENT_SECRET>
Content-Type: application/json`}
                    </code>
                  </pre>
                  <p className="mt-2 text-xs text-verity-ink-soft">
                    Contoh format: <code>Bearer vrtc_8a7b6c5d4e3f2100.vrtk_f0e1d2c3b4a596877869504132231405</code>. Diterbitkan dan dicabut oleh Pemimpin Redaksi di Meja Redaksi Studio (<code>/studio/api-clients</code>).
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 4. Lingkungan */}
          <section id="lingkungan" className="scroll-mt-10 border-b border-verity-rule pb-10">
            <h2 className="font-serif text-2xl font-semibold text-verity-ink">
              4. Lingkungan &amp; Base URL
            </h2>
            <div className="mt-4 space-y-4 text-[0.98rem] leading-[1.7] text-verity-ink">
              <p>
                Konfigurasi integrasi menggunakan Base URL yang selaras dengan lingkungan target pengujian maupun produksi:
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
                      <td className="px-4 py-2.5 font-sans font-medium text-verity-ink">Base URL Aktif Saat Ini</td>
                      <td className="px-4 py-2.5"><code>{baseUrl}</code></td>
                      <td className="px-4 py-2.5 font-sans">Menyesuaikan host loopback/lingkungan permintaan yang sah secara otomatis.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-sans font-medium text-verity-ink">Produksi</td>
                      <td className="px-4 py-2.5"><code>https://veraxpress.vercel.app</code></td>
                      <td className="px-4 py-2.5 font-sans">Kredensial produksi terpisah; penyimpanan produksi terisolasi.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-sans font-medium text-verity-ink">Pengembangan Lokal</td>
                      <td className="px-4 py-2.5"><code>http://localhost:3000</code> / <code>http://127.0.0.1:3000</code></td>
                      <td className="px-4 py-2.5 font-sans">Kredensial lokal dengan penyimpanan pengembangan terisolasi.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* 5. Verax Editorial Intelligence */}
          <section id="vei-coverage" className="scroll-mt-10 border-b border-verity-rule pb-10">
            <h2 className="font-serif text-2xl font-semibold text-verity-ink">
              5. Verax Editorial Intelligence (VEI)
            </h2>
            <div className="mt-4 space-y-4 text-[0.98rem] leading-[1.7] text-verity-ink">
              <p>
                Verax Editorial Intelligence (VEI) adalah lapisan baca-saja (<em>read-only</em>) yang dirancang agar agen kecerdasan buatan eksternal dapat memeriksa riwayat liputan terpublikasi sebelum merumuskan naskah baru. Hal ini mencegah pengulangan topik yang sama dan memastikan setiap naskah membawa sudut pandang baru.
              </p>
              <div className="border border-verity-ink bg-verity-paper-soft p-4 text-sm">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-verity-accent">
                  Prinsip Isolasi Publikasi &amp; Tanpa Opini Rekomendasi
                </p>
                <p className="mt-1.5 text-verity-ink-soft leading-relaxed">
                  VEI hanya mengembalikan artikel yang telah berstatus terpublikasi resmi (<code>PUBLISHED</code> atau <code>CORRECTED</code>). Draf penulis lain, pengajuan yang masih dalam proses penelaahan, serta catatan internal editor tidak dapat diakses sama sekali. API ini juga tidak memberikan putusan lolos atau tolak, evaluasi kelayakan topik diserahkan sepenuhnya kepada nalar agen penulis itu sendiri.
                </p>
              </div>

              <div className="space-y-4 text-xs font-mono">
                <div className="border border-verity-rule bg-card p-4">
                  <div className="flex items-center gap-2 font-semibold">
                    <span className="rounded-xs bg-verity-paper-soft px-2 py-0.5 text-verity-ink border border-verity-rule">GET | HEAD</span>
                    <span className="text-verity-ink">/api/internal/v1/editorial/coverage/search</span>
                  </div>
                  <p className="font-sans text-sm text-verity-ink-soft mt-2">
                    Mencari artikel terpublikasi berdasarkan kata kunci teks, desk editorial, dan rentang tanggal publikasi. Kueri mencari pada lima bidang: judul, topik, entitas, pertanyaan inti, dan sudut pandang editorial.
                  </p>
                  <div className="mt-3 font-sans text-xs text-verity-ink">
                    <p className="font-semibold">Parameter Kueri:</p>
                    <ul className="mt-1 list-disc list-inside space-y-1 text-verity-ink-soft">
                      <li><code>q</code>: Kata kunci pencarian teks (opsional).</li>
                      <li><code>desk</code>: Slug atau nama desk (misal: <code>hukum-keadilan</code>, opsional).</li>
                      <li><code>from</code> / <code>to</code>: Filter rentang tanggal publikasi ISO 8601 (opsional).</li>
                      <li><code>limit</code>: Jumlah rekaman per halaman (1 sampai 100, bawaan: 20).</li>
                      <li><code>cursor</code>: ID artikel untuk paginasi halaman berikutnya.</li>
                    </ul>
                  </div>
                  <pre className="mt-3 overflow-x-auto border border-verity-rule bg-verity-paper-soft p-3 font-mono text-[11px] text-verity-ink">
                    <code>
{`# Contoh cURL Pencarian Liputan
curl -X GET "${baseUrl}/api/internal/v1/editorial/coverage/search?q=kecerdasan%20buatan&desk=teknologi-kebijakan&limit=10" \\
  -H "Authorization: Bearer <VERAX_COVERAGE_API_KEY>"`}
                    </code>
                  </pre>
                </div>

                <div className="border border-verity-rule bg-card p-4">
                  <div className="flex items-center gap-2 font-semibold">
                    <span className="rounded-xs bg-verity-accent px-2 py-0.5 text-verity-paper">POST</span>
                    <span className="text-verity-ink">/api/internal/v1/editorial/coverage/check</span>
                  </div>
                  <p className="font-sans text-sm text-verity-ink-soft mt-2">
                    Mengevaluasi tingkat tumpang tindih usulan naskah terhadap seluruh korpus artikel terpublikasi secara deterministik. Mengembalikan tingkat tumpang tindih (<code>overlapLevel</code>: <code>none</code>, <code>partial</code>, atau <code>high</code>) serta daftar artikel yang memiliki irisan topik atau entitas.
                  </p>
                  <pre className="mt-3 overflow-x-auto border border-verity-rule bg-verity-paper-soft p-3 font-mono text-[11px] text-verity-ink">
                    <code>
{`# Contoh cURL Uji Kebaruan Usulan (Novelty Check)
curl -X POST "${baseUrl}/api/internal/v1/editorial/coverage/check" \\
  -H "Authorization: Bearer <VERAX_COVERAGE_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "proposedTitle": "Tanggung Jawab Hukum Penggunaan Kecerdasan Buatan Generatif",
    "topic": "Regulasi AI dan Perlindungan Data",
    "centralQuestion": "Siapa yang bertanggung jawab ketika sistem AI membocorkan data pribadi?",
    "proposedAngle": "Analisis pembagian beban tanggung jawab penyedia model versus pemakai korporat.",
    "entities": ["UU PDP", "Kementerian Komdigi", "Penyedia LLM"]
  }'`}
                    </code>
                  </pre>
                  <p className="mt-2 font-sans text-xs text-verity-ink-soft">
                    Format keluaran mencantumkan <code>overlapLevel</code> dan larik <code>matches</code> berisi judul, topik, entitas, pertanyaan inti, serta sudut pandang artikel terbit terdahulu untuk bahan perbandingan agen.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 6. Titik Akhir API Ingestion */}
          <section id="titik-akhir" className="scroll-mt-10 border-b border-verity-rule pb-10">
            <h2 className="font-serif text-2xl font-semibold text-verity-ink">
              6. Titik Akhir API Ingestion
            </h2>
            <div className="mt-4 space-y-6 text-[0.98rem] leading-[1.7] text-verity-ink">
              <div className="border border-verity-rule bg-card p-4">
                <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                  <span className="rounded-xs bg-verity-paper-soft px-2 py-0.5 text-verity-ink border border-verity-rule">GET | HEAD</span>
                  <span className="text-verity-ink">/api/internal/v1/capabilities</span>
                </div>
                <p className="mt-2 text-sm text-verity-ink-soft">
                  Mengambil daftar desk aktif di basis data, format yang diizinkan, batas ukuran, tautan standar editorial <code>PROPOSED</code>, dan pemisahan kebijakan jalur.
                </p>
              </div>

              <div className="border border-verity-rule bg-card p-4">
                <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                  <span className="rounded-xs bg-verity-paper-soft px-2 py-0.5 text-verity-ink border border-verity-rule">POST</span>
                  <span className="text-verity-ink">/api/internal/v1/ai-submissions/validate</span>
                </div>
                <p className="mt-2 text-sm text-verity-ink-soft">
                  Uji coba skema (<em>Dry Run</em>, batas 30 req/menit). Memvalidasi skema, tanggal ISO, format, dan desk tanpa membuat data di basis data, serta mengembalikan daftar peringatan non-blocking (misalnya bila <code>deck</code> kosong atau <code>aiUsageNote</code> belum diisi saat <code>substantive</code>).
                </p>
              </div>

              <div className="border border-verity-rule bg-card p-4">
                <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                  <span className="rounded-xs bg-verity-accent px-2 py-0.5 text-verity-paper">POST</span>
                  <span className="text-verity-ink">/api/internal/v1/ai-submissions</span>
                </div>
                <p className="mt-2 text-sm text-verity-ink-soft">
                  Pengiriman draf baru (batas 12 req/menit). Menyimpan draf artikel dengan <code>articleStatus=DRAFT</code>, tanda terima pengiriman <code>submissionStatus=SUBMITTED</code>, seluruh rujukan berstatus <code>UNVERIFIED</code>, serta byline sementara <code>{AI_PLACEHOLDER_BYLINE}</code>. Memerlukan <code>idempotencyKey</code> unik (8..128 karakter); pengulangan payload identik mengembalikan HTTP <code>200</code> (<code>idempotentReplay: true</code>).
                </p>
              </div>

              <div className="border border-verity-rule bg-card p-4">
                <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                  <span className="rounded-xs bg-verity-paper-soft px-2 py-0.5 text-verity-ink border border-verity-rule">GET | HEAD</span>
                  <span className="text-verity-ink">/api/internal/v1/ai-submissions/[submissionId]</span>
                </div>
                <p className="mt-2 text-sm text-verity-ink-soft">
                  Memantau status pemrosesan draf milik klien sendiri. Mengembalikan <code>submissionStatus</code> (<code>SUBMITTED</code>, <code>EDITORIAL_REVIEW</code>, atau <code>RESOLVED</code>) dan <code>articleStatus</code> / <code>editorialStatus</code> (mengikuti seluruh status siklus hidup artikel aktual tanpa mengekspos catatan internal redaksi).
                </p>
              </div>
            </div>
          </section>

          {/* 7. Skema 7 Blok Konten */}
          <section id="skema-konten" className="scroll-mt-10 border-b border-verity-rule pb-10">
            <h2 className="font-serif text-2xl font-semibold text-verity-ink">
              7. Skema 7 Blok Konten Terstruktur
            </h2>
            <div className="mt-4 space-y-4 text-[0.98rem] leading-[1.7] text-verity-ink">
              <p>
                Bidang <code>content</code> berisi <code>1</code> hingga <code>300</code> objek blok JSON terstruktur. HTML mentah tidak diizinkan. Ketujuh tipe yang didukung validator dan perender (sesuai <code>components.schemas.ContentBlock</code> di OpenAPI) adalah:
                <code>paragraph</code> (<code>ParagraphBlock</code>), <code>heading</code> (<code>HeadingBlock</code>), <code>quote</code> (<code>QuoteBlock</code>), <code>list</code> (<code>ListBlock</code>, <strong>wajib menyertakan <code>style</code></strong>), <code>image</code> (<code>ImageBlock</code>), <code>note</code> (<code>NoteBlock</code>), dan <code>qa</code> (<code>QaBlock</code>).
              </p>
              <pre className="overflow-x-auto border border-verity-rule bg-card p-4 font-mono text-xs text-verity-ink">
                <code>
{`[
  {
    "type": "paragraph",
    "text": "Paragraf pembuka yang memaparkan fakta inti secara langsung dan utuh (minimal 120 karakter memicu tampilan drop cap klasik di halaman baca)."
  },
  {
    "type": "heading",
    "level": 2,
    "text": "Ringkasan Ketentuan dan Bukti Dokumen"
  },
  {
    "type": "list",
    "style": "bullet",
    "items": [
      "style WAJIB bernilai 'bullet' atau 'number'.",
      "Minimal 1 butir, maksimal 50 butir per blok."
    ]
  },
  {
    "type": "quote",
    "text": "Kutipan langsung narasumber wajib sesuai dokumen atau rekaman.",
    "attribution": "Nama Pejabat atau Peneliti, Lembaga"
  },
  {
    "type": "image",
    "url": "https://contoh.go.id/grafik-anggaran.png",
    "alt": "Grafik realisasi anggaran kuartal pertama",
    "caption": "Sumber visual resmi untuk ilustrasi naskah.",
    "credit": "Dokumentasi Lembaga Terkait"
  },
  {
    "type": "note",
    "label": "Catatan Metodologi",
    "text": "Menjelaskan cakupan data, periode waktu, atau keterbatasan dokumen."
  },
  {
    "type": "qa",
    "question": "Apa perbedaan jalur kontributor dan jalur API?",
    "answer": "Kontributor mengirim lewat portal web (tanpa format NEWS), sedangkan agen AI mengirim melalui API Ingestion."
  }
]`}
                </code>
              </pre>
            </div>
          </section>

          {/* 8. Sumber Rujukan, Gambar, & AI Disclosure */}
          <section id="sumber-rujukan" className="scroll-mt-10 border-b border-verity-rule pb-10">
            <h2 className="font-serif text-2xl font-semibold text-verity-ink">
              8. Sumber Rujukan, Gambar, &amp; Transparansi AI
            </h2>
            <div className="mt-4 space-y-4 text-[0.98rem] leading-[1.7] text-verity-ink">
              <p>
                Setiap naskah wajib menyertakan minimal <code>1</code> hingga <code>40</code> rujukan sumber (<code>SourceReference</code>).
                Kolom tanggal <code>publishedAt</code> dan <code>accessedAt</code> wajib memakai format ISO 8601 yang valid (<code>YYYY-MM-DD</code> atau <code>YYYY-MM-DDTHH:mm:ssZ</code>); nilai non-ISO akan ditolak dengan HTTP <code>422 VALIDATION_ERROR</code>.
              </p>
              <pre className="overflow-x-auto border border-verity-rule bg-card p-4 font-mono text-xs text-verity-ink">
                <code>
{`"sources": [
  {
    "title": "Contoh Dokumen Resmi Kebijakan Publik",
    "publisher": "Lembaga Penerbit Resmi",
    "url": "https://contoh.go.id/dokumen/kebijakan.pdf",
    "sourceType": "OFFICIAL",
    "publishedAt": "2026-11-10",
    "accessedAt": "2026-11-12T08:00:00Z",
    "supports": "Pasal 4 ayat (1) mengenai mekanisme audit terbuka.",
    "isKeySource": true
  }
]`}
                </code>
              </pre>
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-verity-ink-soft">
                <li>
                  <strong>Tipe Sumber:</strong> <code>PRIMARY</code>, <code>SECONDARY</code>, <code>DOCUMENT</code>, <code>INTERVIEW</code>, <code>DATA</code>, <code>OFFICIAL</code> (bawaan <code>SECONDARY</code>).
                </li>
                <li>
                  <strong>Aset Gambar (<code>images</code>):</strong> Maksimal <code>20</code> item (<code>url</code> http(s) atau <code>/...</code>, <code>creator</code>, <code>license</code>, <code>permissionEvidence</code>, <code>caption</code>). Catatan: bidang boolean <code>isSynthetic</code> belum diekspos pada API ingestion sehingga ilustrasi sintetis AI wajib dicatat terang di <code>license</code> dan <code>caption</code>.
                </li>
                <li>
                  <strong>Deklarasi AI:</strong> <code>aiInvolvement</code> wajib bernilai <code>none</code>, <code>assistive</code>, atau <code>substantive</code>. Bila <code>none</code>, <code>aiUsageNote</code> tidak diperlukan; bila <code>assistive</code>, bersifat opsional; bila <code>substantive</code>, sangat dianjurkan terisi jelas dan layak baca publik. Batas validator API saat ini <code>1.000</code> karakter, sedangkan catatan publik yang disunting redaksi dibatasi maksimal <code>600</code> karakter sehingga disarankan ringkas <code>&lt;= 600</code> karakter.
                </li>
              </ul>
            </div>
          </section>

          {/* 9. Penanganan Galat & Gerbang Publikasi */}
          <section id="penanganan-galat" className="scroll-mt-10 border-b border-verity-rule pb-10">
            <h2 className="font-serif text-2xl font-semibold text-verity-ink">
              9. Penanganan Galat &amp; Enam Gerbang Publikasi
            </h2>
            <div className="mt-4 space-y-4 text-[0.98rem] leading-[1.7] text-verity-ink">
              <p>
                Seluruh respons galat mengembalikan JSON terstruktur berisi <code>error</code>, <code>code</code>, dan <code>requestId</code> (selaras dengan header <code>x-request-id</code>):
              </p>
              <pre className="overflow-x-auto border border-verity-rule bg-card p-4 font-mono text-xs text-verity-ink">
                <code>
{`{
  "error": "Payload naskah tidak memenuhi spesifikasi skema.",
  "code": "VALIDATION_ERROR",
  "requestId": "req_84f932e180cd",
  "details": [
    {
      "path": "content.0.style",
      "code": "INVALID_UNION",
      "message": "Invalid input"
    }
  ]
}`}
                </code>
              </pre>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                <div className="border border-verity-rule bg-card p-2.5">
                  <span className="font-semibold text-verity-ink">400 MALFORMED_JSON / INVALID_PARAMETER / INVALID_CURSOR</span>
                  <p className="font-sans text-verity-ink-soft mt-0.5">Tubuh bukan JSON valid atau parameter kueri salah.</p>
                </div>
                <div className="border border-verity-rule bg-card p-2.5">
                  <span className="font-semibold text-verity-ink">401 UNAUTHORIZED / CREDENTIAL_REVOKED / CREDENTIAL_EXPIRED / CLIENT_INACTIVE</span>
                  <p className="font-sans text-verity-ink-soft mt-0.5">Kredensial tidak valid, dicabut, kedaluwarsa, atau nonaktif.</p>
                </div>
                <div className="border border-verity-rule bg-card p-2.5">
                  <span className="font-semibold text-verity-ink">403 FORBIDDEN_SCOPE</span>
                  <p className="font-sans text-verity-ink-soft mt-0.5">Kredensial di luar cakupan (misal kunci submit dipakai membaca coverage).</p>
                </div>
                <div className="border border-verity-rule bg-card p-2.5">
                  <span className="font-semibold text-verity-ink">404 NOT_FOUND</span>
                  <p className="font-sans text-verity-ink-soft mt-0.5">Submission tidak ditemukan atau bukan milik klien.</p>
                </div>
                <div className="border border-verity-rule bg-card p-2.5">
                  <span className="font-semibold text-verity-ink">405 METHOD_NOT_ALLOWED</span>
                  <p className="font-sans text-verity-ink-soft mt-0.5">Metode HTTP dilarang; cek header <code>Allow</code>.</p>
                </div>
                <div className="border border-verity-rule bg-card p-2.5">
                  <span className="font-semibold text-verity-ink">409 IDEMPOTENCY_CONFLICT</span>
                  <p className="font-sans text-verity-ink-soft mt-0.5">Kunci idempotency dipakai payload berbeda.</p>
                </div>
                <div className="border border-verity-rule bg-card p-2.5">
                  <span className="font-semibold text-verity-ink">422 VALIDATION_ERROR</span>
                  <p className="font-sans text-verity-ink-soft mt-0.5">Skema blok, parameter <code>output</code>/<code>mode</code>, batas panjang, atau tanggal ISO tidak valid.</p>
                </div>
                <div className="border border-verity-rule bg-card p-2.5">
                  <span className="font-semibold text-verity-ink">422 FORMAT_REJECTED</span>
                  <p className="font-sans text-verity-ink-soft mt-0.5">Format tidak sah, ditahan sementara (<code>FORMAT_PENDING_AUTHORIZATION</code> untuk <code>NEWS</code>), atau prasyarat peliputan gagal (<code>FORMAT_PRECONDITION_FAILED</code> untuk <code>FEATURE</code>/<code>INTERVIEW</code>).</p>
                </div>
                <div className="border border-verity-rule bg-card p-2.5">
                  <span className="font-semibold text-verity-ink">422 DESK_REJECTED</span>
                  <p className="font-sans text-verity-ink-soft mt-0.5">Slug desk tidak ditemukan atau berstatus nonaktif.</p>
                </div>
                <div className="border border-verity-rule bg-card p-2.5">
                  <span className="font-semibold text-verity-ink">429 RATE_LIMITED</span>
                  <p className="font-sans text-verity-ink-soft mt-0.5">Batas 12 req/menit (submit) atau 30 req/menit (validate) terlampaui; ikuti header <code>Retry-After</code>.</p>
                </div>
                <div className="border border-verity-rule bg-card p-2.5">
                  <span className="font-semibold text-verity-ink">500 INTERNAL_ERROR</span>
                  <p className="font-sans text-verity-ink-soft mt-0.5">Gangguan pemrosesan internal server.</p>
                </div>
              </div>
              <p className="text-sm text-verity-ink-soft">
                Saat <code>CHIEF_EDITOR</code> menindaklanjuti draf menuju publikasi, server menegakkan enam gerbang wajib: <code>GATE_NO_KEY_SOURCES</code>, <code>GATE_SOURCE_VERIFICATION</code>, <code>GATE_EMPTY_CONTENT</code> (isi teks non-kosong pada <code>paragraph</code>, <code>quote</code>, <code>list</code>, atau <code>qa</code>), <code>GATE_NO_DECK</code>, <code>GATE_BYLINE_UNCONFIRMED</code> (byline final atau atribusi manusia wajib dikonfirmasi), dan <code>GATE_AI_DISCLOSURE</code> (pengungkapan publik wajib jika <code>aiInvolvement = substantive</code>).
              </p>
            </div>
          </section>

          {/* 10. Contoh Kode & Prompt Agen */}
          <section id="contoh-kode" className="scroll-mt-10 pb-10">
            <h2 className="font-serif text-2xl font-semibold text-verity-ink">
              10. Contoh Integrasi Siap Pakai &amp; Prompt Agen
            </h2>
            <div className="mt-4 space-y-6 text-[0.98rem] leading-[1.7] text-verity-ink">
              <div className="border border-verity-ink bg-verity-paper-soft p-4">
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-verity-accent">
                  Instruksi Sistem Siap Tempel untuk Agen Penulis AI (Gemini Agent Instruction)
                </h3>
                <p className="mt-1 text-sm text-verity-ink">
                  Salin blok instruksi di bawah ini langsung ke system instruction agen AI eksternal agar agen otomatis memeriksa riwayat liputan sebelum mulai menyusun naskah:
                </p>
                <pre className="mt-3 overflow-x-auto border border-verity-rule bg-card p-4 font-mono text-xs text-verity-ink">
                  <code>
{`Peran: Agen Jurnalis AI Mandiri untuk Verax Press
Sebelum mulai menulis naskah artikel baru, Anda WAJIB menjalankan protokol pra-penulisan Verax Editorial Intelligence:

Langkah 1: Periksa Riwayat Liputan
Kirim permintaan POST ke ${baseUrl}/api/internal/v1/editorial/coverage/check
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

Langkah 3: Ambil Konteks Standar Editorial
Sebelum menyusun draf, panggil:
GET ${baseUrl}/editorial/context?desk=<deskSlug>&format=<FORMAT>&channel=INGESTION_API&coreMode=compact
Ikuti prinsip pembuktian sumber primer dan format 7 blok konten terstruktur.`}
                  </code>
                </pre>
              </div>

              <div>
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-verity-accent">
                  Alur Lengkap cURL (Pra-Penulisan, Konteks, dan Pengiriman)
                </h3>
                <pre className="mt-2 overflow-x-auto border border-verity-rule bg-card p-4 font-mono text-xs text-verity-ink">
                  <code>
{`# 1. Cek riwayat liputan dan kebaruan usulan (Cakupan coverage:read)
curl -X POST "${baseUrl}/api/internal/v1/editorial/coverage/check" \\
  -H "Authorization: Bearer $VERAX_COVERAGE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "proposedTitle": "Analisis: Menakar Akuntabilitas Hukum Sistem AI Sektor Publik",
    "topic": "Akuntabilitas Keputusan Algoritmik",
    "centralQuestion": "Bagaimana warga negara menguji keputusan administratif otomatis?",
    "proposedAngle": "Perlindungan hak prosedural warga dalam pelayanan publik digital.",
    "entities": ["PP No. 28 Tahun 2025", "Kemenkumham", "PTUN"]
  }'

# 2. Muat konteks editorial selektif (status PROPOSED, bukan kebijakan final)
curl -s "${baseUrl}/editorial/context?desk=teknologi-kebijakan&format=ANALYSIS&channel=INGESTION_API&coreMode=compact"

# 3. Uji coba skema (Dry Run) sebelum kirim nyata
curl -X POST "${baseUrl}/api/internal/v1/ai-submissions/validate" \\
  -H "Authorization: Bearer $VERAX_API_CLIENT_ID.$VERAX_API_CLIENT_SECRET" \\
  -H "Content-Type: application/json" \\
  -d '{ ...payload draf naskah... }'

# 4. Kirim naskah resmi ke meja redaksi
curl -X POST "${baseUrl}/api/internal/v1/ai-submissions" \\
  -H "Authorization: Bearer $VERAX_API_CLIENT_ID.$VERAX_API_CLIENT_SECRET" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Analisis: Menakar Akuntabilitas Hukum Sistem AI Sektor Publik",
    "deck": "Ringkasan uji alur kerja ingestion draf berbasis sumber primer.",
    "desk": "teknologi-kebijakan",
    "format": "ANALYSIS",
    "content": [
      { "type": "paragraph", "text": "Paragraf pembuka uji skema payload yang mengikuti pedoman struktur blok resmi Verax Press dan menyertakan atribusi bukti yang jelas." },
      { "type": "list", "style": "bullet", "items": ["Butir pertama bukti dokumen.", "Butir kedua batasan temuan."] }
    ],
    "sources": [
      {
        "title": "Peraturan Pemerintah No. 28 Tahun 2025",
        "url": "https://peraturan.go.id/dokumen/pp-28-2025.pdf",
        "sourceType": "OFFICIAL",
        "publishedAt": "2026-11-10",
        "accessedAt": "2026-11-12T08:00:00Z",
        "supports": "Menguji ketertelusuran rujukan sumber pada skema draf.",
        "isKeySource": true
      }
    ],
    "aiInvolvement": "assistive",
    "aiUsageNote": "Agen AI menyusun draf awal terstruktur dari dokumen rujukan untuk diperiksa penyunting manusia.",
    "agentId": "verax-policy-agent-v1",
    "idempotencyKey": "verax-submit-20261112-001"
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

const baseUrl = process.env.VERAX_API_BASE_URL || "${baseUrl}";
const clientId = process.env.VERAX_API_CLIENT_ID;
const clientSecret = process.env.VERAX_API_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  throw new Error("Kredensial VERAX_API_CLIENT_ID dan VERAX_API_CLIENT_SECRET wajib disetel.");
}

// 1. Ambil konteks selektif untuk desk + format target
const ctxRes = await fetch(
  \`\${baseUrl}/editorial/context?desk=teknologi-kebijakan&format=ANALYSIS&channel=INGESTION_API&output=json\`,
);
const editorialContext = await ctxRes.json();
console.log("Status standar:", editorialContext.status, "Mengikat:", editorialContext.isBindingEffectivePolicy);

// 2. Susun payload valid
const payload = {
  title: "Contoh Pengujian: Tata Kelola Audit Sistem Otomatis",
  deck: "Ringkasan uji alur kerja ingestion draf berbasis sumber primer.",
  desk: "teknologi-kebijakan",
  format: "ANALYSIS",
  content: [
    { type: "paragraph", text: "Paragraf pembuka uji skema payload yang mengikuti pedoman struktur blok resmi Verax Press dan menyertakan atribusi bukti yang jelas." },
    { type: "list", style: "number", items: ["Langkah pemeriksaan satu.", "Langkah pemeriksaan dua."] }
  ],
  sources: [
    {
      title: "Contoh Dokumen Rujukan Resmi",
      url: "https://example.org/contoh-dokumen.pdf",
      sourceType: "OFFICIAL",
      publishedAt: "2026-11-10",
      isKeySource: true
    }
  ],
  aiInvolvement: "assistive",
  aiUsageNote: "Membantu penyusunan struktur awal dari dokumen rujukan.",
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
  console.log("Naskah diterima sebagai DRAFT:", receipt.submissionId);
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
import uuid
import requests

base_url = os.getenv("VERAX_API_BASE_URL", "${baseUrl}")
client_id = os.getenv("VERAX_API_CLIENT_ID")
client_secret = os.getenv("VERAX_API_CLIENT_SECRET")

if not client_id or not client_secret:
    raise RuntimeError("Kredensial VERAX_API_CLIENT_ID dan VERAX_API_CLIENT_SECRET wajib disetel.")

payload = {
    "title": "Contoh Pengujian: Tata Kelola Audit Sistem Otomatis",
    "deck": "Ringkasan uji alur kerja ingestion draf berbasis sumber primer.",
    "desk": "teknologi-kebijakan",
    "format": "ANALYSIS",
    "content": [
        {"type": "paragraph", "text": "Paragraf pembuka uji skema payload yang mengikuti pedoman struktur blok resmi Verax Press."}
    ],
    "sources": [
        {
            "title": "Contoh Dokumen Rujukan Resmi",
            "url": "https://example.org/contoh-dokumen.pdf",
            "sourceType": "OFFICIAL",
            "publishedAt": "2026-11-10",
            "isKeySource": True
        }
    ],
    "aiInvolvement": "assistive",
    "aiUsageNote": "Membantu penyusunan struktur awal dari dokumen rujukan.",
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
    print("Naskah diterima sebagai DRAFT. ID Pengiriman:", receipt.get("submissionId"))`}
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
              <p className="font-semibold text-verity-ink">Bantuan &amp; Meja Redaksi</p>
              <p>
                Permintaan akses integrasi agen AI diproses melalui Meja Redaksi Studio oleh Pemimpin Redaksi Verax Press.
              </p>
              <div className="pt-2 space-y-1 font-mono text-[11px]">
                <Link href="/standar-editorial" className="block text-verity-accent underline">
                  Standar Editorial →
                </Link>
                <Link href="/kebijakan-ai" className="block text-verity-accent underline">
                  Kebijakan AI Publik →
                </Link>
                <Link href="/kirim-tulisan" className="block text-verity-accent underline">
                  Jalur Kontributor Manusia →
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
