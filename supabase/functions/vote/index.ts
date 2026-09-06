// परत 1: Cloudflare Turnstile — असली ब्राउज़र के बिना वोट डलता ही नहीं।
// Turnstile का secret सिर्फ़ यहाँ रहता है, ब्राउज़र में कभी नहीं जाता।
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "content-type": "application/json" } });

const sha = async (s: string) => {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
};

/* ── VPN/डेटासेंटर IP रोकना ────────────────────────────────────
   सस्ते/मुफ़्त VPN और bot-hosting ज़्यादातर AWS, Google Cloud या Oracle
   Cloud पर चलते हैं — किसी असली भारतीय मोबाइल/ब्रॉडबैंड यूज़र का IP
   कभी इनकी list में नहीं आता। ये list सार्वजनिक हैं, कोई paid service
   नहीं चाहिए। हर 12 घंटे में अपने आप ताज़ा होती है, function ज़िंदा रहते हुए। */
let dcRanges: number[][] = [];      // हर एक: [नेटवर्क, mask]
let dcAt = 0;

function ipToInt(ip: string): number | null {
  const m = ip.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const [a, b, c, d] = m.slice(1).map(Number);
  if ([a, b, c, d].some(x => x > 255)) return null;
  return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
}

function cidrToRange(cidr: string): number[] | null {
  const [ip, bitsStr] = cidr.split("/");
  const net = ipToInt(ip);
  if (net === null) return null;
  const bits = Number(bitsStr ?? 32);
  const mask = bits === 0 ? 0 : (0xFFFFFFFF << (32 - bits)) >>> 0;
  return [net & mask, mask];
}

async function loadDcRanges(): Promise<number[][]> {
  const out: number[][] = [];
  const add = (cidr: string) => { const r = cidrToRange(cidr); if (r) out.push(r); };
  try {
    const [aws, gcp, oci] = await Promise.all([
      fetch("https://ip-ranges.amazonaws.com/ip-ranges.json").then(r => r.json()).catch(() => null),
      fetch("https://www.gstatic.com/ipranges/cloud.json").then(r => r.json()).catch(() => null),
      fetch("https://docs.oracle.com/en-us/iaas/tools/public_ip_ranges.json").then(r => r.json()).catch(() => null),
    ]);
    for (const p of aws?.prefixes ?? []) if (p.ip_prefix) add(p.ip_prefix);
    for (const p of gcp?.prefixes ?? []) if (p.ipv4Prefix) add(p.ipv4Prefix);
    for (const region of oci?.regions ?? []) for (const c of region.cidrs ?? []) if (c.cidr) add(c.cidr);
  } catch { /* नीचे fail-open है */ }
  return out;
}

function isDatacenterIp(ip: string): boolean {
  if (!dcRanges.length) return false;   // सूची अभी लोड नहीं हुई — रोकना नहीं, असली वोट न अटके
  const n = ipToInt(ip);
  if (n === null) return false;         // IPv6 वग़ैरह — फ़िलहाल जाँच नहीं, ब्लॉक नहीं
  for (const [net, mask] of dcRanges) if ((n & mask) === net) return true;
  return false;
}

// पहली बार तुरंत लोड करने की कोशिश, आगे से हर 12 घंटे में पीछे से ताज़ा
async function ensureDcRanges() {
  const stale = Date.now() - dcAt > 12 * 3600 * 1000;
  if (dcRanges.length && !stale) return;
  if (!dcRanges.length) {
    dcRanges = await loadDcRanges();
    dcAt = Date.now();
  } else {
    dcAt = Date.now();               // तुरंत टाइमस्टैम्प बढ़ाओ ताकि दोबारा कोशिश न हो
    loadDcRanges().then(r => { if (r.length) dcRanges = r; }).catch(() => {});
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, code: "bad_method" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, code: "bad_body" }, 400); }

  const { ward, choice, token, device, ts } = body ?? {};
  if (typeof ward !== "number" || ward < 0 || ward > 25) return json({ ok: false, code: "bad_ward" }, 400);
  if (typeof choice !== "string" || choice.length < 1 || choice.length > 12) return json({ ok: false, code: "bad_choice" }, 400);
  if (typeof token !== "string" || !/^[0-9a-f-]{36}$/i.test(token)) return json({ ok: false, code: "bad_token" }, 400);
  if (typeof device !== "string" || device.length < 8 || device.length > 64) return json({ ok: false, code: "bad_device" }, 400);

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";

  // VPN/डेटासेंटर जाँच — Turnstile से पहले, ताकि बेकार का captcha check न हो
  try { await ensureDcRanges(); } catch { /* fail-open */ }
  if (isDatacenterIp(ip)) return json({ ok: false, code: "vpn_blocked" }, 403);

  // Turnstile जाँच
  const secret = Deno.env.get("TURNSTILE_SECRET");
  if (secret) {
    if (typeof ts !== "string" || !ts) return json({ ok: false, code: "no_captcha" }, 400);
    const form = new FormData();
    form.append("secret", secret);
    form.append("response", ts);
    form.append("remoteip", ip);
    try {
      const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
      const v = await r.json();
      if (!v.success) return json({ ok: false, code: "captcha_fail" }, 403);
    } catch {
      return json({ ok: false, code: "captcha_error" }, 503);
    }
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await sb.rpc("cast_vote", {
    p_ward: ward, p_choice: choice, p_token: token,
    p_device: await sha(device + ":pokaran2026"),
    p_ip: await sha(ip + ":pokaran2026"),
  });
  if (error) return json({ ok: false, code: "db" }, 500);
  return json(data);
});
