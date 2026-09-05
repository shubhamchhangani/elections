-- तलहटी के नीचे कितने विज्ञापन। Supabase SQL Editor में चलाएँ।
alter table public.ad_config add column if not exists count int not null default 1;
comment on column public.ad_config.count is
  'इस जगह पर एक ही कोड कितनी बार दिखे। तलहटी के नीचे 10-15 तक रख सकते हैं।';
update public.ad_config set count = 1 where count is null or count < 1;
