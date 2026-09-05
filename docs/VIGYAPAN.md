# विज्ञापन — Adsterra और दुकानों के बैनर

## सब कुछ /admin से

अब विज्ञापन का पूरा नियंत्रण `pokaranchunav.pages.dev/admin` पर है। कोड छूने की ज़रूरत नहीं।

### 3 जगहें

| जगह | कहाँ | दाम |
|---|---|---|
| **सबसे ऊपर** | पेज खुलते ही | सबसे महँगा |
| **बीच में** | नतीजे के ठीक बाद | मध्यम |
| **सबसे नीचे** | पेज के अंत में | सबसे सस्ता |

### नियम

**जिस जगह दुकान का बैनर लगा है, वहाँ हमेशा वही दिखेगा।** बाक़ी जगहों के लिए
/admin में "कहाँ क्या दिखे" से तय करें:

| विकल्प | क्या होगा |
|---|---|
| **Adsterra का विज्ञापन** | Adsterra का बैनर |
| **अपना न्यौता** | "अपने व्यवसाय का विज्ञापन यहाँ लगवाएँ" वाला बॉक्स + आपका WhatsApp |
| **कुछ नहीं** | वह जगह पूरी तरह ग़ायब |

बदलते ही साइट पर तुरंत लागू — कोई build या push नहीं।

### आपात स्थिति

कोई गंदा विज्ञापन दिखे तो /admin में **"तीनों जगह से सारे विज्ञापन हटा दें"** दबा दें।
एक क्लिक में तीनों जगह बंद। दुकानों के बैनर फिर भी चलते रहेंगे।

---

## Adsterra जोड़ना (~10 मिनट)

1. https://adsterra.com → **Publisher** → Sign up
2. **Add website**: `https://pokaranchunav.pages.dev`, category **News**
3. Traffic type: **Mainstream**
4. **"Boost CPM" — बंद रखें** ← अनचाहे creatives कम करने के लिए
5. Blocked verticals/categories में **adult, dating, gambling, betting, casino,
   crypto और downloads** block करें।
6. **Ad quality / moderation** में strictest या family-safe विकल्प चुनें, अगर आपके
   dashboard में यह setting दिखे।
7. एक ad unit बनाएँ — **Banner `320 × 50`**
   > Social Bar · Popunder · In-Page Push · Vignette — **कभी नहीं**।
   > अश्लील विज्ञापन की सारी शिकायतें इन्हीं format की हैं, banner की नहीं।
7. key `src/ads.js` में डालें। **`host` भी देख लें** — यह हर Adsterra
   खाते का अलग होता है, GET CODE वाले `<script src="...">` से लें:
   ```js
   const ADSTERRA = {
     host:   "https://www.highrevenueformat.com",
     banner: { key: "आपकी-320x50-key", w: 320, h: 50 },
   slots:  ["top", "mid", "bottom"],
   };
   ```
8. `npm run build` → commit → push
10. Payout: **Paxum ($5)** चुनें — यही आपकी कमाई की सीमा में आता है

**लगाने के बाद पहले 48 घंटे दिन में 2-3 बार अपने फ़ोन पर साइट खोलकर देखें।**
कुछ भी आपत्तिजनक दिखे तो key हटाकर `""` कर दें और push — 1 मिनट में गायब।

## Vulgar ad तुरंत कैसे हटाएँ

Adsterra का creative बाहरी iframe में आता है, इसलिए website code उसके अंदर का ad
पढ़कर reliably filter नहीं कर सकता। रोकने का सही तरीका Adsterra dashboard है:

1. **Websites → अपनी site → Ad units** में जाकर संबंधित banner खोलें।
2. **Ad quality / Brand safety / Blocked categories** में adult, dating, gambling,
   betting और casino block करें।
3. जो ad दिखा उसका screenshot, landing URL और ad unit/key नोट करके **Report ad / Report
   abuse** करें और उसी ad को block-list में डालें।
4. अगर तुरंत आपत्तिजनक ad दिख रहा हो तो `src/ads.js` में key को `""` कर दें:
   ```js
   banner: { key: "", w: 320, h: 50 },
   ```
   फिर `npm run build` और deploy करें। तीनों जगह ads बंद हो जाएँगे।
5. Popunder, Social Bar, In-Page Push और Vignette चालू न करें; ये banner की तुलना में
   vulgar या disruptive creatives दिखाने की अधिक संभावना रखते हैं।

Categories block करने के बाद भी नया ad दिखे तो उसे report करें और key अस्थायी रूप से
ख़ाली कर दें। केवल code से बाहरी ad network के creative की पूरी guarantee संभव नहीं है।

---

## अभी कौन प्रायोजक है

| दुकान | जगह | संपर्क |
|---|---|---|
| **iPhone Wala** — बैंक ऑफ़ बड़ौदा के सामने, पोकरण | `mid` | प्रशांत व्यास 9785978898 · नवनीत व्यास 9024489425 |

---

## नया बैनर बनाना (~5 मिनट)

दुकान से बैनर मँगवाने की ज़रूरत नहीं — कोड से बन जाता है।

1. `scripts/sponsor.js` खोलें, `iphoneWala` वाले हिस्से को कॉपी करके नया बनाएँ
   (नाम, पता, नंबर बदलें), और `SPONSORS` की सूची में जोड़ें
2. `npm run sponsor` → PNG `public/img/sponsors/` में बन जाएगा
3. `src/ads.js` के `SPONSORS` में एक लाइन जोड़ें (नीचे देखें)
4. `npm run build` → commit → push

> ⚠️ **किसी कंपनी का लोगो मत बनाइए** — Apple, Samsung, Vivo जैसे लोगो पंजीकृत
> ट्रेडमार्क हैं और दूसरे के विज्ञापन में उन्हें बनाना क़ानूनी जोखिम है।
> दुकान अपना लोगो दे तो उसे `public/img/sponsors/` में रखकर SVG में जोड़ सकते हैं।

## दुकान का अपना बना-बनाया बैनर लगाना (~2 मिनट)

1. दुकान से बैनर लें, या ख़ुद बनाएँ:
   - **640 × 100** (चौड़ा) — तीनों जगहों के लिए यही
   - PNG या JPG, 100KB से कम
2. फ़ाइल `public/img/sponsors/` में रखें
3. `src/ads.js` के `SPONSORS` में एक लाइन जोड़ें:
   ```js
   const SPONSORS = [
     { slot:"top", img:"/img/sponsors/sharma-mobile.png",
       href:"https://wa.me/919876543210", alt:"शर्मा मोबाइल, गांधी चौक" },
   ];
   ```
4. `npm run build` → commit → push

**एक ही slot में कई दुकानें** डाल सकते हैं — वे बारी-बारी घूमेंगी (हर 8 सेकंड)।
यानी `top` की जगह तीन दुकानों को अलग-अलग बेच सकते हैं।

```js
{ slot:"top", img:"/img/sponsors/a.png", href:"...", alt:"पहली दुकान" },
{ slot:"top", img:"/img/sponsors/b.png", href:"...", alt:"दूसरी दुकान" },
```

---

## बेचते वक़्त काम की बात

GA की **Realtime** रिपोर्ट खोलकर दुकानदार को दिखाएँ — "अभी इसी वक़्त 40 लोग साइट पर हैं"।
यह सबसे असरदार pitch है। लिंक ग्रुप में डालने के तुरंत बाद यह संख्या सबसे ऊँची रहती है,
इसलिए **7–9 सितम्बर के बीच ही बेच लें**।

## ⚠️ जो कभी न करें

**किसी प्रत्याशी, राजनीतिक दल, या उनके समर्थक का बैनर न लगाएँ।**
चुनाव आयोग के नियम से इंटरनेट पर राजनीतिक विज्ञापन के लिए **MCMC का पूर्व-प्रमाणन**
अनिवार्य है, और वह पैसा उस प्रत्याशी के चुनाव ख़र्च में जुड़ता है।
साइट के footer में यह पहले से लिखा है — वही आपका बचाव है।
