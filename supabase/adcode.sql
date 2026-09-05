-- किसी भी विज्ञापन नेटवर्क का कोड /admin से चिपकाने के लिए।
-- Supabase SQL Editor में एक बार चलाएँ। (ads.sql पहले चला होना चाहिए)

alter table public.ad_config add column if not exists code text;

comment on column public.ad_config.code is
  'विज्ञापन नेटवर्क का पूरा HTML/JS टैग। खाली = कोड वाला डिफ़ॉल्ट।';

-- नई जगहें: नीचे चिपकी पट्टी, और 'global' — पूरे पेज पर एक बार चलने वाला
-- टैग (जैसे Adcash AutoTag, जो ख़ुद जगह ढूँढ़कर विज्ञापन लगाता है)।
alter table public.ad_config drop constraint if exists ad_config_slot_check;
alter table public.ad_config add constraint ad_config_slot_check
  check (slot in ('global','top','mid','bottom','stick'));

insert into public.ad_config (slot, fallback) values
  ('stick', 'adsterra'), ('global', 'adsterra')
on conflict (slot) do nothing;
