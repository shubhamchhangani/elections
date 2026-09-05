import { SUPABASE_URL, SUPABASE_ANON } from "./config.js";

/* ═══════════════════════════════════════════════════════════════
   विज्ञापन — 3 जगहें: top · mid · bottom

   नियम: प्रायोजक (दुकान) का बैनर किसी भी जगह लग सकता है।
         Adsterra के banner तीनों जगहों पर भर सकते हैं।

  top पर भी वही सुरक्षित banner format इस्तेमाल होता है; popunder या social bar नहीं।
   ═══════════════════════════════════════════════════════════════ */

/* ── 1. प्रायोजक — दुकानों के बैनर। पैसा मिलते ही यहाँ जोड़ें ──
  slot:  "top"    सबसे ऊपर, सबसे महँगा
          "mid"    नतीजे के ठीक बाद
          "bottom" सबसे नीचे, सबसे सस्ता
   एक ही slot में कई दुकानें डालेंगे तो वे बारी-बारी घूमेंगी (हर 8 सेकंड)।

   ⚠️ किसी प्रत्याशी या राजनीतिक दल का बैनर यहाँ कभी न डालें —
      चुनाव आयोग के नियम से उसके लिए MCMC का पूर्व-प्रमाणन ज़रूरी है। */
const SPONSORS = [
  // सारे बैनर अब /admin से लगते हैं — यहाँ कुछ लिखने की ज़रूरत नहीं।
  // यह सूची सिर्फ़ आपात स्थिति के लिए है (अगर डेटाबेस जवाब न दे)।
  // { slot:"top",    img:"/img/sponsors/dukan.png", href:"tel:+91XXXXXXXXXX", alt:"दुकान का नाम" },
  // { slot:"bottom", img:"/img/sponsors/dukan2.png", href:"https://wa.me/91XXXXXXXXXX", alt:"दूसरी दुकान" },
];

/* ── 2. Adsterra — ख़ाली जगहें भरने के लिए ──
  डैशबोर्ड में एक banner ad unit बनाएँ और उसकी key यहाँ डालें।
   खाली छोड़ेंगे तो वह जगह बिलकुल नहीं दिखेगी (कोई ख़ाली डिब्बा नहीं)। */
/* अब हर जगह का नियंत्रण /admin से है (ad_config टेबल)।
   यह सिर्फ़ आख़िरी सहारा है — अगर डेटाबेस जवाब ही न दे। */
const FALLBACK_IF_DB_DOWN = { top: "house", mid: "house", bottom: "house" };

const ADSTERRA = {
  // यह domain हर Adsterra खाते का अलग होता है — GET CODE वाले script src से लें
  host: "https://www.highrevenueformat.com",

  // हर जगह के लिए अलग नाप। 300x250 वाला 320x50 से 2-4 गुना ज़्यादा देता है,
  // इसलिए बीच और नीचे वहीं रखा है। key ख़ाली हो तो नीचे वाला 320x50 चलेगा।
  units: {
    top:    { key: "", w: 320, h: 50  },
    mid:    { key: "", w: 300, h: 250 },
    bottom: { key: "", w: 300, h: 250 },
    after:  { key: "", w: 300, h: 250 },
    footer: { key: "", w: 300, h: 250 },
    stick:  { key: "", w: 320, h: 50  },   // नीचे चिपकी पट्टी
  },
  banner: { key: "5e99d15e87d709158409d34747ba1b34", w: 320, h: 50 },   // पुराना, सहारे के लिए
};

/* ─────────────────────────────────────────────────────────── */

/* डेटाबेस से आए बैनर उसी जगह के हार्डकोड बैनर की जगह ले लेते हैं।
   यानी /admin से लगाया बैनर हमेशा जीतता है। */
const H = { apikey: SUPABASE_ANON, authorization: "Bearer " + SUPABASE_ANON };
const get = async (q) => {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: H });
    if (!r.ok) return null;
    const rows = await r.json();
    return Array.isArray(rows) ? rows : null;
  } catch { return null; }
};

const fromDb  = () => get("sponsors?select=slot,img,href,alt&active=eq.true&order=sort.asc");
const cfgFromDb = () => get("ad_config?select=slot,fallback,code,height");

const sponsorHtml = s =>
  `<a class="sponsor" href="${s.href}" rel="nofollow sponsored noopener" target="_blank">
     <img src="${s.img}" alt="${s.alt}" loading="lazy"></a>`;

function fillSponsor(box, list) {
  box.classList.add("has-sponsor");
  box.innerHTML = sponsorHtml(list[0]);
  if (list.length < 2) return;
  let i = 0;
  setInterval(() => { i = (i + 1) % list.length; box.innerHTML = sponsorHtml(list[i]); }, 8000);
}

/* अपना विज्ञापन — जब Adsterra बंद हो या key न हो, तो जगह ख़ाली न रहे,
   बल्कि वहीं से दुकानदार को न्यौता चला जाए */
const HOUSE_WA = "919079269147";
let _grand = 0;

async function loadGrand() {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_totals`, {
      method: "POST", headers: { ...H, "content-type": "application/json" }, body: "{}"
    });
    if (!r.ok) return;
    const d = await r.json();
    _grand = (d && d.grand) || 0;
  } catch {}
}

function fillHouse(box) {
  box.classList.add("has-house");
  const proof = _grand >= 100
    ? ` · <i><b>${_grand.toLocaleString("en-IN")}</b> लोग वोट दे चुके हैं</i>`
    : "";
  box.innerHTML = `<a class="house" href="https://wa.me/${HOUSE_WA}?text=${
    encodeURIComponent("पोकरण चुनाव वेबसाइट पर विज्ञापन के बारे में जानकारी चाहिए")
  }" rel="noopener" target="_blank">
    <b>अपने व्यवसाय का विज्ञापन यहाँ लगवाएं${proof}</b>
    <span>WhatsApp पर संपर्क करें</span>
  </a>`;
}


/* पूरे पेज पर एक बार चलने वाला टैग — जैसे Adcash AutoTag, जो ख़ुद जगह
   ढूँढ़कर विज्ञापन लगाता है। इसे iframe में नहीं डाल सकते, क्योंकि उसे पन्ना
   दिखना चाहिए। इसलिए यह app.js के बाद चलता है — मतदान पहले तैयार हो जाता है। */
function runGlobal(html) {
  if (!html || runGlobal._done) return;
  runGlobal._done = true;
  const holder = document.createElement("div");
  holder.innerHTML = html;
  for (const el of [...holder.children]) {
    if (el.tagName !== "SCRIPT") { document.body.appendChild(el); continue; }
    const sc = document.createElement("script");
    for (const a of el.attributes) sc.setAttribute(a.name, a.value);
    sc.text = el.textContent;
    document.body.appendChild(sc);
  }
}

/* नेटवर्क का अपना टैग — अलग iframe में, ताकि साइट को छू न सके */
function fillCode(box, code, h) {
  box.classList.add("has-ad");
  const f = document.createElement("iframe");
  f.style.cssText = `width:100%;max-width:${h > 300 ? 360 : 340}px;height:${h}px;border:0;display:block`;
  f.setAttribute("scrolling", "no");
  f.title = "विज्ञापन";
  box.appendChild(f);
  if (box.dataset.ad === "stick") addStickClose(box);
  const d = f.contentDocument;
  d.open();
  d.write(`<body style="margin:0;display:flex;align-items:center;justify-content:center">${code}</body>`);
  d.close();
}

function addStickClose(box) {
  document.body.classList.add("has-stick");
  const x = document.createElement("button");
  x.className = "close"; x.type = "button"; x.textContent = "×";
  x.setAttribute("aria-label", "विज्ञापन बंद करें");
  x.onclick = () => { box.remove(); document.body.classList.remove("has-stick"); };
  box.appendChild(x);
}

function fillAdsterra(box, cfg) {
  if (!cfg.key) return box.dataset.ad === "stick" ? null : fillHouse(box);
  box.classList.add("has-ad");
  const f = document.createElement("iframe");
  f.style.cssText = `width:${cfg.w}px;height:${cfg.h}px;border:0;display:block`;
  f.setAttribute("scrolling", "no");
  f.loading = "lazy";
  f.title = "विज्ञापन";
  box.appendChild(f);
  if (box.dataset.ad === "stick") addStickClose(box);
  const d = f.contentDocument;
  d.open();
  d.write(`<body style="margin:0">
<script>atOptions={'key':'${cfg.key}','format':'iframe','height':${cfg.h},'width':${cfg.w},'params':{}};<\/script>
<script src="${ADSTERRA.host}/${cfg.key}/invoke.js"><\/script></body>`);
  d.close();
}

(async () => {
  const [db, cfgRows] = await Promise.all([fromDb(), cfgFromDb(), loadGrand()]);

  const bySlot = {}, seen = new Set();
  for (const s of SPONSORS) (bySlot[s.slot] ||= []).push(s);
  for (const s of (db || [])) {                    // /admin वाला बैनर हार्डकोड पर भारी
    if (!seen.has(s.slot)) { bySlot[s.slot] = []; seen.add(s.slot); }
    bySlot[s.slot].push(s);
  }

  const mode = { ...FALLBACK_IF_DB_DOWN }, code = {}, hgt = {};
  for (const r of (cfgRows || [])) {
    mode[r.slot] = r.fallback;
    if (r.code) code[r.slot] = r.code;
    if (r.height) hgt[r.slot] = r.height;
  }

  if (mode.global !== "off" && code.global) runGlobal(code.global);

  document.querySelectorAll("[data-ad]").forEach(box => {
    const slot = box.dataset.ad;
    const mine = bySlot[slot];
    if (mine && mine.length) return fillSponsor(box, mine);   // दुकान का बैनर सबसे पहले
    const m = mode[slot];
    if (m === "adsterra") {
      if (code[slot]) {
        const h = hgt[slot] || (["mid","bottom","after","footer"].includes(slot) ? 260 : 60);
        return fillCode(box, code[slot], h);
      }
      const u = ADSTERRA.units[slot];
      return fillAdsterra(box, u && u.key ? u : ADSTERRA.banner);
    }
    // ऊपर वाली पट्टी यही बात पहले से कह रही है — top पर दोबारा मत दिखाओ
    if (m === "house" && slot !== "top" && slot !== "stick") return fillHouse(box);
    /* off — कुछ नहीं */
  });
})();
