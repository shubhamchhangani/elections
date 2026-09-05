import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { SUPABASE_URL, SUPABASE_ANON } from "./config.js";

const sb = createClient(SUPABASE_URL, SUPABASE_ANON);
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const SLOTS = { top: "सबसे ऊपर", mid: "बीच में", bottom: "सबसे नीचे" };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));

function say(msg, bad) {
  const el = $("#msg");
  el.textContent = msg;
  el.className = "msg " + (bad ? "bad" : "good");
  el.hidden = false;
  clearTimeout(say._t);
  say._t = setTimeout(() => { el.hidden = true; }, 5000);
}

/* ── लॉगिन ─────────────────────────────────────────────────── */
/* ⚠️ onAuthStateChange के callback के अंदर Supabase का कोई method मत बुलाना —
   callback एक lock पकड़े रहता है और getSession() उसी lock का इंतज़ार करता है,
   यानी पन्ना हमेशा के लिए अटक जाता है। इसलिए callback से मिला session सीधे
   इस्तेमाल करते हैं, और बाक़ी काम setTimeout से बाहर निकालते हैं। */
function applySession(session) {
  $("#login").hidden = !!session;
  $("#panel").hidden = !session;
  if (session) { $("#who").textContent = session.user.email; loadStats(); load(); loadCfg(); }
}

$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = $("#loginBtn"); btn.disabled = true; btn.textContent = "जाँच रहे हैं…";
  const { error } = await sb.auth.signInWithPassword({
    email: $("#email").value.trim(), password: $("#pass").value
  });
  btn.disabled = false; btn.textContent = "लॉगिन करें";
  if (error) return say("ईमेल या पासवर्ड ग़लत है।", true);
});

$("#logout").addEventListener("click", async () => { await sb.auth.signOut(); });

/* ── सूची ──────────────────────────────────────────────────── */
async function load() {
  const { data, error } = await sb.from("sponsors").select("*").order("slot").order("sort");
  if (error) return say("सूची नहीं आई: " + error.message, true);
  const list = $("#list");
  if (!data.length) { list.innerHTML = `<p class="empty">अभी कोई बैनर नहीं है। नीचे से जोड़ें।</p>`; return; }
  list.innerHTML = data.map(s => `
    <div class="card${s.active ? "" : " off"}">
      <img src="${esc(s.img)}" alt="" loading="lazy" decoding="async">
      <div class="meta">
        <b>${esc(s.alt) || "(नाम नहीं)"}</b>
        <span>${SLOTS[s.slot]} · ${esc(s.href)}</span>
        ${s.note ? `<span class="note">${esc(s.note)}</span>` : ""}
      </div>
      <div class="acts">
        <button data-toggle="${s.id}" data-on="${s.active}">${s.active ? "बंद करें" : "चालू करें"}</button>
        <button data-del="${s.id}" class="danger">हटाएँ</button>
      </div>
    </div>`).join("");

  $$("[data-toggle]").forEach(b => b.addEventListener("click", async () => {
    const { error } = await sb.from("sponsors")
      .update({ active: b.dataset.on !== "true" }).eq("id", b.dataset.toggle);
    error ? say(error.message, true) : (say("बदल गया"), load());
  }));
  $$("[data-del]").forEach(b => b.addEventListener("click", async () => {
    if (!confirm("यह बैनर हमेशा के लिए हट जाएगा। पक्का?")) return;
    const { error } = await sb.from("sponsors").delete().eq("id", b.dataset.del);
    error ? say(error.message, true) : (say("हट गया"), load());
  }));
}

/* ── आँकड़े ───────────────────────────────────────────────── */
const DAL_RANG = { bjp: "#F26722", inc: "#1F8FD6", ind: "#78716C" };
const nf = n => Number(n || 0).toLocaleString("en-IN");

async function loadStats() {
  const box = $("#stats");
  const { data: d, error } = await sb.rpc("admin_stats");
  if (error) { box.innerHTML = `<p class="empty">आँकड़े नहीं आए: ${esc(error.message)}<br><small>supabase/stats.sql चलाना बाक़ी है?</small></p>`; return; }

  const W = window.WARDS || [], P = window.PARTIES || {};
  const byWard = Object.fromEntries((d.wards || []).map(w => [w.ward, w]));

  const adh = d.adhyaksh || {};
  const adhTotal = Object.values(adh).reduce((a, b) => a + b, 0) || 1;

  const maxH = Math.max(1, ...(d.hourly || []).map(h => h.c));
  const hrs = (d.hourly || []).slice(-24);

  const rows = W.map(w => {
    const st = byWard[w.n];
    const total = st ? st.total : 0;
    const counts = st ? st.counts : {};
    const best = w.p.map(c => ({ ...c, v: counts[c.n] || 0 })).sort((a, b) => b.v - a.v);
    const lead = best[0], second = best[1];
    const pct = total ? Math.round((lead.v / total) * 100) : 0;
    const marg = total && second ? Math.round(((lead.v - second.v) / total) * 100) : 0;
    return `<tr class="${total < 8 ? "low" : ""}">
      <td class="w">${w.n}</td>
      <td class="t">${nf(total)}</td>
      <td>${total ? `<b style="color:${DAL_RANG[lead.dal]}">${esc(lead.naam)}</b>
            <span class="p">${esc(P[lead.dal] || "")} · ${pct}%${second ? ` · +${marg}` : ""}</span>` : "—"}</td>
    </tr>`;
  }).join("");

  box.innerHTML = `
    <div class="kpi">
      <div><b>${nf(d.grand)}</b><span>कुल वोट</span></div>
      <div><b>${nf(d.last_hour)}</b><span>पिछले 1 घंटे में</span></div>
      <div><b>${nf(d.devices)}</b><span>अलग-अलग फ़ोन</span></div>
    </div>

    <h3>अध्यक्ष किसका</h3>
    <div class="adh">
      ${["bjp","inc","ind"].map(k => `
        <div class="adh-row">
          <span>${esc(P[k] || k)}</span>
          <i style="width:${Math.round(((adh[k]||0)/adhTotal)*100)}%;background:${DAL_RANG[k]}"></i>
          <b>${nf(adh[k]||0)}</b>
        </div>`).join("")}
    </div>

    <h3>हर घंटे (भारतीय समय)</h3>
    <div class="spark">
      ${hrs.map(h => `<i style="height:${Math.max(3, Math.round((h.c/maxH)*100))}%" title="${esc(h.h)} — ${h.c} वोट"></i>`).join("")}
    </div>
    <p class="dims">${hrs.length ? esc(hrs[0].h) + "  →  " + esc(hrs[hrs.length-1].h) : ""}</p>

    <h3>वार्डवार</h3>
    <table class="wt">
      <thead><tr><th>वार्ड</th><th>वोट</th><th>आगे कौन</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="dims">लाल रंग वाले वार्ड में 8 से कम वोट हैं — वहाँ लिंक और भेजें।</p>`;
}

$("#reload").addEventListener("click", () => { loadStats(); load(); loadCfg(); });

/* ── कहाँ क्या दिखे ────────────────────────────────────────── */
const MODES = {
  adsterra: "Adsterra का विज्ञापन",
  house:    "अपना न्यौता — 'विज्ञापन यहाँ लगवाएँ'",
  off:      "कुछ नहीं — जगह ग़ायब"
};

async function loadCfg() {
  const { data, error } = await sb.from("ad_config").select("slot,fallback");
  const box = $("#cfg");
  if (error) { box.innerHTML = `<p class="empty">नियंत्रण नहीं आया: ${esc(error.message)}</p>`; return; }
  const by = Object.fromEntries(data.map(r => [r.slot, r.fallback]));
  box.innerHTML = ["top", "mid", "bottom"].map(slot => `
    <div class="cfg-row">
      <b>${SLOTS[slot]}</b>
      <select data-cfg="${slot}">
        ${Object.entries(MODES).map(([v, t]) =>
          `<option value="${v}"${by[slot] === v ? " selected" : ""}>${t}</option>`).join("")}
      </select>
    </div>`).join("");

  $$("[data-cfg]").forEach(sel => sel.addEventListener("change", async () => {
    const { error } = await sb.from("ad_config")
      .update({ fallback: sel.value, updated: new Date().toISOString() })
      .eq("slot", sel.dataset.cfg);
    error ? say(error.message, true) : say(`${SLOTS[sel.dataset.cfg]} — बदल गया, साइट पर तुरंत लागू`);
  }));
}

$("#allOff").addEventListener("click", async () => {
  if (!confirm("तीनों जगह से सारे विज्ञापन हट जाएँगे (दुकानों के बैनर फिर भी दिखेंगे)। पक्का?")) return;
  const { error } = await sb.from("ad_config").update({ fallback: "off" }).in("slot", ["top","mid","bottom"]);
  if (error) return say(error.message, true);
  say("सारे विज्ञापन बंद"); loadCfg();
});

/* ── नया बैनर ──────────────────────────────────────────────── */
let _prevUrl = null;
$("#file").addEventListener("change", e => {
  const f = e.target.files[0];
  if (_prevUrl) { URL.revokeObjectURL(_prevUrl); _prevUrl = null; }
  if (!f) return;
  const url = _prevUrl = URL.createObjectURL(f);
  const img = new Image();
  img.onload = () => {
    const r = (img.width / img.height).toFixed(2);
    $("#preview").innerHTML = `<img src="${url}" alt="">`;
    $("#dims").textContent =
      `${img.width} × ${img.height} · अनुपात ${r}:1 · ${Math.round(f.size / 1024)}KB` +
      (f.size > 250 * 1024 ? "  ⚠️ 250KB से बड़ी — दबाकर छोटी करें" : "") +
      (img.width / img.height < 2 ? "  ⚠️ बहुत ऊँची है, पेज पर बड़ी जगह लेगी" : "") +
      (img.width > 1600 || f.size > 250 * 1024 ? "  ·  चढ़ाते वक़्त अपने आप छोटी कर दी जाएगी" : "");
  };
  img.src = url;
});

/* बड़ी तस्वीर अपने आप 1600px चौड़ी और हल्की कर दो */
function shrink(file) {
  return new Promise(res => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const MAX = 1600;
      if (img.width <= MAX && file.size <= 250 * 1024) { URL.revokeObjectURL(url); return res(file); }
      const w = Math.min(MAX, img.width), h = Math.round(img.height * w / img.width);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      c.toBlob(b => {
        URL.revokeObjectURL(url);
        res(b && b.size < file.size ? new File([b], "banner.jpg", { type: "image/jpeg" }) : file);
      }, "image/jpeg", 0.86);
    };
    img.onerror = () => { URL.revokeObjectURL(url); res(file); };
    img.src = url;
  });
}

$("#addForm").addEventListener("submit", async e => {
  e.preventDefault();
  const f = $("#file").files[0];
  if (!f) return say("तस्वीर चुनें।", true);
  const btn = $("#addBtn"); btn.disabled = true; btn.textContent = "छोटी कर रहे हैं…";
  try {
    const small = await shrink(f);
    btn.textContent = "चढ़ा रहे हैं…";
    const ext = (small.type === "image/jpeg" ? "jpg" : (f.name.split(".").pop() || "png")).toLowerCase();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const up = await sb.storage.from("sponsors").upload(path, small, { cacheControl: "604800", upsert: false });
    if (up.error) throw up.error;
    const { data: { publicUrl } } = sb.storage.from("sponsors").getPublicUrl(path);
    const ins = await sb.from("sponsors").insert({
      slot: $("#slot").value,
      img: publicUrl,
      href: $("#href").value.trim(),
      alt: $("#alt").value.trim(),
      note: $("#note").value.trim() || null,
      sort: Number($("#sort").value) || 0
    });
    if (ins.error) throw ins.error;
    $("#addForm").reset(); $("#preview").innerHTML = ""; $("#dims").textContent = "";
    say("बैनर लग गया — साइट पर तुरंत दिखने लगेगा");
    await load();
  } catch (err) {
    say("नहीं लगा: " + (err.message || err), true);
  } finally {
    btn.disabled = false; btn.textContent = "बैनर लगाएँ";
  }
});

sb.auth.onAuthStateChange((_event, session) => {
  setTimeout(() => applySession(session), 0);     // lock से बाहर निकलकर
});
sb.auth.getSession().then(({ data: { session } }) => applySession(session));
