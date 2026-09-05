# Gemini से तस्वीरें बनवाने के प्रॉम्प्ट

दो सेट हैं: **12 चुनाव चिन्ह** और **27 OG तस्वीरें**।

---

# भाग 1 — 12 चुनाव चिन्ह

एक ही स्टाइल में सब बनने चाहिए, वरना मतपत्र गड़बड़ दिखेगा।
**नीचे वाला प्रॉम्प्ट कॉपी करें और सिर्फ़ `[OBJECT]` बदलें।**

```
A single election symbol icon in the exact visual style of an official Indian
Election Commission ballot paper symbol.

Subject: [OBJECT]

Style requirements:
- Pure solid BLACK silhouette-and-line drawing on a pure WHITE background
- Flat 2D, front-facing, perfectly centred, no perspective, no 3D
- Bold uniform outlines roughly 6px at 512px canvas — must stay legible at 38px
- NO colour, NO gradient, NO shading, NO shadow, NO texture, NO background scenery
- NO text, NO letters, NO numbers, NO watermark anywhere in the image
- Simple and instantly recognisable to a person who cannot read
- Generous even margin around the object, object fills about 75% of the frame
- Square 512x512, transparent or pure white background

Reference: the free symbols printed on Indian EVM ballot units — extremely
simple, high-contrast, woodcut-like pictograms.
```

`[OBJECT]` की जगह — फ़ाइल का नाम वही रखें जो दाईं तरफ़ लिखा है:

| # | `[OBJECT]` में लिखें | चिन्ह | फ़ाइल का नाम |
|---|---|---|---|
| 1 | `a lotus flower in full bloom, seen from the front` | कमल | `kamal.png` |
| 2 | `an open right hand, palm facing forward, fingers together and pointing up` | हाथ | `haath.png` |
| 3 | `a single apple with one leaf on the stem` | सेब | `seb.png` |
| 4 | `a two-door wooden cupboard / almirah standing upright, with handles` | अलमारी | `almari.png` |
| 5 | `an old-fashioned hand-operated sewing machine on its table` | सिलाई की मशीन | `silai-machine.png` |
| 6 | `a single party balloon with a curling string hanging down` | गुब्बारा | `gubbara.png` |
| 7 | `a men's formal coat / blazer on a hanger, front view` | कोट | `kot.png` |
| 8 | `a traditional Indian charpai — a woven rope cot with four wooden legs, side view` | चारपाई | `charpai.png` |
| 9 | `an ice cream cone with two scoops on top` | आईस क्रीम | `ice-cream.png` |
| 10 | `a bunch of grapes with two leaves at the top` | अंगूर | `angoor.png` |
| 11 | `a rectangular bed pillow lying flat, slightly plump, front view` | तकिया | `takiya.png` |
| 12 | `a school bag / backpack with two straps and a front pocket, front view` | स्कूल का बस्ता | `school-basta.png` |

**बनने के बाद:**
- 512×512 PNG रखें, `public/img/symbols/` में डालें
- हर फ़ाइल **30KB से छोटी** रखें (https://squoosh.app पर मुफ़्त दबा सकते हैं)
- कमल और हाथ पर ख़ास ध्यान दें — ये असली पार्टी चिन्ह हैं, लोग इन्हें तुरंत पहचानते हैं

---

# भाग 2 — WhatsApp की OG तस्वीरें (27)

यही तस्वीर WhatsApp पर लिंक के साथ दिखेगी। **यही तय करेगी कि कोई क्लिक करेगा या नहीं।**

## 2A — होमपेज (`home.png`)

```
A bold Hindi-language social media link preview card, 800x418 pixels, landscape.

Background: warm off-white paper texture, colour #FBFAF7, very subtle.
A thick solid black bar runs across the very top, 60px tall.
Inside the black bar in white Devanagari text: पोकरण नगर पालिका चुनाव 2026

Below, centred, in very large heavy BLACK Devanagari serif type:
आपके वार्ड में
कौन जीत रहा है?

Under that in medium grey Devanagari sans-serif:
25 वार्ड · 74 प्रत्याशी · जनता की राय

On the right side, a simple flat illustration of an Indian ballot box
with a hand dropping a folded ballot slip into it — drawn as a black
line illustration only, no colour.

A thin saffron (#F26722) and blue (#1F8FD6) double rule across the bottom.

Style: clean, official, newspaper-like, extremely high contrast, no gradients,
no glow, no 3D, no photographic elements. Devanagari text must be perfectly
formed and correctly spelled. Flat design.
```

## 2B — हर वार्ड (`ward-1.png` से `ward-25.png` तक)

एक ही प्रॉम्प्ट, हर बार सिर्फ़ **`[N]`** बदलें (1 से 25 तक):

```
A bold Hindi-language social media link preview card, 800x418 pixels, landscape.

Background: warm off-white paper #FBFAF7.
A thick solid black bar across the very top, 60px tall, containing in white
Devanagari: पोकरण नगर पालिका चुनाव 2026

In the centre-left, a very large black Devanagari numeral for [N] set in a
heavy serif face, at least 200px tall, with the smaller word वार्ड directly
above it in a lighter weight.

To the right of the numeral, in large heavy black Devanagari:
कौन जीत
रहा है?

At the bottom, a thin black rule, and below it in small grey Devanagari:
अपना वोट दें · जनता की राय

Style: looks like an official printed ballot paper. Extremely high contrast,
flat, no gradients, no shadows, no 3D, no photos. Devanagari must be perfectly
formed. Generous white space.
```

> **तेज़ तरीक़ा:** पहले एक बार `ward-1.png` बनवाकर पसंद आने तक ठीक कराएँ।
> फिर उसी चैट में सिर्फ़ लिखते जाएँ: `अब यही वार्ड 2 के लिए बनाओ`, `अब वार्ड 3`… इससे स्टाइल एक जैसी रहेगी।
>
> **और भी तेज़:** अगर 25 तस्वीरों का समय नहीं है, तो सिर्फ़ `home.png` बना लें और बाक़ी सब वार्डों में
> वही इस्तेमाल कर लें। क्लिक थोड़े कम आएँगे, पर साइट पूरी चलेगी।

## 2C — अध्यक्ष (`adhyaksh.png`)

```
A bold Hindi-language social media link preview card, 800x418 pixels, landscape.

Background: warm off-white paper #FBFAF7.
Thick solid black bar across the top, 60px tall, white Devanagari text:
पोकरण नगर पालिका चुनाव 2026

Centre, very large heavy black Devanagari serif:
किसका बोर्ड
बनेगा?

Below it, three equal boxes side by side with thin black borders, each
containing a simple black line symbol: a lotus flower, an open palm hand,
and a plain question mark.

Bottom, small grey Devanagari: भाजपा · कांग्रेस · निर्दलीय — आपकी राय?

Style: official printed ballot paper look. Flat, extremely high contrast,
no gradients, no shadows, no 3D. Devanagari perfectly formed.
```

---

## ⚠️ तस्वीरें डालने से पहले

1. **आकार:** हर OG तस्वीर **800×418** (WhatsApp के 4:1 नियम के अंदर)
2. **वज़न:** हर फ़ाइल **300KB से कम** — WhatsApp इससे बड़ी तस्वीर चुपचाप छोड़ देता है
   → https://squoosh.app पर डालें, PNG चुनें, quality घटाकर 300KB से नीचे लाएँ
3. **देवनागरी जाँचें:** AI अक्सर हिन्दी अक्षर टूटे-फूटे बनाता है। हर तस्वीर में लिखा हुआ
   पढ़कर देखें — ग़लत हिन्दी वाली तस्वीर भरोसा तोड़ देगी
4. फ़ाइलें यहाँ रखें: `public/og/` और `public/img/symbols/`
5. फिर: `npm run build && git add -A && git commit -m "तस्वीरें" && git push`

> **WhatsApp की कैश की चेतावनी:** एक बार लिंक भेजने के बाद WhatsApp preview को हफ़्तों तक
> कैश रखता है और उसे मिटाने का कोई तरीक़ा नहीं है। **इसलिए तस्वीरें पहले लगाएँ, लिंक बाद में भेजें।**
> अगर ग़लती से पहले भेज दिया, तो लिंक के आगे `?v=2` लगाकर नया लिंक भेजें।
