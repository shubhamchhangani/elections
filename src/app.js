import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { SUPABASE_URL, SUPABASE_ANON, TURNSTILE_KEY, SITE, GATE, POLL_MS } from "./config.js";

const sb = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
const VOTE_URL = SUPABASE_URL + "/functions/v1/vote";

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const WARD = document.body.dataset.ward !== undefined ? Number(document.body.dataset.ward) : null;

/* ── परत 2: पहचान-टोकन — localStorage + cookie दोनों में ─────── */
const KEY = "pokaran.voter";
function cookie(name, val) {
  if (val === undefined) {
    const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  }
  document.cookie = `${name}=${encodeURIComponent(val)}; max-age=31536000; path=/; SameSite=Lax`;
}
function voterToken() {
  let t = null;
  try { t = localStorage.getItem(KEY); } catch {}
  if (!t) t = cookie(KEY);
  if (!t || !/^[0-9a-f-]{36}$/i.test(t)) {
    t = (crypto.randomUUID?.() ?? URL.createObjectURL(new Blob()).slice(-36));
  }
  try { localStorage.setItem(KEY, t); } catch {}
  cookie(KEY, t);
  return t;
}
const TOKEN = voterToken();

/* ── परत 3: उपकरण की पहचान ──────────────────────────────────── */
let _dev;
async function deviceId() {
  if (_dev) return _dev;
  const c = document.createElement("canvas");
  c.width = 200; c.height = 40;
  const g = c.getContext("2d");
  g.textBaseline = "top"; g.font = "15px Arial";
  g.fillStyle = "#f60"; g.fillRect(0, 0, 100, 20);
  g.fillStyle = "#069"; g.fillText("पोकरण-2026", 2, 4);
  let gpu = "";
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    const d = gl && gl.getExtension("WEBGL_debug_renderer_info");
    if (d) gpu = gl.getParameter(d.UNMASKED_RENDERER_WEBGL) || "";
  } catch {}
  const raw = [c.toDataURL(), gpu, navigator.userAgent, navigator.language,
    screen.width, screen.height, screen.colorDepth, devicePixelRatio,
    new Date().getTimezoneOffset(), navigator.hardwareConcurrency || 0,
    navigator.deviceMemory || 0, navigator.maxTouchPoints || 0].join("|");
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  _dev = [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("").slice(0, 48);
  return _dev;
}

/* ── परत 1: Turnstile — अदृश्य कैप्चा ───────────────────────── */
let _tsId = null;
function captcha() {
  if (!TURNSTILE_KEY || !window.turnstile) return Promise.resolve("");
  return new Promise(res => {
    const done = t => res(t || "");
    if (_tsId === null) {
      const box = document.createElement("div");
      box.style.cssText = "position:fixed;left:-9999px;top:0";
      document.body.appendChild(box);
      _tsId = window.turnstile.render(box, {
        sitekey: TURNSTILE_KEY, size: "invisible",
        callback: done, "error-callback": () => res(""), "timeout-callback": () => res("")
      });
      captcha._cb = done;
    } else {
      captcha._cb = done;
      window.turnstile.reset(_tsId);
    }
    try { window.turnstile.execute(_tsId); } catch { res(""); }
    setTimeout(() => res(""), 8000);
  });
}

/* ── छोटे सहायक ─────────────────────────────────────────────── */
const DEVN = ["०","१","२","३","४","५","६","७","८","९"];
const dev = n => String(n).replace(/\d/g, d => DEVN[+d]);
function toast(msg, ms = 3200) {
  let t = $(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg;
  requestAnimationFrame(() => t.classList.add("on"));
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("on"), ms);
}

/* ── मतपत्र दिखाना ──────────────────────────────────────────── */
const state = { phase: null, counts: {}, total: 0, mine: null, busy: false };

function paint() {
  const rows = $$(".row");
  const showResult = state.phase !== "frozen" && state.total >= GATE;
  $$("[data-phase]").forEach(el => el.classList.toggle("hide", el.dataset.phase !== state.phase));

  rows.forEach(r => {
    const key = r.dataset.choice;
    const n = state.counts[key] || 0;
    const pct = state.total ? Math.round((n / state.total) * 100) : 0;
    r.classList.toggle("chosen", state.mine === key);
    if (state.phase !== "live" || state.mine !== null) r.dataset.locked = "1";
    else delete r.dataset.locked;

    const fill = $(".fill", r);
    if (fill) fill.style.width = showResult ? pct + "%" : "0%";

    const pctCell = $(".pct", r), btnCell = $(".btn-cell", r);
    if (pctCell && btnCell) {
      pctCell.classList.toggle("hide", !showResult);
      btnCell.classList.toggle("hide", showResult);
      if (showResult) {
        $("b", pctCell).textContent = dev(pct) + "%";
        $("small", pctCell).textContent = dev(n) + " वोट";
      }
    }
  });

  const gate = $(".gate");
  if (gate) {
    const need = state.phase !== "frozen" && state.total < GATE;
    gate.classList.toggle("hide", !need);
    if (need) {
      $(".count", gate).textContent = dev(state.total);
      $(".track i", gate).style.width = Math.min(100, (state.total / GATE) * 100) + "%";
      $$("p", gate)[1].textContent = state.mine
        ? `आपका वोट दर्ज हो गया। नतीजा ${dev(GATE)} वोट पूरे होने पर दिखेगा — अपने वार्ड के ग्रुप में भेजें।`
        : `अभी ${dev(state.total)} लोगों ने वोट दिया है। ${dev(GATE)} पूरे होते ही नतीजा दिखेगा।`;
    }
  }

  const lead = $(".leader");
  if (lead) {
    lead.classList.toggle("hide", !showResult);
    if (showResult) {
      const best = rows.map(r => ({ r, n: state.counts[r.dataset.choice] || 0 }))
                       .sort((a, b) => b.n - a.n)[0];
      if (best && best.n > 0) {
        const src = $(".chinh img", best.r), fb = $(".chinh .fallback", best.r);
        const box = $(".body .art", lead);
        if (box) box.innerHTML = src ? `<img src="${src.getAttribute("src")}" alt="">`
                                     : `<div class="fallback">${fb ? fb.textContent : ""}</div>`;
        $(".leader .naam").textContent = $(".who .naam", best.r).textContent;
        const dalEl = $(".who .dal", best.r);
        $(".leader .meta").textContent = dalEl.textContent;
        $(".leader .meta").style.color = getComputedStyle(dalEl).color;
        $(".leader .big").textContent = dev(Math.round((best.n / state.total) * 100)) + "%";
        $(".leader .big").style.color = getComputedStyle(best.r).color;
      }
    }
  }
  $$("[data-total]").forEach(el => el.textContent = dev(state.total));
}

async function refresh() {
  if (WARD === null) return;
  const { data, error } = await sb.rpc("get_counts", { p_ward: WARD, p_token: TOKEN });
  if (error || !data) return;
  state.phase  = data.phase;
  state.counts = data.counts || {};
  state.total  = data.total || 0;
  state.mine   = data.mine || null;
  paint();
}

/* ── मत डालना ───────────────────────────────────────────────── */
const MSG = {
  closed:       "मतदान बंद हो चुका है।",
  already:      "इस वार्ड में आपका वोट पहले ही दर्ज है।",
  device_limit: "इस फ़ोन से इस वार्ड के ३ वोट पहले ही दर्ज हैं।",
  rate:         "अभी बहुत ट्रैफ़िक है। एक मिनट बाद कोशिश करें।",
  captcha_fail: "जाँच पूरी नहीं हुई। पेज दोबारा खोलकर कोशिश करें।",
  no_captcha:   "जाँच पूरी नहीं हुई। पेज दोबारा खोलकर कोशिश करें।",
  bad_ward:     "गड़बड़ी हुई। पेज दोबारा खोलें।"
};

async function vote(choice, row) {
  if (state.busy || state.phase !== "live") return;
  state.busy = true;
  if (row) { row.classList.add("chosen", "flash"); setTimeout(() => row.classList.remove("flash"), 2800); }

  let out;
  try {
    const [device, ts] = await Promise.all([deviceId(), captcha()]);
    const r = await fetch(VOTE_URL, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: SUPABASE_ANON,
                 authorization: "Bearer " + SUPABASE_ANON },
      body: JSON.stringify({ ward: WARD, choice, token: TOKEN, device, ts })
    });
    out = await r.json();
  } catch {
    state.busy = false;
    if (row) row.classList.remove("chosen", "flash");
    toast("नेटवर्क धीमा है। दोबारा कोशिश करें।");
    return;
  }
  state.busy = false;

  if (out.ok) {
    state.mine = choice;
    toast("आपका वोट दर्ज हो गया ✓");
  } else {
    if (out.code === "already") state.mine = out.choice || null;
    else if (row) row.classList.remove("chosen", "flash");
    toast(MSG[out.code] || "वोट दर्ज नहीं हो सका।");
  }
  await refresh();
}

/* ── साझा करना ──────────────────────────────────────────────── */
function shareText() {
  const t = document.title.split("—")[0].trim();
  return `${t}\n\nअपने वार्ड में देखें कौन आगे चल रहा है — और अपना वोट दें:\n${SITE + location.pathname}`;
}
function wireShare() {
  $$("[data-share]").forEach(b => b.addEventListener("click", async e => {
    e.preventDefault();
    const text = shareText();
    if (b.dataset.share === "wa") location.href = "https://wa.me/?text=" + encodeURIComponent(text);
    else if (navigator.share) { try { await navigator.share({ text }); } catch {} }
    else { try { await navigator.clipboard.writeText(text); toast("लिंक कॉपी हो गया"); } catch {} }
  }));
}

/* ── शुरुआत ─────────────────────────────────────────────────── */
async function boot() {
  wireShare();
  $$(".row").forEach(r => r.addEventListener("click", () => {
    if (r.dataset.locked || state.phase !== "live") {
      if (state.mine) toast("इस वार्ड में आपका वोट पहले ही दर्ज है।");
      else if (state.phase === "frozen") toast("मतदान बंद है। नतीजे ९ सितम्बर शाम ६ बजे।");
      else if (state.phase === "result") toast("मतदान समाप्त हो चुका है।");
      return;
    }
    vote(r.dataset.choice, r);
  }));

  await refresh();
  setInterval(() => { if (document.visibilityState === "visible") refresh(); }, POLL_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refresh();
  });
}

// Turnstile का callback वैश्विक होना चाहिए
window.onTurnstileCb = t => captcha._cb && captcha._cb(t);

if (WARD !== null) boot(); else wireShare();
