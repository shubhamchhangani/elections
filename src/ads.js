import { SUPABASE_URL, SUPABASE_ANON } from "./config.js";

/* ═══════════════════════════════════════════════════════════════
   Adcash — Responsive Ad Strategy:

   Mobile  (<480px): 336×280 हर जगह (728 wide नहीं होती)
   Tablet (480-768): 468×60 top/bottom, 336×280 बाक़ी
   Desktop  (>768px): 728×90 top/bottom, 336×280 mid/after

   footer: mobile→3 ads, tablet/desktop→5 ads
   ═══════════════════════════════════════════════════════════════ */

/* ── Zone IDs ── */
const Z = {
  AUTOTAG: "94xe21fgy4",
  W728:    "12110694",   // 728×90  desktop leaderboard
  W468:    "12110702",   // 468×60  tablet/mobile banner
  W336:    "12110682",   // 336×280 rectangle (all devices)
  VIDEO:   "12110890",   // Video Slider
};

/* ── Device ── */
function dev() {
  const w = window.innerWidth;
  if (w < 480) return "mob";
  if (w < 769) return "tab";
  return "desk";
}

/* ── Zone per slot per device ── */
const ZONE = {
  top:    { mob: Z.W336, tab: Z.W468, desk: Z.W728 },
  after:  { mob: Z.W336, tab: Z.W336, desk: Z.W336 },
  mid:    { mob: Z.VIDEO, tab: Z.VIDEO, desk: Z.VIDEO },
  bottom: { mob: Z.W336, tab: Z.W468, desk: Z.W728 },
  stick:  { mob: Z.W336, tab: Z.W468, desk: Z.W468 },
  footer: { mob: Z.W336, tab: Z.W336, desk: Z.W728 },
};

/* ── Height per slot per device ── */
const H_PX = {
  top:    { mob: 280, tab:  60, desk:  90 },
  after:  { mob: 280, tab: 280, desk: 280 },
  mid:    { mob: 280, tab: 280, desk: 280 },
  bottom: { mob: 280, tab:  60, desk:  90 },
  stick:  { mob:  60, tab:  60, desk:  60 },
  footer: { mob: 280, tab: 280, desk:  90 },
};

/* ── Footer count per device ── */
const FOOT_COUNT = { mob: 3, tab: 5, desk: 5 };

/* ── Banner HTML builders ── */
function banner(zoneId) {
  return `<div><script type="text/javascript">aclib.runBanner({zoneId:'${zoneId}'});<\/script><\/div>`;
}
function videoSlider(zoneId) {
  return `<script type="text/javascript">aclib.runVideoSlider({zoneId:'${zoneId}'});<\/script>`;
}

/* ── Resolve responsive code for a slot ── */
function slotCode(slot, dbCode) {
  if (dbCode) return dbCode;
  if (slot === "global") {
    return `<script id="aclib" type="text/javascript" src="//acscdn.com/script/aclib.js"><\/script>
<script type="text/javascript">aclib.runAutoTag({zoneId:'${Z.AUTOTAG}'});<\/script>`;
  }
  const d = dev();
  const zoneId = ZONE[slot]?.[d];
  if (!zoneId) return null;
  return slot === "mid" ? videoSlider(zoneId) : banner(zoneId);
}

function slotHeight(slot, dbH) {
  if (dbH) return dbH;
  return H_PX[slot]?.[dev()] || 0;
}

/* ─────────────────────────────────────────────── */

const SPONSORS = [];
const FALLBACK = {
  top:"adsterra", after:"adsterra", mid:"adsterra",
  bottom:"adsterra", stick:"adsterra", footer:"adsterra", global:"adsterra"
};

const HDR = { apikey: SUPABASE_ANON, authorization: "Bearer " + SUPABASE_ANON };
const get = async (q) => {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: HDR });
    if (!r.ok) return null;
    const rows = await r.json();
    return Array.isArray(rows) ? rows : null;
  } catch { return null; }
};

const fromDb    = () => get("sponsors?select=slot,img,href,alt&active=eq.true&order=sort.asc");
const cfgFromDb = () => get("ad_config?select=slot,fallback,code,height,count");

/* ── Sponsor ── */
const sponsorHtml = s =>
  `<a class="sponsor" href="${s.href}" rel="nofollow sponsored noopener" target="_blank">
     <img src="${s.img}" alt="${s.alt}" loading="lazy"><\/a>`;

function fillSponsor(box, list) {
  box.classList.add("has-sponsor");
  box.innerHTML = sponsorHtml(list[0]);
  if (list.length < 2) return;
  let i = 0;
  setInterval(() => { i = (i + 1) % list.length; box.innerHTML = sponsorHtml(list[i]); }, 8000);
}

/* ── House ad ── */
const HOUSE_WA = "919079269147";
let _grand = 0;

async function loadGrand() {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_totals`, {
      method: "POST", headers: { ...HDR, "content-type": "application/json" }, body: "{}"
    });
    if (!r.ok) return;
    const d = await r.json();
    _grand = (d && d.grand) || 0;
  } catch {}
}

function fillHouse(box) {
  box.classList.add("has-house");
  const proof = _grand >= 100
    ? ` · <i><b>${_grand.toLocaleString("en-IN")}<\/b> लोग वोट दे चुके हैं<\/i>` : "";
  box.innerHTML = `<a class="house" href="https://wa.me/${HOUSE_WA}?text=${
    encodeURIComponent("पोकरण चुनाव वेबसाइट पर विज्ञापन के बारे में जानकारी चाहिए")
  }" rel="noopener" target="_blank">
    <b>अपने व्यवसाय का विज्ञापन यहाँ लगवाएं${proof}<\/b>
    <span>WhatsApp पर संपर्क करें<\/span>
  <\/a>`;
}

/* ── Sequential script runner ── */
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
    sc.src = el.src; host.appendChild(sc);
    await ready;
    await new Promise(r => setTimeout(r, 200));
  } else {
    sc.text = el.textContent; host.appendChild(sc);
    await new Promise(r => setTimeout(r, 30));
  }
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

async function runGlobal(html) {
  if (!html || runGlobal._done) return;
  runGlobal._done = true;
  await ensureLib();
  await runScripts(document.body, html);
}

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

/* ── IntersectionObserver lazy-load ── */
function lazyFill(box, code, h, margin) {
  margin = margin || "200px";
  const io = new IntersectionObserver(function(es) {
    for (const e of es) {
      if (!e.isIntersecting || e.target._done) continue;
      e.target._done = true;
      fillCode(e.target, code, h);
      io.unobserve(e.target);
    }
  }, { rootMargin: margin });
  io.observe(box);
}

/* ══════════════════════════════════════════════════════════════ */

(async () => {
  const device = dev();
  const [db, cfgRows] = await Promise.all([fromDb(), cfgFromDb(), loadGrand()]);

  /* sponsor map */
  const bySlot = {}, seen = new Set();
  for (const s of SPONSORS) (bySlot[s.slot] = bySlot[s.slot] || []).push(s);
  for (const s of (db || [])) {
    if (!seen.has(s.slot)) { bySlot[s.slot] = []; seen.add(s.slot); }
    bySlot[s.slot].push(s);
  }

  /* DB config map */
  const mode = Object.assign({}, FALLBACK);
  const dbCodeMap = {}, dbHgtMap = {}, dbCnt = {};
  for (const r of (cfgRows || [])) {
    mode[r.slot]   = r.fallback;
    if (r.code)   dbCodeMap[r.slot] = r.code;
    if (r.height) dbHgtMap[r.slot]  = r.height;
    dbCnt[r.slot] = Math.max(1, Math.min(20, r.count || 1));
  }

  /* ── global AutoTag ── */
  if (mode.global !== "off") {
    const code = slotCode("global", dbCodeMap.global);
    if (code) runGlobal(code);
  }

  /* ── footer — lazy, device-aware count ── */
  const foot = document.getElementById("footads");
  if (foot && mode.footer !== "off") {
    const code = slotCode("footer", dbCodeMap.footer);
    if (code) {
      const n = dbCnt.footer || FOOT_COUNT[device];
      const h = slotHeight("footer", dbHgtMap.footer);
      for (let i = 0; i < n; i++) {
        const box = document.createElement("div");
        box.className = "ad ad-footer"; box.dataset.ad = "footer";
        foot.appendChild(box);
        lazyFill(box, code, h, "400px");
      }
    }
  }

  /* ── बाक़ी slots: top, after, mid, bottom ── */
  document.querySelectorAll("[data-ad]").forEach(function(box) {
    const slot = box.dataset.ad;
    if (slot === "stick" || slot === "footer") return;

    /* sponsor सबसे पहले */
    const mine = bySlot[slot];
    if (mine && mine.length) return fillSponsor(box, mine);

    const m = mode[slot];
    if (m === "off") return;

    /* network ad */
    if (m !== "house") {
      const code = slotCode(slot, dbCodeMap[slot]);
      if (!code) return;
      const h = slotHeight(slot, dbHgtMap[slot]);
      if (slot === "top") return fillCode(box, code, h);  /* above-fold: तुरंत */
      return lazyFill(box, code, h);
    }

    /* house ad */
    if (slot !== "top" && slot !== "stick") fillHouse(box);
  });

  /* ── Sticky bar — 1.5s बाद ── */
  const stickBox = document.querySelector(".stick[data-ad='stick']");
  if (stickBox && mode.stick !== "off") {
    const mine = bySlot.stick;
    if (mine && mine.length) {
      setTimeout(function() { fillSponsor(stickBox, mine); }, 1500);
    } else {
      const code = slotCode("stick", dbCodeMap.stick);
      if (code) setTimeout(function() {
        fillCode(stickBox, code, slotHeight("stick", dbHgtMap.stick));
      }, 1500);
    }
  }
})();
