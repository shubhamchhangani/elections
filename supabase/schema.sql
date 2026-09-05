-- पोकरण नगर पालिका चुनाव 2026 — जनता की राय
-- Supabase SQL Editor में पूरा चिपकाकर एक बार "Run" करें।

-- ── समय की सीमाएँ (IST) ─────────────────────────────────────────
--  मतदान बंद : 07-09-2026 शाम 6:00 IST  = 2026-09-07 12:30 UTC
--  नतीजे खुलें: 09-09-2026 शाम 6:00 IST  = 2026-09-09 12:30 UTC
--  धारा 126 लोक प्रतिनिधित्व अधिनियम की 48-घंटे मौन अवधि।
create table if not exists public.config (
  key   text primary key,
  value timestamptz not null
);
insert into public.config(key, value) values
  ('freeze_at', '2026-09-07T12:30:00Z'),
  ('reveal_at', '2026-09-09T12:30:00Z')
on conflict (key) do nothing;

-- ── मत ──────────────────────────────────────────────────────────
--  ward 0 = अध्यक्ष वाला सवाल (choice: 'bjp' | 'inc' | 'ind')
--  ward 1..25 = वार्ड पार्षद (choice: प्रत्याशी का क्रमांक '1'..'6')
create table if not exists public.votes (
  id          bigint generated always as identity primary key,
  ward        smallint not null check (ward between 0 and 25),
  choice      text     not null check (char_length(choice) between 1 and 12),
  user_id     uuid     not null references auth.users(id) on delete cascade,
  device_hash text,
  ip_hash     text,
  created_at  timestamptz not null default now(),
  unique (ward, user_id)                    -- एक Google खाता = एक वोट
);

create index if not exists votes_ward_choice_idx on public.votes (ward, choice);
create index if not exists votes_device_idx      on public.votes (ward, device_hash);
create index if not exists votes_created_idx     on public.votes (created_at desc);

alter table public.votes  enable row level security;
alter table public.config enable row level security;
-- कोई सीधी पहुँच नहीं। सब कुछ नीचे के फंक्शन से होता है।
-- (कोई policy न होने का मतलब: anon/authenticated कुछ नहीं पढ़/लिख सकते)

-- ── सहायक ───────────────────────────────────────────────────────
create or replace function public.cfg(k text) returns timestamptz
language sql stable security definer set search_path = public as $$
  select value from public.config where key = k
$$;

create or replace function public.phase() returns text
language sql stable security definer set search_path = public as $$
  select case
    when now() <  public.cfg('freeze_at') then 'live'      -- मतदान चालू, नतीजे दिखते हैं
    when now() <  public.cfg('reveal_at') then 'frozen'    -- मौन अवधि: सब बंद
    else 'result'                                          -- नतीजे खुले, मतदान बंद
  end
$$;
grant execute on function public.phase() to anon, authenticated;

create or replace function public.client_ip_hash() returns text
language sql stable as $$
  select encode(sha256(convert_to(coalesce(
    split_part(nullif(current_setting('request.headers', true)::json->>'x-forwarded-for',''), ',', 1),
    'unknown') || ':pokaran2026', 'utf8')), 'hex')
$$;

-- ── मत डालना ────────────────────────────────────────────────────
create or replace function public.cast_vote(p_ward smallint, p_choice text, p_device text)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_ip   text := public.client_ip_hash();
  v_dev  int;
  v_ipc  int;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'code', 'no_auth');
  end if;

  if public.phase() <> 'live' then
    return json_build_object('ok', false, 'code', 'closed');
  end if;

  if p_ward < 0 or p_ward > 25 then
    return json_build_object('ok', false, 'code', 'bad_ward');
  end if;

  -- एक ही फ़ोन से 3 से ज़्यादा खाते नहीं (परिवार चल जाए, धांधली न चले)
  if p_device is not null then
    select count(distinct user_id) into v_dev
      from public.votes where ward = p_ward and device_hash = p_device;
    if v_dev >= 3 then
      return json_build_object('ok', false, 'code', 'device_limit');
    end if;
  end if;

  -- ढीली IP सीमा — CGNAT की वजह से सिर्फ़ सर्किट-ब्रेकर, पहचान नहीं
  select count(*) into v_ipc
    from public.votes
   where ward = p_ward and ip_hash = v_ip and created_at > now() - interval '1 hour';
  if v_ipc >= 40 then
    return json_build_object('ok', false, 'code', 'rate');
  end if;

  insert into public.votes (ward, choice, user_id, device_hash, ip_hash)
  values (p_ward, p_choice, v_uid, p_device, v_ip)
  on conflict (ward, user_id) do nothing;

  if not found then
    return json_build_object('ok', false, 'code', 'already',
      'choice', (select choice from public.votes where ward = p_ward and user_id = v_uid));
  end if;

  return json_build_object('ok', true, 'choice', p_choice);
end $$;
grant execute on function public.cast_vote(smallint, text, text) to authenticated;

-- ── गिनती ───────────────────────────────────────────────────────
create or replace function public.get_counts(p_ward smallint)
returns json
language plpgsql stable security definer set search_path = public as $$
declare v_phase text := public.phase(); v_rows json; v_total int;
begin
  select count(*) into v_total from public.votes where ward = p_ward;

  -- मौन अवधि में गिनती किसी को नहीं दिखती (धारा 126)
  if v_phase = 'frozen' then
    return json_build_object('phase', v_phase, 'total', null, 'counts', null);
  end if;

  select coalesce(json_object_agg(choice, c), '{}'::json) into v_rows
    from (select choice, count(*)::int c from public.votes where ward = p_ward group by choice) t;

  return json_build_object('phase', v_phase, 'total', v_total, 'counts', v_rows);
end $$;
grant execute on function public.get_counts(smallint) to anon, authenticated;

create or replace function public.my_vote(p_ward smallint)
returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('choice',
    (select choice from public.votes where ward = p_ward and user_id = auth.uid()))
$$;
grant execute on function public.my_vote(smallint) to authenticated;

-- होमपेज: हर वार्ड का कुल + अध्यक्ष वाला सवाल
create or replace function public.get_totals()
returns json
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
grant execute on function public.get_totals() to anon, authenticated;

-- ── निगरानी: सिर्फ़ आपके लिए, SQL Editor में चलाएँ ───────────────
--  संदिग्ध गतिविधि देखने के लिए:
--    select ward, device_hash, count(distinct user_id) u, count(*) v
--      from votes where device_hash is not null
--     group by 1,2 having count(*) > 2 order by v desc;
--
--    select date_trunc('minute', created_at) m, ward, count(*)
--      from votes group by 1,2 having count(*) > 25 order by 3 desc;
--
--  किसी वार्ड के फ़र्ज़ी वोट हटाने के लिए (सावधानी से):
--    delete from votes where ward = 5 and device_hash = '<hash>';
