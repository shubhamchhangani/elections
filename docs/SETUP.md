# सेटअप — क्रम से करें (कुल ~30 मिनट)

दो खाते चाहिए: **Supabase** (डेटा) और **Cloudflare** (होस्टिंग + कैप्चा)।
दोनों मुफ़्त। क्रेडिट कार्ड कहीं नहीं। **कोई लॉगिन सिस्टम नहीं — लोग सीधे वोट देंगे।**

---

## धांधली कैसे रुकती है — चार परतें

| परत | क्या करती है | क्या रोकती है |
|---|---|---|
| **1. Turnstile कैप्चा** | असली ब्राउज़र के बिना वोट डलता ही नहीं | स्क्रिप्ट/बॉट से हज़ारों वोट |
| **2. पहचान-टोकन** | localStorage + cookie दोनों में | वही व्यक्ति दोबारा वोट दे |
| **3. फ़िंगरप्रिंट** | एक फ़ोन से एक वार्ड में अधिकतम 3 वोट | incognito / डेटा साफ़ करके दोबारा |
| **4. IP सीमा** | एक IP से 40 वोट/घंटा प्रति वार्ड | अचानक की बाढ़ |

सब जाँच **सर्वर पर** होती है — फ़ोन की घड़ी या ब्राउज़र बदलकर बाईपास नहीं होती।
साथ में `shak` नाम का व्यू है जिससे आप संदिग्ध वोट देखकर मिटा सकते हैं (सबसे नीचे)।

---

## 1️⃣ Supabase (~6 मिनट)

1. https://supabase.com → **Start your project** → GitHub से साइन-इन
2. **New project**
   - Name: `pokaranchunav`
   - Database password: मज़बूत रखें, **कहीं लिखकर रखें**
   - Region: **Southeast Asia (Singapore)** ← भारत के सबसे पास
3. बनने में ~2 मिनट
4. बाएँ मेन्यू **SQL Editor** → **New query** → `supabase/schema.sql` का **पूरा** कंटेंट चिपकाएँ → **Run**
   - "Success. No rows returned" आना चाहिए
5. **Settings** (⚙️) → **API** → दो चीज़ें कॉपी करें:
   - **Project URL** — जैसे `https://abcdefgh.supabase.co`
   - **anon public** key — लंबी `eyJ...` वाली

> **Table Editor में `votes` पर "No policies" का warning दिखेगा — वह सही है।**
> RLS चालू है और कोई policy नहीं, यानी anon key से न पढ़ा जा सकता है न लिखा जा सकता है।
> उस warning पर क्लिक करके policy मत जोड़ना।

---

## 2️⃣ Cloudflare Turnstile — कैप्चा (~5 मिनट)

1. https://dash.cloudflare.com → खाता बनाएँ
2. बाएँ मेन्यू → **Turnstile** → **Add widget**
   - Widget name: `pokaranchunav`
   - Domain: `pokaranchunav.pages.dev`  ← Cloudflare Pages वाले URL से बिलकुल मेल खाना चाहिए
   - Widget Mode: **Invisible** ← ज़रूरी, वरना लोगों को चेकबॉक्स दिखेगा
3. **Create** → दो चाबियाँ मिलेंगी:
   - **Site Key** (सार्वजनिक) — यह `src/config.js` में जाएगी
   - **Secret Key** (गुप्त) — यह सिर्फ़ Supabase में जाएगी, कोड में कभी नहीं

---

## 3️⃣ Edge Function — वोट लेने वाला (~7 मिनट)

यह वह हिस्सा है जो कैप्चा जाँचता है। Secret Key इसी के अंदर रहती है, ब्राउज़र में कभी नहीं जाती।

1. Supabase डैशबोर्ड → बाएँ मेन्यू **Edge Functions** → **Deploy a new function** → **Via Editor**
2. Function name: **`vote`** (बिलकुल यही नाम, छोटे अक्षरों में)
3. एडिटर में जो कुछ लिखा है सब मिटाकर `supabase/functions/vote/index.ts` का **पूरा** कंटेंट चिपकाएँ
4. **Deploy**
5. अब secret डालें: **Project Settings** (⚙️) → **Edge Functions** → **Add new secret**
   - Name: `TURNSTILE_SECRET`
   - Value: Turnstile की **Secret Key**
   - **Save**

> `SUPABASE_URL` और `SUPABASE_SERVICE_ROLE_KEY` अपने आप उपलब्ध रहते हैं — उन्हें जोड़ने की ज़रूरत नहीं।
> अगर `TURNSTILE_SECRET` नहीं डाला तो साइट चलेगी, पर कैप्चा वाली परत बंद रहेगी।

---

## 4️⃣ चाबियाँ कोड में (~1 मिनट)

`src/config.js` की तीन लाइनें बदलें:

```js
export const SUPABASE_URL  = "https://abcdefgh.supabase.co";  // Project URL
export const SUPABASE_ANON = "eyJhbGciOi...";                  // anon public key
export const TURNSTILE_KEY = "0x4AAAAAAA...";                  // Turnstile Site Key
```

फिर: `npm run build`

---

## 5️⃣ Cloudflare Pages — होस्टिंग (~8 मिनट)

1. कोड GitHub पर:
   ```bash
   cd ~/elections
   git add -A && git commit -m "पोकरण चुनाव 2026"
   git remote add origin https://github.com/shubhamchhangani/elections.git
   git push -u origin main
   ```
2. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. `pokaranchunav` चुनें। Build settings:
   - Framework preset: **None**
   - Build command: `npm run build`
   - Build output directory: `dist`
4. **Save and Deploy**
5. प्रोजेक्ट का नाम `pokaranchunav` रखें ताकि URL `https://pokaranchunav.pages.dev` बने

> आगे से हर `git push` पर साइट 1 मिनट में अपने आप अपडेट।

---

## 6️⃣ तस्वीरें (~20 मिनट, Gemini से)

`docs/GEMINI-PROMPTS.md` में सारे prompt तैयार हैं।

- **12 चुनाव चिन्ह** → `public/img/symbols/`
- **27 OG तस्वीरें** → `public/og/` (हर एक **300KB से कम**)

> तस्वीरें न हों तो भी साइट चलेगी — चिन्ह की जगह नाम लिखा दिखेगा।
> पर **OG तस्वीर पहले लगाएँ, लिंक बाद में भेजें** — WhatsApp preview को हफ़्तों कैश रखता है और मिटाया नहीं जा सकता।

---

## 7️⃣ Adsterra (~10 मिनट, बाद में भी चलेगा)

1. https://adsterra.com → **Publisher** → Sign up
2. Add website: `https://pokaranchunav.pages.dev`, category **News**
3. Traffic type: **Mainstream**
4. **"Boost CPM" — बंद रखें** ← सबसे ज़रूरी
5. Blocked verticals: **adult, dating, gambling, betting**
6. Ad unit: **Banner 320×50** या Native Banner. **Social Bar / Popunder / In-Page Push कभी नहीं**
7. key को `src/ads.js` की `ADSTERRA_KEY` में डालें → build → push
8. Payout: **Paxum ($5)** — यही आपकी कमाई की सीमा में आता है
9. पहले 48 घंटे दिन में 2-3 बार फ़ोन पर साइट खोलकर देखें कि क्या दिख रहा है।
   कुछ भी आपत्तिजनक हो तो `ADSTERRA_KEY = ""` करके push — 1 मिनट में हट जाएगा।

---

## ✅ लॉन्च से पहले की जाँच

- [ ] `npm run build` बिना error
- [ ] साइट खुलती है, 25 वार्ड की जाली दिखती है
- [ ] प्रत्याशी पर टैप → **तुरंत** "आपका वोट दर्ज हो गया ✓" (कोई लॉगिन नहीं आया)
- [ ] उसी फ़ोन पर दोबारा टैप → "आपका वोट पहले ही दर्ज है"
- [ ] **incognito विंडो में वही पेज → वोट दे पाए** (फ़िंगरप्रिंट 3 तक छूट देता है)
- [ ] **incognito में 4 बार → "इस फ़ोन से इस वार्ड के ३ वोट पहले ही दर्ज हैं"** ← यही असली परीक्षा है
- [ ] 20 वोट से कम पर नतीजा छिपा, gate दिख रहा है
- [ ] WhatsApp पर लिंक भेजकर देखा — title, description, तस्वीर सब दिख रही है

---

## 📅 चुनाव के दिनों में

| कब | क्या |
|---|---|
| **7 सितम्बर शाम 6:00** | कुछ नहीं — साइट अपने आप बंद (समय सर्वर पर तय है) |
| **9 सितम्बर शाम 6:00** | कुछ नहीं — नतीजे अपने आप खुलेंगे। **इसी वक़्त लिंक दोबारा ग्रुपों में डालें** |
| **14 सितम्बर** | असली नतीजे आने पर "हमारा पोल vs असल" पेज भरें |

समय बदलना हो (SQL Editor):
```sql
update config set value = '2026-09-07T12:30:00Z' where key = 'freeze_at';
update config set value = '2026-09-09T12:30:00Z' where key = 'reveal_at';
-- ये UTC हैं। IST = UTC + 5:30
```

---

## 🔍 धांधली पर नज़र — रोज़ 2 मिनट (SQL Editor)

```sql
-- संदिग्ध फ़ोन (एक ही उपकरण से कई वोट)
select * from shak;

-- वोटों की अचानक बाढ़
select date_trunc('minute', created_at) samay, ward, count(*)
  from votes group by 1,2 having count(*) > 25 order by 3 desc;

-- हर वार्ड की कुल गिनती
select ward, count(*) from votes group by 1 order by 1;

-- किसी फ़ोन के फ़र्ज़ी वोट हटाना (सावधानी से — वापस नहीं आएँगे)
delete from votes where ward = 5 and device_hash = '<shak से मिला hash>';
```

> **यह रोज़ करना ज़रूरी है।** बिना लॉगिन वाले पोल में रोकथाम से ज़्यादा भरोसा
> पकड़ने पर है। दिन में दो बार `select * from shak;` चलाकर ऊपर की 5 पंक्तियाँ देख लें —
> कोई एक फ़ोन 10-15 वोट दिखा रहा हो तो वही धांधली है, मिटा दें।
