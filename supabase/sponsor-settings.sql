-- प्रायोजकों की सेटिंग — तलहटी के बैनर का क्रम तय/बेतरतीब करने के लिए।
-- Supabase SQL Editor में एक बार चलाएँ।

create table if not exists public.sponsor_settings (
  key   text primary key,
  value boolean not null default false
);
insert into public.sponsor_settings (key, value) values ('footer_shuffle', false)
on conflict (key) do nothing;

alter table public.sponsor_settings enable row level security;

drop policy if exists sponsor_settings_read on public.sponsor_settings;
create policy sponsor_settings_read on public.sponsor_settings
  for select to anon, authenticated using (true);

drop policy if exists sponsor_settings_write on public.sponsor_settings;
create policy sponsor_settings_write on public.sponsor_settings
  for update to authenticated using (true) with check (true);
