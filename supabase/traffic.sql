-- साइट पर कितने लोग आए — अपना अपना हिसाब, Google Analytics के इंतज़ार के बिना।
-- Supabase SQL Editor में एक बार चलाएँ।

create table if not exists public.hits (
  id         bigint generated always as identity primary key,
  path       text not null,
  ref        text,                       -- कहाँ से आया: whatsapp / google / direct
  visitor    uuid,                       -- वही टोकन जो वोट में इस्तेमाल होता है
  created_at timestamptz not null default now()
);

create index if not exists hits_time_idx    on public.hits (created_at desc);
create index if not exists hits_path_idx    on public.hits (path, created_at desc);
create index if not exists hits_visitor_idx on public.hits (visitor, path, created_at desc);

alter table public.hits enable row level security;
-- कोई policy नहीं: anon न पढ़ सकता है न सीधे लिख सकता है। लिखना सिर्फ़ नीचे वाले फंक्शन से।

-- ── गिनती दर्ज करना ─────────────────────────────────────────────
create or replace function public.log_hit(p_path text, p_ref text, p_visitor uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_path is null or char_length(p_path) > 120 then return; end if;

  -- वही आदमी वही पन्ना 30 सेकंड में दोबारा खोले तो दोबारा मत गिनो
  if p_visitor is not null and exists (
    select 1 from public.hits
     where visitor = p_visitor and path = p_path
       and created_at > now() - interval '30 seconds'
  ) then return; end if;

  insert into public.hits (path, ref, visitor)
  values (left(p_path, 120), left(coalesce(p_ref, 'direct'), 40), p_visitor);
end $$;
grant execute on function public.log_hit(text, text, uuid) to anon, authenticated;

-- ── डैशबोर्ड के लिए ─────────────────────────────────────────────
create or replace function public.admin_traffic()
returns json
language plpgsql stable security definer set search_path = public as $$
declare v_win json; v_pages json; v_refs json; v_hourly json;
begin
  select json_agg(t order by t.mins) into v_win from (
    select 60 mins, 'पिछला 1 घंटा' label,
           count(*)::int hits, count(distinct visitor)::int uniq
      from public.hits where created_at > now() - interval '1 hour'
    union all
    select 360, 'पिछले 6 घंटे', count(*)::int, count(distinct visitor)::int
      from public.hits where created_at > now() - interval '6 hours'
    union all
    select 720, 'पिछले 12 घंटे', count(*)::int, count(distinct visitor)::int
      from public.hits where created_at > now() - interval '12 hours'
    union all
    select 1440, 'पिछले 24 घंटे', count(*)::int, count(distinct visitor)::int
      from public.hits where created_at > now() - interval '24 hours'
    union all
    select 999999, 'कुल', count(*)::int, count(distinct visitor)::int from public.hits
  ) t;

  select coalesce(json_agg(t order by t.hits desc), '[]'::json) into v_pages from (
    select path, count(*)::int hits, count(distinct visitor)::int uniq
      from public.hits where created_at > now() - interval '24 hours'
     group by path order by count(*) desc limit 12
  ) t;

  select coalesce(json_agg(t order by t.hits desc), '[]'::json) into v_refs from (
    select ref, count(*)::int hits
      from public.hits where created_at > now() - interval '24 hours'
     group by ref order by count(*) desc limit 8
  ) t;

  select coalesce(json_agg(t order by t.ord), '[]'::json) into v_hourly from (
    select to_char(date_trunc('hour', created_at at time zone 'Asia/Kolkata'), 'DD/MM HH24:00') h,
           count(*)::int c, min(created_at) ord
      from public.hits where created_at > now() - interval '48 hours'
     group by 1 order by min(created_at)
  ) t;

  return json_build_object('windows', v_win, 'pages', v_pages, 'refs', v_refs, 'hourly', v_hourly);
end $$;
revoke execute on function public.admin_traffic() from anon, public;
grant  execute on function public.admin_traffic() to authenticated;
