-- किसी भी विज्ञापन नेटवर्क का कोड /admin से चिपकाने के लिए।
-- Supabase SQL Editor में एक बार चलाएँ। (ads.sql पहले चला होना चाहिए)

alter table public.ad_config add column if not exists code text;

--  code खाली हो तो कोड में लिखा Adsterra चलेगा।
--  code में नेटवर्क का पूरा टैग चिपका दें (Adcash, Adsterra, कोई भी) —
--  वह एक अलग iframe में चलेगा, इसलिए साइट को छू नहीं सकता।

comment on column public.ad_config.code is
  'विज्ञापन नेटवर्क का पूरा HTML/JS टैग। खाली = कोड वाला डिफ़ॉल्ट।';

-- 'stick' (नीचे चिपकी पट्टी) भी एक जगह है
alter table public.ad_config drop constraint if exists ad_config_slot_check;
alter table public.ad_config add constraint ad_config_slot_check
  check (slot in ('top','mid','bottom','stick'));

insert into public.ad_config (slot, fallback) values ('stick', 'adsterra')
on conflict (slot) do nothing;
