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
