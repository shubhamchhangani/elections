-- ward 5 · बद्रीनारायण (choice=1) — सबूत-आधारित सुधार
-- साक्ष्य: 86 अलग IP में से 82 ने 1-1 वोट, 2 ने 2-2 वोट (सामान्य)।
--         1 IP ने अकेले 41 वोट दिए, वह भी सिर्फ़ 20 मिनट में (19:40-19:50) —
--         किसी साझा नेटवर्क से संभव नहीं, वही पैटर्न जो वार्ड 12 में मिला।
-- फ़ैसला: सिर्फ़ इस 1 IP से पहला वोट रखा जाएगा, बाक़ी 40 हटेंगे।
--         6 वोट वाला और 2-2 वोट वाले IP नहीं छुए जा रहे — वे सामान्य दायरे में हैं।

-- पहले देख लें कि कितने हटेंगे:
select ip_hash, count(*) कुल, count(*) filter (where rn > 1) हटेंगे
  from (
    select ip_hash, row_number() over (partition by ip_hash order by created_at) rn
      from votes
     where ward = 5 and choice = '1'
       and ip_hash = 'a079e62eddfa66932a86f415767213648785dde48f245f302071de5352e03abe'
  ) x
 group by ip_hash;

-- ऊपर "40" दिखे तभी यह चलाएँ:

delete from votes v using (
  select id, row_number() over (partition by ip_hash order by created_at) rn
    from votes
   where ward = 5 and choice = '1'
     and ip_hash = 'a079e62eddfa66932a86f415767213648785dde48f245f302071de5352e03abe'
) d
where v.id = d.id and d.rn > 1;

-- नतीजा जाँचें:
select choice, count(*) from votes where ward = 5 group by choice order by choice;
