-- पोकरण नगर पालिका चुनाव 2026 — जनता की राय
-- बिना लॉगिन वाला संस्करण। Supabase SQL Editor में पूरा चिपकाकर एक बार "Run" करें।
--
-- ⚠️ यह फ़ाइल किसी भी हालत से चलती है — खाली डेटाबेस हो या पुराना schema पड़ा हो।
--    दोबारा चलाने पर सारे वोट मिट जाएँगे (लॉन्च से पहले यही चाहिए)।

-- ── पुरानी चीज़ें हटाएँ ──────────────────────────────────────────
drop view     if exists public.shak;
drop function if exists public.get_counts(smallint);
drop function if exists public.get_counts(smallint, uuid);
drop function if exists public.get_totals();
drop function if exists public.my_vote(smallint);
drop function if exists public.cast_vote(smallint, text, text);
drop function if exists public.cast_vote(smallint, text, uuid, text, text);
drop function if exists public.client_ip_hash();
drop function if exists public.cfg(text);
drop function if exists public.phase();
drop table    if exists public.votes cascade;

-- ── समय की सीमाएँ (UTC में; IST = UTC + 5:30) ───────────────────
--  मतदान (असली)  : 11-09-2026, सुबह 7 – शाम 6  (पोकरण दूसरे चरण में है)
--  मतदान बंद   : 09-09-2026 शाम 6:00 IST = 2026-09-09 12:30 UTC
--  नतीजे खुलें : 11-09-2026 शाम 6:00 IST = 2026-09-11 12:30 UTC
--  धारा 126 लोक प्रतिनिधित्व अधिनियम की 48-घंटे मौन अवधि।
create table if not exists public.config (
  key text primary key,
  value timestamptz not null
);
insert into public.config(key, value) values
  ('freeze_at', '2026-09-09T12:30:00Z'),
  ('reveal_at', '2026-09-11T12:30:00Z')
on conflict (key) do nothing;

-- ── मत ──────────────────────────────────────────────────────────
--  ward 0 = अध्यक्ष वाला सवाल (choice: 'bjp' | 'inc' | 'ind')
--  ward 1..25 = वार्ड पार्षद (choice: प्रत्याशी का क्रमांक '1'..'6')
create table public.votes (
  id           bigint generated always as identity primary key,
  ward         smallint not null check (ward between 0 and 25),
  choice       text     not null check (char_length(choice) between 1 and 12),
  voter_token  uuid     not null,          -- ब्राउज़र में रखा गया पहचान-टोकन
  device_hash  text     not null,          -- फ़िंगरप्रिंट
  ip_hash      text,
  created_at   timestamptz not null default now(),
  unique (ward, voter_token)               -- परत 2: एक ब्राउज़र = एक वोट
);

create index votes_ward_choice_idx on public.votes (ward, choice);
create index votes_device_idx      on public.votes (ward, device_hash);
create index votes_ip_idx          on public.votes (ward, ip_hash, created_at desc);
create index votes_created_idx     on public.votes (created_at desc);

alter table public.votes  enable row level security;
alter table public.config enable row level security;
-- कोई policy नहीं = anon key से न पढ़ा जा सकता है न लिखा जा सकता है।
-- लिखना सिर्फ़ Edge Function (service_role) से। पढ़ना सिर्फ़ नीचे के फंक्शन से।

-- ── समय ─────────────────────────────────────────────────────────
create or replace function public.phase() returns text
language sql stable security definer set search_path = public as $$
  select case
    when now() < (select value from public.config where key='freeze_at') then 'live'
    when now() < (select value from public.config where key='reveal_at') then 'frozen'
    else 'result'
  end
$$;
grant execute on function public.phase() to anon;

-- ── मत डालना — सिर्फ़ Edge Function इसे बुलाता है ────────────────
create or replace function public.cast_vote(
  p_ward smallint, p_choice text, p_token uuid, p_device text, p_ip text
) returns json
language plpgsql security definer set search_path = public as $$
declare v_dev int; v_ipc int;
begin
  if public.phase() <> 'live' then
    return json_build_object('ok', false, 'code', 'closed');
  end if;
  if p_ward < 0 or p_ward > 25 then
    return json_build_object('ok', false, 'code', 'bad_ward');
  end if;

  -- परत 3: एक फ़ोन से इस वार्ड में अधिकतम 3 वोट
  -- (फ़िंगरप्रिंट कभी-कभी दो असली लोगों का एक जैसा निकलता है, इसलिए 1 नहीं 3)
  select count(*) into v_dev from public.votes
   where ward = p_ward and device_hash = p_device;
  if v_dev >= 3 then
    return json_build_object('ok', false, 'code', 'device_limit');
  end if;

  -- परत 4: बहुत ढीली IP सीमा। पोकरण में Jio/Airtel के CGNAT की वजह से
  -- सैकड़ों लोग एक ही IP साझा करते हैं — कड़ी सीमा असली मतदाताओं को रोक देती है।
  -- बॉट Turnstile पहले ही रोक देता है, इसलिए यह सिर्फ़ बाढ़ रोकने का ब्रेक है।
  select count(*) into v_ipc from public.votes
   where ward = p_ward and ip_hash = p_ip and created_at > now() - interval '1 hour';
  if v_ipc >= 400 then
    return json_build_object('ok', false, 'code', 'rate');
  end if;

  insert into public.votes (ward, choice, voter_token, device_hash, ip_hash)
  values (p_ward, p_choice, p_token, p_device, p_ip)
  on conflict (ward, voter_token) do nothing;

  if not found then
    return json_build_object('ok', false, 'code', 'already',
      'choice', (select choice from public.votes where ward = p_ward and voter_token = p_token));
  end if;
  return json_build_object('ok', true, 'choice', p_choice);
end $$;
revoke execute on function public.cast_vote(smallint, text, uuid, text, text) from anon, authenticated, public;

-- ── गिनती (सबके लिए पढ़ने योग्य) ─────────────────────────────────
create or replace function public.get_counts(p_ward smallint, p_token uuid default null)
returns json
language plpgsql stable security definer set search_path = public as $$
declare v_phase text := public.phase(); v_rows json; v_total int; v_mine text;
begin
  select count(*) into v_total from public.votes where ward = p_ward;

  if p_token is not null then
    select choice into v_mine from public.votes where ward = p_ward and voter_token = p_token;
  end if;

  -- मौन अवधि में गिनती सर्वर से बाहर ही नहीं निकलती (धारा 126)
  if v_phase = 'frozen' then
    return json_build_object('phase', v_phase, 'total', null, 'counts', null, 'mine', v_mine);
  end if;

  select coalesce(json_object_agg(choice, c), '{}'::json) into v_rows
    from (select choice, count(*)::int c from public.votes where ward = p_ward group by choice) t;

  return json_build_object('phase', v_phase, 'total', v_total, 'counts', v_rows, 'mine', v_mine);
end $$;
grant execute on function public.get_counts(smallint, uuid) to anon;

create or replace function public.get_totals() returns json
language plpgsql stable security definer set search_path = public as $$
declare v_phase text := public.phase(); v_w json; v_a json;
begin
  if v_phase = 'frozen' then
    return json_build_object('phase', v_phase, 'wards', null, 'adhyaksh', null, 'grand', null);
  end if;
  select coalesce(json_object_agg(ward, c), '{}'::json) into v_w
    from (select ward, count(*)::int c from public.votes where ward > 0 group by ward) t;
  select coalesce(json_object_agg(choice, c), '{}'::json) into v_a
    from (select choice, count(*)::int c from public.votes where ward = 0 group by choice) t;
  return json_build_object('phase', v_phase, 'wards', v_w, 'adhyaksh', v_a,
    'grand', (select count(*)::int from public.votes));
end $$;
grant execute on function public.get_totals() to anon;

-- ── निगरानी — SQL Editor में चलाएँ ───────────────────────────────
create or replace view public.shak as
  select ward, device_hash, count(*) vote, count(distinct voter_token) token,
         min(created_at) pehla, max(created_at) aakhri
    from public.votes group by 1,2 having count(*) > 1 order by 3 desc;

--  संदिग्ध फ़ोन:            select * from shak;
--  वोटों की अचानक बाढ़:     select date_trunc('minute',created_at) m, ward, count(*)
--                             from votes group by 1,2 having count(*)>25 order by 3 desc;
--  फ़र्ज़ी वोट हटाना:       delete from votes where ward=5 and device_hash='<hash>';
