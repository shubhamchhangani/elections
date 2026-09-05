-- विज्ञापन का नियंत्रण — Supabase SQL Editor में एक बार चलाएँ।
-- इसके बाद कौन सी जगह पर क्या दिखेगा, यह /admin से तय होगा।

create table if not exists public.ad_config (
  slot     text primary key check (slot in ('top','mid','bottom')),
  fallback text not null default 'house' check (fallback in ('adsterra','house','off')),
  updated  timestamptz not null default now()
);

--  fallback का मतलब: जब उस जगह पर कोई दुकान का बैनर न लगा हो, तब क्या दिखे
--    adsterra — Adsterra का विज्ञापन
--    house    — 'अपने व्यवसाय का विज्ञापन यहाँ' वाला बॉक्स
--    off      — कुछ नहीं, जगह ही ग़ायब
insert into public.ad_config (slot, fallback) values
  ('top', 'house'), ('mid', 'adsterra'), ('bottom', 'adsterra')
on conflict (slot) do nothing;

alter table public.ad_config enable row level security;

drop policy if exists ad_config_read on public.ad_config;
create policy ad_config_read on public.ad_config
  for select to anon, authenticated using (true);

drop policy if exists ad_config_write on public.ad_config;
create policy ad_config_write on public.ad_config
  for update to authenticated using (true) with check (true);
