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
  // { slot:"top",    img:"/img/sponsors/dukan1.png", href:"https://wa.me/91XXXXXXXXXX", alt:"दुकान का नाम" },
  // { slot:"mid",    img:"/img/sponsors/dukan2.png", href:"tel:+91XXXXXXXXXX",          alt:"दूसरी दुकान" },
  // { slot:"bottom", img:"/img/sponsors/dukan3.png", href:"https://...",                alt:"तीसरी दुकान" },
];

/* ── 2. Adsterra — ख़ाली जगहें भरने के लिए ──
  डैशबोर्ड में एक banner ad unit बनाएँ और उसकी key यहाँ डालें।
   खाली छोड़ेंगे तो वह जगह बिलकुल नहीं दिखेगी (कोई ख़ाली डिब्बा नहीं)। */
/* ⚠️ आपातकालीन स्विच — कोई गंदा विज्ञापन दिखे तो इसे false करके push करें।
   Adsterra तुरंत बंद, और उसकी जगह आपका अपना "विज्ञापन यहाँ लगवाएँ" वाला बॉक्स। */
const ADSTERRA_ON = false;

const ADSTERRA = {
  // यह domain हर Adsterra खाते का अलग होता है — GET CODE वाले script src से लें
  host:   "https://www.highrevenueformat.com",
  banner: { key: "5e99d15e87d709158409d34747ba1b34", w: 320, h: 50 },
  slots:  ["top", "mid", "bottom"],    // तीनों जगह Adsterra banner
};

/* ─────────────────────────────────────────────────────────── */

const bySlot = {};
for (const s of SPONSORS) (bySlot[s.slot] ||= []).push(s);

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
function fillHouse(box) {
  box.classList.add("has-house");
  box.innerHTML = `<a class="house" href="https://wa.me/${HOUSE_WA}?text=${
    encodeURIComponent("पोकरण चुनाव वेबसाइट पर विज्ञापन के बारे में जानकारी चाहिए")
  }" rel="noopener" target="_blank">
    <b>अपने व्यवसाय का विज्ञापन यहाँ</b>
    <span>पोकरण के हज़ारों लोग रोज़ देख रहे हैं · WhatsApp करें</span>
  </a>`;
}

function fillAdsterra(box, cfg) {
  if (!ADSTERRA_ON || !cfg.key) return fillHouse(box);
  box.classList.add("has-ad");
  const f = document.createElement("iframe");
  f.style.cssText = `width:${cfg.w}px;height:${cfg.h}px;border:0;display:block`;
  f.setAttribute("scrolling", "no");
  f.loading = "lazy";
  f.title = "विज्ञापन";
  box.appendChild(f);
  const d = f.contentDocument;
  d.open();
  d.write(`<body style="margin:0">
<script>atOptions={'key':'${cfg.key}','format':'iframe','height':${cfg.h},'width':${cfg.w},'params':{}};<\/script>
<script src="${ADSTERRA.host}/${cfg.key}/invoke.js"><\/script></body>`);
  d.close();
}

document.querySelectorAll("[data-ad]").forEach(box => {
  const slot = box.dataset.ad;
  const mine = bySlot[slot];
  if (mine && mine.length) return fillSponsor(box, mine);
  if (ADSTERRA.slots.includes(slot)) fillAdsterra(box, ADSTERRA.banner);
});
