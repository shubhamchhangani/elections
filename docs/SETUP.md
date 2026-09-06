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
2. Function name: कोई भी रखें — **जो नाम रखें, वही `src/config.js` की `VOTE_FN` में लिखें**
   (Supabase डिफ़ॉल्ट में `smart-processor` जैसा नाम सुझाता है; वही रखना भी ठीक है)
3. एडिटर में जो कुछ लिखा है सब मिटाकर `supabase/functions/vote/index.ts` का **पूरा** कंटेंट चिपकाएँ
4. **Deploy**
5. अब secret डालें: **Project Settings** (⚙️) → **Edge Functions** → **Add new secret**
   - Name: `TURNSTILE_SECRET`
   - Value: Turnstile की **Secret Key**
   - **Save**

> `SUPABASE_URL` और `SUPABASE_SERVICE_ROLE_KEY` अपने आप उपलब्ध रहते हैं — उन्हें जोड़ने की ज़रूरत नहीं।
> अगर `TURNSTILE_SECRET` नहीं डाला तो साइट चलेगी, पर कैप्चा वाली परत बंद रहेगी।

### वोट न जुड़ने पर तुरंत जाँच

- Supabase के **Project Settings → API** से वर्तमान `anon` या `publishable` public
   key लेकर `src/config.js` में डालें। पुरानी JWT key पर gateway
   `UNAUTHORIZED_LEGACY_JWT` या `INVALID_API_KEY` दे सकता है।
- Function का नाम और `src/config.js` की `VOTE_FN` value बिल्कुल समान होनी चाहिए।
   इस repository में source path `supabase/functions/vote/index.ts` है; अगर CLI से
   deploy करते हैं तो `vote` नाम से deploy करें और `VOTE_FN` को `vote` करें। अगर
   dashboard में `smart-processor` नाम रखा है, तो उसी नाम पर पूरा source deploy करें।
- Browser console में `get_counts failed` दिखे तो public key/RPC समस्या है।
   `http_401` public key की समस्या, `http_404` function name/deployment की समस्या,
   और `captcha_fail` या `no_captcha` Turnstile domain/secret की समस्या है।
- Key या function बदलने के बाद `npm run build` करके नया `dist` Cloudflare Pages पर
   deploy करें। पुराने tab को hard refresh करें।

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

## 6️⃣ तस्वीरें — कुछ नहीं करना

चुनाव चिन्ह और WhatsApp की सभी 27 preview तस्वीरें कोड से बनती हैं और
repo में पहले से मौजूद हैं। डिज़ाइन बदलना हो तो `npm run og` — बाक़ी कुछ नहीं।
विस्तार के लिए `docs/GEMINI-PROMPTS.md`।

---

## 7️⃣ Google Analytics (~5 मिनट)

यह बताएगा कि कितने लोग आए, किस वार्ड के पेज सबसे ज़्यादा खुले, कितनों ने वोट दिया,
और कितनों ने आगे शेयर किया।

1. https://analytics.google.com → **Start measuring**
2. Account name: `Pokaran Chunav` → Next
3. Property name: `pokaranchunav` · Time zone: **India** · Currency: **INR** → Next
4. Business details भरें (कुछ भी सामान्य) → Create
5. Platform: **Web** चुनें
   - Website URL: `https://pokaranchunav.pages.dev`
   - Stream name: `pokaranchunav`
6. बनने के बाद **Measurement ID** मिलेगी — `G-XXXXXXXXXX` जैसी
7. उसे `src/config.js` की `GA_ID` में डालें:
   ```js
   export const GA_ID = "G-XXXXXXXXXX";
   ```
8. `npm run build` → commit → push

### आपको क्या-क्या दिखेगा

पेज देखने के अलावा ये घटनाएँ अपने आप दर्ज होती हैं
(GA → **Reports → Engagement → Events**):

| घटना | कब | इससे क्या पता चलता है |
|---|---|---|
| `vote_cast` | वोट दर्ज हुआ | असल में कितने वोट पड़े, किस वार्ड में, किस दल को |
| `vote_blocked` | वोट रुका | कितने लोग कैप्चा/डुप्लिकेट पर अटके — **कुछ गड़बड़ है तो यहीं दिखेगा** |
| `gate_shown` | 20 वोट से कम वाला पर्दा दिखा | कितने लोग नतीजा देखे बिना लौटे |
| `result_shown` | नतीजा दिखा | कितनों तक असली नतीजा पहुँचा |
| `share` | शेयर बटन दबा | कितने लोगों ने आगे भेजा — **यही वायरल होने की रफ़्तार है** |

**सबसे काम की रिपोर्ट:** GA → **Realtime**। लिंक ग्रुप में डालने के 30 सेकंड बाद
खोलकर देखें — कितने लोग इसी वक़्त साइट पर हैं। इसी स्क्रीन का स्क्रीनशॉट
दुकानदारों को दिखाकर विज्ञापन बेचना सबसे आसान पड़ता है।

> अगर `vote_blocked` की गिनती `vote_cast` से ज़्यादा हो जाए तो कुछ टूटा है —
> `reason` देखें: `captcha_fail` का मतलब Turnstile में गड़बड़, `device_limit` का
> मतलब लोग बार-बार कोशिश कर रहे हैं।

---

## 8️⃣ विज्ञापन

सिर्फ़ दुकानों के बैनर, `/admin` से — पूरी जानकारी `docs/VIGYAPAN.md` में।

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
- [ ] लॉन्च से ठीक पहले टेस्ट के वोट मिटाए: `delete from votes;`

---

## 📅 चुनाव के दिनों में

| कब | क्या |
|---|---|
| **9 सितम्बर शाम 6:00** | कुछ नहीं — साइट अपने आप बंद (समय सर्वर पर तय है) |
| **11 सितम्बर शाम 6:00** | कुछ नहीं — नतीजे अपने आप खुलेंगे। **इसी वक़्त लिंक दोबारा ग्रुपों में डालें** |
| **14 सितम्बर** | असली नतीजे आने पर "हमारा पोल vs असल" पेज भरें |

समय बदलना हो (SQL Editor):
```sql
update config set value = '2026-09-09T12:30:00Z' where key = 'freeze_at';
update config set value = '2026-09-11T12:30:00Z' where key = 'reveal_at';
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

## 🔍 धांधली — प्रत्याशी-स्तर की जाँच (6 सितम्बर से)

`/admin` का "धांधली की जाँच" सेक्शन अब हर प्रत्याशी को अपने आप जाँचता है —
किसी भी वार्ड में किसी प्रत्याशी को अगर बहुत कम अलग-अलग IP से बहुत सारे वोट
मिलें (जैसा 5 सितम्बर को वार्ड 12 में मनमोहन के साथ हुआ — एक IP से 98 वोट,
दूसरे से 87), तो वह अपने आप लाल रंग में दिखेगा। दोबारा मुझसे (Claude से)
forensic query मँगवाने की ज़रूरत नहीं — हर लॉगिन पर ख़ुद दिखता है।

**server पर भी रोक लगा दी गई है** (`cast_vote` की परत 5): अब एक ही IP
किसी एक प्रत्याशी को वार्ड में **5 से ज़्यादा वोट** नहीं दे सकता, चाहे
हर बार अलग device_hash (fingerprint बदलने वाला ब्राउज़र) क्यों न इस्तेमाल
करे। यही वह छेद था जिससे वार्ड 12 का मामला हुआ — वार्ड की 400/घंटा वाली
ढीली सीमा के अंदर रहकर एक ही प्रत्याशी को बार-बार वोट दिया गया।

अगर कभी कोई प्रत्याशी फिर झंडे में दिखे:
1. Supabase SQL Editor में: `select * from admin_ip_breakdown(<वार्ड>, '<choice>');`
2. जो 1-2 IP असामान्य रूप से ज़्यादा वोट दिखाएँ, उनसे सिर्फ़ पहला वोट रखकर
   बाक़ी हटाएँ (देखें `supabase/cleanup-ward12.sql` जैसा पैटर्न) —
   **किसी और प्रत्याशी को वोट देना नहीं, सिर्फ़ हटाना।**
