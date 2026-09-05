import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { SUPABASE_URL, SUPABASE_ANON, SITE, GATE, POLL_MS } from "./config.js";

const sb = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
});

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const PAGE = document.body.dataset;
const WARD = PAGE.ward !== undefined ? Number(PAGE.ward) : null;   // 0 = अध्यक्ष
const PENDING = "pokaran.pending";

/* ── उपकरण की पहचान — कड़ी रोक नहीं, सिर्फ़ धांधली की सीमा ── */
async function deviceHash() {
  const c = document.createElement("canvas");
  c.width = 200; c.height = 40;
  const g = c.getContext("2d");
  g.textBaseline = "top";
  g.font = "15px 'Arial'";
  g.fillStyle = "#f60"; g.fillRect(0, 0, 100, 20);
  g.fillStyle = "#069"; g.fillText("पोकरण-2026", 2, 4);
  let gpu = "";
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    const d = gl && gl.getExtension("WEBGL_debug_renderer_info");
    if (d) gpu = gl.getParameter(d.UNMASKED_RENDERER_WEBGL) || "";
  } catch {}
  const raw = [
    c.toDataURL(), gpu, navigator.userAgent, navigator.language,
    screen.width, screen.height, screen.colorDepth, devicePixelRatio,
    new Date().getTimezoneOffset(), navigator.hardwareConcurrency || 0,
    navigator.deviceMemory || 0, navigator.maxTouchPoints || 0
  ].join("|");
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 40);
}

/* ── छोटे सहायक ─────────────────────────────────────────────── */
const DEV = ["०","१","२","३","४","५","६","७","८","९"];
const dev = n => String(n).replace(/\d/g, d => DEV[+d]);

function toast(msg, ms = 3200) {
  let t = $(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg;
  requestAnimationFrame(() => t.classList.add("on"));
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("on"), ms);
}

async function signIn() {
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: "select_account" } }
  });
  if (error) toast("लॉगिन शुरू नहीं हो सका। दोबारा कोशिश करें।");
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
      const best = rows
        .map(r => ({ r, n: state.counts[r.dataset.choice] || 0 }))
        .sort((a, b) => b.n - a.n)[0];
      if (best && best.n > 0) {
        const src = $(".chinh img", best.r), fb = $(".chinh .fallback", best.r);
        const box = $(".body .art", lead);
        if (box) box.innerHTML = src ? `<img src="${src.getAttribute("src")}" alt="">`
                                     : `<div class="fallback">${fb ? fb.textContent : ""}</div>`;
        $(".leader .naam").textContent = $(".who .naam", best.r).textContent;
        $(".leader .meta").textContent = $(".who .dal", best.r).textContent;
        $(".leader .meta").style.color = getComputedStyle($(".who .dal", best.r)).color;
        $(".leader .big").textContent = dev(Math.round((best.n / state.total) * 100)) + "%";
        $(".leader .big").style.color = getComputedStyle(best.r).color;
      }
    }
  }

  $$("[data-total]").forEach(el => el.textContent = dev(state.total));
}

async function refresh() {
  if (WARD === null) return;
  const { data, error } = await sb.rpc("get_counts", { p_ward: WARD });
  if (error) return;
  state.phase  = data.phase;
  state.counts = data.counts || {};
  state.total  = data.total || 0;
  paint();
}

async function loadMine() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session || WARD === null) { state.mine = null; return; }
  const { data } = await sb.rpc("my_vote", { p_ward: WARD });
  state.mine = data && data.choice ? data.choice : null;
}

/* ── मत डालना ───────────────────────────────────────────────── */
const MSG = {
  no_auth:      "वोट दर्ज करने के लिए Google लॉगिन ज़रूरी है।",
  closed:       "मतदान बंद हो चुका है।",
  already:      "इस वार्ड में आपका वोट पहले ही दर्ज है।",
  device_limit: "इस फ़ोन से इस वार्ड के 3 वोट पहले ही दर्ज हैं।",
  rate:         "अभी बहुत ट्रैफ़िक है। एक मिनट बाद कोशिश करें।",
  bad_ward:     "गड़बड़ी हुई। पेज दोबारा खोलें."
};

async function vote(choice, row) {
  if (state.busy) return;
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    localStorage.setItem(PENDING, JSON.stringify({ ward: WARD, choice }));
    await signIn();
    return;
  }
  state.busy = true;
  if (row) { row.classList.add("chosen", "flash"); setTimeout(() => row.classList.remove("flash"), 2800); }

  const { data, error } = await sb.rpc("cast_vote", {
    p_ward: WARD, p_choice: choice, p_device: await deviceHash()
  });
  state.busy = false;

  if (error) { if (row) row.classList.remove("chosen", "flash"); toast("नेटवर्क धीमा है। दोबारा कोशिश करें।"); return; }

  if (data.ok) {
    state.mine = choice;
    toast("आपका वोट दर्ज हो गया ✓");
  } else {
    if (data.code === "already") state.mine = data.choice || null;
    else if (row) row.classList.remove("chosen", "flash");
    toast(MSG[data.code] || "वोट दर्ज नहीं हो सका।");
  }
  await refresh();
}

async function flushPending() {
  const raw = localStorage.getItem(PENDING);
  if (!raw) return;
  localStorage.removeItem(PENDING);
  try {
    const p = JSON.parse(raw);
    if (p.ward !== WARD) return;
    const row = $$(".row").find(r => r.dataset.choice === p.choice);
    await vote(p.choice, row);
  } catch {}
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
      location.href = "https://wa.me/?text=" + encodeURIComponent(text);
    } else if (navigator.share) {
      try { await navigator.share({ text }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(text); toast("लिंक कॉपी हो गया"); } catch {}
    }
  }));
}

/* ── शुरुआत ─────────────────────────────────────────────────── */
async function boot() {
  wireShare();
  $$("[data-signin]").forEach(b => b.addEventListener("click", e => { e.preventDefault(); signIn(); }));
  $$("[data-signout]").forEach(b => b.addEventListener("click", async e => {
    e.preventDefault(); await sb.auth.signOut(); state.mine = null; paint(); toast("लॉगआउट हो गया");
  }));

  $$(".row").forEach(r => r.addEventListener("click", () => {
    if (r.dataset.locked || state.phase !== "live") {
      if (state.mine) toast("इस वार्ड में आपका वोट पहले ही दर्ज है।");
      else if (state.phase === "frozen") toast("मतदान बंद है। नतीजे 9 सितंबर शाम 6 बजे।");
      else if (state.phase === "result") toast("मतदान समाप्त हो चुका है।");
      return;
    }
    vote(r.dataset.choice, r);
  }));

  await refresh();
  await loadMine();
  paint();
  await flushPending();

  sb.auth.onAuthStateChange(async (_e, s) => {
    if (s) { await loadMine(); paint(); }
  });

  setInterval(() => { if (document.visibilityState === "visible") refresh(); }, POLL_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refresh();
  });
}

if (WARD !== null) boot(); else wireShare();
