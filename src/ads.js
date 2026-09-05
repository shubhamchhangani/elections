/* विज्ञापन — Adsterra (सिर्फ़ Banner / Native Banner)
   ⚠️ Adsterra डैशबोर्ड में ज़रूरी सेटिंग:
      Traffic type: Mainstream · "Boost CPM": OFF
      Blocked verticals: adult, dating, gambling, betting
      कभी नहीं: Social Bar, Popunder, In-Page Push, Vignette
   नीचे ADSTERRA_KEY में अपनी key डालें, या खाली छोड़ दें (तब कोई विज्ञापन नहीं दिखेगा)। */

const ADSTERRA_KEY = "";          // उदा. "a1b2c3d4e5f6..."
const AD_W = 320, AD_H = 50;

/* स्थानीय प्रायोजक — सीधे यहाँ जोड़ें। हर आइटम एक दुकान।
   प्रत्याशी या राजनीतिक दल का विज्ञापन यहाँ कभी न डालें (चुनाव आयोग: MCMC पूर्व-प्रमाणन अनिवार्य)। */
const SPONSORS = [
  // { img: "/img/sponsors/dukan1.png", href: "https://wa.me/91XXXXXXXXXX", alt: "दुकान का नाम" },
];

document.querySelectorAll("[data-ad]").forEach((slot, i) => {
  const s = SPONSORS[i % Math.max(SPONSORS.length, 1)];
  if (SPONSORS.length && s) {
    slot.innerHTML = `<a class="sponsor" href="${s.href}" rel="nofollow sponsored noopener" target="_blank">
      <img src="${s.img}" alt="${s.alt}" loading="lazy" width="320" height="100"></a>`;
    return;
  }
  if (!ADSTERRA_KEY) return;
  const f = document.createElement("iframe");
  f.style.cssText = `width:${AD_W}px;height:${AD_H}px;border:0;display:block`;
  f.setAttribute("scrolling", "no");
  f.loading = "lazy";
  f.title = "विज्ञापन";
  slot.appendChild(f);
  const d = f.contentDocument;
  d.open();
  d.write(`<body style="margin:0">
<script>atOptions={'key':'${ADSTERRA_KEY}','format':'iframe','height':${AD_H},'width':${AD_W},'params':{}};<\/script>
<script src="//www.highperformanceformat.com/${ADSTERRA_KEY}/invoke.js"><\/script></body>`);
  d.close();
});
