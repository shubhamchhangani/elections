-- और विज्ञापन की जगहें + हर जगह की ऊँचाई। Supabase SQL Editor में चलाएँ।
-- (ads.sql और adcode.sql पहले चल चुके हों)

alter table public.ad_config add column if not exists height int not null default 0;
comment on column public.ad_config.height is
  'iframe की ऊँचाई px में। 0 = अपने आप (banner 60, बड़ा 260)। वीडियो/300x600 के लिए 600 रखें।';

alter table public.ad_config drop constraint if exists ad_config_slot_check;
alter table public.ad_config add constraint ad_config_slot_check
  check (slot in ('global','top','after','mid','bottom','footer','stick'));

insert into public.ad_config (slot, fallback, height) values
  ('after',  'adsterra', 0),     -- मतपत्र के ठीक बाद
  ('footer', 'adsterra', 0),     -- तलहटी के नीचे
  ('stick',  'adsterra', 0),
  ('global', 'adsterra', 0)
on conflict (slot) do nothing;
