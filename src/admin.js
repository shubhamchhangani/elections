import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { SUPABASE_URL, SUPABASE_ANON } from "./config.js";

const sb = createClient(SUPABASE_URL, SUPABASE_ANON);
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const SLOTS = {
  top:    "सबसे ऊपर",
  after:  "मतपत्र के ठीक बाद",
  mid:    "बीच में",
  bottom: "सबसे नीचे",
  stick:  "नीचे चिपकी पट्टी",
  footer: "तलहटी के नीचे (कितने भी)",
};
const ORDER = ["top","after","mid","bottom","stick","footer"];
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
  if (session) { $("#who").textContent = session.user.email; loadStats(); loadTraffic(); loadFraud(); load(); }
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

/* ── सूची — जगह के हिसाब से समूह में, ताकि साफ़ दिखे कहाँ कितने बैनर हैं ── */
async function load() {
  const { data, error } = await sb.from("sponsors").select("*").order("slot").order("sort");
  if (error) return say("सूची नहीं आई: " + error.message, true);
  const list = $("#list");
  if (!data.length) { list.innerHTML = `<p class="empty">अभी कोई बैनर नहीं है। नीचे से जोड़ें।</p>`; return; }

  const bySlot = {};
  for (const s of data) (bySlot[s.slot] = bySlot[s.slot] || []).push(s);

  list.innerHTML = ORDER.filter(slot => bySlot[slot]?.length).map(slot => {
    const items = bySlot[slot];
    const activeN = items.filter(s => s.active).length;
    return `
    <div class="slot-group">
      <h4>${SLOTS[slot]} <span class="cnt">${activeN} चालू / ${items.length} कुल</span></h4>
      ${items.map(s => `
        <div class="card${s.active ? "" : " off"}" data-card="${s.id}">
          <img src="${esc(s.img)}" alt="" loading="lazy" decoding="async">
          <div class="meta">
            <b class="editable" data-field="alt" data-id="${s.id}">${esc(s.alt) || "(नाम नहीं)"}</b>
            <span class="editable" data-field="href" data-id="${s.id}">${esc(s.href)}</span>
            ${s.note ? `<span class="note editable" data-field="note" data-id="${s.id}">${esc(s.note)}</span>`
                     : `<span class="note editable muted" data-field="note" data-id="${s.id}">+ अपने लिए नोट जोड़ें</span>`}
          </div>
          <div class="acts">
            <button data-toggle="${s.id}" data-on="${s.active}">${s.active ? "बंद करें" : "चालू करें"}</button>
            <button data-del="${s.id}" class="danger">हटाएँ</button>
          </div>
        </div>`).join("")}
    </div>`;
  }).join("");

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

  /* नाम, लिंक, नोट — बिना दोबारा तस्वीर चढ़ाए, यहीं क्लिक करके बदलें */
  $$(".editable").forEach(el => el.addEventListener("click", () => {
    if (el.querySelector("input")) return;
    const field = el.dataset.field, id = el.dataset.id;
    const old = field === "note" && el.classList.contains("muted") ? "" : el.textContent.trim();
    const input = document.createElement("input");
    input.type = "text"; input.value = old;
    input.style.cssText = "width:100%;font:inherit;padding:3px 5px;border:1.5px solid var(--evm)";
    el.textContent = ""; el.appendChild(input); input.focus(); input.select();
    const save = async () => {
      const val = input.value.trim();
      const patch = { [field]: val || null };
      const { error } = await sb.from("sponsors").update(patch).eq("id", id);
      error ? say(error.message, true) : say("बदल गया");
      load();
    };
    input.addEventListener("keydown", e => { if (e.key === "Enter") save(); if (e.key === "Escape") load(); });
    input.addEventListener("blur", save);
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

$("#reload").addEventListener("click", () => { loadStats(); loadTraffic(); load(); });

/* ── कितने लोग आए ─────────────────────────────────────────── */
const REF_NAAM = { whatsapp:"WhatsApp", google:"Google", direct:"सीधे लिंक से",
  facebook:"Facebook", instagram:"Instagram", twitter:"X/Twitter", telegram:"Telegram" };

async function loadTraffic() {
  const box = $("#traffic");
  const { data: d, error } = await sb.rpc("admin_traffic");
  if (error) { box.innerHTML = `<p class="empty">नहीं आया: ${esc(error.message)}<br><small>supabase/traffic.sql चलाना बाक़ी है?</small></p>`; return; }

  const wins = d.windows || [];
  const pages = d.pages || [], refs = d.refs || [];
  const maxP = Math.max(1, ...pages.map(p => p.hits));
  const maxR = Math.max(1, ...refs.map(r => r.hits));
  const hrs = (d.hourly || []).slice(-24);
  const maxH = Math.max(1, ...hrs.map(h => h.c));

  const wardName = p => {
    const m = p.match(/^\/ward-(\d+)$/);
    if (m) return "वार्ड " + m[1];
    return { "/":"मुख्य पन्ना", "/adhyaksh":"अध्यक्ष",
      "/adhyaksh-kaise-chunte-hain":"अध्यक्ष कैसे चुना जाता है",
      "/gopniyata-niti":"गोपनीयता नीति" }[p] || p;
  };

  box.innerHTML = `
    <table class="wt tw">
      <thead><tr><th>समय</th><th>पेज खुले</th><th>अलग लोग</th></tr></thead>
      <tbody>${wins.map(w => `<tr>
        <td>${esc(w.label)}</td><td class="t">${nf(w.hits)}</td><td class="t">${nf(w.uniq)}</td>
      </tr>`).join("")}</tbody>
    </table>

    <h3>हर घंटे (भारतीय समय)</h3>
    <div class="spark">${hrs.map(h =>
      `<i style="height:${Math.max(3, Math.round((h.c/maxH)*100))}%" title="${esc(h.h)} — ${h.c}"></i>`).join("")}</div>
    <p class="dims">${hrs.length ? esc(hrs[0].h) + "  →  " + esc(hrs[hrs.length-1].h) : ""}</p>

    <h3>कहाँ से आए (24 घंटे)</h3>
    ${refs.map(r => `<div class="adh-row">
      <span>${esc(REF_NAAM[r.ref] || r.ref)}</span>
      <i style="width:${Math.round((r.hits/maxR)*100)}%;background:#12457E"></i>
      <b>${nf(r.hits)}</b></div>`).join("") || '<p class="empty">अभी कुछ नहीं</p>'}

    <h3>सबसे ज़्यादा खुले पन्ने (24 घंटे)</h3>
    ${pages.map(p => `<div class="adh-row">
      <span class="wide">${esc(wardName(p.path))}</span>
      <i style="width:${Math.round((p.hits/maxP)*100)}%;background:#F26722"></i>
      <b>${nf(p.hits)}</b></div>`).join("") || '<p class="empty">अभी कुछ नहीं</p>'}`;
}

/* ── धांधली की जाँच — सिर्फ़ admin के लिए ─────────────────────
   हर वार्ड में वोट कितने, अलग-अलग फ़ोन कितने, अलग-अलग IP कितने।
   अगर वोट बहुत हों पर IP बहुत कम, तो वह एक ही जगह से आ रहे हैं — शक की बात। */
async function loadFraud() {
  const box = $("#fraud");
  const { data: d, error } = await sb.rpc("admin_fraud_stats");
  if (error) { box.innerHTML = `<p class="empty">नहीं आया: ${esc(error.message)}<br><small>supabase/fixes2.sql चलाना बाक़ी है?</small></p>`; return; }

  const rows = (d.wards || []).filter(w => w.ward > 0).map(w => {
    const perIp = w.ips ? (w.total / w.ips) : w.total;
    const perDev = w.devices ? (w.total / w.devices) : w.total;
    const shaky = w.total >= 15 && (perIp >= 8 || perDev >= 3);
    return { ...w, perIp, perDev, shaky };
  }).sort((a, b) => b.perIp - a.perIp);

  const anyShaky = rows.some(r => r.shaky);

  box.innerHTML = `
    ${anyShaky ? `<p class="warnbox">⚠️ नीचे लाल रंग वाले वार्डों में वोट-प्रति-IP या वोट-प्रति-फ़ोन का अनुपात
      असामान्य है — यानी बहुत कम अलग जगहों से बहुत सारे वोट आए हैं। Supabase में
      <code>select * from shak;</code> चलाकर device देखें और शक होने पर मिटाएँ:
      <code>delete from votes where ward=&lt;N&gt; and device_hash='&lt;hash&gt;';</code></p>` : ""}
    <table class="wt">
      <thead><tr><th>वार्ड</th><th>वोट</th><th>फ़ोन</th><th>IP</th><th>वोट/IP</th></tr></thead>
      <tbody>${rows.map(r => `<tr class="${r.shaky ? "low" : ""}">
        <td class="w">${r.ward}</td><td class="t">${nf(r.total)}</td>
        <td class="t">${nf(r.devices)}</td><td class="t">${nf(r.ips)}</td>
        <td class="t">${r.perIp.toFixed(1)}</td>
      </tr>`).join("")}</tbody>
    </table>
    <p class="dims">सामान्य वार्ड में वोट/IP आमतौर पर 1–4 के बीच रहता है (परिवार/मोहल्ले के साझा नेटवर्क की वजह से थोड़ा ऊपर भी जा सकता है)। बहुत ऊपर का मतलब एक ही जगह से बाढ़।</p>`;
}

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
