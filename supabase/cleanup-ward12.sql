-- ward 12 · मनमोहन (choice=2) — सबूत-आधारित सुधार
-- साक्ष्य: 38 अलग IP में से 35 ने ठीक 1-1 वोट दिया (सामान्य)।
--         सिर्फ़ 3 IP ने 98, 87, 18 वोट दिए — यह किसी साझा नेटवर्क से
--         संभव नहीं, स्क्रिप्ट/ऑटोमेशन का साफ़ निशान।
-- फ़ैसला: इन 3 IP से सिर्फ़ पहला वोट रखा जाएगा (शक का फ़ायदा), बाक़ी हटेंगे।
--         बाक़ी 35 IP (35 वोट) बिलकुल नहीं छुए जाएँगे।

-- पहले देख लें कि कितने हटेंगे (कुछ भी मिटता नहीं):
select ip_hash, count(*) कुल,
       count(*) filter (where rn > 1) हटेंगे
  from (
    select ip_hash, row_number() over (partition by ip_hash order by created_at) rn
      from votes
     where ward = 12 and choice = '2'
       and ip_hash in (
         '44b029c380beeaa80b40d82e2e01be16377b0c064d29ab5b1dee9bdd4cbee1ab',
         'a50bd8ed28b96247fe00c3762baf25060f6e76b7b8ae7d4cb12c952a48e25067',
         '23e3f056d83be29bf5f6566b4cdc82044fd6c627c2c65ec9ec35722b9dfe256c'
       )
  ) x
 group by ip_hash;

-- ऊपर वाला नतीजा 98,87,18 के करीब "हटेंगे" दिखाए तभी नीचे वाला चलाएँ:

delete from votes v using (
  select id, row_number() over (partition by ip_hash order by created_at) rn
    from votes
   where ward = 12 and choice = '2'
     and ip_hash in (
       '44b029c380beeaa80b40d82e2e01be16377b0c064d29ab5b1dee9bdd4cbee1ab',
       'a50bd8ed28b96247fe00c3762baf25060f6e76b7b8ae7d4cb12c952a48e25067',
       '23e3f056d83be29bf5f6566b4cdc82044fd6c627c2c65ec9ec35722b9dfe256c'
     )
) d
where v.id = d.id and d.rn > 1;

-- नतीजा जाँचें:
select choice, count(*) from votes where ward = 12 group by choice order by choice;
