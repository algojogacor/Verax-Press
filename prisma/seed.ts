/**
 * Verax Press seed — idempotent (aman dijalankan ulang).
 * - Konten seed adalah kebijakan platform sendiri (faktual & dapat dilacak), BUKAN liputan berita nyata.
 *   Wajib diganti sebelum go-live publik (lihat worklog §11).
 * - Password akun dari env dengan fallback DEV-ONLY (wajib override di produksi):
 *   VERITY_SEED_PASSWORD_CHIEF / _EDITOR / _AUTHOR
 * - Secret API client demo ditulis ke .env.local (VERITY_INGESTION_DEMO_CLIENT_SECRET), tidak ke source.
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hashPassword } from "../src/lib/password";
import { hashClientSecret, generateClientCredential } from "../src/lib/api-key";
import { AI_PLACEHOLDER_BYLINE } from "../src/lib/domain/constants";

const db = new PrismaClient();

const CHIEF_EMAIL = "chief@verity.test";
const EDITOR_EMAIL = "editor@verity.test";
const AUTHOR_EMAIL = "penulis@verity.test";

function envPassword(name: string, fallback: string): string {
  const val = process.env[name];
  if (process.env.NODE_ENV === "production") {
    if (!val) {
      throw new Error(`SECURITY FATAL: Environment variable ${name} must be explicitly set in production. Refusing to seed dev fallback credentials.`);
    }
    if (val === fallback) {
      throw new Error(`SECURITY FATAL: ${name} cannot use the default development credential in production.`);
    }
    return val;
  }
  return val ?? fallback;
}

function daysAgo(n: number, hour = 9): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 12, 0, 0);
  return d;
}

interface SeedBlock {
  type: string;
  text?: string;
  level?: number;
  attribution?: string;
  style?: string;
  items?: string[];
  url?: string;
  alt?: string;
  caption?: string;
  credit?: string;
  label?: string;
  question?: string;
  answer?: string;
}

function p(text: string): SeedBlock { return { type: "paragraph", text }; }
function h2(text: string): SeedBlock { return { type: "heading", level: 2, text }; }
function quote(text: string, attribution: string): SeedBlock { return { type: "quote", text, attribution }; }
function bullets(items: string[]): SeedBlock { return { type: "list", style: "bullet", items }; }
function note(label: string, text: string): SeedBlock { return { type: "note", label, text }; }

interface SeedSource {
  title: string;
  publisher: string;
  url: string;
  sourceType: string;
  publishedAt?: Date | null;
  supports: string;
  isKeySource: boolean;
  verificationStatus: string;
}

async function upsertArticle(input: {
  slug: string;
  title: string;
  deck: string;
  deskSlug: string;
  format: string;
  status: string;
  origin: string;
  byline: string;
  aiInvolvement: string;
  aiDisclosurePublic?: boolean;
  aiDisclosureNote?: string | null;
  content: SeedBlock[];
  createdById: string;
  publishedAt?: Date | null;
  firstPublishedAt?: Date | null;
  sources: SeedSource[];
  verifiedByStaffId?: string;
  contributions: { personId: string; role: string; displayOrder: number; publicCredit: boolean }[];
  reviews: { reviewerId: string; fromStatus: string; toStatus: string; decision: string; notes?: string; createdAt: Date }[];
  versionType?: string;
  createdByLabel?: string;
}) {
  const desk = await db.desk.findUniqueOrThrow({ where: { slug: input.deskSlug } });
  const existing = await db.article.findUnique({ where: { slug: input.slug } });
  const contentJson = JSON.stringify(input.content);

  const article =
    existing ??
    (await db.article.create({
      data: {
        slug: input.slug,
        title: input.title,
        deck: input.deck,
        deskId: desk.id,
        format: input.format,
        status: "DRAFT",
        contentJson,
        byline: input.byline,
        origin: input.origin,
        aiInvolvement: input.aiInvolvement,
        aiDisclosurePublic: input.aiDisclosurePublic ?? false,
        aiDisclosureNote: input.aiDisclosureNote ?? null,
        createdById: input.createdById,
        createdAt: input.publishedAt ?? daysAgo(10),
      },
    }));

  // Versi #1 (naskah awal)
  const versionCount = await db.articleVersion.count({ where: { articleId: article.id } });
  if (versionCount === 0) {
    await db.articleVersion.create({
      data: {
        articleId: article.id,
        versionNo: 1,
        title: input.title,
        deck: input.deck,
        contentJson,
        versionType: input.versionType ?? "author",
        createdById: input.versionType ? null : input.createdById,
        createdByLabel: input.createdByLabel ?? null,
        createdAt: input.publishedAt ?? daysAgo(10),
      },
    });
  }

  // Sumber
  const sourceCount = await db.sourceReference.count({ where: { articleId: article.id } });
  if (sourceCount === 0) {
    for (const s of input.sources) {
      await db.sourceReference.create({
        data: {
          articleId: article.id,
          title: s.title,
          publisher: s.publisher,
          url: s.url,
          sourceType: s.sourceType,
          publishedAt: s.publishedAt ?? null,
          accessedAt: daysAgo(12),
          supports: s.supports,
          isKeySource: s.isKeySource,
          verificationStatus: s.verificationStatus,
          verifiedById: s.verificationStatus !== "UNVERIFIED" ? input.verifiedByStaffId : null,
          verifiedAt: s.verificationStatus !== "UNVERIFIED" ? daysAgo(9) : null,
        },
      });
    }
  }

  // Kontribusi
  const contributionCount = await db.articleContribution.count({ where: { articleId: article.id } });
  if (contributionCount === 0) {
    for (const c of input.contributions) {
      await db.articleContribution.create({ data: { articleId: article.id, ...c } });
    }
  }

  // Riwayat review
  const reviewCount = await db.editorialReview.count({ where: { articleId: article.id } });
  if (reviewCount === 0) {
    for (const r of input.reviews) {
      await db.editorialReview.create({
        data: {
          articleId: article.id,
          reviewerId: r.reviewerId,
          fromStatus: r.fromStatus,
          toStatus: r.toStatus,
          decision: r.decision,
          notes: r.notes ?? null,
          createdAt: r.createdAt,
        },
      });
    }
  }

  // Status akhir + metadata publikasi
  await db.article.update({
    where: { id: article.id },
    data: {
      status: input.status,
      contentJson,
      publishedAt: input.publishedAt ?? null,
      firstPublishedAt: input.firstPublishedAt ?? input.publishedAt ?? null,
    },
  });

  return article;
}

async function main() {
  console.log("→ Seed Verax Press dimulai…");

  // ============ Desks ============
  const desks = [
    { slug: "hukum-keadilan", name: "Hukum & Keadilan", description: "Regulasi, peradilan, penegakan hukum, hak masyarakat, dan kebijakan hukum.", sortOrder: 1 },
    { slug: "teknologi-kebijakan", name: "Teknologi & Kebijakan", description: "AI, inovasi digital, keamanan data, regulasi teknologi, dan dampaknya bagi masyarakat.", sortOrder: 2 },
    { slug: "nasional-publik", name: "Nasional & Publik", description: "Kebijakan pemerintah, pendidikan, sosial, ekonomi publik, dan peristiwa nasional.", sortOrder: 3 },
  ];
  for (const desk of desks) {
    await db.desk.upsert({ where: { slug: desk.slug }, create: desk, update: { name: desk.name, description: desk.description, sortOrder: desk.sortOrder } });
  }

  // ============ Staff ============
  const chief = await db.staffUser.upsert({
    where: { email: CHIEF_EMAIL },
    create: {
      username: "chief",
      email: CHIEF_EMAIL,
      name: "Arya Rizky Ardhi Pratama",
      role: "CHIEF_EDITOR",
      passwordHash: hashPassword(envPassword("VERITY_SEED_PASSWORD_CHIEF", "VerityChief!2026")),
    },
    update: { username: "chief", role: "CHIEF_EDITOR" },
  });
  const editor = await db.staffUser.upsert({
    where: { email: EDITOR_EMAIL },
    create: {
      username: "editor",
      email: EDITOR_EMAIL,
      name: "Bagus Prakoso",
      role: "WRITER",
      passwordHash: hashPassword(envPassword("VERITY_SEED_PASSWORD_EDITOR", "VerityEditor!2026")),
    },
    update: { username: "editor", role: "WRITER" },
  });
  const author = await db.staffUser.upsert({
    where: { email: AUTHOR_EMAIL },
    create: {
      username: "penulis",
      email: AUTHOR_EMAIL,
      name: "Alya Rahmadani",
      role: "WRITER",
      passwordHash: hashPassword(envPassword("VERITY_SEED_PASSWORD_AUTHOR", "VerityAuthor!2026")),
    },
    update: { username: "penulis", role: "WRITER" },
  });

  // ============ Persons (identitas publik) ============
  const chiefPerson = await db.person.upsert({
    where: { staffUserId: chief.id },
    create: { accountType: "STAFF", staffUserId: chief.id, publicName: chief.name, bio: "Chief Editor Verax Press." },
    update: {},
  });
  const editorPerson = await db.person.upsert({
    where: { staffUserId: editor.id },
    create: { accountType: "STAFF", staffUserId: editor.id, publicName: editor.name, bio: "Editor Verax Press." },
    update: {},
  });
  const authorPerson = await db.person.upsert({
    where: { staffUserId: author.id },
    create: { accountType: "STAFF", staffUserId: author.id, publicName: author.name, bio: "Penulis internal Verax Press." },
    update: {},
  });
  // Nama pena untuk opini (demonstrasi fleksibilitas atribusi; identitas internal tetap tercatat)
  const penPerson = await db.person.findFirst({ where: { accountType: "BYLINE_ONLY", publicName: "Sekar Ayu W." } });
  const pen = penPerson ?? (await db.person.create({
    data: { accountType: "BYLINE_ONLY", publicName: "Sekar Ayu W.", anonymityMode: "PEN_NAME", bio: "Penulis dan pengamat kebijakan publik." },
  }));
  const pen2Person = await db.person.findFirst({ where: { accountType: "BYLINE_ONLY", publicName: "Bram Aditya" } });
  const pen2 = pen2Person ?? (await db.person.create({
    data: { accountType: "BYLINE_ONLY", publicName: "Bram Aditya", anonymityMode: "PEN_NAME", bio: "Pengamat hukum digital." },
  }));

  // ============ Artikel #1 — Sambutan (PUBLISHED) ============
  await upsertArticle({
    slug: "selamat-datang-di-verax-press",
    title: "Selamat Datang di Verax Press: Media Independen dengan Kendali Editorial Manusia",
    deck: "Verax Press hadir sebagai media digital independen yang menempatkan verifikasi sumber, transparansi proses, dan pertanggungjawaban editor manusia di atas kecepatan.",
    deskSlug: "nasional-publik",
    format: "EXPLAINER",
    status: "PUBLISHED",
    origin: "NEWSROOM",
    byline: "Redaksi Verax Press",
    aiInvolvement: "none",
    createdById: author.id,
    publishedAt: daysAgo(6, 8),
    firstPublishedAt: daysAgo(6, 8),
    content: [
      p("Verax Press adalah media digital independen yang berfokus pada Indonesia, dengan tiga desk awal: Hukum & Keadilan, Teknologi & Kebijakan, serta Nasional & Publik. Kami menyajikan pemberitaan, analisis, opini, explainer, feature, dan wawancara — semuanya melalui proses editorial yang dikendalikan manusia."),
      p("Kami percaya media yang sehat dimulai dari disiplin yang membosankan tetapi penting: setiap klaim penting harus dapat diuji terhadap sumber yang layak, setiap koreksi tampil terang-terangan, dan setiap artikel yang terbit ada editor manusia yang bertanggung jawab atasnya."),
      h2("Yang membuat Verax Press berbeda"),
      bullets([
        "Setiap artikel melewati alur draft → review → fact-check → persetujuan Chief Editor sebelum terbit.",
        "Sumber kunci diverifikasi editor manusia; artikel tidak dapat disetujui bila ada sumber kunci yang belum diverifikasi atau dipertanyakan.",
        "Koreksi material tampil pada artikel dan tercatat pada log koreksi publik — kami tidak menghapus riwayat kesalahan secara diam-diam.",
        "Kami memisahkan fakta, analisis, dan opini; tulisan opini selalu memuat disclaimer bahwa pendapat penulis tidak otomatis mewakili redaksi.",
      ]),
      note("Catatan proses", "Artikel ini adalah dokumen kebijakan redaksi, bukan liputan berita. Versi ringkas kebijakan kami tersedia di halaman Standar Editorial."),
      p("Verax Press bukan platform self-publishing dan bukan forum terbuka. Kontribusi eksternal kelak dibuka secara terbatas melalui undangan, dan tetap melewati proses editorial yang sama sebelum bisa terbit."),
      quote("Tidak ada naskah yang dapat terbit di Verax Press tanpa persetujuan manusia yang berwenang.", "Piagam Redaksi Verax Press"),
    ],
    sources: [
      { title: "UU No. 40 Tahun 1999 tentang Pers", publisher: "BPK RI", url: "https://peraturan.bpk.go.id/Details/45370/uu-no-40-tahun-1999", sourceType: "OFFICIAL", supports: "Kerangka kebebasan pers dan hak jawab yang menjadi rujukan kebijakan redaksi.", isKeySource: true, verificationStatus: "VERIFIED" },
      { title: "Kode Etik Jurnalistik (Peraturan Dewan Pers No. 6/Peraturan-DP/V/2008)", publisher: "Dewan Pers", url: "https://jdih.dewanpers.or.id/dokumen/peraturan/peraturan-dewan-pers-nomor-6peraturan-dpv2008-tentang-pengesahan-surat-keputusan-dewan-pers-nomor-03sk-dpiii2006-tentang-kode-etik-jurnalistik-sebagai-peraturan-dewan-pers", sourceType: "OFFICIAL", supports: "Standar etika yang dijadikan acuan internal.", isKeySource: false, verificationStatus: "VERIFIED" },
    ],
    verifiedByStaffId: editor.id,
    contributions: [
      { personId: authorPerson.id, role: "AUTHOR", displayOrder: 1, publicCredit: false },
      { personId: chiefPerson.id, role: "EDITOR", displayOrder: 2, publicCredit: true },
    ],
    reviews: [
      { reviewerId: author.id, fromStatus: "DRAFT", toStatus: "PENDING_REVIEW", decision: "SUBMIT_REVIEW", createdAt: daysAgo(7, 10) },
      { reviewerId: editor.id, fromStatus: "PENDING_REVIEW", toStatus: "FACT_CHECK", decision: "START_FACT_CHECK", createdAt: daysAgo(7, 14) },
      { reviewerId: editor.id, fromStatus: "FACT_CHECK", toStatus: "PENDING_APPROVAL", decision: "SUBMIT_FOR_APPROVAL", createdAt: daysAgo(6, 9) },
      { reviewerId: chief.id, fromStatus: "PENDING_APPROVAL", toStatus: "PUBLISHED", decision: "PUBLISH", createdAt: daysAgo(6, 8) },
    ],
  });

  // ============ Artikel #2 — Verifikasi sumber (CORRECTED — demo correction log) ============
  const article2 = await upsertArticle({
    slug: "cara-verax-press-memverifikasi-sumber",
    title: "Cara Verax Press Memverifikasi Sumber Sebelum Artikel Terbit",
    deck: "Dari penandaan sumber kunci hingga gerbang persetujuan: penjelasan lengkap tentang bagaimana klaim penting diuji sebelum publikasi.",
    deskSlug: "nasional-publik",
    format: "EXPLAINER",
    status: "CORRECTED",
    origin: "NEWSROOM",
    byline: "Oleh Alya Rahmadani",
    aiInvolvement: "none",
    createdById: author.id,
    publishedAt: daysAgo(4, 10),
    firstPublishedAt: daysAgo(4, 10),
    content: [
      p("Setiap artikel Verax Press menyimpan daftar referensi sumber secara terstruktur: judul, penerbit, URL, tanggal terbit, tanggal akses, tipe sumber, dan klaim yang didukung. Daftar ini bukan hiasan — ia adalah alat kerja redaksi."),
      h2("Sumber primer lebih dulu"),
      p("Redaksi mengutamakan sumber primer: peraturan, putusan, dokumen resmi, data asli, rekaman, atau wawancara langsung. Sumber sekunder boleh memberi konteks dan triangulasi, tetapi tidak menggantikan sumber primer saat tersedia."),
      h2("Penandaan sumber kunci"),
      p("Editor menandai sumber yang menopang klaim terpenting sebagai sumber kunci. Status setiap sumber kunci harus diverifikasi editor sebelum artikel dapat disetujui untuk terbit. Bila ada sumber kunci yang belum diverifikasi atau justru dipertanyakan, gerbang persetujuan otomatis menolak artikel."),
      bullets([
        "UNVERIFIED — belum diperiksa editor; menghambat persetujuan bila bersifat kunci.",
        "VERIFIED — sudah diperiksa editor manusia terhadap dokumen/tautan aslinya.",
        "DISPUTED — sumber saling bertentangan atau tidak dapat dipastikan; klaim terkait ditahan.",
      ]),
      note("Catatan koreksi", "Artikel ini telah dikoreksi. Versi awal keliru menuliskan nomor Peraturan Dewan Pers tentang Pedoman Hak Jawab; kesalahan telah diperbaiki dan tercatat di log koreksi."),
      p("Daftar sumber setiap artikel tampil di bagian bawah halaman artikel, termasuk status verifikasinya. Pembaca dapat menelusuri sendiri klaim yang kami kemukakan."),
      quote("Jika sumber bertentangan, jelaskan perbedaan atau tahan klaim yang belum dapat dipastikan.", "Piagam Redaksi Verax Press"),
    ],
    sources: [
      { title: "Pedoman Pemberitaan Media Siber (2012)", publisher: "Dewan Pers", url: "https://www.dewanpers.or.id/assets/documents/pedoman/1907090253_-2012_PEDOMAN_PEMBERITAAN_MEDIA_SIBER.pdf", sourceType: "OFFICIAL", supports: "Standar verifikasi dan koreksi pemberitaan siber.", isKeySource: true, verificationStatus: "VERIFIED" },
      { title: "Peraturan Dewan Pers No. 9/Peraturan-DP/X/2008 — Pedoman Hak Jawab", publisher: "Dewan Pers", url: "https://jdih.dewanpers.or.id/dokumen/peraturan/peraturan-dewan-pers-nomor-9peraturan-dpx2008-tentang-pedoman-hak-jawab", sourceType: "OFFICIAL", supports: "Prosedur hak jawab yang dijadikan acuan kanal keluhan.", isKeySource: true, verificationStatus: "VERIFIED" },
    ],
    verifiedByStaffId: editor.id,
    contributions: [
      { personId: authorPerson.id, role: "AUTHOR", displayOrder: 1, publicCredit: true },
      { personId: editorPerson.id, role: "EDITOR", displayOrder: 2, publicCredit: true },
    ],
    reviews: [
      { reviewerId: author.id, fromStatus: "DRAFT", toStatus: "PENDING_REVIEW", decision: "SUBMIT_REVIEW", createdAt: daysAgo(5, 9) },
      { reviewerId: editor.id, fromStatus: "PENDING_REVIEW", toStatus: "FACT_CHECK", decision: "START_FACT_CHECK", createdAt: daysAgo(5, 15) },
      { reviewerId: editor.id, fromStatus: "FACT_CHECK", toStatus: "PENDING_APPROVAL", decision: "SUBMIT_FOR_APPROVAL", createdAt: daysAgo(4, 11) },
      { reviewerId: chief.id, fromStatus: "PENDING_APPROVAL", toStatus: "PUBLISHED", decision: "PUBLISH", createdAt: daysAgo(4, 10) },
    ],
  });

  // Koreksi untuk artikel #2
  const correctionCount = await db.correctionRecord.count({ where: { articleId: article2.id } });
  if (correctionCount === 0) {
    await db.correctionRecord.create({
      data: {
        articleId: article2.id,
        summary: "Versi awal keliru menuliskan nomor peraturan Pedoman Hak Jawab (tertulis No. 8, seharusnya No. 9/Peraturan-DP/X/2008).",
        publicNote: "Kesalahan penulisan nomor peraturan telah diperbaiki. Kami mohon maaf atas ketidakakuratan tersebut.",
        approvedById: chief.id,
        correctedAt: daysAgo(2, 16),
      },
    });
    // Versi koreksi (copyedit)
    const lastVersion = await db.articleVersion.findFirst({ where: { articleId: article2.id }, orderBy: { versionNo: "desc" } });
    await db.articleVersion.create({
      data: {
        articleId: article2.id,
        versionNo: (lastVersion?.versionNo ?? 1) + 1,
        title: article2.title,
        deck: article2.deck,
        contentJson: article2.contentJson,
        versionType: "editorial_copyedit",
        changeReason: "Koreksi nomor peraturan Pedoman Hak Jawab.",
        createdById: chief.id,
        createdAt: daysAgo(2, 16),
      },
    });
  }

  // ============ Artikel #3 — Kebijakan AI (PUBLISHED) ============
  await upsertArticle({
    slug: "kebijakan-verax-press-soal-penggunaan-ai",
    title: "Kebijakan Verax Press soal Penggunaan AI dalam Jurnalisme",
    deck: "AI boleh membantu riset dan struktur; AI tidak pernah menjadi sumber fakta, tidak pernah menulis byline palsu, dan tidak pernah menerbitkan apa pun.",
    deskSlug: "teknologi-kebijakan",
    format: "EXPLAINER",
    status: "PUBLISHED",
    origin: "NEWSROOM",
    byline: "Redaksi Verax Press",
    aiInvolvement: "assistive",
    aiDisclosurePublic: false,
    createdById: chief.id,
    publishedAt: daysAgo(3, 9),
    firstPublishedAt: daysAgo(3, 9),
    content: [
      p("Verax Press menggunakan kecerdasan buatan dengan cara yang terbatas dan jujur. AI boleh membantu riset awal, ringkasan dokumen, alternatif judul, atau penataan struktur. Manusia tetap menulis, memeriksa, dan bertanggung jawab atas teks akhir."),
      h2("Tiga tingkat keterlibatan AI"),
      bullets([
        "None — AI tidak digunakan, atau hanya fungsi mekanis seperti pemeriksaan ejaan.",
        "Assistive — AI membantu riset awal, ringkasan, atau struktur; manusia menulis dan memeriksa teks akhir.",
        "Substantive — bagian substansial naskah awal disusun AI; wajib memuat catatan proses publik.",
      ]),
      p("Untuk tingkat substantive, artikel wajib memuat catatan proses singkat yang menjelaskan bagaimana AI terlibat dan bagaimana redaksi memeriksanya. Editor tidak boleh menurunkan tingkat keterlibatan hanya demi citra."),
      h2("Yang tidak pernah kami lakukan"),
      bullets([
        "Tidak ada publikasi otomatis oleh AI, API, scheduler, atau job impor apa pun.",
        "AI tidak boleh mengarang narasumber, kutipan, dokumen, atau kejadian.",
        "Gambar sintetis tidak pernah disajikan sebagai dokumentasi fotografi peristiwa nyata.",
      ]),
      p("AI agent eksternal — jika kelak digunakan untuk membantu penyusunan draf — hanya dapat mengirim naskah melalui API ingestion internal dengan cakupan submit saja. Agent tidak dapat menyetujui, menerbitkan, atau membaca catatan internal redaksi."),
      note("Catatan proses", "Artikel ini disusun redaksi dengan bantuan AI pada tahap peringkasan rujukan kebijakan (tingkat assistive); seluruh isi diperiksa dan disunting manusia."),
    ],
    sources: [
      { title: "Google Search guidance — Generative AI content", publisher: "Google Search Central", url: "https://developers.google.com/search/docs/fundamentals/using-gen-ai-content/", sourceType: "SECONDARY", supports: "Praktik industri soal transparansi konten bantuan AI.", isKeySource: false, verificationStatus: "VERIFIED" },
      { title: "Google Search spam policies — Scaled content abuse", publisher: "Google Search Central", url: "https://developers.google.com/search/docs/essentials/spam-policies", sourceType: "SECONDARY", supports: "Risiko konten massal tanpa nilai tambah.", isKeySource: false, verificationStatus: "VERIFIED" },
      { title: "UU No. 27 Tahun 2022 — Pelindungan Data Pribadi", publisher: "BPK RI", url: "https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022", sourceType: "OFFICIAL", supports: "Kerangka privasi yang diperhatikan dalam kebijakan data redaksi.", isKeySource: true, verificationStatus: "VERIFIED" },
    ],
    verifiedByStaffId: editor.id,
    contributions: [
      { personId: chiefPerson.id, role: "AUTHOR", displayOrder: 1, publicCredit: false },
      { personId: editorPerson.id, role: "EDITOR", displayOrder: 2, publicCredit: true },
    ],
    reviews: [
      { reviewerId: chief.id, fromStatus: "DRAFT", toStatus: "PENDING_REVIEW", decision: "SUBMIT_REVIEW", createdAt: daysAgo(4, 13) },
      { reviewerId: editor.id, fromStatus: "PENDING_REVIEW", toStatus: "FACT_CHECK", decision: "START_FACT_CHECK", createdAt: daysAgo(3, 10) },
      { reviewerId: editor.id, fromStatus: "FACT_CHECK", toStatus: "PENDING_APPROVAL", decision: "SUBMIT_FOR_APPROVAL", notes: "Rujukan kebijakan dicek ke tautan resmi.", createdAt: daysAgo(3, 11) },
      { reviewerId: chief.id, fromStatus: "PENDING_APPROVAL", toStatus: "PUBLISHED", decision: "PUBLISH", createdAt: daysAgo(3, 9) },
    ],
  });

  // ============ Artikel #4 — Opini (PUBLISHED, nama pena) ============
  await upsertArticle({
    slug: "media-independen-dan-disiplin-sumber",
    title: "Media Independen dan Disiplin Sumber: Catatan dari Meja Redaksi",
    deck: "Kepercayaan pembaca tidak dibangun oleh desain yang cantik, melainkan oleh kebiasaan kecil yang konsisten: mencatat, memeriksa, dan mengakui kesalahan.",
    deskSlug: "nasional-publik",
    format: "OPINION",
    status: "PUBLISHED",
    origin: "NEWSROOM",
    byline: "Oleh Sekar Ayu W.",
    aiInvolvement: "none",
    createdById: author.id,
    publishedAt: daysAgo(1, 10),
    firstPublishedAt: daysAgo(1, 10),
    content: [
      p("Setiap kali sebuah media baru diluncurkan, pertanyaan pertama saya bukan tentang desainnya, melainkan tentang dapurnya: siapa yang memeriksa fakta, bagaimana kesalahan ditangani, dan apakah pembaca bisa menelusuri klaim hingga ke sumbernya."),
      p("Di titik itulah media independen punya peluang sekaligus beban. Peluangnya: tanpa tekanan komersial pemilik besar, redaksi bekerja untuk pembaca. Bebannya: tanpa nama besar yang diwariskan, kepercayaan harus dibangun dari nol, artikel demi artikel."),
      h2("Transparansi bukan gaya, melainkan infrastruktur"),
      p("Menampilkan daftar sumber dan status verifikasinya di setiap artikel terasa tidak lazim. Tetapi saya berpendapat itu akan menjadi standar baru media yang serius. Pembaca dewasa tidak butuh dilindungi dari kerumitan; mereka butuh alat untuk menilai sendiri."),
      quote("Kejujuran tentang proses adalah bentuk rasa hormat yang paling mendasar kepada pembaca.", "Catatan penulis"),
      p("Koreksi yang disembunyikan adalah utang yang menunggu waktu jatuh tempo. Log koreksi publik mungkin terasa memalukan, tetapi justru di situlah kredibilitas diuji: media yang berani mencatat kesalahannya adalah media yang bisa dipercaya saat memberitakan kesalahan orang lain."),
      p("Tulisan ini adalah opini. Sepanjang media baru seperti Verax Press konsisten pada disiplin sumber, kejujuran koreksi, dan kendali editorial manusia, saya akan tetap menjadi pembacanya — dan sesekali pengkritiknya."),
    ],
    sources: [
      { title: "Kode Etik Jurnalistik (Peraturan Dewan Pers No. 6/Peraturan-DP/V/2008)", publisher: "Dewan Pers", url: "https://jdih.dewanpers.or.id/dokumen/peraturan/peraturan-dewan-pers-nomor-6peraturan-dpv2008-tentang-pengesahan-surat-keputusan-dewan-pers-nomor-03sk-dpiii2006-tentang-kode-etik-jurnalistik-sebagai-peraturan-dewan-pers", sourceType: "OFFICIAL", supports: "Rujukan etika pencarian dan verifikasi informasi.", isKeySource: true, verificationStatus: "VERIFIED" },
    ],
    verifiedByStaffId: editor.id,
    contributions: [
      { personId: pen.id, role: "AUTHOR", displayOrder: 1, publicCredit: true },
    ],
    reviews: [
      { reviewerId: author.id, fromStatus: "DRAFT", toStatus: "PENDING_REVIEW", decision: "SUBMIT_REVIEW", createdAt: daysAgo(2, 9) },
      { reviewerId: editor.id, fromStatus: "PENDING_REVIEW", toStatus: "FACT_CHECK", decision: "START_FACT_CHECK", createdAt: daysAgo(2, 12) },
      { reviewerId: editor.id, fromStatus: "FACT_CHECK", toStatus: "PENDING_APPROVAL", decision: "SUBMIT_FOR_APPROVAL", createdAt: daysAgo(1, 13) },
      { reviewerId: chief.id, fromStatus: "PENDING_APPROVAL", toStatus: "PUBLISHED", decision: "PUBLISH", createdAt: daysAgo(1, 10) },
    ],
  });

  // ============ Artikel #9 — Alur editorial (PUBLISHED, terbaru → lead homepage) ============
  await upsertArticle({
    slug: "lima-tahap-sebelum-terbit-alur-editorial-verax-press",
    title: "Lima Tahap Sebelum Terbit: Anatomi Alur Editorial Verax Press",
    deck: "Draft, review, fact-check, persetujuan, terbit — setiap naskah melewati jalur yang sama, dan setiap langkah meninggalkan jejak yang bisa diaudit.",
    deskSlug: "nasional-publik",
    format: "EXPLAINER",
    status: "PUBLISHED",
    origin: "NEWSROOM",
    byline: "Redaksi Verax Press",
    aiInvolvement: "none",
    createdById: author.id,
    publishedAt: daysAgo(0, 8),
    firstPublishedAt: daysAgo(0, 8),
    content: [
      p("Tidak ada naskah yang langsung melompat dari meja penulis ke halaman depan. Sebelum sebuah artikel Verax Press tampil, ia melewati lima tahap yang sama — tanpa pengecualian, tanpa jalur cepat."),
      h2("Tahap demi tahap"),
      bullets([
        "Draft — penulis menyusun naskah beserta daftar sumber terstruktur dan tingkat keterlibatan AI.",
        "Review — editor menilai kelayakan, kejelasan, dan kepatuhan pada standar; naskah bisa diminta revisi.",
        "Fact-check — klaim diperiksa terhadap sumber; sumber kunci harus berstatus terverifikasi.",
        "Persetujuan — hanya Chief Editor yang dapat menyetujui publikasi; gerbang otomatis menolak bila ada sumber kunci yang belum lolos verifikasi.",
        "Terbit — artikel tayang lengkap dengan byline, daftar sumber, dan status verifikasinya.",
      ]),
      p("Setiap transisi menyimpan jejak audit: siapa melakukan apa, kapan, dan dengan keputusan apa. Setiap penyimpanan konten menciptakan versi baru — sejarah naskah tidak pernah tertimpa."),
      quote("Proses yang bisa diaudit adalah proses yang bisa dipercaya.", "Catatan redaksi"),
      note("Catatan proses", "Artikel ini sendiri melewati kelima tahap tersebut; riwayat versi dan keputusannya tercatat pada sistem redaksi."),
    ],
    sources: [
      { title: "Kode Etik Jurnalistik (Peraturan Dewan Pers No. 6/Peraturan-DP/V/2008)", publisher: "Dewan Pers", url: "https://jdih.dewanpers.or.id/dokumen/peraturan/peraturan-dewan-pers-nomor-6peraturan-dpv2008-tentang-pengesahan-surat-keputusan-dewan-pers-nomor-03sk-dpiii2006-tentang-kode-etik-jurnalistik-sebagai-peraturan-dewan-pers", sourceType: "OFFICIAL", supports: "Kewajiban verifikasi dan pembedaan fakta-opini yang menjadi dasar alur editorial.", isKeySource: true, verificationStatus: "VERIFIED" },
      { title: "Pedoman Pemberitaan Media Siber (2012)", publisher: "Dewan Pers", url: "https://www.dewanpers.or.id/assets/documents/pedoman/1907090253_-2012_PEDOMAN_PEMBERITAAN_MEDIA_SIBER.pdf", sourceType: "OFFICIAL", supports: "Standar penyuntingan dan koreksi pemberitaan siber.", isKeySource: false, verificationStatus: "VERIFIED" },
    ],
    verifiedByStaffId: editor.id,
    contributions: [
      { personId: authorPerson.id, role: "AUTHOR", displayOrder: 1, publicCredit: false },
      { personId: chiefPerson.id, role: "EDITOR", displayOrder: 2, publicCredit: true },
    ],
    reviews: [
      { reviewerId: author.id, fromStatus: "DRAFT", toStatus: "PENDING_REVIEW", decision: "SUBMIT_REVIEW", createdAt: daysAgo(1, 9) },
      { reviewerId: editor.id, fromStatus: "PENDING_REVIEW", toStatus: "FACT_CHECK", decision: "START_FACT_CHECK", createdAt: daysAgo(1, 14) },
      { reviewerId: editor.id, fromStatus: "FACT_CHECK", toStatus: "PENDING_APPROVAL", decision: "SUBMIT_FOR_APPROVAL", createdAt: daysAgo(0, 7) },
      { reviewerId: chief.id, fromStatus: "PENDING_APPROVAL", toStatus: "PUBLISHED", decision: "PUBLISH", createdAt: daysAgo(0, 8) },
    ],
  });

  // ============ Artikel #10 — Anatomi koreksi (PUBLISHED, hukum) ============
  await upsertArticle({
    slug: "anatomi-koreksi-terbuka-verax-press",
    title: "Anatomi Koreksi Terbuka: Bagaimana Verax Press Mencatat dan Menampilkan Kesalahannya",
    deck: "Koreksi bukan aib yang dikubur diam-diam. Begini cara setiap koreksi terekam, disetujui, dan ditampilkan — di halaman artikel dan di log publik.",
    deskSlug: "hukum-keadilan",
    format: "EXPLAINER",
    status: "PUBLISHED",
    origin: "NEWSROOM",
    byline: "Oleh Alya Rahmadani",
    aiInvolvement: "none",
    createdById: author.id,
    publishedAt: daysAgo(5, 15),
    firstPublishedAt: daysAgo(5, 15),
    content: [
      p("Semua redaksi bisa salah; yang membedakan adalah apa yang terjadi setelahnya. Di Verax Press, kesalahan material tidak diperbaiki diam-diam — ia dicatat, disetujui Chief Editor, lalu ditampilkan terbuka."),
      h2("Apa yang terjadi saat kesalahan ditemukan"),
      p("Setiap koreksi menyimpan ringkasan teknis untuk redaksi dan catatan publik untuk pembaca. Koreksi hanya berlaku setelah disetujui Chief Editor; sampai itu terjadi, versi lama tetap yang tampil."),
      h2("Versi tidak pernah hilang"),
      p("Setiap perubahan editorial tersimpan sebagai versi bernomor. Pembaca tidak perlu memercayai memori redaksi — jejaknya ada di sistem."),
      bullets([
        "Artikel yang dikoreksi memuat kotak koreksi berisi catatan publik dan tanggalnya.",
        "Setiap koreksi masuk ke log koreksi publik yang bisa ditelusuri siapa saja.",
        "Stempel waktu artikel menunjukkan kapan ia diperbarui, terpisah dari kapan pertama terbit.",
      ]),
      quote("Media yang berani mencatat kesalahannya lebih layak dipercaya saat memberitakan kesalahan orang lain.", "Catatan redaksi"),
    ],
    sources: [
      { title: "Pedoman Pemberitaan Media Siber (2012)", publisher: "Dewan Pers", url: "https://www.dewanpers.or.id/assets/documents/pedoman/1907090253_-2012_PEDOMAN_PEMBERITAAN_MEDIA_SIBER.pdf", sourceType: "OFFICIAL", supports: "Kewajiban media siber mencantumkan kebijakan koreksi yang mudah diakses pembaca.", isKeySource: true, verificationStatus: "VERIFIED" },
      { title: "Peraturan Dewan Pers No. 9/Peraturan-DP/X/2008 — Pedoman Hak Jawab", publisher: "Dewan Pers", url: "https://jdih.dewanpers.or.id/dokumen/peraturan/peraturan-dewan-pers-nomor-9peraturan-dpx2008-tentang-pedoman-hak-jawab", sourceType: "OFFICIAL", supports: "Kerangka hak jawab dan hak koreksi yang diadopsi kebijakan internal.", isKeySource: false, verificationStatus: "VERIFIED" },
    ],
    verifiedByStaffId: editor.id,
    contributions: [
      { personId: authorPerson.id, role: "AUTHOR", displayOrder: 1, publicCredit: true },
      { personId: editorPerson.id, role: "EDITOR", displayOrder: 2, publicCredit: true },
    ],
    reviews: [
      { reviewerId: author.id, fromStatus: "DRAFT", toStatus: "PENDING_REVIEW", decision: "SUBMIT_REVIEW", createdAt: daysAgo(6, 10) },
      { reviewerId: editor.id, fromStatus: "PENDING_REVIEW", toStatus: "FACT_CHECK", decision: "START_FACT_CHECK", createdAt: daysAgo(6, 14) },
      { reviewerId: editor.id, fromStatus: "FACT_CHECK", toStatus: "PENDING_APPROVAL", decision: "SUBMIT_FOR_APPROVAL", createdAt: daysAgo(5, 13) },
      { reviewerId: chief.id, fromStatus: "PENDING_APPROVAL", toStatus: "PUBLISHED", decision: "PUBLISH", createdAt: daysAgo(5, 15) },
    ],
  });

  // ============ Artikel #11 — Kiriman AI agent (PUBLISHED, teknologi) ============
  await upsertArticle({
    slug: "satu-pintu-untuk-mesin-kiriman-ai-verax-press",
    title: "Satu Pintu untuk Mesin: Cara Verax Press Mengelola Kiriman AI dan Menjaga Manusia di Ujung",
    deck: "Agen AI hanya bisa mengirim draf lewat API ingestion dengan izin submit — tidak bisa menyetujui, menerbitkan, atau membaca catatan internal redaksi.",
    deskSlug: "teknologi-kebijakan",
    format: "EXPLAINER",
    status: "PUBLISHED",
    origin: "NEWSROOM",
    byline: "Redaksi Verax Press",
    aiInvolvement: "assistive",
    aiDisclosurePublic: false,
    createdById: chief.id,
    publishedAt: daysAgo(2, 9),
    firstPublishedAt: daysAgo(2, 9),
    content: [
      p("Kami mendesain gerbang untuk mesin sejak hari pertama: kalau kelak agen AI dipakai untuk membantu menyusun draf, ia hanya boleh masuk lewat satu pintu — API ingestion internal — dengan izin yang sangat sempit."),
      h2("Mengapa submit-only"),
      bullets([
        "Tidak ada endpoint publikasi untuk klien API; izinnya selesai di kata submit.",
        "Setiap kiriman wajib membawa kunci idempotensi — pengiriman ulang tidak menduplikasi naskah.",
        "Tingkat keterlibatan AI wajib dinyatakan sejak pengiriman pertama; ia tidak bisa diturunkan diam-diam.",
        "Setiap sumber yang dikirim agen harus menyertakan URL yang dapat diperiksa editor.",
      ]),
      p("Kiriman agen masuk sebagai draf di alur editorial yang sama seperti naskah newsroom: review, fact-check, lalu persetujuan Chief Editor. Mesin tidak pernah berdiri di titik keputusan."),
      note("Catatan proses", "Artikel ini disusun redaksi dengan bantuan AI pada tahap peringkasan rujukan teknis (tingkat assistive); seluruh isi diperiksa dan disunting manusia."),
    ],
    sources: [
      { title: "Google Search guidance — Generative AI content", publisher: "Google Search Central", url: "https://developers.google.com/search/docs/fundamentals/using-gen-ai-content/", sourceType: "SECONDARY", supports: "Praktik industri soal transparansi konten bantuan AI.", isKeySource: false, verificationStatus: "VERIFIED" },
      { title: "UU No. 27 Tahun 2022 — Pelindungan Data Pribadi", publisher: "BPK RI", url: "https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022", sourceType: "OFFICIAL", supports: "Kerangka privasi untuk pengolahan data pada sistem redaksi.", isKeySource: true, verificationStatus: "VERIFIED" },
    ],
    verifiedByStaffId: editor.id,
    contributions: [
      { personId: chiefPerson.id, role: "AUTHOR", displayOrder: 1, publicCredit: false },
      { personId: editorPerson.id, role: "EDITOR", displayOrder: 2, publicCredit: true },
    ],
    reviews: [
      { reviewerId: chief.id, fromStatus: "DRAFT", toStatus: "PENDING_REVIEW", decision: "SUBMIT_REVIEW", createdAt: daysAgo(3, 10) },
      { reviewerId: editor.id, fromStatus: "PENDING_REVIEW", toStatus: "FACT_CHECK", decision: "START_FACT_CHECK", createdAt: daysAgo(3, 15) },
      { reviewerId: editor.id, fromStatus: "FACT_CHECK", toStatus: "PENDING_APPROVAL", decision: "SUBMIT_FOR_APPROVAL", createdAt: daysAgo(2, 8) },
      { reviewerId: chief.id, fromStatus: "PENDING_APPROVAL", toStatus: "PUBLISHED", decision: "PUBLISH", createdAt: daysAgo(2, 9) },
    ],
  });

  // ============ Artikel #12 — Opini ke-2 (PUBLISHED, nama pena baru) ============
  await upsertArticle({
    slug: "di-zaman-banjir-konten-kehati-hatian-adalah-keunggulan",
    title: "Di Zaman Banjir Konten, Kehati-hatian adalah Keunggulan",
    deck: "Ketika mesin mampu menulis ribuan artikel per hari, justru media yang lambat, mencatat sumbernya, dan berani mengoreksi diri yang punya nilai tersisa.",
    deskSlug: "hukum-keadilan",
    format: "OPINION",
    status: "PUBLISHED",
    origin: "NEWSROOM",
    byline: "Oleh Bram Aditya",
    aiInvolvement: "none",
    createdById: author.id,
    publishedAt: daysAgo(6, 10),
    firstPublishedAt: daysAgo(6, 10),
    content: [
      p("Setiap kali saya membuka internet pagi ini, saya bukan kekurangan bacaan — saya kelebihan. Ribuan kata baru terbit setiap menit, sebagian besar disusun mesin yang tidak pernah capek, tidak pernah ragu, dan tidak pernah bertanggung jawab."),
      h2("Kecepatan bukan lagi keunggulan"),
      p("Dulu media berlomba siapa lebih dulu. Sekarang perlombaan itu sudah dimenangkan mesin — dan hadiahnya nyaris tidak ada: pembaca makin sulit membedakan mana yang benar-benar diperiksa manusia. Di pasar yang jenuh, justru kelambatan yang disengaja menjadi pembeda: artikel yang baru terbit setelah sumbernya dicek, dicatat, dan bisa ditelusuri ulang."),
      p("Karena itu saya menyambut baik kebiasaan baru seperti menampilkan status verifikasi sumber di setiap artikel. Itu bukan gimmick; itu cara media mengatakan: ini yang kami pertaruhkan namanya."),
      quote("Kepercayaan dibangun lambat dan hilang cepat; karena itu ia harus dijaga dengan proses, bukan retorika.", "Catatan penulis"),
      p("Tulisan ini adalah opini. Saya tidak menuntut semua media meniru Verax Press — saya hanya menuntut mereka berhenti berpura-pura bahwa kecepatan masih menggantikan ketelitian."),
    ],
    sources: [
      { title: "Kode Etik Jurnalistik (Peraturan Dewan Pers No. 6/Peraturan-DP/V/2008)", publisher: "Dewan Pers", url: "https://jdih.dewanpers.or.id/dokumen/peraturan/peraturan-dewan-pers-nomor-6peraturan-dpv2008-tentang-pengesahan-surat-keputusan-dewan-pers-nomor-03sk-dpiii2006-tentang-kode-etik-jurnalistik-sebagai-peraturan-dewan-pers", sourceType: "OFFICIAL", supports: "Rujukan etika verifikasi informasi yang dikutip penulis.", isKeySource: true, verificationStatus: "VERIFIED" },
    ],
    verifiedByStaffId: editor.id,
    contributions: [
      { personId: pen2.id, role: "AUTHOR", displayOrder: 1, publicCredit: true },
    ],
    reviews: [
      { reviewerId: author.id, fromStatus: "DRAFT", toStatus: "PENDING_REVIEW", decision: "SUBMIT_REVIEW", createdAt: daysAgo(7, 9) },
      { reviewerId: editor.id, fromStatus: "PENDING_REVIEW", toStatus: "FACT_CHECK", decision: "START_FACT_CHECK", createdAt: daysAgo(7, 13) },
      { reviewerId: editor.id, fromStatus: "FACT_CHECK", toStatus: "PENDING_APPROVAL", decision: "SUBMIT_FOR_APPROVAL", createdAt: daysAgo(6, 9) },
      { reviewerId: chief.id, fromStatus: "PENDING_APPROVAL", toStatus: "PUBLISHED", decision: "PUBLISH", createdAt: daysAgo(6, 10) },
    ],
  });

  // ============ Artikel #13 — Tiga dokumen fondasi (PUBLISHED, nasional) ============
  await upsertArticle({
    slug: "tiga-dokumen-fondasi-verax-press",
    title: "Tiga Dokumen Fondasi Verax Press: Piagam, Kebijakan Kontributor, dan Standar Editorial",
    deck: "Sebelum menulis satu kata berita pun, kami menulis aturan mainnya. Tiga dokumen ini mengikat seluruh redaksi — dan sebagian isinya bisa Anda baca sendiri.",
    deskSlug: "nasional-publik",
    format: "EXPLAINER",
    status: "PUBLISHED",
    origin: "NEWSROOM",
    byline: "Redaksi Verax Press",
    aiInvolvement: "none",
    createdById: author.id,
    publishedAt: daysAgo(1, 15),
    firstPublishedAt: daysAgo(1, 15),
    content: [
      p("Media baru biasanya diperkenalkan lewat desain atau rubrik. Verax Press memilih urutan yang membosankan: kami menyusun aturan mainnya lebih dulu, barulah kontennya."),
      h2("Piagam Redaksi"),
      p("Piagam menegaskan hal-hal yang tidak bisa ditawar: tidak ada naskah terbit tanpa persetujuan manusia yang berwenang, sumber kunci wajib terverifikasi, dan koreksi tampil terbuka. Piagam mengikat semua anggota redaksi tanpa pengecualian."),
      h2("Kebijakan Kontributor"),
      p("Ketika portal kontributor dibuka kelak, naskah eksternal tidak masuk lewat pintu belakang: ia melewati proses editorial yang sama, dengan opsi nama pena atau anonim yang dijamin kebijakannya. Portal ini belum dibuka — kebijakannya sudah disiapkan lebih dulu supaya aturan main jelas sebelum undangan pertama dikirim."),
      h2("Standar Editorial"),
      p("Standar editorial menerjemahkan prinsip menjadi prosedur harian: bagaimana sumber dicatat, bagaimana fakta dipisahkan dari opini, dan bagaimana koreksi diproses. Versi ringkasnya bisa Anda baca di halaman Standar Editorial."),
      quote("Aturan yang ditulis sebelum ujian baru benar-benar menjadi aturan.", "Catatan redaksi"),
    ],
    sources: [
      { title: "UU No. 40 Tahun 1999 tentang Pers", publisher: "BPK RI", url: "https://peraturan.bpk.go.id/Details/45370/uu-no-40-tahun-1999", sourceType: "OFFICIAL", supports: "Kerangka kebebasan pers dan tanggung jawab pers yang dirujuk piagam redaksi.", isKeySource: true, verificationStatus: "VERIFIED" },
      { title: "Kode Etik Jurnalistik (Peraturan Dewan Pers No. 6/Peraturan-DP/V/2008)", publisher: "Dewan Pers", url: "https://jdih.dewanpers.or.id/dokumen/peraturan/peraturan-dewan-pers-nomor-6peraturan-dpv2008-tentang-pengesahan-surat-keputusan-dewan-pers-nomor-03sk-dpiii2006-tentang-kode-etik-jurnalistik-sebagai-peraturan-dewan-pers", sourceType: "OFFICIAL", supports: "Standar etika yang diadopsi standar editorial internal.", isKeySource: false, verificationStatus: "VERIFIED" },
    ],
    verifiedByStaffId: editor.id,
    contributions: [
      { personId: authorPerson.id, role: "AUTHOR", displayOrder: 1, publicCredit: false },
      { personId: chiefPerson.id, role: "EDITOR", displayOrder: 2, publicCredit: true },
    ],
    reviews: [
      { reviewerId: author.id, fromStatus: "DRAFT", toStatus: "PENDING_REVIEW", decision: "SUBMIT_REVIEW", createdAt: daysAgo(2, 10) },
      { reviewerId: editor.id, fromStatus: "PENDING_REVIEW", toStatus: "FACT_CHECK", decision: "START_FACT_CHECK", createdAt: daysAgo(2, 15) },
      { reviewerId: editor.id, fromStatus: "FACT_CHECK", toStatus: "PENDING_APPROVAL", decision: "SUBMIT_FOR_APPROVAL", createdAt: daysAgo(1, 14) },
      { reviewerId: chief.id, fromStatus: "PENDING_APPROVAL", toStatus: "PUBLISHED", decision: "PUBLISH", createdAt: daysAgo(1, 15) },
    ],
  });

  // ============ Artikel #14 — Perlindungan sumber (PUBLISHED, hukum) ============
  await upsertArticle({
    slug: "perlindungan-sumber-dan-anonimitas-verax-press",
    title: "Perlindungan Sumber dan Anonimitas: Janji Verax Press pada Narasumber dan Kontributor",
    deck: "Kerahasiaan sumber bukan janji lisan yang bergantung pada ingatan — di Verax Press ia kebijakan tertulis yang mengikat sebelum liputan pertama dibuat.",
    deskSlug: "hukum-keadilan",
    format: "EXPLAINER",
    status: "PUBLISHED",
    origin: "NEWSROOM",
    byline: "Oleh Alya Rahmadani",
    aiInvolvement: "none",
    createdById: author.id,
    publishedAt: daysAgo(3, 15),
    firstPublishedAt: daysAgo(3, 15),
    content: [
      p("Janji pada sumber adalah mata uang jurnalistik: sekali dilanggar, nilainya tidak bisa dipulihkan. Karena itu kebijakan perlindungan sumber Verax Press ditulis sebelum liputan pertama dibuat."),
      h2("Perlindungan sumber dalam hukum"),
      p("Undang-Undang Pers menjamin wartawan berhak menolak mengungkapkan sumber berita. Kami menganggapnya titik mulai, bukan langit-langit: perjanjian kerahasiaan dengan narasumber dicatat secara eksplisit sebelum wawancara sensitif dilakukan."),
      h2("Anonimitas kontributor"),
      p("Kontributor Verax Press dapat memilih tampil dengan nama asli, nama pena, atau anonim. Pilihan itu mengikat tampilan publik; identitas internal tetap tercatat redaksi untuk kepentingan pertanggungjawaban — keduanya tidak saling meniadakan."),
      quote("Kerahasiaan yang dikelola dengan disiplin adalah bagian dari kejujuran, bukan lawannya.", "Catatan redaksi"),
    ],
    sources: [
      { title: "UU No. 40 Tahun 1999 tentang Pers", publisher: "BPK RI", url: "https://peraturan.bpk.go.id/Details/45370/uu-no-40-tahun-1999", sourceType: "OFFICIAL", supports: "Jaminan hak wartawan menolak mengungkapkan sumber berita.", isKeySource: true, verificationStatus: "VERIFIED" },
      { title: "Kode Etik Jurnalistik (Peraturan Dewan Pers No. 6/Peraturan-DP/V/2008)", publisher: "Dewan Pers", url: "https://jdih.dewanpers.or.id/dokumen/peraturan/peraturan-dewan-pers-nomor-6peraturan-dpv2008-tentang-pengesahan-surat-keputusan-dewan-pers-nomor-03sk-dpiii2006-tentang-kode-etik-jurnalistik-sebagai-peraturan-dewan-pers", sourceType: "OFFICIAL", supports: "Kewajiban menghormati kerahasiaan sumber.", isKeySource: false, verificationStatus: "VERIFIED" },
    ],
    verifiedByStaffId: editor.id,
    contributions: [
      { personId: authorPerson.id, role: "AUTHOR", displayOrder: 1, publicCredit: true },
      { personId: editorPerson.id, role: "EDITOR", displayOrder: 2, publicCredit: true },
    ],
    reviews: [
      { reviewerId: author.id, fromStatus: "DRAFT", toStatus: "PENDING_REVIEW", decision: "SUBMIT_REVIEW", createdAt: daysAgo(4, 10) },
      { reviewerId: editor.id, fromStatus: "PENDING_REVIEW", toStatus: "FACT_CHECK", decision: "START_FACT_CHECK", createdAt: daysAgo(4, 16) },
      { reviewerId: editor.id, fromStatus: "FACT_CHECK", toStatus: "PENDING_APPROVAL", decision: "SUBMIT_FOR_APPROVAL", createdAt: daysAgo(3, 14) },
      { reviewerId: chief.id, fromStatus: "PENDING_APPROVAL", toStatus: "PUBLISHED", decision: "PUBLISH", createdAt: daysAgo(3, 15) },
    ],
  });

  // ============ Artikel #15 — Konten terstruktur (PUBLISHED, teknologi) ============
  await upsertArticle({
    slug: "isi-artikel-terstruktur-bukan-html-lepas",
    title: "Isi Artikel yang Terstruktur: Mengapa Verax Press Tidak Memakai HTML Lepas",
    deck: "Paragraf, judul, kutipan, daftar — isi artikel Verax Press tersimpan sebagai dokumen terstruktur, bukan keping HTML bebas. Ini pilihan keamanan sekaligus pilihan tipografi.",
    deskSlug: "teknologi-kebijakan",
    format: "EXPLAINER",
    status: "PUBLISHED",
    origin: "NEWSROOM",
    byline: "Redaksi Verax Press",
    aiInvolvement: "none",
    createdById: author.id,
    publishedAt: daysAgo(2, 15),
    firstPublishedAt: daysAgo(2, 15),
    content: [
      p("Setiap artikel Verax Press tersimpan sebagai dokumen terstruktur — paragraf, judul, kutipan, daftar, catatan, gambar — bukan keping HTML bebas yang ditempel apa adanya."),
      h2("Kenapa ini penting"),
      bullets([
        "Keamanan: tanpa HTML mentah dari penulis, permukaan serangan skrip menyusut drastis.",
        "Konsistensi: tipografi dan struktur seluruh artikel dijaga sistem, bukan kebiasaan masing-masing penulis.",
        "Ketertelusuran: dokumen yang bisa divalidasi otomatis juga bisa diaudit otomatis — struktur adalah syarat transparansi.",
      ]),
      p("Konsekuensinya sebuah pilihan desain: editor redaksi memakai penyusun blok, bukan pengolah kata bebas. Penulis menata gagasan; sistem menata tampilan."),
      p("Praktik keamanan web menempatkan pemisahan struktur dari presentasi sebagai pertahanan pertama terhadap injeksi skrip — dan itu persis alasan arsitektur ini dipilih."),
    ],
    sources: [
      { title: "OWASP Cheat Sheet Series — Cross Site Scripting Prevention", publisher: "OWASP Foundation", url: "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html", sourceType: "SECONDARY", supports: "Standar industri soal risiko HTML tak tersanitasi.", isKeySource: true, verificationStatus: "VERIFIED" },
      { title: "UU No. 27 Tahun 2022 — Pelindungan Data Pribadi", publisher: "BPK RI", url: "https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022", sourceType: "OFFICIAL", supports: "Kerangka keamanan pengolahan data yang menjadi pertimbangan arsitektur.", isKeySource: false, verificationStatus: "VERIFIED" },
    ],
    verifiedByStaffId: editor.id,
    contributions: [
      { personId: authorPerson.id, role: "AUTHOR", displayOrder: 1, publicCredit: false },
      { personId: editorPerson.id, role: "EDITOR", displayOrder: 2, publicCredit: true },
    ],
    reviews: [
      { reviewerId: author.id, fromStatus: "DRAFT", toStatus: "PENDING_REVIEW", decision: "SUBMIT_REVIEW", createdAt: daysAgo(3, 10) },
      { reviewerId: editor.id, fromStatus: "PENDING_REVIEW", toStatus: "FACT_CHECK", decision: "START_FACT_CHECK", createdAt: daysAgo(3, 16) },
      { reviewerId: editor.id, fromStatus: "FACT_CHECK", toStatus: "PENDING_APPROVAL", decision: "SUBMIT_FOR_APPROVAL", createdAt: daysAgo(2, 13) },
      { reviewerId: chief.id, fromStatus: "PENDING_APPROVAL", toStatus: "PUBLISHED", decision: "PUBLISH", createdAt: daysAgo(2, 15) },
    ],
  });

  // ============ Artikel #16 — Kode etik sebagai rujukan (PUBLISHED, nasional) ============
  await upsertArticle({
    slug: "kode-etik-jurnalistik-sebagai-rujukan-bukan-stiker",
    title: "Kode Etik Jurnalistik sebagai Rujukan — Bukan Stiker pada Dinding",
    deck: "Verax Press belum terverifikasi Dewan Pers dan tidak mengklaimnya. Tapi kode etik jurnalistik tetap menjadi rujukan harian redaksi — begini cara kami memakainya.",
    deskSlug: "nasional-publik",
    format: "EXPLAINER",
    status: "PUBLISHED",
    origin: "NEWSROOM",
    byline: "Redaksi Verax Press",
    aiInvolvement: "none",
    createdById: author.id,
    publishedAt: daysAgo(4, 11),
    firstPublishedAt: daysAgo(4, 11),
    content: [
      p("Ada perbedaan besar antara mengacu pada sebuah kode etik dan mengklaim diri patuh padanya. Yang pertama bisa diperiksa setiap hari; yang kedua hanya bisa diperiksa saat ia dilanggar."),
      h2("Apa yang kami pakai"),
      bullets([
        "Verifikasi sebelum publikasi — klaim penting diuji ke sumbernya, sumber kunci diverifikasi editor.",
        "Pemisahan fakta dan opini — keduanya tidak pernah dicampur dalam satu naskah tanpa penanda.",
        "Hak jawab — kanal keluhan terbuka dan setiap keluhan tercatat dengan nomor antrean.",
        "Koreksi terbuka — kesalahan material dikoreksi di tempat dan dicatat pada log publik.",
      ]),
      h2("Yang belum kami klaim"),
      p("Verax Press belum memiliki badan hukum pers dan belum mengajukan verifikasi Dewan Pers. Alih-alih berpura-pura, kami menuliskannya apa adanya pada halaman Informasi Kelembagaan dan catatan kaki situs."),
      quote("Kredibilitas tidak dibeli stiker; ia dibangun dari kebiasaan yang bisa diperiksa.", "Catatan redaksi"),
    ],
    sources: [
      { title: "Kode Etik Jurnalistik (Peraturan Dewan Pers No. 6/Peraturan-DP/V/2008)", publisher: "Dewan Pers", url: "https://jdih.dewanpers.or.id/dokumen/peraturan/peraturan-dewan-pers-nomor-6peraturan-dpv2008-tentang-pengesahan-surat-keputusan-dewan-pers-nomor-03sk-dpiii2006-tentang-kode-etik-jurnalistik-sebagai-peraturan-dewan-pers", sourceType: "OFFICIAL", supports: "Isi kode etik yang dijadikan rujukan harian redaksi.", isKeySource: true, verificationStatus: "VERIFIED" },
      { title: "Pedoman Pemberitaan Media Siber (2012)", publisher: "Dewan Pers", url: "https://www.dewanpers.or.id/assets/documents/pedoman/1907090253_-2012_PEDOMAN_PEMBERITAAN_MEDIA_SIBER.pdf", sourceType: "OFFICIAL", supports: "Standar pemberitaan digital yang diadopsi kebijakan internal.", isKeySource: false, verificationStatus: "VERIFIED" },
    ],
    verifiedByStaffId: editor.id,
    contributions: [
      { personId: authorPerson.id, role: "AUTHOR", displayOrder: 1, publicCredit: false },
      { personId: chiefPerson.id, role: "EDITOR", displayOrder: 2, publicCredit: true },
    ],
    reviews: [
      { reviewerId: author.id, fromStatus: "DRAFT", toStatus: "PENDING_REVIEW", decision: "SUBMIT_REVIEW", createdAt: daysAgo(5, 9) },
      { reviewerId: editor.id, fromStatus: "PENDING_REVIEW", toStatus: "FACT_CHECK", decision: "START_FACT_CHECK", createdAt: daysAgo(5, 14) },
      { reviewerId: editor.id, fromStatus: "FACT_CHECK", toStatus: "PENDING_APPROVAL", decision: "SUBMIT_FOR_APPROVAL", createdAt: daysAgo(4, 10) },
      { reviewerId: chief.id, fromStatus: "PENDING_APPROVAL", toStatus: "PUBLISHED", decision: "PUBLISH", createdAt: daysAgo(4, 11) },
    ],
  });

  // ============ Artikel #5 — Analisis regulasi (PENDING_APPROVAL, 1 sumber kunci belum diverifikasi → gate demo) ============
  await upsertArticle({
    slug: "analisis-peta-regulasi-ai-indonesia",
    title: "Analisis: Peta Regulasi AI Indonesia dan Jalan Panjang Kebijakan",
    deck: "Dari etika jurnalistik hingga perizinan berusaha berbasis risiko: potret regulasi yang mengelilingi pemanfaatan AI di Indonesia.",
    deskSlug: "teknologi-kebijakan",
    format: "ANALYSIS",
    status: "PENDING_APPROVAL",
    origin: "NEWSROOM",
    byline: "Oleh Alya Rahmadani",
    aiInvolvement: "assistive",
    createdById: author.id,
    content: [
      p("Perdebatan soal kecerdasan buatan di Indonesia bergerak pada tiga rel: perlindungan data pribadi, perizinan berusaha berbasis risiko, dan etika profesi yang memakai AI. Ketiganya belum membentuk satu kerangka tunggal tentang AI, tetapi masing-masing sudah menorehkan aturan main yang nyata."),
      h2("Rel pertama: data pribadi"),
      p("UU Pelindungan Data Pribadi menetapkan kewajiban pengendali data yang berlaku juga pada sistem AI yang memproses data orang Indonesia. Implementasi teknisnya — termasuk putusan mahkamah konstitusi terkait pasal 53 — masih terus berkembang, dan menjadi rujukan penting bagi pengembang sistem."),
      h2("Rel kedua: perizinan berbasis risiko"),
      p("PP No. 28 Tahun 2025 mencabut PP No. 5 Tahun 2021 dan mengubah cara perizinan berusaha dinilai. Bagi penyelenggara sistem elektronik, pertanyaan kuncinya adalah apakah layanan mereka masuk kategori yang wajib mendaftar sebagai PSE lingkup privat menurut standar kegiatan usaha terbaru."),
      note("Status naskah", "Analisis ini menunggu persetujuan Chief Editor. Salah satu sumber kunci masih berstatus belum diverifikasi sehingga gerbang persetujuan menolak publikasi sampai editor memverifikasinya."),
      h2("Rel ketiga: etika penggunaan"),
      p("Bagi profesi — termasuk jurnalistik — kode etik menuntut kejujuran tentang penggunaan alat otomatis. Verax Press, misalnya, mencatat tingkat keterlibatan AI pada setiap artikel dan menolak publikasi otomatis."),
      p("Kesimpulannya sementara: regulasi AI Indonesia saat ini lebih merupakan mozaik dari aturan sektoral daripada satu undang-undang tunggal. Analisis ini akan diperbarui seiring perkembangan kebijakan."),
    ],
    sources: [
      { title: "UU No. 27 Tahun 2022 — Pelindungan Data Pribadi", publisher: "BPK RI", url: "https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022", sourceType: "OFFICIAL", supports: "Kerangka perlindungan data pribadi nasional.", isKeySource: true, verificationStatus: "VERIFIED" },
      { title: "PP No. 28 Tahun 2025 — Penyelenggaraan Perizinan Berusaha Berbasis Risiko", publisher: "BPK RI", url: "https://peraturan.bpk.go.id/Details/319773/pp-no-28-tahun-2025", sourceType: "OFFICIAL", supports: "Perubahan rezim perizinan berusaha yang relevan bagi penyelenggara sistem elektronik.", isKeySource: true, verificationStatus: "UNVERIFIED" },
      { title: "Permenkomdigi No. 15 Tahun 2025 — Standar Kegiatan Usaha dan Standar Produk/Jasa", publisher: "JDIH Komdigi", url: "https://jdih.komdigi.go.id/produk_hukum/view/id/985/t/peraturan%2Bmenteri%2Bkomunikasi%2Bdan%2Bdigital%2Bnomor%2B15%2Btahun%2B2025", sourceType: "OFFICIAL", supports: "Standar pendaftaran PSE lingkup privat terbaru.", isKeySource: false, verificationStatus: "UNVERIFIED" },
    ],
    verifiedByStaffId: editor.id,
    contributions: [
      { personId: authorPerson.id, role: "AUTHOR", displayOrder: 1, publicCredit: true },
      { personId: editorPerson.id, role: "EDITOR", displayOrder: 2, publicCredit: true },
    ],
    reviews: [
      { reviewerId: author.id, fromStatus: "DRAFT", toStatus: "PENDING_REVIEW", decision: "SUBMIT_REVIEW", createdAt: daysAgo(1, 14) },
      { reviewerId: editor.id, fromStatus: "PENDING_REVIEW", toStatus: "FACT_CHECK", decision: "START_FACT_CHECK", createdAt: daysAgo(1, 16) },
      { reviewerId: editor.id, fromStatus: "FACT_CHECK", toStatus: "PENDING_APPROVAL", decision: "SUBMIT_FOR_APPROVAL", notes: "Satu sumber kunci (PP 28/2025) menunggu verifikasi akhir.", createdAt: daysAgo(0, 9) },
    ],
  });

  // ============ Artikel #6 — Explainer hak jawab (FACT_CHECK) ============
  await upsertArticle({
    slug: "explainer-apa-itu-hak-jawab-dan-hak-koreksi",
    title: "Explainer: Apa Itu Hak Jawab dan Hak Koreksi, dan Bagaimana Cara Mengajukannya di Verax Press",
    deck: "Dua hak yang dijamin peraturan Dewan Pers — dijelaskan dengan bahasa sederhana, beserta cara menggunakannya di media ini.",
    deskSlug: "hukum-keadilan",
    format: "EXPLAINER",
    status: "FACT_CHECK",
    origin: "NEWSROOM",
    byline: "Oleh Alya Rahmadani",
    aiInvolvement: "none",
    createdById: author.id,
    content: [
      p("Hak jawab dan hak koreksi adalah dua instrumen yang dimiliki masyarakat terhadap pemberitaan media. Keduanya diatur peraturan Dewan Pers dan menjadi bagian dari tata kelola media yang bertanggung jawab."),
      h2("Hak jawab"),
      p("Hak jawab adalah hak pihak yang diberitakan untuk membantah atau menanggapi pemberitaan yang merugikannya. Redaksi wajib menimbang dan menanggapi permohonan tersebut sesuai pedoman."),
      h2("Hak koreksi"),
      p("Hak koreksi adalah hak siapa pun — termasuk pembaca — meminta perbaikan atas kesalahan faktual. Di Verax Press, koreksi material tampil pada artikel terkait dan tercatat pada log koreksi publik, lengkap dengan waktu pembaruan."),
      bullets([
        "Ajukan melalui formulir keluhan di halaman /keluhan.",
        "Cantumkan artikel terkait dan bagian yang menurut Anda keliru.",
        "Redaksi mencatat setiap permohonan pada register keluhan dengan nomor antrean.",
      ]),
      note("Status naskah", "Explainer ini sedang berada di tahap fact-check."),
      p("Tenggat operasional penanganan permohonan sedang ditinjau secara hukum oleh redaksi. Sebelum ditetapkan, setiap permohonan tetap dicatat dan ditindaklanjuti secepat kapasitas redaksi memungkinkan."),
    ],
    sources: [
      { title: "Peraturan Dewan Pers No. 9/Peraturan-DP/X/2008 — Pedoman Hak Jawab", publisher: "Dewan Pers", url: "https://jdih.dewanpers.or.id/dokumen/peraturan/peraturan-dewan-pers-nomor-9peraturan-dpx2008-tentang-pedoman-hak-jawab", sourceType: "OFFICIAL", supports: "Definisi dan prosedur hak jawab.", isKeySource: true, verificationStatus: "VERIFIED" },
      { title: "UU No. 40 Tahun 1999 tentang Pers", publisher: "BPK RI", url: "https://peraturan.bpk.go.id/Details/45370/uu-no-40-tahun-1999", sourceType: "OFFICIAL", supports: "Dasar hukum hak jawab dan hak koreksi.", isKeySource: true, verificationStatus: "UNVERIFIED" },
    ],
    verifiedByStaffId: editor.id,
    contributions: [
      { personId: authorPerson.id, role: "AUTHOR", displayOrder: 1, publicCredit: true },
    ],
    reviews: [
      { reviewerId: author.id, fromStatus: "DRAFT", toStatus: "PENDING_REVIEW", decision: "SUBMIT_REVIEW", createdAt: daysAgo(1, 11) },
      { reviewerId: editor.id, fromStatus: "PENDING_REVIEW", toStatus: "FACT_CHECK", decision: "START_FACT_CHECK", createdAt: daysAgo(0, 10) },
    ],
  });

  // ============ Artikel #7 — Draf hasil ingestion API (DRAFT, AI substantive) ============
  const agentArticle = await upsertArticle({
    slug: "catatan-kebijakan-status-pse-media-digital",
    title: "Catatan Kebijakan: Status PSE Lingkup Privat untuk Media Digital",
    deck: "Draf awal dari agent internal: ringkasan kerangka PSE lingkup privat dan pertanyaan yang perlu dijawab redaksi sebelum naskah ini ditindaklanjuti.",
    deskSlug: "teknologi-kebijakan",
    format: "EXPLAINER",
    status: "DRAFT",
    origin: "INGESTION_API",
    byline: AI_PLACEHOLDER_BYLINE,
    aiInvolvement: "substantive",
    aiDisclosureNote: "Draf awal disusun agent internal melalui Content Ingestion API; belum diperiksa editor manusia.",
    createdById: editor.id,
    content: [
      p("Media digital yang menyajikan konten elektronik kepada publik berpotensi masuk dalam kriteria penyelenggara sistem elektronik lingkup privat. Kerangka regulasinya berdiri di atas Permenkominfo No. 5 Tahun 2020 sebagaimana diubah Permenkominfo No. 10 Tahun 2021, dan perlu dibaca bersama rezim perizinan berusaha berbasis risiko yang baru."),
      h2("Pertanyaan kunci untuk redaksi"),
      bullets([
        "Apakah model operasi Verax Press memenuhi kriteria PSE lingkup privat?",
        "Jalur pendaftaran apa yang sesuai dengan standar kegiatan usaha terbaru?",
        "Apa konsekuensi bagi media yang juga membuka submission kontributor pada tahap berikutnya?",
      ]),
      p("Catatan ini adalah draf awal untuk diskusi redaksi. Seluruh klaim pada draf ini belum diverifikasi editor manusia dan tidak untuk dipublikasikan sebelum melewati proses editorial."),
    ],
    sources: [
      { title: "Permenkominfo No. 5 Tahun 2020 — PSE Lingkup Privat", publisher: "JDIH Komdigi", url: "https://jdih.komdigi.go.id/produk_hukum/view/id/759/t/peraturan%2Bmenteri%2Bkomunikasi%2Bdan%2Binformatika%2Bnomor%2B5%2Btahun%2B2020", sourceType: "OFFICIAL", supports: "Kerangka dasar PSE lingkup privat.", isKeySource: true, verificationStatus: "UNVERIFIED" },
      { title: "Permenkominfo No. 10 Tahun 2021 — Perubahan atas Permenkominfo No. 5/2020", publisher: "JDIH Komdigi", url: "https://jdih.komdigi.go.id/produk_hukum/view/id/774/t/peraturan%2Bmenteri%2Bkomunikasi%2Bdan%2Binformatika%2Bnomor%2B10%2Btahun%2B2021", sourceType: "OFFICIAL", supports: "Perubahan rezim PSE privat.", isKeySource: true, verificationStatus: "UNVERIFIED" },
    ],
    contributions: [],
    reviews: [],
    versionType: "ingestion",
    createdByLabel: "api-client:demo-agent",
  });

  // Submission record untuk artikel #7
  await db.submission.upsert({
    where: { articleId: agentArticle.id },
    create: {
      origin: "INGESTION_API",
      articleId: agentArticle.id,
      agentId: "verax-demo-agent",
      status: "SUBMITTED",
      aiInvolvementDeclared: "substantive",
      aiUsageNote: "Draf awal disusun agent untuk ditinjau redaksi.",
      verificationNotes: "Agent mencantumkan rujukan resmi; verifikasi menunggu editor.",
      idempotencyKey: "seed-ingest-demo-001",
      submittedAt: daysAgo(0, 8),
    },
    update: {},
  });

  // ============ Artikel #8 — Draf newsroom biasa (DRAFT) ============
  await upsertArticle({
    slug: "laporan-verax-press-menangani-keluhan-pembaca",
    title: "Laporan Verax Press: Bagaimana Kami Menangani Keluhan Pembaca",
    deck: "Dokumen kerja redaksi tentang alur penanganan keluhan — masih dalam tahap draf.",
    deskSlug: "hukum-keadilan",
    format: "EXPLAINER",
    status: "DRAFT",
    origin: "NEWSROOM",
    byline: "Oleh Alya Rahmadani",
    aiInvolvement: "none",
    createdById: author.id,
    content: [
      p("Setiap keluhan yang masuk melalui formulir publik tercatat pada register keluhan dengan nomor antrean, jenis (hak jawab, hak koreksi, keluhan, atau permintaan penurunan), dan status pengerjaan."),
      p("Draf ini akan menjelaskan alur penanganan, siapa yang berwenang memutuskan, dan bagaimana hasil keputusan dikomunikasikan kepada pelapor."),
    ],
    sources: [],
    contributions: [
      { personId: authorPerson.id, role: "AUTHOR", displayOrder: 1, publicCredit: true },
    ],
    reviews: [],
  });

  // ============ Complaints ============
  const complaintYear = new Date().getFullYear();
  const complaintCount = await db.complaint.count();
  if (complaintCount === 0) {
    await db.complaint.create({
      data: {
        refCode: `KEL-${complaintYear}-0001`,
        type: "HAK_KOREKSI",
        articleId: article2.id,
        senderName: "Pembaca Setia",
        senderEmail: "pembaca@example.com",
        message: "Pada artikel tentang verifikasi sumber, nomor Peraturan Dewan Pers untuk Pedoman Hak Jawab tampak tertulis keliru. Mohon diperiksa.",
        status: "RESOLVED",
        decision: "Kesalahan faktual dipastikan. Koreksi diterbitkan dan tercatat pada log koreksi.",
        decidedAt: daysAgo(2, 17),
        createdAt: daysAgo(3, 20),
      },
    });
    await db.complaint.create({
      data: {
        refCode: `KEL-${complaintYear}-0002`,
        type: "KELUHAN",
        senderName: "Budi Santoso",
        senderEmail: "budi@example.com",
        message: "Saran: mungkin tulisan opini perlu penanda visual yang lebih jelas di beranda.",
        status: "RECEIVED",
        createdAt: daysAgo(0, 7),
      },
    });
  }

  // ============ API client demo ============
  const demoClient = await db.apiClient.findUnique({ where: { clientId: "vrtc_demo_agent" } });
  if (!demoClient) {
    const { secret } = generateClientCredential();
    await db.apiClient.create({
      data: {
        clientId: "vrtc_demo_agent",
        name: "Demo AI Agent (internal)",
        secretHash: hashClientSecret(secret),
        scopes: "submit",
      },
    });
    writeEnvLocal("VERITY_INGESTION_DEMO_CLIENT_ID", "vrtc_demo_agent");
    writeEnvLocal("VERITY_INGESTION_DEMO_CLIENT_SECRET", secret);
    console.log("→ API client demo dibuat; credential ditulis ke .env.local");
  }

  // ============ Audit ringkas ============
  const auditCount = await db.auditEvent.count();
  if (auditCount === 0) {
    const events = [
      { actorType: "SYSTEM", action: "seed.completed", targetType: "ARTICLE", targetId: null, metadataJson: JSON.stringify({ note: "Seed awal Tahap A" }) },
      { actorType: "STAFF", actorId: chief.id, actorLabel: CHIEF_EMAIL, action: "article.published", targetType: "ARTICLE", targetId: null, metadataJson: JSON.stringify({ count: 4 }) },
    ];
    for (const e of events) await db.auditEvent.create({ data: { ...e, createdAt: daysAgo(0, 8) } });
  }

  console.log("✓ Seed selesai.");
  console.log("  Akun (password diatur via env VERITY_SEED_PASSWORD_*; fallback dev-only):");
  console.log(`  - ${CHIEF_EMAIL} (Pemimpin Redaksi, @chief)`);
  console.log(`  - ${EDITOR_EMAIL} (Penulis, @editor)`);
  console.log(`  - ${AUTHOR_EMAIL} (Penulis, @penulis)`);
}

function writeEnvLocal(key: string, value: string): void {
  const envPath = join(process.cwd(), ".env.local");
  let content = "";
  if (existsSync(envPath)) content = readFileSync(envPath, "utf8");
  if (content.includes(`${key}=`)) return;
  const prefix = content.length > 0 && !content.endsWith("\n") ? "\n" : "";
  writeFileSync(envPath, `${content}${prefix}${key}=${value}\n`, { flag: "w" });
}

main()
  .catch((error) => {
    console.error("Seed gagal:", error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
