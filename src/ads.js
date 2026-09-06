import { SUPABASE_URL, SUPABASE_ANON } from "./config.js";

/*  विज्ञापन — सिर्फ़ दुकानों के बैनर
    slots: mid · bottom · footer
    सब /admin से control होते हैं (sponsors टेबल)        */

const H = { apikey: SUPABASE_ANON, authorization: "Bearer " + SUPABASE_ANON };

const HOUSE_WA = "919079269147";

async function loadSponsors() {
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/sponsors?select=slot,img,href,alt&active=eq.true&order=sort.asc`,
      { headers: H }
    );
    return r.ok ? await r.json() : [];
  } catch { return []; }
}

function sponsorHtml(s) {
  return `<a class="sponsor" href="${s.href}" rel="nofollow sponsored noopener" target="_blank">
    <img src="${s.img}" alt="${s.alt}" loading="lazy">
  </a>`;
}

function fillSponsor(box, list) {
  box.classList.add("has-sponsor");
  box.innerHTML = sponsorHtml(list[0]);
  if (list.length < 2) return;
  let i = 0;
  setInterval(() => {
    i = (i + 1) % list.length;
    box.innerHTML = sponsorHtml(list[i]);
  }, 8000);
}

function fillHouse(box) {
  box.classList.add("has-house");
  box.innerHTML = `<a class="house"
    href="https://wa.me/${HOUSE_WA}?text=${encodeURIComponent("पोकरण चुनाव वेबसाइट पर विज्ञापन के बारे में जानकारी चाहिए")}"
    rel="noopener" target="_blank">
    <b>अपनी दुकान का बैनर यहाँ लगवाएं</b>
    <span>WhatsApp पर संपर्क करें →</span>
  </a>`;
}

function addStickClose(box) {
  document.body.classList.add("has-stick");
  const x = document.createElement("button");
  x.className = "close"; x.type = "button"; x.textContent = "×";
  x.setAttribute("aria-label", "बंद करें");
  x.onclick = () => { box.remove(); document.body.classList.remove("has-stick"); };
  box.appendChild(x);
}

(async () => {
  const sponsors = await loadSponsors();

  /* slot → list */
  const bySlot = {};
  for (const s of sponsors) (bySlot[s.slot] = bySlot[s.slot] || []).push(s);

  /* ── regular slots (top, after, mid, bottom, stick) ── */
  document.querySelectorAll("[data-ad]").forEach(box => {
    const slot = box.dataset.ad;
    if (slot === "footer") return;   // footer अलग से, नीचे

    const list = bySlot[slot];
    if (list && list.length) {
      fillSponsor(box, list);
      if (slot === "stick") addStickClose(box);
    } else if (slot !== "stick") {
      fillHouse(box);   // चिपकी पट्टी ख़ाली हो तो कुछ नहीं — वरना पूरी स्क्रीन घेर लेती
    }
  });

  /* ── footer — lazy load ── */
  const foot = document.getElementById("footads");
  if (!foot) return;

  const footList = bySlot["footer"] || [];
  if (!footList.length) {
    /* एक house ad */
    const box = document.createElement("div");
    box.className = "ad"; box.dataset.ad = "footer";
    foot.appendChild(box);
    fillHouse(box);
    return;
  }

  /* हर बैनर के लिए एक box */
  for (const s of footList) {
    const box = document.createElement("div");
    box.className = "ad ad-footer"; box.dataset.ad = "footer";
    foot.appendChild(box);

    const io = new IntersectionObserver(es => {
      if (!es[0].isIntersecting || box._done) return;
      box._done = true;
      fillSponsor(box, [s]);
      io.unobserve(box);
    }, { rootMargin: "300px" });
    io.observe(box);
  }
})();
