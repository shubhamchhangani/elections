/* चुनाव चिन्ह — असली मतपत्र जैसी सादी, ऊँचे कंट्रास्ट वाली आकृतियाँ।
   सब 64×64, सिर्फ़ काला, 38px पर भी साफ़ पहचान में आएँ। */

const S = (body) =>
  `<svg viewBox="0 0 64 64" fill="none" stroke="#111" stroke-width="3.2" ` +
  `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const SYMBOLS = {
  // कमल — पाँच भरी हुई पंखुड़ियाँ, नीचे पत्तियाँ
  kamal: S(`
    <g fill="#111" stroke="none">
      <path d="M32 42c-7-8-9-21 0-34 9 13 7 26 0 34z"/>
      <path d="M32 42c-7-8-9-21 0-34 9 13 7 26 0 34z" transform="rotate(-34 32 42)"/>
      <path d="M32 42c-7-8-9-21 0-34 9 13 7 26 0 34z" transform="rotate(34 32 42)"/>
      <path d="M32 42c-6-7-8-18 0-29 8 11 6 22 0 29z" transform="rotate(-66 32 42)"/>
      <path d="M32 42c-6-7-8-18 0-29 8 11 6 22 0 29z" transform="rotate(66 32 42)"/>
    </g>
    <path d="M6 44c7 7 16 11 26 11s19-4 26-11" stroke-width="3.6"/>`),

  // हाथ — खुली हथेली, उँगलियाँ ऊपर
  haath: S(`
    <path d="M22 34V14a3.5 3.5 0 017 0v16M29 30V10a3.5 3.5 0 017 0v20M36 31V13a3.5 3.5 0 017 0v19"/>
    <path d="M43 32V22a3.5 3.5 0 017 0v18c0 9-6 16-15 16h-6c-5 0-8-2-11-6l-7-11a3.5 3.5 0 015-5l6 5"/>`),

  // सेब — ऊपर खाँचा, डंठल और पत्ता
  seb: S(`
    <path d="M32 20c-4-4-11-4-15 1-5 6-3 18 2 26 3 4 6 6 9 4 2-1 5-1 8 0 3 2 6 0 9-4 5-8 7-20 2-26-4-5-11-5-15-1z" fill="#111" stroke="none"/>
    <path d="M32 20V9"/>
    <path d="M33 13c3-5 8-6 11-5 1 4-2 9-7 9-2 0-4-2-4-4z" fill="#111" stroke="none"/>`),

  // अलमारी — दो पल्ले, हत्थे
  almari: S(`
    <rect x="13" y="7" width="38" height="46" rx="1.5"/>
    <path d="M32 7v46M17 53v4M47 53v4"/>
    <path d="M28 27v6M36 27v6" stroke-width="4"/>`),

  // सिलाई की मशीन — मेज़, खम्भा, बाँह, सिर और सुई
  "silai-machine": S(`
    <path d="M7 51h50" stroke-width="3.6"/>
    <path d="M13 51v6M51 51v6"/>
    <g fill="#111" stroke="none">
      <rect x="10" y="43" width="44" height="6" rx="1"/>
      <rect x="42" y="14" width="9" height="29"/>
      <rect x="16" y="14" width="35" height="7"/>
      <rect x="13" y="14" width="8" height="15" rx="1.5"/>
    </g>
    <path d="M17 30v9" stroke-width="2.6"/>
    <circle cx="46" cy="27" r="4.5"/>`),

  // गुब्बारा — गोल, गाँठ, लहरदार डोरी
  gubbara: S(`
    <ellipse cx="32" cy="24" rx="15" ry="18" fill="#111" stroke="none"/>
    <path d="M28 42h8l-4 5-4-5z" fill="#111" stroke="none"/>
    <path d="M32 47c6 4-6 7 0 11"/>`),

  // कोट — कॉलर, दोनों पल्ले, बाँहें
  kot: S(`
    <path d="M26 10l6 8 6-8"/>
    <path d="M26 10l-12 5a3 3 0 00-2 3v34a2 2 0 002 2h12V10zM38 10l12 5a3 3 0 012 3v34a2 2 0 01-2 2H38V10z"/>
    <path d="M32 18v36M42 30v3M42 39v3"/>`),

  // चारपाई — बुनी हुई रस्सी की सतह और चार पाए
  charpai: S(`
    <rect x="11" y="12" width="42" height="34" rx="2" stroke-width="3.6"/>
    <g stroke-width="1.8">
      <path d="M11 20h42M11 27h42M11 34h42M11 41h42"/>
      <path d="M20 12v34M29 12v34M38 12v34M45 12v34"/>
    </g>
    <path d="M15 46v8M49 46v8M15 12V6M49 12V6" stroke-width="3.6"/>`),

  // आईस क्रीम — दो स्कूप, कोन
  "ice-cream": S(`
    <circle cx="25" cy="19" r="9" fill="#111" stroke="none"/>
    <circle cx="39" cy="19" r="9" fill="#111" stroke="none"/>
    <circle cx="32" cy="11" r="8" fill="#111" stroke="none"/>
    <path d="M18 28h28L32 57 18 28z"/>
    <path d="M24 34l9 9M32 32l7 7" stroke-width="2"/>`),

  // अंगूर — कसा हुआ गुच्छा, पत्ता और डंठल
  angoor: S(`
    <g fill="#111" stroke="none">
      <circle cx="21" cy="30" r="7"/><circle cx="33" cy="29" r="7"/><circle cx="45" cy="30" r="7"/>
      <circle cx="27" cy="41" r="7"/><circle cx="39" cy="41" r="7"/>
      <circle cx="33" cy="51" r="7"/>
    </g>
    <path d="M33 22V10"/>
    <path d="M32 14c-4-6-12-7-16-4-1 6 4 11 10 11 3 0 6-3 6-7z" fill="#111" stroke="none"/>`),

  // तकिया — भरा हुआ, सिलाई की लकीर
  takiya: S(`
    <path d="M11 22c14-4 28-4 42 0 3 1 4 4 4 10s-1 9-4 10c-14 4-28 4-42 0-3-1-4-4-4-10s1-9 4-10z"/>
    <path d="M13 27c13-3 25-3 38 0M13 37c13 3 25 3 38 0" stroke-width="2"/>`),

  // स्कूल का बस्ता — फ़ीते, ढक्कन, जेब
  "school-basta": S(`
    <path d="M24 18v-3a8 8 0 0116 0v3"/>
    <path d="M18 18h28a7 7 0 017 7v24a5 5 0 01-5 5H16a5 5 0 01-5-5V25a7 7 0 017-7z"/>
    <path d="M11 30c8-4 34-4 42 0" stroke-width="2.6"/>
    <rect x="24" y="38" width="16" height="16" rx="2"/>
    <path d="M28 46h8" stroke-width="2.6"/>`),
};

export const symbolSvg = (slug) => SYMBOLS[slug] || "";
