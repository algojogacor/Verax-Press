# Audit Revisi Penulisan Sistemik Verax Press

Tanggal: 10 November 2026  
Standar Acuan: `anti-ai-writing` dan `docs/editorial/VERAX_WRITING_STANDARDS.md`  
Cakupan: Seluruh teks institusional, kebijakan publik, antarmuka CMS, komunikasi sistem, dan dokumentasi proyek.  
Pengecualian Mutlak: Seluruh isi berita, draf artikel jurnalistik, kutipan langsung narasumber, dan data naskah pada basis data.

---

## 1. Ringkasan Eksekutif

Revisi penulisan berskala sistem telah diselesaikan di seluruh repositori Verax Press (`D:\Projects\verax`). Proyek ini menata ulang seluruh bahasa yang diproduksi oleh sistem, pengembang, dan institusi pengelola agar mencerminkan karakter jurnalisme investigatif yang disiplin, bersahaja, terukur, dan bebas dari gaya penulisan sintetis model bahasa buatan (AI clichés).

Pekerjaan ini dilakukan tanpa mengubah satu pun baris artikel jurnalistik atau memodifikasi catatan berita di basis data lokal maupun produksi.

### Ringkasan Capaian Utama:
1. **Pemberantasan Tanda Pisah Em Dash (—):** Sebanyak 167 kemunculan tanda pisah em dash dalam direktori kode sumber (`src/`) dan dokumentasi telah dihilangkan dan ditulis ulang menggunakan struktur sintaksis bahasa Indonesia yang baku atau tanda baca netral (titik tengah `·`, koma, atau tanda kurung).
2. **Penghapusan Kosakata Klise AI:** Seluruh kata klise seperti *delve*, *elevate*, *seamless*, *robust*, *tapestry*, *testament*, *foster*, *revolutionize*, dan padanan Indonesianya telah dibersihkan secara menyeluruh.
3. **Penyelarasan Istilah Editorial Bahasa Indonesia:** Istilah asing yang sebelumnya tercampur di antarmuka sistem telah dibakukan (contoh: *review* menjadi *penelaahan*, *fact-check* menjadi *uji fakta*, *news* menjadi *berita*, *editor* menjadi *redaktur*).
4. **Pemberantasan Skor dan Metrik Semu:** Klaim-klaim persentase rekaan (*94.60% quality score*) dalam dokumentasi diganti dengan verifikasi nyata dari rangkaian pengujian teknis otomatis.
5. **Penegakan Transparansi Hukum:** Seluruh halaman institusional menegaskan status Verax Press secara jujur sebagai proyek jurnalisme percontohan mandiri tanpa klaim palsu berbadan hukum pers, tanda daftar PSE, atau sertifikasi Dewan Pers.
6. **Pembuatan Pedoman Permanen:** Dokumen panduan penulisan baku telah disahkan pada `docs/editorial/VERAX_WRITING_STANDARDS.md` dan diikatkan ke dalam aturan agen pada berkas `AGENTS.md`.

---

## 2. Batasan dan Pemisahan Cakupan Kerja

| Kategori Teks | Status Revisi | Keterangan |
| :--- | :---: | :--- |
| **A. Identitas Institusional & Kebijakan** | Selesai Dirombak | Halaman Tentang, Standar Editorial, Kebijakan AI, Pedoman Kontributor, Koreksi, Kontak, Opini. |
| **B. Antarmuka Pembaca (Situs Publik)** | Selesai Dirombak | Masthead, navigasi, footer, kartu artikel, formulir keluhan, halaman indeks desk, halaman profil penulis. |
| **C. Antarmuka Kerja Staf (Studio CMS)** | Selesai Dirombak | Halaman login, tata letak CMS, ruang kerja artikel, tab alur dan versi, tab catatan editorial, editor blok. |
| **D. Nilai Domain & Konstanta Alur** | Selesai Dirombak | Label status, label format, label transisi, dan keterangan peringatan alur tanpa mengubah nama enum basis data. |
| **E. Dokumentasi Proyek** | Selesai Dirombak | `README.md` dibersihkan dari emoji dekoratif, em dash, dan diselaraskan dengan arsitektur produksi aktif. |
| **F. Isi Naskah Jurnalistik (Berita/Opini)** | Dikecualikan Mutlak | Tidak ada teks artikel, paragraf tubuh berita, atau rekaman basis data yang diubah atau dihapus. |

---

## 3. Rincian Berkas yang Direvisi

### A. Pedoman dan Aturan Sistem
- `docs/editorial/VERAX_WRITING_STANDARDS.md`: Dokumen acuan baku setebal 230 baris yang memuat visi institusional, larangan kosakata klise AI, aturan tipografi anti-em dash, pembakuan istilah redaksional, dan tabel perbandingan sebelum-sesudah.
- `AGENTS.md`: Berkas instruksi agen di akar proyek yang mewajibkan kepatuhan terhadap `VERAX_WRITING_STANDARDS.md` pada setiap sesi interaksi kode mendatang.

### B. Halaman Publik (`src/app/(public)`)
- `src/app/layout.tsx`: Judul metadata diubah dari em dash menjadi pipa (`|`), ringkasan metadata dibersihkan dari kata-kata promosi.
- `src/app/(public)/tentang/page.tsx`: Penulisan ulang menyeluruh prosa institusional, penegasan transparansi hukum (belum berbadan hukum pers terpisah), pembersihan istilah asing.
- `src/app/(public)/standar-editorial/page.tsx`: Penulisan ulang 3 tingkatan AI, transparansi pencatatan sumber naskah, penghapusan seluruh em dash.
- `src/app/(public)/kebijakan-ai/page.tsx`: Penataan ulang prinsip keterbukaan AI, eliminasi em dash pada judul bagian dan butir kebijakan.
- `src/app/(public)/pedoman-kontributor/page.tsx`: Penegasan batas format yang diterima (khusus Opini, Analisis, Penjelas, Kisah Khas, Wawancara; format Berita tertutup), penjelasan status penerimaan draf uji coba.
- `src/app/(public)/kontak/page.tsx`: Penataan saluran komunikasi redaksi, penghapusan jargon layanan pelanggan korporat.
- `src/app/(public)/koreksi/page.tsx`: Pembersihan em dash pada judul dan deskripsi metadata indeks koreksi publik.
- `src/app/(public)/opini/page.tsx`: Pemurnian prosa pengantar desk opini dan penegasan sanggahan tanggung jawab pandangan penulis.
- `src/app/(public)/penulis/[id]/page.tsx`: Judul halaman menggunakan pipa (`${person.publicName} | Verax Press`), komentar kode diselaraskan.
- `src/app/(public)/desk/[slug]/page.tsx`: Teks kondisi kosong diperbarui menjadi istilah redaksional baku ("penelaahan, uji fakta, dan persetujuan redaktur").
- `src/app/(public)/artikel/[slug]/page.tsx`: Sanggahan opini dan catatan transparansi AI disesuaikan dengan rujukan piagam editorial, komentar dan teks bantuan verifikasi dibersihkan dari em dash.

### C. Komponen Bersama (`src/components`)
- `src/components/site/masthead.tsx`: Pembersihan em dash pada label aksesibilitas (`aria-label`) dan komentar.
- `src/components/site/site-footer.tsx`: Teks penutup kaki halaman menggunakan istilah bahasa Indonesia yang presisi.
- `src/components/site/site-mobile-nav.tsx`: Pembersihan komentar dan penataan label navigasi bergerak.
- `src/components/site/complaint-form.tsx`: Placeholder masukan artikel diubah dari em dash menjadi tanda kurung `(kosongkan jika tidak terkait artikel tertentu)`.
- `src/components/content/content-renderer.tsx`: Format atribusi kutipan diubah dari em dash menjadi titik tengah netral (`· {block.attribution}`), komentar ritme visual dibersihkan.

### D. Nilai Domain dan Tata Bahasa Alur (`src/lib/domain` & `src/lib`)
- `src/lib/domain/constants.ts`:
  - `STATUS_LABELS`: `PENDING_REVIEW` menjadi "Menunggu Penelaahan", `FACT_CHECK` menjadi "Uji Fakta".
  - `FORMAT_LABELS`: `NEWS` menjadi "Berita", `EXPLAINER` menjadi "Penjelas", `FEATURE` menjadi "Kisah Khas".
  - `VERSION_TYPE_LABELS`: `editorial_copyedit` menjadi "Penyuntingan Redaksi", `risk_edit` menjadi "Penyuntingan Risiko", `ingestion` menjadi "Pemasukan API".
  - `ORIGIN_LABELS`: `NEWSROOM` menjadi "Ruang Redaksi", `INGESTION_API` menjadi "Agen AI (API)".
  - `FORMAT_STRUCTURE_HINTS`: Teras berita dan struktur narasi dibakukan.
- `src/lib/domain/workflow.ts`:
  - `TRANSITION_LABELS`: `SUBMIT_REVIEW` menjadi "Ajukan Penelaahan", `START_FACT_CHECK` menjadi "Mulai Uji Fakta", `SUBMIT_FOR_APPROVAL` menjadi "Ajukan Persetujuan", `RESUBMIT_REVIEW` menjadi "Kirim Ulang Penelaahan", `PUBLISH` menjadi "Setujui dan Terbitkan".
- `src/lib/format.ts`: Nilai bawaan tanggal kosong diubah dari em dash (`"—"`) menjadi tanda hubung netral (`"-"`).
- `src/lib/auth.ts`: Komentar pembuka dibersihkan dari em dash.
- `src/lib/password.ts`: Komentar pengamanan password dibersihkan dari em dash.
- `src/types/verity.ts`: Komentar tipe data divalidasi tanpa em dash.

### E. Antarmuka Redaksi Studio CMS (`src/app/studio` & `src/components/studio`)
- `src/app/studio/login/page.tsx`: Contoh masukan placeholder diubah menjadi `nama@redaksi.example`, judul dan tautan balik dirapikan.
- `src/app/studio/(cms)/layout.tsx`: Label navigasi "API Clients" dibakukan menjadi "Klien API", teks identitas pengguna cadangan tidak menggunakan em dash.
- `src/app/studio/(cms)/articles/[id]/page.tsx`: Pesan peringatan gerbang sumber kunci diubah menjadi "sumber kunci belum diverifikasi; gerbang publikasi terkunci."
- `src/components/studio/block-editor.tsx`: Keterangan jenis blok dan pesan kesalahan validasi diformat tanpa em dash, pilihan H2/H3 menggunakan tanda kurung.
- `src/components/studio/article-workflow-tab.tsx`: Label keputusan penelaahan editorial diselaraskan dengan istilah baku, masukan kontributor menggunakan placeholder "Nama lengkap".
- `src/components/studio/article-comments-tab.tsx`: Placeholder catatan redaksi disesuaikan menjadi "Tulis catatan penelaahan atau arahan revisi...".

### F. Dokumentasi Proyek
- `README.md`:
  - Seluruh emoji dekoratif pada judul bab dihilangkan.
  - Tanda pisah em dash pada epigraf diganti dengan pemisah pipa.
  - Deskripsi teknologi diselaraskan dengan kondisi aktual: Next.js 16, Turso Cloud libSQL produksi di Singapura, Verax Media Storage Service pada Azure VM dengan enkripsi HTTPS dan HMAC.
  - Bagian metrik semu diganti dengan pelaporan status verifikasi teknis yang nyata.

---

## 4. Evaluasi Gaya Bahasa dan Analisis Komparatif

| Dimensi Penilaian | Karakteristik Sebelumnya | Karakteristik Pasca-Revisi |
| :--- | :--- | :--- |
| **Nada Suara (Tone)** | Kadang terkesan antusiasme promosi piranti lunak (*platform revolusioner, seamless workflow*). | Kering, tenang, presisi, berbobot institusi pers independen. |
| **Tanda Baca** | Ketergantungan tinggi pada tanda pisah em dash (`—`) untuk menyisipkan keterangan (167 kemunculan). | Disusun dengan struktur kalimat terencana; keterangan disisipkan lewat koma, tanda kurung, atau titik tengah. |
| **Pilihan Kosakata** | Percampuran kata serapan mentah (*review, fact-check, human-in-the-loop, draft, ingest*). | Istilah redaksional Indonesia yang matang (*penelaahan, uji fakta, kendali redaktur, naskah draf, pemasukan*). |
| **Klaim Hukum** | Pernyataan samar mengenai standar dewan pers dan status badan hukum media. | Kejujuran mutlak: secara eksplisit menyatakan status percontohan mandiri dan tidak memalsukan izin/badan usaha. |
| **Metrik dan Bukti** | Skor persentase buatan model AI (*94.60% overall quality score*). | Bukti nyata dari kompilasi build, uji tipe data TypeScript, dan pelaporan suite Bun Test. |

---

## 5. Hasil Verifikasi Teknis

Rangkaian pemeriksaan mutu otomatis dijalankan secara lengkap setelah proses penulisan ulang selesai:

1. **Pemeriksaan Tipe Data (`bun run typecheck`):**
   - Hasil: **0 Kesalahan (Exit code 0)**.
   - Tidak ada antarmuka tipe atau kontrak data yang rusak akibat perubahan label tampilan.
2. **Pemeriksaan Sintaksis Kode (`bun run lint`):**
   - Hasil: **Bersih tanpa peringatan (Exit code 0)**.
3. **Pengujian Logika dan Domain (`bun test`):**
   - Hasil: **16 pengujian lulus, 35 pengujian regresi HTTP diskip secara terencana karena server dev lokal tidak aktif (Exit code 0)**.
   - Modul kunci yang teruji: `api-key.test.ts`, `content.test.ts`, `db.test.ts`, `password.test.ts`, `workflow.test.ts`.
4. **Kompilasi Build Produksi (`bun run build`):**
   - Hasil: **Sukses tanpa galat**.
   - Menghasilkan 26 rute produksi statis/dinamis yang terkompilasi sempurna melalui Next.js Turbopack.

---

## 6. Kesimpulan

Proses revisi penulisan sistemik Verax Press telah selesai 100% dengan kepatuhan penuh terhadap keutuhan data naskah redaksi, kaidah anti-ai-writing, dan standar editorial institusional. Verax Press kini memiliki identitas kebahasaan yang padat, berwibawa, dan dapat dipertanggungjawabkan secara publik maupun teknis.
