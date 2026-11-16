import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FONTS = [
  {
    key: "newsreaderRegular",
    path: "node_modules/@fontsource/newsreader/files/newsreader-latin-400-normal.woff",
    name: "Newsreader",
    weight: 400,
    style: "normal" as const,
  },
  {
    key: "newsreaderBold",
    path: "node_modules/@fontsource/newsreader/files/newsreader-latin-700-normal.woff",
    name: "Newsreader",
    weight: 700,
    style: "normal" as const,
  },
  {
    key: "newsreaderItalic",
    path: "node_modules/@fontsource/newsreader/files/newsreader-latin-400-italic.woff",
    name: "Newsreader",
    weight: 400,
    style: "italic" as const,
  },
  {
    key: "interRegular",
    path: "node_modules/@fontsource/inter/files/inter-latin-400-normal.woff",
    name: "Inter",
    weight: 400,
    style: "normal" as const,
  },
  {
    key: "interBold",
    path: "node_modules/@fontsource/inter/files/inter-latin-700-normal.woff",
    name: "Inter",
    weight: 700,
    style: "normal" as const,
  },
];

let code = `/**
 * AUTO-GENERATED - Embedded WOFF fonts for Satori rendering.
 * Self-contained base64 strings so rendering works in both local dev and Vercel Serverless
 * without runtime filesystem dependencies.
 */

`;

for (const font of FONTS) {
  const buf = readFileSync(join(process.cwd(), font.path));
  const b64 = buf.toString("base64");
  code += `export const ${font.key}Base64 = "${b64}";\n`;
  code += `export const ${font.key}Meta = { name: "${font.name}", weight: ${font.weight}, style: "${font.style}" as const };\n\n`;
}

code += `export function getSatoriFonts() {
  return [
    { ...newsreaderRegularMeta, data: Buffer.from(newsreaderRegularBase64, "base64") },
    { ...newsreaderBoldMeta, data: Buffer.from(newsreaderBoldBase64, "base64") },
    { ...newsreaderItalicMeta, data: Buffer.from(newsreaderItalicBase64, "base64") },
    { ...interRegularMeta, data: Buffer.from(interRegularBase64, "base64") },
    { ...interBoldMeta, data: Buffer.from(interBoldBase64, "base64") },
  ];
}
`;

writeFileSync(join(process.cwd(), "src/lib/instagram-fonts.ts"), code);
console.log("Successfully generated src/lib/instagram-fonts.ts");
