// Renderer block-JSON → JSX. Tidak ada HTML mentah: semua string dirender sebagai
// text node React (aman dari XSS by construction). Skema: src/lib/domain/content.ts.
// Tradisi editorial: paragraf pembuka yang cukup panjang mendapat DROP CAP
// (huruf pertama besar menggantung), klasik dan tenang tanpa ornamen.
//
// RITME (Tahap 2): wrapper TIDAK memakai space-y seragam. Tiap blok diberi
// margin kontekstual menurut jenis dan blok sebelumnya: judul melekat pada
// konten di bawahnya (margin bawah kecil) dan berjarak dari bagian sebelumnya
// (margin atas besar), pull-quote/note/gambar merupakan jeda visual yang terukur.
// Margin antar-sibling collapse (layout blok biasa), jadi jarak aktual =
// max(margin-bawah blok sebelumnya, margin-atas blok berikutnya).
import type { ArticleContent } from "@/lib/domain/content";

export function ContentRenderer({ content, endMark = false }: { content: ArticleContent; endMark?: boolean }) {
  // Drop cap hanya untuk paragraf pembuka pertama yang cukup panjang (≥80 karakter)
  // agar tidak menjadi gimmick pada pembuka pendek.
  const dropCapIndex = content.findIndex(
    (block) => block.type === "paragraph" && block.text.length >= 80,
  );
  // H2 pertama artikel = pergantian babak (dari prosa pembuka ke tubuh artikel)
  // → napas terbesar; H2 berikutnya lebih rapat.
  const firstH2Index = content.findIndex((b) => b.type === "heading" && b.level === 2);
  const lastIndex = content.length - 1;

  return (
    <div className="max-w-(--measure-article)">
      {content.map((block, index) => {
        const prev = index > 0 ? content[index - 1] : null;
        const isFirst = index === 0;
        // Blok berbingkai (quote/note/gambar) melepas margin bawahnya bila ia
        // blok terakhir agar tanda akhir tetap menempel pada penutup artikel.
        const boxedBottom = isLastBlock(index, lastIndex, endMark);
        const afterHeading = prev?.type === "heading";

        switch (block.type) {
          case "paragraph": {
            const useDropCap = index === dropCapIndex;
            return (
              <p
                key={index}
                className={
                  (isFirst || afterHeading ? "" : "mt-6 ") +
                  "font-serif text-[1.0625rem] leading-[1.78] text-verity-ink" +
                  // Drop cap 2 baris penuh: line-box 5rem×0.76 ≈ 2× line-height body (30.3px)
                  // agar dua baris pertama mengalir rapi di samping huruf (wrap klasik).
                  (useDropCap
                    ? " first-letter:float-left first-letter:mr-3 first-letter:mt-[0.18rem] first-letter:font-serif first-letter:text-[5rem] first-letter:font-semibold first-letter:leading-[0.76] first-letter:text-verity-ink"
                    : "")
                }
              >
                {block.text}
              </p>
            );
          }
          case "heading":
            // H2: babak pertama mendapat napas 48px, babak berikutnya 36px;
            // margin bawah 14px menempelkan heading pada konten yang digerakkannya.
            return block.level === 2 ? (
              <h2
                key={index}
                className={
                  (isFirst ? "" : index === firstH2Index ? "mt-12 " : "mt-9 ") +
                  "mb-3.5 font-serif text-[1.5rem] font-semibold leading-tight text-verity-ink"
                }
              >
                {block.text}
              </h2>
            ) : (
              <h3
                key={index}
                className={
                  (isFirst ? "" : "mt-7 ") +
                  "mb-2.5 font-serif text-[1.2rem] font-semibold leading-tight text-verity-ink"
                }
              >
                {block.text}
              </h3>
            );
          case "quote":
            // Pull-quote sebagai jeda yang disengaja: napas proporsional di kedua sisi,
            // tata letak terpusat dan lebih ramping dari lebar naskah utama.
            return (
              <figure
                key={index}
                className={
                  (isFirst ? "" : "mt-10 ") +
                  (boxedBottom ? "" : "mb-10 ") +
                  "border-y border-verity-rule-strong py-8"
                }
              >
                <blockquote className="mx-auto max-w-[42ch] text-center font-serif text-[1.45rem] font-medium italic leading-[1.45] text-verity-ink">
                  “{block.text}”
                </blockquote>
                {block.attribution ? (
                  <figcaption className="mx-auto mt-4 max-w-[42ch] text-center font-mono text-[11px] uppercase tracking-[0.14em] text-verity-ink-faint">
                    · {block.attribution}
                  </figcaption>
                ) : null}
              </figure>
            );
          case "list":
            return block.style === "bullet" ? (
              <ul key={index} className={(afterHeading ? "" : "mt-5 ") + "space-y-2.5 pl-1"}>
                {block.items.map((item, i) => (
                  <li key={i} className="flex gap-3 font-serif text-[1.02rem] leading-[1.7] text-verity-ink">
                    <span className="mt-[0.72em] h-[5px] w-[5px] shrink-0 bg-verity-ink" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <ol key={index} className={(afterHeading ? "" : "mt-5 ") + "space-y-2.5 pl-1"}>
                {block.items.map((item, i) => (
                  <li key={i} className="flex gap-3 font-serif text-[1.02rem] leading-[1.7] text-verity-ink">
                    <span className="mt-[0.15em] font-mono text-[0.85rem] text-verity-ink-soft">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            );
          case "image":
            return (
              <figure
                key={index}
                className={(isFirst ? "" : "mt-9 ") + (boxedBottom ? "" : "mb-9 ")}
              >
                <img
                  src={block.url}
                  alt={block.alt ?? block.caption ?? ""}
                  className="w-full border border-verity-rule bg-verity-paper-soft object-contain"
                  loading="lazy"
                />
                {block.caption || block.credit ? (
                  <figcaption className="mt-2.5 border-b border-verity-rule pb-3 font-mono text-[11px] leading-relaxed text-verity-ink-faint">
                    {block.caption}
                    {block.caption && block.credit ? " " : ""}
                    {block.credit ? <span className="text-verity-ink-soft">({block.credit})</span> : null}
                  </figcaption>
                ) : null}
              </figure>
            );
          case "note":
            return (
              <aside
                key={index}
                className={
                  (isFirst ? "" : "mt-9 ") +
                  (boxedBottom ? "" : "mb-9 ") +
                  "border border-verity-rule bg-verity-paper-soft px-5 py-4"
                }
              >
                {block.label ? (
                  <p className="font-mono text-[12px] font-medium uppercase tracking-[0.18em] text-verity-accent">
                    {block.label}
                  </p>
                ) : null}
                <p className="mt-1.5 font-serif text-[0.95rem] leading-relaxed text-verity-ink-soft">
                  {block.text}
                </p>
              </aside>
            );
          case "qa":
            return (
              <div
                key={index}
                className={(prev?.type === "qa" ? "mt-6 " : "mt-8 ") + "border-t border-verity-rule pt-5"}
              >
                <p className="font-sans text-[0.95rem] font-semibold text-verity-ink">
                  <span className="mr-2 font-mono text-[11px] uppercase tracking-[0.12em] text-verity-accent">T</span>
                  {block.question}
                </p>
                <p className="mt-2 font-serif text-[1.02rem] leading-[1.75] text-verity-ink">
                  <span className="mr-2 font-mono text-[11px] uppercase tracking-[0.12em] text-verity-ink-faint">J</span>
                  {block.answer}
                </p>
              </div>
            );
          default:
            return null;
        }
      })}
      {/* Tanda akhir (tombstone): penanda naskah selesai, melekat pada blok
          terakhir tanpa celah berlebih. */}
      {endMark ? (
        <span aria-hidden="true" className="mt-3 block h-[9px] w-[9px] bg-verity-ink" />
      ) : null}
    </div>
  );
}

/** Memeriksa apakah blok merupakan penutup dan tanda akhir akan mengikuti
 *  untuk melepas margin bawah blok berbingkai agar akhir artikel tetap rapi. */
function isLastBlock(index: number, lastIndex: number, endMark: boolean): boolean {
  return endMark && index === lastIndex;
}
