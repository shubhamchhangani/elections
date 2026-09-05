/* WhatsApp की preview तस्वीरें — SVG बनाकर qlmanage (WebKit) से PNG।
   qlmanage वर्ग कैनवस देता है, इसलिए 800×418 पोस्टर को 800×800 के बीच में
   रखकर बनाते हैं और sips से बीच का हिस्सा काट लेते हैं। */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SYMBOLS } from "../src/symbols.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT  = join(ROOT, "public/og");
const TMP  = join(ROOT, ".og-tmp");
const D    = JSON.parse(readFileSync(join(ROOT, "data/candidates.json"), "utf8"));

const W = 800, H = 418, PAD = (800 - H) / 2;
const F = "Kohinoor Devanagari, Devanagari Sangam MN, sans-serif";
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const sym = (slug, x, y, size) => {
  const inner = (SYMBOLS[slug] || "").replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  const k = size / 64;
  return `<g transform="translate(${x},${y}) scale(${k})" fill="none" stroke="#111"
    stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
};

const poster = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
<rect width="800" height="800" fill="#ffffff"/>
<g transform="translate(0,${PAD})">
  <rect width="${W}" height="${H}" fill="#FBFAF7"/>
  <rect width="${W}" height="66" fill="#000000"/>
  <text x="30" y="44" font-family="${F}" font-size="26" font-weight="700" fill="#ffffff">पोकरण नगर पालिका चुनाव 2026</text>
  ${body}
  <rect y="${H - 6}" width="400" height="6" fill="#F26722"/>
  <rect x="400" y="${H - 6}" width="400" height="6" fill="#1F8FD6"/>
</g></svg>`;

/* होमपेज */
const home = poster(`
  <text x="30" y="150" font-family="${F}" font-size="52" font-weight="700" fill="#1C1814">आपके वार्ड में</text>
  <text x="30" y="215" font-family="${F}" font-size="62" font-weight="700" fill="#12457E">कौन जीत रहा है?</text>
  <text x="30" y="270" font-family="${F}" font-size="25" fill="#5A5148">25 वार्ड · 74 प्रत्याशी · जनता की राय</text>
  ${sym("kamal", 30, 300, 68)}${sym("haath", 118, 300, 68)}${sym("seb", 206, 300, 68)}${sym("almari", 294, 300, 68)}${sym("charpai", 382, 300, 68)}
  <text x="500" y="352" font-family="${F}" font-size="23" fill="#5A5148">अपना वार्ड चुनें →</text>`);

/* अध्यक्ष */
const adhyaksh = poster(`
  <text x="30" y="150" font-family="${F}" font-size="60" font-weight="700" fill="#1C1814">किसका बोर्ड बनेगा?</text>
  <text x="30" y="196" font-family="${F}" font-size="24" fill="#5A5148">25 वार्डों में जिसके ज़्यादा पार्षद, अध्यक्ष उसी दल का</text>
  ${sym("kamal", 60, 225, 92)}${sym("haath", 220, 225, 92)}
  <g transform="translate(380,225) scale(1.44)" fill="none" stroke="#111" stroke-width="3.2" stroke-linecap="round">
    <circle cx="32" cy="32" r="21"/><path d="M25 25a7 7 0 0112 4c0 5-6 5-6 9"/><circle cx="31" cy="46" r="2.4" fill="#111"/></g>
  <text x="70"  y="352" font-family="${F}" font-size="24" font-weight="700" fill="#C24C0C">भाजपा</text>
  <text x="222" y="352" font-family="${F}" font-size="24" font-weight="700" fill="#146298">कांग्रेस</text>
  <text x="378" y="352" font-family="${F}" font-size="24" font-weight="700" fill="#78716C">निर्दलीय</text>`);

/* वार्ड */
const ward = (w) => {
  const n = String(w.ward);
  const nx = n.length > 1 ? 30 : 46;
  const syms = w.pratyashi.slice(0, 5)
    .map((p, i) => sym(p.chinh, 236 + i * 84, 268, 66)).join("");
  let k = w.kshetra;
  if (k.length > 42) k = k.split(" · ").slice(0, 2).join(" · ");
  return poster(`
  <text x="30" y="150" font-family="${F}" font-size="30" font-weight="700" fill="#5A5148">वार्ड</text>
  <text x="${nx}" y="252" font-family="${F}" font-size="112" font-weight="700" fill="#1C1814">${n}</text>
  <text x="236" y="152" font-family="${F}" font-size="52" font-weight="700" fill="#12457E">कौन जीत रहा है?</text>
  <text x="236" y="196" font-family="${F}" font-size="23" fill="#5A5148">${esc(k)}</text>
  <text x="236" y="232" font-family="${F}" font-size="23" font-weight="700" fill="#1C1814">${w.pratyashi.length} प्रत्याशी</text>
  ${syms}
  <text x="30" y="352" font-family="${F}" font-size="20" fill="#5A5148">जनता की राय</text>`);
};

/* बनाओ */
if (existsSync(TMP)) rmSync(TMP, { recursive: true });
mkdirSync(TMP, { recursive: true });
mkdirSync(OUT, { recursive: true });

const jobs = [["home", home], ["adhyaksh", adhyaksh], ...D.wards.map(w => [`ward-${w.ward}`, ward(w)])];

for (const [name, svg] of jobs) {
  const src = join(TMP, `${name}.svg`);
  writeFileSync(src, svg);
  execFileSync("qlmanage", ["-t", "-s", "800", "-o", TMP, src], { stdio: "ignore" });
  execFileSync("sips", ["-c", String(H), String(W), join(TMP, `${name}.svg.png`),
                        "--out", join(OUT, `${name}.png`)], { stdio: "ignore" });
}
rmSync(TMP, { recursive: true });

const { statSync } = await import("node:fs");
const sizes = jobs.map(([n]) => statSync(join(OUT, `${n}.png`)).size);
console.log(`✓ ${jobs.length} OG तस्वीरें → public/og/`);
console.log(`  सबसे बड़ी: ${Math.round(Math.max(...sizes)/1024)}KB (WhatsApp की सीमा 300KB)`);
