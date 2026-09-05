import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE, WA, GA_ID, GSC_VERIFY } from "../src/config.js";
import { symbolSvg } from "../src/symbols.js";   // एक ही जगह से — दोबारा कभी बेमेल न हो

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT  = join(ROOT, "dist");
const D    = JSON.parse(readFileSync(join(ROOT, "data/candidates.json"), "utf8"));

const dev = n => String(n);   // अंक अंग्रेज़ी में — 1 2 3, देवनागरी में नहीं
const esc  = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

/* ── साँचा ───────────────────────────────────────────────────── */
// og: टैग सबसे ऊपर — WhatsApp सिर्फ़ head के शुरुआती हिस्से को पढ़ता है
const ga = GA_ID ? `
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}
gtag('js',new Date());
gtag('config','${GA_ID}',{anonymize_ip:true});
</script>` : "";

const page = ({ title, desc, path, og, body, ward = null, schema = "" }) => `<!doctype html>
<html lang="hi">
<head>
<meta charset="utf-8">
<meta property="og:type" content="website">
<meta property="og:site_name" content="पोकरण चुनाव 2026">
<meta property="og:locale" content="hi_IN">
<meta property="og:title" content="${esc(og.title)}">
<meta property="og:description" content="${esc(og.desc)}">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:image" content="${SITE}${og.img}">
<meta property="og:image:width" content="800">
<meta property="og:image:height" content="418">
<meta name="twitter:card" content="summary_large_image">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${path}">
<meta name="theme-color" content="#000000">${GSC_VERIFY ? `\n<meta name="google-site-verification" content="${GSC_VERIFY}">` : ""}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Martel:wght@700;800&family=Mukta:wght@400;600;700&display=swap">
<link rel="stylesheet" href="/styles.css">
${schema}
</head>
<body${ward !== null ? ` data-ward="${ward}"` : ""}>

<header class="masthead">
  <div class="wrap">
    <b><a href="/">पोकरण नगर पालिका<br>चुनाव 2026</a></b>
    <small>जनता की राय</small>
  </div>
</header>

<div class="status live hide" data-phase="live"><span class="dot"></span> मतदान चालू · 7 सितम्बर शाम 6 बजे तक</div>
<div class="status frozen hide" data-phase="frozen">मतदान बंद · नतीजे 9 सितम्बर शाम 6 बजे</div>
<div class="status result hide" data-phase="result">अंतिम नतीजे · मतदान समाप्त</div>

<main class="wrap">
${body}
</main>

<footer>
  <div class="wrap">
    <div class="disc">
      <b>यह एक जनमत सर्वेक्षण है।</b> यह चुनाव आयोग या किसी सरकारी संस्था से सम्बंधित नहीं है।
      यहाँ दिखने वाले आँकड़े इस वेबसाइट पर वोट देने वालों के हैं — ये असली चुनाव परिणाम नहीं हैं।
      प्रत्याशियों की सूची रिटर्निंग अधिकारी द्वारा जारी प्ररूप-6 (दिनांक 04.09.2026) से ली गई है।
      <br><br>
      <b>एक फ़ोन से एक ही वोट।</b> दोबारा वोट डालने की कोशिश रोकने के लिए हर उपकरण की पहचान
      दर्ज होती है, और स्वचालित मतदान (बॉट) रोकने के लिए जाँच लगी है। फिर भी यह एक खुला
      जनमत सर्वेक्षण है — गुप्त मतदान नहीं।
    </div>
    <p><b>इस वेबसाइट पर किसी प्रत्याशी या राजनीतिक दल का विज्ञापन नहीं लिया जाता।</b></p>
    <p>अपनी दुकान या व्यवसाय का विज्ञापन यहाँ लगवाएँ — बैनर, वीडियो या स्लाइडर।
       <a href="https://wa.me/${WA}?text=${encodeURIComponent("पोकरण चुनाव वेबसाइट पर विज्ञापन के बारे में जानकारी चाहिए")}">WhatsApp पर संपर्क करें</a></p>
    <p><a href="/">सभी वार्ड</a> · <a href="/adhyaksh">अध्यक्ष</a> · <a href="/adhyaksh-kaise-chunte-hain">अध्यक्ष कैसे चुना जाता है?</a> · <a href="/gopniyata-niti">गोपनीयता नीति</a></p>
    <p style="font-size:12.5px">मतदान 09 सितम्बर 2026 · मतगणना 14 सितम्बर 2026</p>
  </div>
</footer>

<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>
<script src="/ads.js" defer></script>
<script type="module" src="/app.js"></script>${ga}
</body>
</html>`;

/* ── मतपत्र की पंक्तियाँ ─────────────────────────────────────── */
const symImg = (slug, naam) =>
  `<span class="sym" role="img" aria-label="${esc(naam)}">${symbolSvg(slug)}</span>`;

const row = ({ choice, dal, naam, dalNaam, chinhSlug, chinhNaam, serial }) => `
    <button class="row" data-choice="${choice}" data-dal="${dal}" type="button">
      <span class="fill"></span>
      <span class="serial">${dev(serial)}</span>
      <span class="who"><span class="naam">${esc(naam)}</span><span class="dal">${esc(dalNaam)}</span></span>
      <span class="chinh">${symImg(chinhSlug, chinhNaam)}<small>${esc(chinhNaam)}</small></span>
      <span class="btn-cell"><i class="lamp"></i><i class="evm-btn"></i></span>
      <span class="pct hide"><b>—</b><small></small></span>
    </button>`;

const ballot = (label, rows) => `
  <div class="ballot">
    <div class="ballot-head"><span>${label}</span><span><span data-total>0</span> वोट</span></div>
${rows}
  </div>`;

const leader = `
  <div class="leader hide">
    <div class="cap"><span>अभी आगे चल रहे हैं</span><span>जनता की राय</span></div>
    <div class="body"><span class="art"></span>
      <div><p class="naam"></p><p class="meta"></p></div>
      <div class="big"></div>
    </div>
    <div class="foot"><span><b data-total>0</b> लोगों की राय</span><span>${SITE.replace(/^https?:\/\//,"")}</span></div>
  </div>`;

const gate = `
  <div class="gate hide">
    <p class="count">0</p>
    <p></p>
    <div class="track"><i style="width:0"></i></div>
  </div>`;

const shareBtns = `
  <button class="btn wa" data-share="wa" type="button">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.5 14.1c-.2.7-1.3 1.3-1.9 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5.1-4.5-.1-.2-1.2-1.5-1.2-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.3.3c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.2.4-.2.6-.1l2 .9c.2.1.4.2.4.3.1.2.1.7-.1 1.3Z"/></svg>
    WhatsApp पर भेजें
  </button>
  <button class="btn ghost" data-share="any" type="button">लिंक कॉपी करें</button>`;

const adSlot = (slot, label) =>
  `<div class="ad ad-${slot}" data-ad="${slot}"${label ? ` data-label="${label}"` : ""}></div>`;



/* ── पृष्ठ बनाना ─────────────────────────────────────────────── */
if (existsSync(OUT)) rmSync(OUT, { recursive: true });
mkdirSync(OUT, { recursive: true });
const pages = [];
const write = (p, html) => { const f = join(OUT, p); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, html); pages.push(p); };

const P = D.parties;

/* होमपेज */
{
  const tiles = D.wards.map(w =>
    `<a href="/ward-${w.ward}"><span>${dev(w.ward)}</span><small>वार्ड</small></a>`).join("\n    ");

  const noINC = D.wards.filter(w => !w.pratyashi.some(p => p.dal === "inc")).map(w => w.ward);

  write("index.html", page({
    title: "पोकरण नगर पालिका चुनाव 2026 — वार्डवार प्रत्याशी सूची और जनता की राय",
    desc: "पोकरण नगर पालिका चुनाव 2026 के सभी 25 वार्डों के 74 प्रत्याशी, उनके चुनाव चिन्ह और जनता की राय। अपने वार्ड में देखें कौन आगे चल रहा है।",
    path: "/",
    og: { title: "पोकरण नगर पालिका चुनाव 2026 — आपके वार्ड में कौन जीत रहा है?",
          desc: "25 वार्ड, 74 प्रत्याशी। अपना वार्ड चुनें और देखें जनता की राय।",
          img: "/og/home.png" },
    schema: `<script type="application/ld+json">${JSON.stringify({
      "@context":"https://schema.org","@type":"WebSite","name":"पोकरण चुनाव 2026 — जनता की राय",
      "url":SITE,"inLanguage":"hi-IN"})}</script>`,
    body: `
  ${adSlot("top")}

  <div class="head">
    <h1>आपके वार्ड में कौन जीत रहा है?</h1>
    <p class="kshetra">पोकरण नगर पालिका के सभी 25 वार्ड · 74 प्रत्याशी · अपना वार्ड चुनें</p>
  </div>

  <div class="grid">
    ${tiles}
  </div>

  ${adSlot("mid")}

  <div class="sec">
    <h2>अध्यक्ष किस पार्टी का बनेगा?</h2>
    <p>25 वार्डों में से जिस दल के सबसे ज़्यादा पार्षद जीतेंगे, अध्यक्ष उसी का बनेगा। आपकी क्या राय है?</p>
    <a class="btn" href="/adhyaksh">अध्यक्ष वाले सवाल पर वोट दें</a>
  </div>

  <div class="sec">
    <h2>चुनाव की तारीख़ें</h2>
    <ul>
      <li><b>09 सितम्बर 2026</b> — मतदान, सुबह 7 से शाम 6 बजे तक</li>
      <li><b>14 सितम्बर 2026</b> — मतगणना</li>
      <li><b>21 सितम्बर 2026</b> — अध्यक्ष का चुनाव (जीते हुए पार्षदों द्वारा)</li>
    </ul>
    <p><a href="/adhyaksh-kaise-chunte-hain">अध्यक्ष कैसे चुना जाता है? पूरी जानकारी पढ़ें →</a></p>
  </div>

  <div class="sec">
    <h2>इस बार की एक ख़ास बात</h2>
    <p>भारतीय जनता पार्टी ने सभी 25 वार्डों में प्रत्याशी उतारे हैं, जबकि कांग्रेस ने 21 में।
       <b>वार्ड ${noINC.map(dev).join(", ")} में कांग्रेस का कोई प्रत्याशी नहीं है</b> — इन वार्डों में मुक़ाबला भाजपा और निर्दलीयों के बीच है।
       कुल 74 प्रत्याशियों में 28 निर्दलीय हैं।</p>
  </div>

  ${shareBtns}
  ${adSlot("bottom")}`
  }));
}

/* वार्ड पृष्ठ */
for (const w of D.wards) {
  const rows = w.pratyashi.map(p => row({
    choice: String(p.n), dal: p.dal, naam: p.naam,
    dalNaam: P[p.dal].naam, chinhSlug: p.chinh, chinhNaam: D.symbols[p.chinh], serial: p.n
  })).join("\n");

  const naamList = w.pratyashi.map(p => p.naam).join(", ");

  write(`ward-${w.ward}.html`, page({
    ward: w.ward,
    title: `पोकरण वार्ड ${w.ward} प्रत्याशी सूची 2026 — कौन जीत रहा है? | नगर पालिका चुनाव`,
    desc: `पोकरण नगर पालिका वार्ड ${w.ward} के ${w.pratyashi.length} प्रत्याशी: ${naamList}। ${w.kshetra}। चुनाव चिन्ह और जनता की राय देखें।`,
    path: `/ward-${w.ward}`,
    og: { title: `वार्ड ${w.ward} में कौन जीत रहा है? — पोकरण चुनाव 2026`,
          desc: `${w.kshetra} · ${w.pratyashi.length} प्रत्याशी। अपना वोट दें और जनता की राय देखें।`,
          img: `/og/ward-${w.ward}.png` },
    schema: `<script type="application/ld+json">${JSON.stringify({
      "@context":"https://schema.org","@type":"ItemList",
      "name":`पोकरण नगर पालिका वार्ड ${w.ward} प्रत्याशी 2026`,
      "numberOfItems":w.pratyashi.length,
      "itemListElement":w.pratyashi.map(p=>({"@type":"ListItem","position":p.n,
        "item":{"@type":"Person","name":p.naam,"affiliation":P[p.dal].naam}}))})}</script>`,
    body: `
  ${adSlot("top")}

  <div class="head">
    <h1>वार्ड ${dev(w.ward)}</h1>
    <p class="kshetra">${esc(w.kshetra)}</p>
    <p class="sub" data-phase="live">अपने प्रत्याशी पर टैप करें। कोई लॉगिन नहीं — बस एक टैप।</p>
    <p class="sub hide" data-phase="frozen">मतदान बंद है। नतीजे 9 सितम्बर शाम 6 बजे खुलेंगे।</p>
    <p class="sub hide" data-phase="result">यह जनता की राय का अंतिम नतीजा है।</p>
  </div>

  ${leader}
  ${gate}
  ${ballot(`वार्ड ${dev(w.ward)} · ${dev(w.pratyashi.length)} प्रत्याशी`, rows)}

  ${shareBtns}
  ${adSlot("mid")}

  <div class="sec">
    <h2>वार्ड ${dev(w.ward)} के प्रत्याशी</h2>
    <ul>
      ${w.pratyashi.map(p => `<li><b>${esc(p.naam)}</b> — ${esc(P[p.dal].naam)}, चिन्ह: ${esc(D.symbols[p.chinh])}<br><span style="color:#5A5148;font-size:14px">${esc(p.pata)}</span></li>`).join("\n      ")}
    </ul>
    <p style="font-size:13.5px;color:#5A5148">स्रोत: प्ररूप-6, रिटर्निंग अधिकारी (उपखण्ड अधिकारी) नगर पालिका पोकरण, दिनांक 04.09.2026</p>
  </div>

  <div class="sec">
    <h2>दूसरे वार्ड</h2>
    <div class="grid">
      ${D.wards.map(x => `<a href="/ward-${x.ward}"${x.ward===w.ward?' style="background:#000;color:#fff"':''}><span>${dev(x.ward)}</span><small>वार्ड</small></a>`).join("\n      ")}
    </div>
    <a class="btn ghost" href="/adhyaksh">अध्यक्ष किस पार्टी का बनेगा?</a>
  </div>

  ${adSlot("bottom")}`
  }));
}

/* अध्यक्ष */
{
  const opts = [
    { c: "bjp", naam: "भारतीय जनता पार्टी", chinh: "kamal", cn: "कमल" },
    { c: "inc", naam: "इण्डियन नेशनल कांग्रेस", chinh: "haath", cn: "हाथ" },
    { c: "ind", naam: "निर्दलीय", chinh: null, cn: "निर्दलीय" }
  ];
  const rows = opts.map((o, i) => `
    <button class="row" data-choice="${o.c}" data-dal="${o.c}" type="button">
      <span class="fill"></span>
      <span class="serial">${dev(i + 1)}</span>
      <span class="who"><span class="naam">${esc(o.naam)}</span><span class="dal">${o.c==="ind"?"किसी दल से नहीं":"राष्ट्रीय दल"}</span></span>
      <span class="chinh">${o.chinh ? symImg(o.chinh, o.cn) : `<span class="sym"><svg viewBox="0 0 64 64" fill="none" stroke="#111" stroke-width="3.2" stroke-linecap="round"><circle cx="32" cy="32" r="20"/><path d="M26 26a6 6 0 0111 3c0 4-5 4-5 8"/><circle cx="32" cy="45" r="2" fill="#111"/></svg></span>`}<small>${esc(o.cn)}</small></span>
      <span class="btn-cell"><i class="lamp"></i><i class="evm-btn"></i></span>
      <span class="pct hide"><b>—</b><small></small></span>
    </button>`).join("\n");

  write("adhyaksh.html", page({
    ward: 0,
    title: "पोकरण नगर पालिका अध्यक्ष 2026 — किस पार्टी का बोर्ड बनेगा? | जनता की राय",
    desc: "पोकरण नगर पालिका चुनाव 2026 में किस दल का बोर्ड बनेगा और अध्यक्ष किसका होगा — भाजपा, कांग्रेस या निर्दलीय? जनता की राय में अपना वोट दें।",
    path: "/adhyaksh",
    og: { title: "पोकरण में किस पार्टी का बोर्ड बनेगा? — चुनाव 2026",
          desc: "भाजपा, कांग्रेस या निर्दलीय — आपकी क्या राय है? एक टैप में वोट दें।",
          img: "/og/adhyaksh.png" },
    body: `
  ${adSlot("top")}

  <div class="head">
    <h1>अध्यक्ष किस पार्टी का बनेगा?</h1>
    <p class="kshetra">25 वार्डों में जिस दल के सबसे ज़्यादा पार्षद जीतेंगे, अध्यक्ष उसी दल का बनेगा।</p>
    <p class="sub" data-phase="live">अपनी राय पर टैप करें। कोई लॉगिन नहीं — बस एक टैप।</p>
    <p class="sub hide" data-phase="frozen">मतदान बंद है। नतीजे 9 सितम्बर शाम 6 बजे खुलेंगे।</p>
    <p class="sub hide" data-phase="result">यह जनता की राय का अंतिम नतीजा है।</p>
  </div>

  ${leader}
  ${gate}
  ${ballot("पूरी नगर पालिका · 3 विकल्प", rows)}

  ${shareBtns}
  ${adSlot("mid")}

  <div class="note">
    <b>ध्यान दें:</b> अध्यक्ष का चुनाव जनता सीधे नहीं करती। 09 सितम्बर को आप सिर्फ़ अपना वार्ड पार्षद चुनते हैं।
    अध्यक्ष को <b>21 सितम्बर</b> को जीते हुए पार्षद मिलकर चुनते हैं।
    <a href="/adhyaksh-kaise-chunte-hain">पूरी जानकारी पढ़ें</a>
  </div>

  <div class="sec">
    <h2>अपना वार्ड चुनें</h2>
    <div class="grid">
      ${D.wards.map(x => `<a href="/ward-${x.ward}"><span>${dev(x.ward)}</span><small>वार्ड</small></a>`).join("\n      ")}
    </div>
  </div>

  ${adSlot("bottom")}`
  }));
}

/* व्याख्या पृष्ठ — SEO + सच में काम की जानकारी */
write("adhyaksh-kaise-chunte-hain.html", page({
  title: "नगर पालिका अध्यक्ष कैसे चुना जाता है? — राजस्थान नियम 78 | पोकरण 2026",
  desc: "राजस्थान में नगर पालिका अध्यक्ष जनता सीधे नहीं चुनती। जीते हुए पार्षद चुनते हैं। नियम 78, तारीख़ें और पूरी प्रक्रिया आसान हिन्दी में।",
  path: "/adhyaksh-kaise-chunte-hain",
  og: { title: "नगर पालिका अध्यक्ष कैसे चुना जाता है?",
        desc: "जनता नहीं, पार्षद चुनते हैं। और अध्यक्ष बनने के लिए पार्षद होना भी ज़रूरी नहीं। जानिए पूरा नियम।",
        img: "/og/home.png" },
  body: `
  <div class="head">
    <h1>अध्यक्ष कैसे चुना जाता है?</h1>
    <p class="kshetra">राजस्थान नगर पालिका (चुनाव) नियम 1994, नियम 78</p>
  </div>

  <div class="note warn"><b>सबसे ज़रूरी बात:</b> अध्यक्ष को जनता सीधे वोट देकर नहीं चुनती।
    09 सितम्बर को आप सिर्फ़ अपने वार्ड का पार्षद चुनते हैं।</div>

  <div class="sec">
    <h2>पूरी प्रक्रिया</h2>
    <ul>
      <li><b>09 सितम्बर 2026</b> — जनता 25 वार्डों के पार्षद चुनती है (सुबह 7 से शाम 6)</li>
      <li><b>14 सितम्बर 2026</b> — मतगणना, पता चलता है कौन-कौन पार्षद बने</li>
      <li><b>21 सितम्बर 2026</b> — जीते हुए पार्षद बैठक में अध्यक्ष चुनते हैं (सुबह 10 से दोपहर 2 बजे), गिनती उसी दिन</li>
      <li><b>22 सितम्बर 2026</b> — उपाध्यक्ष का चुनाव</li>
    </ul>
  </div>

  <div class="sec">
    <h2>दो बातें जो ज़्यादातर लोगों को नहीं पता</h2>
    <p><b>1. अध्यक्ष बनने के लिए पार्षद होना ज़रूरी नहीं है।</b> नियम 78(2) के अनुसार कोई भी व्यक्ति जो पार्षद बनने योग्य है और अयोग्य नहीं है, अध्यक्ष चुना जा सकता है — चाहे उसने वार्ड का चुनाव लड़ा ही न हो। वोट सिर्फ़ जीते हुए पार्षद डालते हैं।</p>
    <p><b>2. कुछ लोग अध्यक्ष नहीं बन सकते।</b> नियम 78(4) के अनुसार सांसद, विधायक, और पंचायती राज संस्थाओं के सदस्य या अध्यक्ष अध्यक्ष पद के लिए अयोग्य हैं।</p>
  </div>

  <div class="sec">
    <h2>इसका मतलब आपके वोट के लिए क्या है?</h2>
    <p>आपका एक वोट सीधे अध्यक्ष नहीं चुनता, लेकिन वही तय करता है कि आपके वार्ड से कौन पार्षद बनेगा — और वही पार्षद 21 सितम्बर को अध्यक्ष चुनेगा। इसलिए बोर्ड किस दल का बनेगा, यह 25 वार्डों के नतीजों से तय होता है।</p>
    <a class="btn" href="/adhyaksh">आपकी राय: किसका बोर्ड बनेगा?</a>
    <a class="btn ghost" href="/">अपना वार्ड चुनें</a>
  </div>

  ${adSlot("bottom")}`
}));

/* गोपनीयता नीति — Turnstile के invisible mode की शर्त, और
   विज्ञापन नेटवर्क के अनुमोदन के लिए भी ज़रूरी */
write("gopniyata-niti.html", page({
  title: "गोपनीयता नीति — पोकरण नगर पालिका चुनाव 2026",
  desc: "इस वेबसाइट पर कौन सी जानकारी दर्ज होती है और क्यों। नाम, फ़ोन नंबर या ईमेल कुछ नहीं लिया जाता।",
  path: "/gopniyata-niti",
  og: { title: "गोपनीयता नीति — पोकरण चुनाव 2026", desc: "हम कौन सी जानकारी रखते हैं और क्यों।", img: "/og/home.png" },
  body: `
  <div class="head">
    <h1>गोपनीयता नीति</h1>
    <p class="kshetra">अंतिम बदलाव: 5 सितम्बर 2026</p>
  </div>

  <div class="note"><b>छोटे में:</b> हम आपका नाम, फ़ोन नंबर, ईमेल या पता कुछ नहीं लेते।
  कोई लॉगिन नहीं है। आपने किसे वोट दिया, यह किसी को नहीं दिखाया जाता — सिर्फ़ कुल गिनती दिखती है।</div>

  <div class="sec">
    <h2>हम क्या दर्ज करते हैं</h2>
    <ul>
      <li><b>एक बेतरतीब पहचान-टोकन</b> — आपके ब्राउज़र में रखा जाता है ताकि एक ही व्यक्ति दोबारा वोट न दे सके। इससे आपकी पहचान नहीं होती।</li>
      <li><b>उपकरण की पहचान (fingerprint)</b> — आपके ब्राउज़र की कुछ सामान्य बातों (स्क्रीन का आकार, भाषा, समय-क्षेत्र) से बना एक कूट। यह एन्क्रिप्ट करके रखा जाता है और इससे आपका नाम या नंबर नहीं जाना जा सकता।</li>
      <li><b>IP पते का कूट</b> — एन्क्रिप्ट करके, सिर्फ़ यह देखने के लिए कि एक ही जगह से अचानक बहुत सारे वोट तो नहीं आ रहे। असली IP कहीं नहीं रखा जाता।</li>
      <li><b>आपका वोट और समय</b></li>
    </ul>
    <p>यह सब सिर्फ़ धांधली रोकने के लिए है, और चुनाव के बाद इसकी ज़रूरत ख़त्म हो जाती है।</p>
  </div>

  <div class="sec">
    <h2>Cloudflare Turnstile</h2>
    <p>स्वचालित मतदान (बॉट) रोकने के लिए यह वेबसाइट Cloudflare Turnstile का उपयोग करती है।
    यह बिना कुछ दिखाए जाँचता है कि वोट किसी असली व्यक्ति ने दिया है या मशीन ने। इस दौरान Cloudflare
    आपके ब्राउज़र से कुछ तकनीकी जानकारी लेता है। इसके लिए
    <a href="https://www.cloudflare.com/application-services/terms/turnstile-privacy-addendum/" rel="noopener" target="_blank">Cloudflare Turnstile Privacy Addendum</a>
    लागू होता है। Turnstile का उपयोग विज्ञापन के लिए नहीं किया जाता।</p>
  </div>

  <div class="sec">
    <h2>Google Analytics</h2>
    <p>यह जानने के लिए कि कितने लोग वेबसाइट पर आए और कौन से वार्ड के पेज ज़्यादा देखे गए,
    यह वेबसाइट Google Analytics का उपयोग करती है। इससे पता चलता है कि कुल कितने लोग आए,
    किस पेज पर कितनी देर रुके, और कितने लोगों ने वोट दिया — <b>यह नहीं कि किस व्यक्ति ने किसे वोट दिया</b>।
    आपका IP पता Google को अधूरा (anonymized) भेजा जाता है। यह जानकारी
    <a href="https://policies.google.com/privacy" rel="noopener" target="_blank">Google की गोपनीयता नीति</a>
    के अनुसार संभाली जाती है।</p>
  </div>

  <div class="sec">
    <h2>विज्ञापन</h2>
    <p>इस वेबसाइट पर विज्ञापन दिखते हैं जिनसे इसका ख़र्च निकलता है। विज्ञापन देने वाली कंपनियाँ
    अपनी कुकीज़ का उपयोग कर सकती हैं। हम उन्हें आपकी कोई निजी जानकारी नहीं देते, क्योंकि हमारे पास है ही नहीं।</p>
    <p><b>इस वेबसाइट पर किसी प्रत्याशी या राजनीतिक दल का विज्ञापन नहीं लिया जाता।</b></p>
  </div>

  <div class="sec">
    <h2>यह वेबसाइट किसकी है</h2>
    <p>यह एक निजी वेबसाइट है। इसका भारत निर्वाचन आयोग, राजस्थान राज्य निर्वाचन आयोग,
    नगर पालिका पोकरण या किसी राजनीतिक दल से कोई सम्बन्ध नहीं है।
    यहाँ दिखने वाले आँकड़े असली चुनाव परिणाम नहीं हैं।</p>
    <p>कोई सवाल या शिकायत हो तो
    <a href="https://wa.me/${WA}" rel="noopener" target="_blank">WhatsApp पर संपर्क करें</a>।</p>
  </div>

  <a class="btn" href="/">अपना वार्ड चुनें</a>`
}));

/* 404 — इसके बिना Cloudflare हर ग़ायब फ़ाइल पर homepage का HTML
   200 के साथ लौटाता है, जिससे og:image टूटता है और Google को soft-404 मिलते हैं। */
write("404.html", page({
  title: "पेज नहीं मिला — पोकरण नगर पालिका चुनाव 2026",
  desc: "यह पेज मौजूद नहीं है। पोकरण नगर पालिका चुनाव 2026 के सभी 25 वार्ड देखें।",
  path: "/404",
  og: { title: "पोकरण नगर पालिका चुनाव 2026", desc: "अपना वार्ड चुनें और जनता की राय देखें।", img: "/og/home.png" },
  body: `
  <div class="head">
    <h1>यह पेज नहीं मिला</h1>
    <p class="kshetra">शायद लिंक अधूरा रह गया। नीचे से अपना वार्ड चुनें।</p>
  </div>
  <div class="grid">
    ${D.wards.map(x => `<a href="/ward-${x.ward}"><span>${dev(x.ward)}</span><small>वार्ड</small></a>`).join("\n    ")}
  </div>
  <a class="btn" href="/">मुख्य पेज पर जाएँ</a>
  <a class="btn ghost" href="/adhyaksh">अध्यक्ष किस पार्टी का बनेगा?</a>`
}));

/* स्थिर फ़ाइलें */
cpSync(join(ROOT, "src/styles.css"), join(OUT, "styles.css"));
cpSync(join(ROOT, "src/app.js"),    join(OUT, "app.js"));
cpSync(join(ROOT, "src/config.js"), join(OUT, "config.js"));
cpSync(join(ROOT, "src/ads.js"),    join(OUT, "ads.js"));
if (existsSync(join(ROOT, "public"))) cpSync(join(ROOT, "public"), OUT, { recursive: true });

/* Cloudflare Pages खुद ही /ward-14 पर ward-14.html देता है।
   यहाँ _redirects लिखने से उसके अपने clean-URL redirect से टकराव होकर
   अनंत 308 लूप बन जाता था — इसलिए यह फ़ाइल नहीं बनानी। */

writeFileSync(join(OUT, "_headers"),
`/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
/img/*
  Cache-Control: public, max-age=604800
/og/*
  Cache-Control: public, max-age=604800
`);

const urls = ["/", ...D.wards.map(w => `/ward-${w.ward}`), "/adhyaksh", "/adhyaksh-kaise-chunte-hain", "/gopniyata-niti"];
writeFileSync(join(OUT, "sitemap.xml"),
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITE}${u}</loc><changefreq>hourly</changefreq><priority>${u==="/"?"1.0":"0.8"}</priority></url>`).join("\n")}
</urlset>`);

writeFileSync(join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

writeFileSync(join(OUT, "favicon.svg"),
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#000"/><rect x="10" y="14" width="44" height="36" fill="#FBFAF7"/><rect x="10" y="14" width="10" height="36" fill="#12457E"/><rect x="26" y="22" width="22" height="4" fill="#1C1814"/><rect x="26" y="31" width="22" height="4" fill="#1C1814"/><rect x="26" y="40" width="14" height="4" fill="#1C1814"/></svg>`);

console.log(`✓ ${pages.length} पृष्ठ बने → dist/`);
console.log(`  ${urls.length} URLs · sitemap · robots · _headers`);
