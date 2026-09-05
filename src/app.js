import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { SUPABASE_URL, SUPABASE_ANON, TURNSTILE_KEY, VOTE_FN, SITE, GATE, POLL_MS } from "./config.js";

const sb = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
const VOTE_URL = SUPABASE_URL + "/functions/v1/" + VOTE_FN;

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
/* widget एक बार बनता है और पेज खुलते ही token तैयार कर लेता है, ताकि
   वोट के वक़्त इंतज़ार न करना पड़े। हर वोट के बाद reset करके नया token।
   ⚠️ size:"invisible" जैसी कोई value नहीं होती (सिर्फ़ normal/flexible/compact) —
   अदृश्य रहना Turnstile डैशबोर्ड की Widget Mode सेटिंग से तय होता है। */
let _tsId = null, _tsToken = "", _tsWaiters = [];

function tsResolve(t) { _tsWaiters.splice(0).forEach(f => f(t || "")); }

function tsRender() {
  if (_tsId !== null || !TURNSTILE_KEY || !window.turnstile) return;
  const box = document.createElement("div");
  box.className = "cf-turnstile-box";
  document.body.appendChild(box);
  try {
    _tsId = window.turnstile.render(box, {
      sitekey: TURNSTILE_KEY,
      appearance: "interaction-only",
      retry: "auto",
      "refresh-expired": "auto",
      callback: t => { _tsToken = t || ""; dbg("turnstile: token मिला"); tsResolve(_tsToken); },
      "error-callback": e => { _tsToken = ""; dbg("turnstile error: " + e); tsResolve(""); },
      "expired-callback": () => { _tsToken = ""; dbg("turnstile: token expire"); },
      "timeout-callback": () => { _tsToken = ""; dbg("turnstile: timeout"); tsResolve(""); }
    });
    dbg("turnstile: widget बना");
  } catch (e) { dbg("turnstile render फेल: " + e.message); tsResolve(""); }
}

function tsWaitScript() {
  return new Promise(res => {
    if (window.turnstile) return res(true);
    const t0 = Date.now();
    (function wait() {
      if (window.turnstile) return res(true);
      if (Date.now() - t0 > 10000) { dbg("turnstile script लोड नहीं हुआ"); return res(false); }
      setTimeout(wait, 100);
    })();
  });
}

async function captcha() {
  if (!TURNSTILE_KEY) return "";
  if (_tsToken) { const t = _tsToken; _tsToken = ""; return t; }        // तैयार token
  if (!(await tsWaitScript())) return "";
  if (_tsId === null) tsRender();
  else { try { window.turnstile.reset(_tsId); } catch (e) { dbg("reset फेल: " + e.message); } }
  return new Promise(res => {
    let done = false;
    const finish = t => { if (!done) { done = true; res(t || ""); } };
    _tsWaiters.push(finish);
    setTimeout(() => { if (!done) dbg("turnstile: 12s में जवाब नहीं"); finish(""); }, 12000);
  });
}

/* ── Google Analytics की घटनाएँ ─────────────────────────────── */
const track = (name, props) => {
  try { if (window.gtag) window.gtag("event", name, props || {}); } catch {}
};

/* ── फ़ोन में हल्का कंपन — टैप का तुरंत एहसास ──────────────── */
const haptic = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };

/* ── अंक धीरे-धीरे बदलें, झटके से नहीं ─────────────────────── */
function animateNum(el, to, suffix = "") {
  const from = parseInt(el.textContent, 10);
  if (!Number.isFinite(from) || from === to) { el.textContent = to + suffix; return; }
  const t0 = performance.now(), dur = 420;
  (function step(t) {
    const k = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(from + (to - from) * e) + suffix;
    if (k < 1) requestAnimationFrame(step);
  })(t0);
}

/* ── जाँच के लिए: URL में ?debug=1 लगाएँ ────────────────────── */
const DEBUG = new URLSearchParams(location.search).has("debug");
function dbg(msg) {
  if (!DEBUG) return;
  let b = document.getElementById("dbg");
  if (!b) {
    b = document.createElement("pre");
    b.id = "dbg";
    b.style.cssText = "position:fixed;left:0;right:0;bottom:0;max-height:45vh;overflow:auto;margin:0;"
      + "background:#000;color:#0f0;font:11px/1.5 monospace;padding:8px;z-index:99999;white-space:pre-wrap";
    document.body.appendChild(b);
  }
  b.textContent += new Date().toLocaleTimeString() + "  " + msg + "\n";
  b.scrollTop = b.scrollHeight;
}

/* ── छोटे सहायक ─────────────────────────────────────────────── */
const dev = n => String(n);
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
        animateNum($("b", pctCell), pct, "%");
        $("small", pctCell).textContent = dev(n) + " वोट";
      }
    }
  });

  if (showResult && !paint._sawResult) { paint._sawResult = true; track("result_shown", { ward: WARD, total: state.total }); }

  const gate = $(".gate");
  if (gate) {
    const need = state.phase !== "frozen" && state.total < GATE;
    gate.classList.toggle("hide", !need);
    if (need && !paint._sawGate) { paint._sawGate = true; track("gate_shown", { ward: WARD, total: state.total }); }
    if (need) {
      animateNum($(".count", gate), state.total);
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
        const sym = $(".chinh .sym", best.r);
        const box = $(".body .art", lead);
        if (box) box.innerHTML = sym ? `<span class="sym">${sym.innerHTML}</span>` : "";
        $(".leader .naam").textContent = $(".who .naam", best.r).textContent;
        const dalEl = $(".who .dal", best.r);
        $(".leader .meta").textContent = dalEl.textContent;
        $(".leader .meta").style.color = getComputedStyle(dalEl).color;
        animateNum($(".leader .big"), Math.round((best.n / state.total) * 100), "%");
        $(".leader .big").style.color = getComputedStyle(best.r).color;
      }
    }
  }
  $$("[data-total]").forEach(el => animateNum(el, state.total));
}

async function refresh() {
  if (WARD === null) return;
  const { data, error } = await sb.rpc("get_counts", { p_ward: WARD, p_token: TOKEN });
  dbg("get_counts → " + (error ? "ERROR " + JSON.stringify(error) : JSON.stringify(data)));
  if (error || !data) {
    console.error("get_counts failed", error);
    toast("वोटिंग सर्वर से कनेक्शन नहीं हो रहा। थोड़ी देर बाद फिर कोशिश करें।", 5000);
    return false;
  }
  state.phase  = data.phase;
  state.counts = data.counts || {};
  state.total  = data.total || 0;
  state.mine   = data.mine || null;
  try { paint(); } catch (e) { dbg("paint फेल: " + e.message); throw e; }
  dbg("दिखाया: total=" + state.total + " phase=" + state.phase + " gate=" + GATE);
  return true;
}

/* ── मत डालना ───────────────────────────────────────────────── */
const MSG = {
  closed:       "मतदान बंद हो चुका है।",
  already:      "इस वार्ड में आपका वोट पहले ही दर्ज है।",
  device_limit: "इस फ़ोन से इस वार्ड में वोट पहले ही दर्ज हो चुका है।",
  rate:         "अभी बहुत ट्रैफ़िक है। एक मिनट बाद कोशिश करें।",
  captcha_fail: "जाँच पूरी नहीं हुई। पेज दोबारा खोलकर कोशिश करें।",
  no_captcha:   "जाँच पूरी नहीं हुई। पेज दोबारा खोलकर कोशिश करें।",
  captcha_error: "Cloudflare जाँच में गड़बड़ी है। थोड़ी देर बाद कोशिश करें।",
  db:           "वोटिंग database से जवाब नहीं मिला। व्यवस्थापक को बताएं।",
  http_401:     "Supabase की public key गलत या पुरानी है। व्यवस्थापक को बताएं।",
  http_404:     "Voting function deploy नहीं है या उसका नाम गलत है।",
  bad_ward:     "गड़बड़ी हुई। पेज दोबारा खोलें।"
};

async function vote(choice, row) {
  if (state.busy || state.phase !== "live") return;
  state.busy = true;
  haptic(14);

  // तुरंत दिखाओ: लाल बत्ती जले, गिनती बढ़े — सर्वर का इंतज़ार न कराएँ
  const before = { mine: state.mine, total: state.total, counts: { ...state.counts } };
  state.mine = choice;
  state.counts[choice] = (state.counts[choice] || 0) + 1;
  state.total += 1;
  if (row) { row.classList.add("chosen", "flash", "sending"); setTimeout(() => row.classList.remove("flash"), 2600); }
  paint();

  let out;
  try {
    dbg("वोट शुरू: ward=" + WARD + " choice=" + choice);
    const [device, ts] = await Promise.all([deviceId(), captcha()]);
    dbg("captcha token: " + (ts ? ts.slice(0, 14) + "… (" + ts.length + " अक्षर)" : "खाली!"));
    const r = await fetch(VOTE_URL, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: SUPABASE_ANON,
                 authorization: "Bearer " + SUPABASE_ANON },
      body: JSON.stringify({ ward: WARD, choice, token: TOKEN, device, ts })
    });
    const raw = await r.text();
    try { out = JSON.parse(raw); }
    catch { out = { ok: false, code: `http_${r.status}` }; }
    if (!r.ok) out = { ok: false, code: out.code || `http_${r.status}` };
    dbg("सर्वर: HTTP " + r.status + " → " + raw.slice(0, 160));
  } catch {
    state.busy = false;
    if (row) row.classList.remove("chosen", "flash", "sending");
    Object.assign(state, before);                    // वापस पहले जैसा
    paint();
    track("vote_blocked", { ward: WARD, reason: "network" });
    toast("नेटवर्क धीमा है। दोबारा कोशिश करें।");
    return;
  }
  state.busy = false;
  if (row) row.classList.remove("sending");

  if (out.ok) {
    state.mine = choice;
    haptic([12, 60, 22]);
    track("vote_cast", { ward: WARD, choice, dal: row ? row.dataset.dal : undefined });
    toast("आपका वोट दर्ज हो गया ✓");
  } else {
    Object.assign(state, before);                    // आशावादी बदलाव वापस
    if (out.code === "already") state.mine = out.choice || null;
    else if (row) row.classList.remove("chosen", "flash");
    paint();
    track("vote_blocked", { ward: WARD, reason: out.code || "unknown" });
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
    if (b.dataset.share === "wa") {
      track("share", { method: "whatsapp", ward: WARD });
      location.href = "https://wa.me/?text=" + encodeURIComponent(text);
    } else if (navigator.share) {
      track("share", { method: "native", ward: WARD });
      try { await navigator.share({ text }); } catch {}
    } else {
      track("share", { method: "copy", ward: WARD });
      try { await navigator.clipboard.writeText(text); toast("लिंक कॉपी हो गया"); } catch {}
    }
  }));
}

/* ── कौन कहाँ से आया — अपनी गिनती, GA के इंतज़ार के बिना ──── */
function refSource() {
  const r = document.referrer || "";
  if (!r) return "direct";
  try {
    const h = new URL(r).hostname.replace(/^www\./, "");
    if (/whatsapp|wa\.me/.test(h))          return "whatsapp";
    if (/google|googleusercontent/.test(h)) return "google";
    if (/facebook|fb\./.test(h))            return "facebook";
    if (/instagram/.test(h))                return "instagram";
    if (/t\.co|twitter|x\.com/.test(h))     return "twitter";
    if (/telegram|t\.me/.test(h))           return "telegram";
    if (h.endsWith("pokaranchunav.pages.dev")) return "इसी साइट से";
    return h.slice(0, 40);
  } catch { return "other"; }
}
sb.rpc("log_hit", {
  p_path: location.pathname.slice(0, 120) || "/",
  p_ref: refSource(),
  p_visitor: TOKEN
}).then(() => {}, () => {});

/* कुल वोट — हर पन्ने पर, क्योंकि होमपेज पर ही सबसे पहले लोग आते हैं */
sb.rpc("get_totals").then(({ data }) => {
  const g = data && data.grand;
  if (!g || g < 100) return;                        // कम संख्या उल्टा असर करती है
  $$("[data-grand]").forEach(el => animateNum(el, g));
  $$(".pitch-proof").forEach(el => el.classList.remove("hide"));
}).catch(() => {});

/* ── शुरुआत ─────────────────────────────────────────────────── */
window.addEventListener("error", e => dbg("JS गड़बड़ी: " + e.message + " @ " + (e.filename||"").split("/").pop() + ":" + e.lineno));
window.addEventListener("unhandledrejection", e => dbg("promise गड़बड़ी: " + (e.reason && e.reason.message || e.reason)));

async function boot() {
  wireShare();
  $$(".row").forEach(r => r.addEventListener("click", () => {
    if (r.dataset.locked || state.phase !== "live") {
      if (state.mine) toast("इस वार्ड में आपका वोट पहले ही दर्ज है।");
      else if (state.phase === "frozen") toast("मतदान बंद है। नतीजे 11 सितम्बर शाम 6 बजे।");
      else if (state.phase === "result") toast("मतदान समाप्त हो चुका है।");
      return;
    }
    vote(r.dataset.choice, r);
  }));

  dbg("शुरू | ward=" + WARD + " | token=" + TOKEN.slice(0, 8) + "… | turnstile key=" + (TURNSTILE_KEY ? "है" : "नहीं"));
  tsWaitScript().then(ok => { if (ok) tsRender(); });

  await refresh();
  setInterval(() => { if (document.visibilityState === "visible") refresh(); }, POLL_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refresh();
  });
}

// Turnstile का callback वैश्विक होना चाहिए
window.onTurnstileCb = t => captcha._cb && captcha._cb(t);

if (WARD !== null) boot(); else wireShare();
