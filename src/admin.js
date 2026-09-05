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
async function refreshAuth() {
  const { data: { session } } = await sb.auth.getSession();
  $("#login").hidden = !!session;
  $("#panel").hidden = !session;
  if (session) { $("#who").textContent = session.user.email; await load(); }
}

$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = $("#loginBtn"); btn.disabled = true; btn.textContent = "जाँच रहे हैं…";
  const { error } = await sb.auth.signInWithPassword({
    email: $("#email").value.trim(), password: $("#pass").value
  });
  btn.disabled = false; btn.textContent = "लॉगिन करें";
  if (error) return say("ईमेल या पासवर्ड ग़लत है।", true);
  await refreshAuth();
});

$("#logout").addEventListener("click", async () => { await sb.auth.signOut(); await refreshAuth(); });

/* ── सूची ──────────────────────────────────────────────────── */
async function load() {
  const { data, error } = await sb.from("sponsors").select("*").order("slot").order("sort");
  if (error) return say("सूची नहीं आई: " + error.message, true);
  const list = $("#list");
  if (!data.length) { list.innerHTML = `<p class="empty">अभी कोई बैनर नहीं है। नीचे से जोड़ें।</p>`; return; }
  list.innerHTML = data.map(s => `
    <div class="card${s.active ? "" : " off"}">
      <img src="${esc(s.img)}" alt="">
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

/* ── नया बैनर ──────────────────────────────────────────────── */
$("#file").addEventListener("change", e => {
  const f = e.target.files[0];
  if (!f) return;
  const url = URL.createObjectURL(f);
  const img = new Image();
  img.onload = () => {
    const r = (img.width / img.height).toFixed(2);
    $("#preview").innerHTML = `<img src="${url}" alt="">`;
    $("#dims").textContent =
      `${img.width} × ${img.height} · अनुपात ${r}:1 · ${Math.round(f.size / 1024)}KB` +
      (f.size > 250 * 1024 ? "  ⚠️ 250KB से बड़ी — दबाकर छोटी करें" : "") +
      (img.width / img.height < 2 ? "  ⚠️ बहुत ऊँची है, पेज पर बड़ी जगह लेगी" : "");
  };
  img.src = url;
});

$("#addForm").addEventListener("submit", async e => {
  e.preventDefault();
  const f = $("#file").files[0];
  if (!f) return say("तस्वीर चुनें।", true);
  const btn = $("#addBtn"); btn.disabled = true; btn.textContent = "चढ़ा रहे हैं…";
  try {
    const ext = (f.name.split(".").pop() || "png").toLowerCase();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const up = await sb.storage.from("sponsors").upload(path, f, { cacheControl: "604800", upsert: false });
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

sb.auth.onAuthStateChange(() => refreshAuth());
refreshAuth();
