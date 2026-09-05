# सेटअप — क्रम से करें (कुल ~35 मिनट)

तीन खाते बनाने हैं: **Supabase** (डेटा + लॉगिन), **Google Cloud** (लॉगिन की चाबी), **Cloudflare** (होस्टिंग)।
सब मुफ़्त हैं। क्रेडिट कार्ड कहीं नहीं लगेगा।

---

## 1️⃣ Supabase (~6 मिनट)

1. https://supabase.com → **Start your project** → GitHub से साइन-इन
2. **New project**
   - Name: `pokaran-chunav`
   - Database password: कुछ भी मज़बूत — **कहीं लिखकर रखें**
   - Region: **Southeast Asia (Singapore)** ← भारत के सबसे पास, सबसे तेज़
3. प्रोजेक्ट बनने में ~2 मिनट लगेंगे
4. बाएँ मेन्यू में **SQL Editor** → **New query**
5. `supabase/schema.sql` फ़ाइल का **पूरा** कंटेंट कॉपी करके चिपकाएँ → **Run**
   - "Success. No rows returned" आना चाहिए
6. बाएँ मेन्यू → **Settings** (⚙️) → **API**. दो चीज़ें कॉपी करें:
   - **Project URL** — जैसे `https://abcdefgh.supabase.co`
   - **anon public** key — लंबी `eyJ...` वाली

> **anon key छिपाने की ज़रूरत नहीं है।** सारी जाँच (लॉगिन, समय, धांधली की सीमा) डेटाबेस के अंदर
> `security definer` फ़ंक्शन में होती है। टेबल पर कोई RLS policy नहीं है, इसलिए इस key से
> कोई सीधे न पढ़ सकता है न लिख सकता है।

---

## 2️⃣ Google Cloud — लॉगिन की चाबी (~12 मिनट)

**यह सबसे नाज़ुक हिस्सा है। स्टेप 6 मत छोड़ना।**

1. https://console.cloud.google.com → ऊपर प्रोजेक्ट ड्रॉपडाउन → **New Project**
   - Name: `pokaran-chunav` → Create
2. ऊपर के ड्रॉपडाउन से उसी प्रोजेक्ट को चुनें
3. बाएँ मेन्यू → **APIs & Services** → **OAuth consent screen**
4. User Type: **External** → Create
5. भरें:
   - App name: `पोकरण चुनाव 2026`
   - User support email: आपकी Gmail
   - Developer contact: वही Gmail
   - बाक़ी सब खाली छोड़ दें → **Save and Continue**
6. **Scopes** वाले पेज पर **कुछ भी add मत करें** → Save and Continue
   Test users पर भी कुछ नहीं → Save and Continue
7. ⚠️ **सबसे ज़रूरी:** OAuth consent screen के मुख्य पेज पर लौटें →
   **"PUBLISH APP"** बटन दबाएँ → Confirm
   - स्थिति **"In production"** दिखनी चाहिए
   - अगर यह "Testing" रह गया तो **सिर्फ़ 100 लोग** लॉगिन कर पाएँगे और 101वें को error आएगा
   - सिर्फ़ बुनियादी scopes (email, profile) माँग रहे हैं, इसलिए Google की verification नहीं लगेगी
8. बाएँ मेन्यू → **Credentials** → **+ Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `pokaran-web`
   - **Authorized redirect URIs** → ADD URI →
     `https://<आपका-project-ref>.supabase.co/auth/v1/callback`
     *(यही URL Supabase → Authentication → Providers → Google में भी लिखा मिलेगा — वहीं से कॉपी करें)*
   - **Create**
9. `Client ID` और `Client Secret` कॉपी करें
10. **Supabase** डैशबोर्ड → **Authentication** → **Providers** → **Google**
    - Enable ✅
    - Client ID और Client Secret चिपकाएँ → **Save**
11. **Authentication** → **URL Configuration**
    - **Site URL**: `https://pokaran-chunav.pages.dev`
    - **Redirect URLs** में ये दोनों जोड़ें:
      - `https://pokaran-chunav.pages.dev/**`
      - `http://localhost:5173/**`  *(अपने लैपटॉप पर जाँचने के लिए)*

---

## 3️⃣ चाबियाँ कोड में डालें (~1 मिनट)

`src/config.js` खोलकर पहली दो लाइनें बदलें:

```js
export const SUPABASE_URL  = "https://abcdefgh.supabase.co";   // आपका Project URL
export const SUPABASE_ANON = "eyJhbGciOi...";                   // आपकी anon public key
```

फिर: `npm run build`

---

## 4️⃣ Cloudflare Pages — होस्टिंग (~8 मिनट)

1. कोड GitHub पर डालें:
   ```bash
   cd ~/elections
   git add -A && git commit -m "पोकरण चुनाव 2026"
   gh repo create pokaran-chunav --private --source=. --push
   ```
2. https://dash.cloudflare.com → खाता बनाएँ → बाएँ मेन्यू **Workers & Pages**
3. **Create** → **Pages** → **Connect to Git** → GitHub जोड़ें → `pokaran-chunav` चुनें
4. Build settings:
   - Framework preset: **None**
   - Build command: `npm run build`
   - Build output directory: `dist`
5. **Save and Deploy**
6. Deploy होने के बाद **Custom domains** के पास प्रोजेक्ट का नाम बदलकर `pokaran-chunav` कर दें
   ताकि URL `https://pokaran-chunav.pages.dev` बने

> आगे से हर `git push` पर साइट अपने आप अपडेट हो जाएगी — 1 मिनट में।

---

## 5️⃣ तस्वीरें (~20 मिनट, Gemini से)

`docs/GEMINI-PROMPTS.md` में सारे prompt तैयार हैं।

- **12 चुनाव चिन्ह** → `public/img/symbols/` में `kamal.png`, `haath.png`, `seb.png`, `almari.png`,
  `silai-machine.png`, `gubbara.png`, `kot.png`, `charpai.png`, `ice-cream.png`, `angoor.png`,
  `takiya.png`, `school-basta.png`
- **27 OG तस्वीरें** → `public/og/` में `home.png`, `adhyaksh.png`, `ward-1.png` … `ward-25.png`

> तस्वीरें न भी हों तो साइट चलेगी — चिन्ह की जगह उसका नाम लिखा दिखेगा।
> **पर OG तस्वीर के बिना WhatsApp पर preview फीका रहेगा, और वही आपकी सारी क्लिक लाता है।**
> **हर OG फ़ाइल 300KB से छोटी होनी चाहिए** — WhatsApp इससे बड़ी तस्वीर चुपचाप छोड़ देता है।

---

## 6️⃣ Adsterra (~10 मिनट, बाद में भी कर सकते हैं)

1. https://adsterra.com → **Publisher** → Sign up
2. **Add website**: `https://pokaran-chunav.pages.dev`, category: **News**
3. Traffic type: **Mainstream**
4. **"Boost CPM" — बंद रखें** ← सबसे ज़रूरी सेटिंग
5. Blocked verticals में जोड़ें: **adult, dating, gambling, betting**
6. Ad unit बनाएँ: **Banner 320×50** (या Native Banner) — Social Bar / Popunder / In-Page Push **कभी नहीं**
7. मिली हुई key `src/ads.js` की `ADSTERRA_KEY` में डालें → build → push
8. Payout: **Paxum ($5)** चुनें — यही आपकी कमाई की सीमा में आता है
9. **पहले 48 घंटे दिन में 2-3 बार अपने फ़ोन पर साइट खोलकर देखें कि क्या विज्ञापन दिख रहा है।**
   कुछ भी आपत्तिजनक दिखे तो `ADSTERRA_KEY = ""` कर दें और push — 1 मिनट में हट जाएगा।

---

## ✅ लॉन्च से पहले की जाँच

- [ ] `npm run build` बिना error चला
- [ ] साइट खुलती है, वार्ड की जाली दिखती है
- [ ] किसी प्रत्याशी पर टैप → Google लॉगिन आया → वोट दर्ज हुआ → "आपका वोट दर्ज हो गया ✓"
- [ ] **दूसरे फ़ोन से दोबारा उसी खाते से वोट → "आपका वोट पहले ही दर्ज है"**
- [ ] 20 वोट से कम पर नतीजा छिपा है, gate दिख रहा है
- [ ] WhatsApp पर लिंक भेजकर देखा — title, description और तस्वीर दिख रही है
- [ ] Google OAuth स्थिति **"In production"** है (Testing नहीं)
- [ ] footer में WhatsApp नंबर और "किसी प्रत्याशी का विज्ञापन नहीं" वाली लाइन दिख रही है

---

## 📅 चुनाव के दिनों में क्या करना है

| कब | क्या |
|---|---|
| **7 सितम्बर शाम 6:00** | कुछ नहीं — साइट अपने आप बंद हो जाएगी (समय सर्वर पर तय है) |
| **9 सितम्बर शाम 6:00** | कुछ नहीं — नतीजे अपने आप खुल जाएँगे। **इसी वक़्त लिंक दोबारा ग्रुपों में डालें** |
| **14 सितम्बर** | असली नतीजे आने पर `data/results.json` भरें → build → push |

अगर कभी समय बदलना पड़े (Supabase → SQL Editor):
```sql
update config set value = '2026-09-07T12:30:00Z' where key = 'freeze_at';
update config set value = '2026-09-09T12:30:00Z' where key = 'reveal_at';
-- ये UTC में हैं। IST = UTC + 5:30
```

## 🔍 धांधली पर नज़र (Supabase → SQL Editor)

```sql
-- एक ही फ़ोन से कई खाते
select ward, device_hash, count(distinct user_id) khaate, count(*) vote
  from votes where device_hash is not null
 group by 1,2 having count(*) > 2 order by vote desc;

-- अचानक वोटों की बाढ़
select date_trunc('minute', created_at) samay, ward, count(*)
  from votes group by 1,2 having count(*) > 25 order by 3 desc;

-- फ़र्ज़ी वोट हटाना (सावधानी से!)
delete from votes where ward = 5 and device_hash = '<hash>';
```
