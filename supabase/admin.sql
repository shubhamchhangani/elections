-- प्रायोजकों का प्रबंधन — Supabase SQL Editor में एक बार चलाएँ।
-- इसके बाद बैनर लगाने के लिए कोड छूने की ज़रूरत नहीं, /admin से लग जाएगा।

create table if not exists public.sponsors (
  id         bigint generated always as identity primary key,
  slot       text not null check (slot in ('top','mid','bottom')),
  img        text not null,              -- तस्वीर का पूरा URL
  href       text not null,              -- टैप करने पर कहाँ जाए (tel: या https:)
  alt        text not null default '',   -- दुकान का नाम
  active     boolean not null default true,
  sort       int not null default 0,     -- एक ही जगह पर कई हों तो क्रम
  note       text,                       -- आपके लिए: कितने पैसे, कब तक — किसी को नहीं दिखता
  created_at timestamptz not null default now()
);

create index if not exists sponsors_slot_idx on public.sponsors (slot, active, sort);

alter table public.sponsors enable row level security;

-- सब पढ़ सकते हैं, पर सिर्फ़ चालू बैनर
drop policy if exists sponsors_read on public.sponsors;
create policy sponsors_read on public.sponsors
  for select to anon, authenticated using (active = true);

-- लिखने का हक़ सिर्फ़ लॉगिन किए हुए को (यानी सिर्फ़ आपको — खाता एक ही बनेगा)
drop policy if exists sponsors_write on public.sponsors;
create policy sponsors_write on public.sponsors
  for all to authenticated using (true) with check (true);

-- लॉगिन किया हुआ व्यक्ति बंद बैनर भी देख सके (admin सूची के लिए)
drop policy if exists sponsors_read_all on public.sponsors;
create policy sponsors_read_all on public.sponsors
  for select to authenticated using (true);

-- ── तस्वीरों के लिए जगह ──────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('sponsors', 'sponsors', true)
on conflict (id) do update set public = true;

drop policy if exists sponsor_img_read on storage.objects;
create policy sponsor_img_read on storage.objects
  for select to anon, authenticated using (bucket_id = 'sponsors');

drop policy if exists sponsor_img_write on storage.objects;
create policy sponsor_img_write on storage.objects
  for insert to authenticated with check (bucket_id = 'sponsors');

drop policy if exists sponsor_img_del on storage.objects;
create policy sponsor_img_del on storage.objects
  for delete to authenticated using (bucket_id = 'sponsors');
