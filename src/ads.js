import { SUPABASE_URL, SUPABASE_ANON } from "./config.js";

/* ═══════════════════════════════════════════════════════════════
   विज्ञापन — slot map:
     global  → Adcash AutoTag (पूरे पन्ने पर, ख़ुद जगह ढूँढ़ता है)
     top     → Display 728×90  (zone 12110694) — शीर्षक से पहले
     after   → Display 336×280 (zone 12110682) — ballot के ठीक बाद
     mid     → Video Slider    (zone 12110890)  — शेयर बटन के नीचे
     bottom  → Display 468×60  (zone 12110702) — पेज के अंत में
     stick   → Display 468×60  (zone 12110702) — नीचे चिपकी पट्टी
     footer  → DB से जितने चाहें, lazy-load

   UX नियम:
   • IntersectionObserver — ad तभी लोड हो जब user वहाँ पहुँचे
   • sticky bar 1.5s बाद — पहले content, बाद में ad
   • Adcash library एक बार — बार-बार नहीं
   • DB से code आए तो वही चले, नहीं तो hardcoded Adcash
   ═══════════════════════════════════════════════════════════════ */

/* ── Adcash Zone IDs ── */
const AC = {
  AUTOTAG: "94xe21fgy4",
  TOP:     "12110694",
  AFTER:   "12110682",
  MID:     "12110890",
  BOTTOM:  "12110702",
  STICK:   "12110702",
  FOOTER:  "12110682",   // 336×280 — footer में भी यही चलेगा
};

/* Hardcoded Adcash templates — /admin के DB code से override होते हैं */
const acCode = {
  global: `<script id="aclib" type="text/javascript" src="//acscdn.com/script/aclib.js"></script>
<script type="text/javascript">aclib.runAutoTag({zoneId:'${AC.AUTOTAG}'});</script>`,
  top:    `<div><script type="text/javascript">aclib.runBanner({zoneId:'${AC.TOP}'});</script></div>`,
  after:  `<div><script type="text/javascript">aclib.runBanner({zoneId:'${AC.AFTER}'});</script></div>`,
  mid:    `<script type="text/javascript">aclib.runVideoSlider({zoneId:'${AC.MID}'});</script>`,
  bottom: `<div><script type="text/javascript">aclib.runBanner({zoneId:'${AC.BOTTOM}'});</script></div>`,
  stick:  `<div><script type="text/javascript">aclib.runBanner({zoneId:'${AC.STICK}'});</script></div>`,
  footer: `<div><script type="text/javascript">aclib.runBanner({zoneId:'${AC.FOOTER}'});</script></div>`,
};

/* footer mein kitne ads dikhein — DB se override, default 5 */
const FOOTER_COUNT_DEFAULT = 5;

/* ── 1. प्रायोजक बैनर ── */
const SPONSORS = [];
const FALLBACK_IF_DB_DOWN = { top:"adsterra", after:"adsterra", mid:"adsterra", bottom:"adsterra", stick:"adsterra", footer:"adsterra", global:"adsterra" };

/* ── DB helpers ── */
const H = { apikey: SUPABASE_ANON, authorization: "Bearer " + SUPABASE_ANON };
const get = async (q) => {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: H });
    if (!r.ok) return null;
    const rows = await r.json();
    return Array.isArray(rows) ? rows : null;
  } catch { return null; }
};

const fromDb    = () => get("sponsors?select=slot,img,href,alt&active=eq.true&order=sort.asc");
const cfgFromDb = () => get("ad_config?select=slot,fallback,code,height,count");

/* ── sponsor ── */
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

/* ── house ad ── */
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

/* ── Script runner ── */
async function runScripts(host, html) {
  const holder = document.createElement("div");
  holder.innerHTML = html;
  for (const el of [...holder.childNodes]) {
    if (el.nodeType !== 1) { host.appendChild(el.cloneNode(true)); continue; }
    if (el.tagName !== "SCRIPT") {
      const wrap = el.cloneNode(true);
      const inner = [...wrap.querySelectorAll("script")];
      inner.forEach(x => x.remove());
      host.appendChild(wrap);
      for (const x of inner) await runOne(wrap, x);
      continue;
    }
    await runOne(host, el);
  }
}

async function runOne(host, el) {
  const sc = document.createElement("script");
  for (const at of el.attributes) sc.setAttribute(at.name, at.value);
  sc.async = false;
  if (el.src) {
    const ready = new Promise(r => { sc.onload = r; sc.onerror = r; setTimeout(r, 8000); });
    sc.src = el.src;
    host.appendChild(sc);
    await ready;
    await new Promise(r => setTimeout(r, 200));
  } else {
    sc.text = el.textContent;
    host.appendChild(sc);
    await new Promise(r => setTimeout(r, 30));
  }
}

async function runGlobal(html) {
  if (!html || runGlobal._done) return;
  runGlobal._done = true;
  await ensureLib();
  await runScripts(document.body, html);
}

/* ── Adcash library — एक बार ── */
let _lib = null;
function ensureLib() {
  if (_lib) return _lib;
  if (document.getElementById("aclib")) return (_lib = Promise.resolve());
  _lib = new Promise(res => {
    const s = document.createElement("script");
    s.id = "aclib"; s.async = false;
    s.src = "//acscdn.com/script/aclib.js";
    s.onload = () => setTimeout(res, 250);
    s.onerror = () => res();
    setTimeout(res, 8000);
    document.head.appendChild(s);
  });
  return _lib;
}

/* ── fillCode ── */
async function fillCode(box, code, h) {
  box.classList.add("has-ad");
  if (h) box.style.minHeight = h + "px";
  if (box.dataset.ad === "stick") addStickClose(box);
  await ensureLib();
  await runScripts(box, code);
}

function addStickClose(box) {
  document.body.classList.add("has-stick");
  const x = document.createElement("button");
  x.className = "close"; x.type = "button"; x.textContent = "×";
  x.setAttribute("aria-label", "विज्ञापन बंद करें");
  x.onclick = () => { box.remove(); document.body.classList.remove("has-stick"); };
  box.appendChild(x);
}

/* ── lazy-load via IntersectionObserver ── */
function lazyFill(box, code, h, margin = "200px") {
  const io = new IntersectionObserver(es => {
    for (const e of es) {
      if (!e.isIntersecting || e.target._done) continue;
      e.target._done = true;
      fillCode(e.target, code, h);
      io.unobserve(e.target);
    }
  }, { rootMargin: margin });
  io.observe(box);
}

/* ── slot के लिए code और height resolve करो ── */
function resolveCode(slot, dbCode) {
  return dbCode || acCode[slot] || null;
}

function resolveHeight(slot, dbH) {
  if (dbH) return dbH;
  return { top:90, after:280, mid:250, bottom:60, stick:60, footer:260 }[slot] || 0;
}

/* ══════════════════════════════════════════════════════════════ */

(async () => {
  const [db, cfgRows] = await Promise.all([fromDb(), cfgFromDb(), loadGrand()]);

  /* sponsor map */
  const bySlot = {}, seen = new Set();
  for (const s of SPONSORS) (bySlot[s.slot] ||= []).push(s);
  for (const s of (db || [])) {
    if (!seen.has(s.slot)) { bySlot[s.slot] = []; seen.add(s.slot); }
    bySlot[s.slot].push(s);
  }

  /* config map */
  const mode = { ...FALLBACK_IF_DB_DOWN }, dbCodeMap = {}, dbHgtMap = {}, cnt = {};
  for (const r of (cfgRows || [])) {
    mode[r.slot]     = r.fallback;
    if (r.code)     dbCodeMap[r.slot] = r.code;
    if (r.height)   dbHgtMap[r.slot]  = r.height;
    cnt[r.slot]     = Math.max(1, Math.min(20, r.count || 1));
  }

  /* ── footer — lazy, multiple ── */
  const foot = document.getElementById("footads");
  if (foot) {
    const footCode = resolveCode("footer", dbCodeMap.footer);
    if (footCode && mode.footer !== "off") {
      const n = cnt.footer || FOOTER_COUNT_DEFAULT;
      const h = resolveHeight("footer", dbHgtMap.footer);
      for (let i = 0; i < n; i++) {
        const box = document.createElement("div");
        box.className = "ad ad-footer"; box.dataset.ad = "footer";
        foot.appendChild(box);
        lazyFill(box, footCode, h, "300px");
      }
    }
  }

  /* ── global AutoTag ── */
  const globalCode = resolveCode("global", dbCodeMap.global);
  if (mode.global !== "off" && globalCode) runGlobal(globalCode);

  /* ── बाक़ी slots (top, after, mid, bottom) ── */
  document.querySelectorAll("[data-ad]").forEach(box => {
    const slot = box.dataset.ad;
    if (slot === "stick" || slot === "footer") return;

    /* sponsor सबसे पहले */
    const mine = bySlot[slot];
    if (mine && mine.length) return fillSponsor(box, mine);

    const m = mode[slot];
    if (m === "off") return;

    if (m === "adsterra" || m === "adcash") {
      const code = resolveCode(slot, dbCodeMap[slot]);
      if (!code) return;
      const h = resolveHeight(slot, dbHgtMap[slot]);
      /* top — above the fold, तुरंत */
      if (slot === "top") return fillCode(box, code, h);
      /* बाक़ी — lazy */
      return lazyFill(box, code, h);
    }

    if (m === "house" && slot !== "top" && slot !== "stick") return fillHouse(box);
  });

  /* ── sticky bar — 1.5s बाद (UX: content पहले) ── */
  const stickBox = document.querySelector(".stick[data-ad='stick']");
  if (stickBox && mode.stick !== "off") {
    const mine = bySlot.stick;
    if (mine && mine.length) {
      setTimeout(() => fillSponsor(stickBox, mine), 1500);
    } else {
      const code = resolveCode("stick", dbCodeMap.stick);
      if (code) setTimeout(() => fillCode(stickBox, code, resolveHeight("stick", dbHgtMap.stick)), 1500);
    }
  }
})();
