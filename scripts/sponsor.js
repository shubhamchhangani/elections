/* प्रायोजकों के बैनर — SVG से PNG (qlmanage + sips, वही तरीक़ा जो OG तस्वीरों का है)।
   नया प्रायोजक मिले तो नीचे SPONSORS में एक entry जोड़कर  npm run sponsor  चलाएँ। */
import { writeFileSync, mkdirSync, rmSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT  = join(ROOT, "public/img/sponsors");
const TMP  = join(ROOT, ".sp-tmp");
const W = 640, H = 180, PAD = (W - H) / 2;
const HI = "Kohinoor Devanagari, Devanagari Sangam MN, sans-serif";
const EN = "Helvetica Neue, Helvetica, Arial, sans-serif";

const iphoneWala = `
  <rect width="${W}" height="${H}" fill="#0B0B0D"/>
  <rect x="0" y="0" width="5" height="${H}" fill="#C8C8CE"/>

  <!-- फ़ोन की आकृति -->
  <g transform="translate(40,30)" fill="none" stroke="#E8E8EE" stroke-width="2.6">
    <rect x="0" y="0" width="62" height="120" rx="12"/>
    <rect x="7" y="14" width="48" height="92" rx="4" stroke="#4A4A55"/>
    <path d="M22 6h18" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="31" cy="113" r="3.4" fill="#E8E8EE" stroke="none"/>
  </g>

  <text x="140" y="52" font-family="${EN}" font-size="38" font-weight="700"
        fill="#FFFFFF" letter-spacing="-.5">iPhone Wala</text>
  <text x="140" y="78" font-family="${HI}" font-size="17" fill="#A9A9B4">
    बैंक ऑफ़ बड़ौदा के सामने, पोकरण</text>

  <rect x="140" y="92" width="300" height="1" fill="#33333D"/>

  <text x="140" y="118" font-family="${HI}" font-size="16" fill="#A9A9B4">प्रशांत व्यास</text>
  <text x="252" y="118" font-family="${EN}" font-size="18" font-weight="700" fill="#FFFFFF">97859 78898</text>
  <text x="140" y="145" font-family="${HI}" font-size="16" fill="#A9A9B4">नवनीत व्यास</text>
  <text x="252" y="145" font-family="${EN}" font-size="18" font-weight="700" fill="#FFFFFF">90244 89425</text>

  <!-- कॉल करें -->
  <rect x="470" y="62" width="132" height="46" rx="23" fill="#FFFFFF"/>
  <g transform="translate(492,76)" fill="#0B0B0D">
    <path d="M3.6 1.2c.5-.5 1.3-.4 1.7.2l1.6 2.4c.3.5.2 1.1-.2 1.5l-.9.9c-.2.2-.3.5-.1.8a12 12 0 0 0 4.6 4.6c.3.2.6.1.8-.1l.9-.9c.4-.4 1-.5 1.5-.2l2.4 1.6c.6.4.7 1.2.2 1.7l-1.1 1.1c-.6.6-1.5.9-2.3.7C9.2 16.3 4.1 11.2 2.5 5.1c-.2-.8.1-1.7.7-2.3l.4-1.6z"/>
  </g>
  <text x="518" y="92" font-family="${HI}" font-size="17" font-weight="700" fill="#0B0B0D">कॉल करें</text>
`;

const SPONSORS = [
  { file: "iphone-wala.png", body: iphoneWala },
];

if (existsSync(TMP)) rmSync(TMP, { recursive: true });
mkdirSync(TMP, { recursive: true });
mkdirSync(OUT, { recursive: true });

for (const s of SPONSORS) {
  const name = s.file.replace(/\.png$/, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}">
<rect width="${W}" height="${W}" fill="#ffffff"/>
<g transform="translate(0,${PAD})">${s.body}</g></svg>`;
  const src = join(TMP, `${name}.svg`);
  writeFileSync(src, svg);
  execFileSync("qlmanage", ["-t", "-s", String(W), "-o", TMP, src], { stdio: "ignore" });
  execFileSync("sips", ["-c", String(H), String(W), join(TMP, `${name}.svg.png`),
                        "--out", join(OUT, s.file)], { stdio: "ignore" });
  console.log(`✓ ${s.file}  ${Math.round(statSync(join(OUT, s.file)).size / 1024)}KB`);
}
rmSync(TMP, { recursive: true });
