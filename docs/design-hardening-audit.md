# Design Hardening Audit — Tahap A (UI/UX Editorial Refinement)

> **Tahap A-2 (10 Nov 2026, sesi rebrand):** dokumen ini kini juga mencakup
> pass "high class & elegan" + rebrand Verity → **Verax Press**. Lihat bagian
> "Tahap A-2" di bawah.

> Audit visual dilakukan 10 Nov 2026 terhadap homepage `/`, halaman artikel
> `/artikel/cara-verity-memverifikasi-sumber`, dan listing desk
> `/desk/teknologi-kebijakan` — via screenshot desktop 1440px + pengukuran
> computed style di browser + analisis visual model. Pembanding pola:
> The New York Times (lompatan skala lead→sekunder), The Guardian (identitas
> tata letak berbeda per section), Reuters/BBC (rule/line sebagai pemberi
> "berat" struktural).
>
> Prinsip yang tidak berubah: tanpa warna baru, tanpa gradient/glassmorphism,
> tanpa kartu membulat; kedalaman dicapai lewat tipografi, garis, spacing.

## Pengukuran baseline (desktop 1440px)

| Elemen | Ukuran sekarang | Catatan |
|---|---|---|
| Wordmark masthead | 54.4px / tracking 15.2px | OK |
| Headline lead homepage | 41.6px (2.6rem) | Terlalu dekat ke tier di bawahnya |
| Section heading (`SectionHeading`) | 22.4px (1.4rem) serif 600 | **Hampir sama dengan headline kartu** |
| Headline kartu standard | 20px (1.25rem) serif 600 | OK sebagai tier 3 |
| Headline kartu compact (rail) | 16.32px serif 500 | OK sebagai tier 4 |
| Kicker | 11px mono, tracking 1.54px | Terlalu kecil/ mudah terlewat |
| Semua separator | 1px `--verity-rule` | Tidak ada variasi berat garis |

## Temuan per halaman

### Homepage `/`

1. **Lompatan skala lead→sekunder terlalu landai.** Lead 41.6px vs standard
   20px vs compact 16.3px — secara angka ada lompatan, tetapi *section
   heading* 22.4px "menabrak" dari atas: judul seksi ("Terbaru", nama desk)
   hampir sebesar headline artikel di dalamnya, sehingga seluruh halaman
   terbaca sebagai satu dataran mid-size. NYT memakai jurang tegas:
   lead ≫ sekunder ≫ rail, dan label seksi justru KECIL (small caps)
   supaya konten yang bicara.
2. **Tidak ada dominasi visual untuk lead story.** Lead hanya sedikit lebih
   besar dari tetangganya, dan rail "Terbaru" punya presence visual yang
   setara (heading 22.4px + border-b-2). Tidak ada "bernapas" ekstra di
   sekitar lead. NYT mendominasi lead lewat ukuran + posisi + whitespace
   di sekelilingnya — tiga hal itu belum dipakai agresif.
3. **Semua seksi = template yang diulang.** `SectionHeading + grid 2
   StandardArticleCard` diulang identik untuk tiap desk, lalu opini
   memakai pola compact yang sama dengan rail Terbaru. Guardian memberi
   identitas layout berbeda per section (featured+list, grid, rows).
4. **Duplikasi konten.** Artikel lead muncul 3× (sebagai lead, di seksi
   desk-nya, dan di seksi Opini) karena query seksi tidak mengecualikan
   lead — halaman terkesan dihasilkan otomatis.
5. **Kedalaman flat.** Semua rule hairline 1px sama berat; tidak ada
   kontras berat garis; spacing antar-seksi seragam mekanis (`pb-12`
   semua) — tidak ada ritme "napas besar di elemen penting".
6. **Kicker lemah & redundan.** 11px mudah terlewat; di dalam seksi desk,
   kicker mengulang nama desk yang baru saja ditulis heading seksi
   ("TEKNOLOGI & KEBIJAKAN · EXPLAINER" di bawah heading "Teknologi &
   Kebijakan") — slot informasi terbuang.
7. **Seksi opini satu artikel kesepian** + disclaimer mengambang di
   whitespace; bagian bawah halaman (strip koreksi) jaraknya jauh lebih
   besar dari jarak antar-seksi — ritme tidak seimbang.

### Halaman artikel `/artikel/[slug]`

1. **Lebar aside tidak konsisten.** Box koreksi (border-l-2 aksen), box
   disclaimer opini, dan box disclosure AI mengambil lebar penuh kontainer
   (max-w-6xl), sedangkan body dibatasi 66ch — tiga "aside" punya tepi
   kolom berbeda dari teks; kolom artikel tidak rata.
2. **Spasi vertikal atas berlebihan.** Byline → koreksi → paragraf pertama
   terpisah terlalu jauh; halaman baru "masuk ritme" setelah ±3 layar.
3. **Kicker 11px** — penanda kategori terpenting justru paling sulit
   dibaca (kontras rendah terhadap kertas).
4. **Headline 2.7rem** bisa naik sedikit dengan line-height & tracking
   yang dijaga agar tetap elegan; kaskade headline→deck→body sudah benar.
5. **Seksi "Sumber & Verifikasi"** adalah diferensiator produk (bagus,
   dipertahankan) — heading-nya bisa sedikit lebih tegas dan item meta
   lebih rapi.
6. **Terkait ("Lainnya dari desk")** polos dibanding bagian di atasnya.

### Listing desk `/desk/[slug]`

1. **Tidak ada artikel unggulan.** Semua artikel dirender grid seragam;
   dengan isi sedikit, halaman terbaca sebagai stub kosong, bukan indeks
   seksi. NYT/Guardian section page selalu punya featured pertama yang
   jelas (ukuran + deck penuh) lalu daftar di bawahnya.
2. **Judul halaman bersaing dengan headline artikel** — sama-sama serif
   600, skala berdekatan (2rem vs 1.25rem), tidak ada kaskade.
3. **Kicker mengulang nama desk** yang sudah tertulis di H1 dua inci di
   atasnya.
4. **Tidak ada state aktif di nav masthead** untuk desk yang sedang
   dibuka — Guardian menandai section aktif di navigasi.
5. **Deskripsi desk nyaris tak terlihat** (1.02rem regular) — seharusnya
   standfirst yang layak.

## Keputusan perbaikan (yang diimplementasikan)

### Sistem skala tipografi baru (token sama: Newsreader/Inter/Plex Mono)

| Tier | Sebelum | Sesudah |
|---|---|---|
| Lead homepage | 2.6rem | `clamp` s/d **3.5rem**, lh 1.05, tracking −0.015em |
| Headline artikel | 2.7rem | **2.9rem**, lh 1.08 |
| Featured per-seksi/desk | — (tidak ada) | **1.6rem** (tier baru) |
| Section heading | serif 1.4rem | **sans 0.85rem semibold uppercase tracking 0.2em** + rule 2px ink (label struktural kecil — pola NYT) |
| Standard card | 1.25rem | 1.3rem |
| Compact/rail | 1.02rem | 1.05rem |
| Kicker | 11px / 0.14em | **12px / 0.18em / medium** |

Pemisahan famili: **sans = struktur/chrome** (nav, section heading, label),
**serif = konten** (headline, deck, body) — sehingga section heading kecil
tidak "menabrak" headline serif.

### Sistem 3 bobot garis

1. **Berat** `border-b-2 border-verity-ink` — section heading & anchor
   header halaman (sudah dipakai, diperluas).
2. **Sedang** `border-verity-rule-strong` — pemisah zona besar halaman
   (sebelum blok seksi desk, band opini).
3. **Hairline** `border-verity-rule` — separator item di dalam seksi.

### Tata letak homepage

- Zona lead: lead + rail "Terbaru" (rail tetap, heading jadi label kecil);
  lead dinaikkan skalanya dan diberi napas terbesar di halaman.
- Seksi desk: **3 layout yang berganti** (A: featured besar + list teks;
  B: grid 2 kolom dengan garis vertikal; C: baris editorial headline+deck)
  — ditentukan oleh indeks seksi sehingga tiap seksi tidak copy-paste.
- Opini: **band paper-soft** (token lama) dengan border rule-strong,
  item dengan byline menonjol — identitas berbeda tanpa warna baru.
- Duplikasi dihilangkan: lead dieksekusi dari query seksi desk & opini.
- Kicker dalam seksi desk hanya menampilkan FORMAT (nama desk dihapus —
  sudah diucapkan heading seksi).

### Halaman lain

- Artikel: aside disamakan lebarnya dengan kolom body (66ch); spasi atas
  dirapatkan; kicker 12px; headline 2.9rem; terkait diberi kicker format.
- Desk/opini: H1 + rule berat + standfirst; artikel pertama jadi featured
  (1.6rem + deck penuh), sisanya list; kicker format-only.
- Masthead: nav dengan **state aktif** (underline ink via inset shadow),
  zona wordmark sedikit dirapatkan.
- Content renderer: pull-quote dinaikkan (1.45rem), caption gambar lebih
  rapi.

### Konten demo

Ditambah 8 artikel seed terbit (semua kebijakan platform sendiri — bukan
berita pihak ketiga, sesuai hard rule #5) supaya variasi layout seksi
terlihat nyata: explainer alur editorial (lead), anatomi koreksi, pengelolaan
kiriman AI, 2 opini tambahan (satu pena baru "Bram Aditya"), tiga dokumen
fondasi, perlindungan sumber & anonimitas, konten terstruktur, kode etik
sebagai rujukan. Total artikel terbit: 12.

---

## Hasil implementasi & verifikasi (10 Nov 2026)

Semua perbaikan di atas diimplementasikan dan diverifikasi berulang lewat
screenshot + evaluasi visual model (3 putaran) + pengukuran computed style:

- **Kaskade skala terpasang**: lead 56px → featured 27.2px → standard/row
  20.8px → opini 19.2px → rail 16.8px; section heading jadi label small-caps
  sans 13.6px + rule 2px ink (tidak lagi menyaingi headline 20px).
- **Paket utama homepage**: lead + 2 headline sekunder + rail Terbaru dengan
  stempel relatif ("Hari ini · 08.12") — dead zone 247px di bawah lead
  hilang (sisa 21px slack grid).
- **Dedup**: lead & sekunder tidak mengulang di seksi; seksi desk hanya
  liputan (opini hanya di band Opini); rail boleh tumpang-tindih — konvensi
  ticker koran (diberi identitas ticker agar repetisinya terbaca disengaja).
- **3 layout seksi berbeda** terverifikasi visual: grid 2 kolom / baris
  headline-dek / unggulan+daftar; seksi bersebelahan tidak memakai pola sama.
- **Halaman lain**: aside artikel segaris dengan kolom body (66ch); desk &
  opini memakai header anchor + featured; nav aktif `aria-current="page"`
  terverifikasi di /desk/hukum-keadilan.
- **Responsif**: mobile 390px tanpa overflow horizontal (scrollWidth ==
  clientWidth), nav scrollable, footer tetap sticky; sticky footer desktop
  terverifikasi (`flex` mechanism aktif).
- **Interaksi**: ditemukan bahwa link headline inline multi-baris punya
  "celah tangga" — titik tengah bounding box bisa jatuh di luar line box
  (klik otomatis meleset, dan area sentuh kecil). Semua anchor headline
  diubah menjadi **block link** (target klik selebar kolom) — terverifikasi
  klik end-to-end: lead → artikel, nav → desk, featured → artikel.
- **Kualitas**: `bun run lint` 0 error; `bunx tsc --noEmit` bersih; semua
  halaman publik 200; artikel internal 404; acceptance test **26 PASS / 0
  FAIL** setelah reset+seed (2 perbaikan ikutan: asersi `grep -c` →
  `grep -o | wc -l` di `scripts/acceptance-test.sh` karena respons JSON
  satu baris; API client demo dibuat ulang karena `.env.local` hilang
  antar-sesi).
- Evaluasi visual model putaran akhir: 9/10 "professional, restrained,
  credible broadsheet feel".

Screenshot before/after tersimpan di `docs/screenshots/`.

### Keputusan yang dicatat sebagai konvensi (bukan bug)

1. **Kolom kanan halaman artikel kosong** — measure 66ch di viewport lebar
   memang sengaja (pola NYT/Guardian); aside mengambang akan melanggar
   prinsip restraint.
2. **Repetisi rail "Terbaru"** — konvensi "latest ticker" koran digital;
   identitas ticker (mono + stempel relatif) membuatnya terbaca disengaja.
3. **Format tanggal rail campuran** ("Hari ini · 08.12" vs "8 Nov") —
   pola waktu relatif standar (fresnel), disengaja.
4. **Kicker Opini merah di halaman desk** — semantik terdokumentasi
   (token: aksen = penanda opini), bukan inkonsistensi.

---

# Tahap A-2 — High Class & Elegan + Rebrand Verax Press (10 Nov 2026)

## Riset arah (prinsip yang diambil, bukan identitas yang ditiru)

Publikasi yang terasa berdiri puluhan tahun (broadsheet klasik, jurnal
institusi lama) membangun wibawa lewat **ketenangan, presisi, dan referensi
pada tradisi nyata jurnalistik cetak** — bukan warna, ornamen ramai, atau
efek. Elemen yang dipelajari: masthead yang berstruktur seperti lembaga
(nama + motto + baris tanggal/edisi), rule tebal sebagai jangkar halaman,
drop cap pada pembuka artikel (tradisi tipografi editorial berabad-abad),
end mark/tombstone sebagai sinyal "artikel selesai", dan penggunaan bahasa
Latin sebagai penanda kesinambungan dengan tradisi pers Eropa.

## Arah yang dipilih untuk Verax Press

1. **Masthead institusional** — struktur broadsheet klasik: motto Latin
   **"Ex Fontibus Veritas"** ("kebenaran bersumber dari sumbernya") di atas
   nama — memilih motto ini karena mengikat etimologi nama (*verax*, Latin:
   "jujur, yang berkata benar") dengan identitas produk inti (verifikasi
   sumber); wordmark **VERAX PRESS** satu baris serif tracking lebar; baris
   tanggal + "Est. MMXXVI" di bawah nama (konvensi surat kabar mapan);
   rule 2px ink sebagai jangkar sebelum nav. Tanggal dipindah dari baris
   utilitas ke bawah wordmark (posisi klasiknya).
2. **Drop cap** pada paragraf pembuka artikel — hanya bila paragraf ≥ 80
   karakter (hindari drop cap pada pembuka pendek yang jadi gimmick).
3. **End mark (tombstone)** — persegi kecil ink setelah paragraf terakhir
   artikel; sinyal penyelesaian khas publikasi mapan.
4. **Motto di footer** sebagai gema identitas + etimologi nama di halaman
   Tentang (nama yang dipikirkan, bukan dipilih acak).
5. Yang **tidak** dipakai (restraint): ornamen dekoratif, warna baru,
   variasi font, kutipan oversized — semua di luar token yang ada.

## Batasan rebrand yang diputuskan

- **Ganti** (reader-facing): masthead, judul/templat metadata SEO, teks UI
  publik, byline "Redaksi Verity" → "Redaksi Verax Press", disclaimer &
  konstanta prosa, seluruh konten seed (judul/deck/isi/slug), studio
  (login/nav/placeholder), byline default ingestion API.
- **Tetap** (teknis, risiko merusak): class CSS `*-verity-*`, env var
  `VERITY_*`, email demo `@verity.test` (dipakai acceptance test), password
  dev, `AUTH_SECRET` fallback, nama API client `vrtc_demo_agent`,
  default `byline` di `schema.prisma` (praktis tidak pernah terpakai —
  studio & ingestion selalu set byline eksplisit; dicatat di worklog).

## Hasil implementasi Tahap A-2 (10 Nov 2026)

- **Masthead baru** (desktop + mobile terverifikasi): motto "EX FONTIBUS
  VERITAS" (mono caps, flanking hairline — hairline disembunyikan di mobile),
  wordmark "VERAX PRESS" (mobile tracking 0.14em agar proporsional; desktop
  2.6–3rem tracking 0.24em; `pl` sebesar tracking untuk pusat optik), baris
  tanggal + "Est. MMXXVI" di bawah nama, rule 2px ink di atas nav.
- **Drop cap** (5rem, line-box ≈ 2 baris body) hanya pada paragraf pembuka
  ≥80 karakter; wrap 2 baris di samping huruf terverifikasi (80px float,
  paragraf pembuka 3 baris: 2 samping cap + 1 full).
- **End mark** dipindah ke DALAM ContentRenderer (prop `endMark`) sehingga
  menempel blok terakhir via space-y-6.
- **text-balance** pada headline lead homepage & H1 artikel (menghilangkan
  widow seperti baris pendek "Press").
- **Rebrand lengkap**: metadata SEO + OG + template judul, masthead, footer
  (wordmark + motto + legal), disclaimer opini, semua teks halaman publik,
  etimologi nama di /tentang, byline default ingestion API, placeholder &
  wordmark studio, session name auth, 51 prosa + 9 slug + agentId di seed.
  Sweep 21 URL publik: 0 "Verity" di prosa; URL lama 404; sitemap slug baru.
- **Yang sengaja TIDAK diganti** (teknis, dicatat): class CSS `*-verity-*`,
  env `VERITY_*`, email demo `@verity.test`, password dev fallback
  (`VerityChief!2026` dst — dipakai acceptance test), `AUTH_SECRET` fallback,
  default `byline` di schema.prisma (tidak pernah terpakai; studio &
  ingestion selalu set eksplisit), nama API client `vrtc_demo_agent`.
- Evaluasi visual model putaran 2: "Ship-ready" — drop cap wrap, end mark,
  masthead institusional, wordmark mobile semua CONFIRM; 0 sisa Verity.
- `bun run lint` 0 error; `bunx tsc --noEmit` bersih; acceptance 26/26 PASS;
  mobile 390px tanpa overflow; 0 error konsol.

---

# Design Hardening — Tahap 2: Ritme dan Komposisi (10 Nov 2026)

> Fokus: BUKAN identitas (masthead/motto/drop cap/end mark sudah ship-ready,
> tidak disentuh), melainkan bagaimana elemen yang ada **bertransisi** satu ke
> yang lain saat pembaca scroll — halaman panjang harus terasa seperti satu
> alur yang dikurasi, bukan blok komponen yang ditumpuk.
> Metode: screenshot penuh desktop 1440px (`docs/screenshots/ritme-before-*.png`)
> + analisis visual model. Halaman yang diaudit: `/` (homepage),
> `/artikel/tiga-dokumen-fondasi-verax-press` (artikel 3× H2 beruntun),
> `/desk/nasional-publik` (6 artikel).

## Temuan

### A. Artikel panjang dengan banyak heading (`/artikel/tiga-dokumen-...`)

1. **H2 mengambang, tidak mengikat kontennya.** Wrapper `space-y-6` memberi
   jarak simetris 24px di atas dan bawah tiap H2 — jarak heading→paragrafnya
   sendiri ≈ jarak ke paragraf seksi sebelumnya. Secara gestalt, heading
   justru lebih "terikat" ke bagian yang SUDAH selesai. (NYT/Economist:
   crosshead menempel erat ke konten bawahnya, jauh dari konten atasnya.)
2. **Semua H2 diberi bobot & napas identik** — "Piagam Redaksi" → "Kebijakan
   Kontributor" → "Standar Editorial" terbaca sebagai daftar seksi generik,
   bukan narasi; tidak ada transisi "babak pembuka" saat prosa intro berakhir.
3. **Pull-quote tidak terbaca sebagai jeda kutipan.** `border-y` hairline
   menyamai bahasa separator body lainnya; teksnya rata kiri selebar measure —
   terasa seperti komponen ditempel, bukan jeda yang disengaja.
4. **End mark mengambang** 24px di bawah blok terakhir (sisa `space-y-6`),
   setelah quote malah makin jauh (padding quote + 24px) — "kuburan kecil
   sendirian di padang putih" (analisis model).
5. **Akhir artikel = dua modul ber-rule-tebal yang tidak pernah muncul di
   body.** `Sumber & Verifikasi` (border-t-2 ink) dan `Lainnya dari desk`
   (border-t-2 ink, pola IDENTIK) bookending bagian akhir — dua garis berat
   yang bahasa visualnya tidak pernah diperkenalkan sebelumnya, sehingga akhir
   artikel "terasa seperti dokumen berbeda" (analisis model). Inginnya:
   sumber = babak baru artikel yang sama; "Lainnya" = navigasi tenang.

### B. Homepage `/`

1. **Transisi antar-seksi = perangkat identik diulang.** Tiap seksi desk:
   `mt-10` seragam + `SectionHeading` (label small-caps + rule 2px ink +
   "Lihat semua") — drumbeat mekanis; scroll terbaca sebagai tumpukan rata,
   bukan kurasi. Tidak ada variasi napas antar-seksi (guardian: seksi
   berubah karakter saat scroll; di sini hanya labelnya yang berganti).
2. **Seksi pertama setelah paket utama tidak "membuka babak".** Setelah lead
   dominan, seksi berikut langsung pola standar — tidak ada seksi showcase
   yang memperkenalkan liputan desk (mis. dengan standfirst desk).
3. **Band Opini = widget dashboard.** Box `bg-verity-paper-soft` + border
   dengan tepi inset terlihat terhadap margin halaman; item opini tanpa
   deck tampak seperti stub label. Terasa kontainer asing, bukan seksi
   editorial (NYT/Guardian memakai rule ganda + tipografi serif untuk
   opini, bukan latar warna).
4. Strip koreksi setelahnya terasa "ditempel" — hanya lanjutan hairline
   tanpa napas.

### C. Halaman desk `/desk/nasional-publik`

1. **Grid 2×3 seragam penuh** di bawah featured — semua kartu identik
   (kicker/headline/deck/byline), tanpa variasi skala; baris bawah rata
   kiri-kanan tidak seimbang (kolom kanan lebih pendek → area kosong
   terlihat).
2. **Transisi featured→grid tidak bernapas** — hanya pergantian lebar
   (penuh → setengah) pada jarak yang sama; featured tidak terbaca dominan,
   hanya "yang pertama".
3. Tidak ada ekor indeks ringkas untuk artikel yang lebih lama — semua
   dipaksa format kartu penuh.

## Keputusan perbaikan (diterapkan)

1. **Renderer artikel: sistem ritme per-blok, menggantikan `space-y-6`
   seragam.** Margin atas kontekstual per tipe blok + tipe blok sebelumnya:
   paragraf 24px (0px setelah heading); H2 pertama artikel = "act break"
   48px, H2 berikutnya 36px, dan SEMUA heading ber-`mb` kecil (14px) agar
   mengikat konten; pull-quote = jeda 40px atas-bawah + interior
   terpusat/narrower (bahasa "set piece"); note/image 36px; end mark
   menempel 12px dari blok terakhir (blok kotak terakhir melepas mb-nya).
   Tidak ada penomoran otomatis H2 — konten seed sudah ada yang bernomor
   di judulnya ("Rel pertama/kedua/ketiga"), penomoran otomatis akan
   bentrok (keputusan: spacing-asymmetry saja).
2. **Akhir artikel:** `Sumber & Verifikasi` = babak baru (napas 64px + rule
   2px — satu-satunya rule tebal di akhir, karena memang bagian dari
   janji artikel); `Lainnya dari desk` diturunkan jadi navigasi tenang —
   hairline + label small-caps sans (bahasa struktur), bukan serif +
   rule tebal. Dua modul akhir tidak lagi kembar.
3. **Homepage:** napas antar-seksi disengaja dan tidak seragam — 72px
   setelah paket utama (membuka babak liputan desk), 56px antar-seksi
   desk, 64px sebelum band Opini; seksi PERTAMA = showcase (featured-list
   + standfirst desk dari `Desk.description` — teks pengantar yang tidak
   muncul di seksi lain); rotasi layout anti-pengulangan-bersebelahan;
   band Opini dibangun ulang tanpa latar warna → **rule ganda klasik**
   (2px ink + 3px + hairline, full-bleed) + label serif italic "Opini"
   (pola NYT/Guardian opinion) + disclaimer di baris header.
4. **Halaman desk: tiering 3 tingkat** — featured (utuh) → 2 kartu dengan
   deck (hairline) → ekor indeks ringkas (compact, byline+tanggal) untuk
   artikel lebih lama; menghilangkan grid rata seragam + baris bawah
   timpang.

Batasan yang dipegang: tidak ada warna baru, tidak ada font baru, tidak ada
komponen/elemen fitur baru (semua perubahan = penyusunan & transisi elemen
yang sudah ada), identitas Tahap A/A-2 (masthead, motto, drop cap, end mark,
wordmark) tidak disentuh, workflow/RBAC/schema tidak berubah.

## Hasil implementasi & verifikasi Tahap 2 (10 Nov 2026)

Terukur di browser (eval computed style + bounding box, desktop 1440px;
direproduksi ulang independen di sesi lanjutan dengan hasil identik):

- **Artikel multi-H2** (`tiga-dokumen-fondasi`): gap blok = 48px (act break
  H2 pertama) → 14px (heading memeluk kontennya) → 36px (H2 berikutnya) →
  40px (pull-quote sebagai set-piece; mb dilepas pada blok terakhir) → 12px
  (end mark menempel penutup). Sebelum: 24px simetris seragam pada semua.
- **Akhir artikel dibedakan**: `Sumber & Verifikasi` = mt-64px + rule 2px ink
  + H2 serif 23.2px (babak baru artikel); `Lainnya dari desk` = mt-56px +
  hairline + H2 Inter uppercase 12.8px (navigasi tenang). Dua modul akhir
  tidak lagi kembar rule-tebal.
- **Homepage**: napas antar-seksi 72px setelah paket utama (membuka babak
  liputan) / 56 / 56 / 64px sebelum Opini; rule ganda Opini terukur (2px
  ink, hairline 3px di bawahnya) full-bleed; label "Opini" serif italic
  24px; standfirst showcase italic 16.8px hanya di seksi pertama.
- **Desk**: 3 tier (featured headline 27.2px → 2 kartu ber-deck → ekor indeks
  3-kolom); header rule 2px ink; hairline dobel bertumpuk dihapus.
- **Mobile 390px**: homepage/artikel/desk scrollWidth=390 (tanpa overflow),
  rule Opini full-bleed 390px, footer terdorong natural (footerBottom ==
  docHeight), 0 error konsol.
- **Interaksi**: block link headline teruji klik end-to-end (lead → artikel).
- **Kualitas**: lint 0 error; `tsc --noEmit` bersih; semua halaman publik 200.
- Evaluasi visual model putaran akhir: kedua halaman "ship-ready".

Screenshot before/after: `docs/screenshots/ritme-*.png`.
