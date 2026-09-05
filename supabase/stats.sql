-- /admin का डैशबोर्ड — Supabase SQL Editor में एक बार चलाएँ।
-- सिर्फ़ लॉगिन किए हुए (यानी आप) को दिखता है। anon को नहीं।

create or replace function public.admin_stats()
returns json
language plpgsql stable security definer set search_path = public as $$
declare v_wards json; v_hourly json; v_adh json; v_recent json;
begin
  -- हर वार्ड: कुल और किसको कितने
  select coalesce(json_agg(t order by t.ward), '[]'::json) into v_wards from (
    select ward,
           count(*)::int total,
           json_object_agg(choice, c) counts
      from (select ward, choice, count(*)::int c from public.votes where ward > 0 group by 1,2) x
     group by ward
  ) t;

  -- अध्यक्ष वाला सवाल
  select coalesce(json_object_agg(choice, c), '{}'::json) into v_adh
    from (select choice, count(*)::int c from public.votes where ward = 0 group by 1) y;

  -- पिछले 48 घंटे, हर घंटे (भारतीय समय)
  select coalesce(json_agg(t order by t.h), '[]'::json) into v_hourly from (
    select to_char(date_trunc('hour', created_at at time zone 'Asia/Kolkata'), 'DD/MM HH24:00') h,
           count(*)::int c,
           min(created_at) ord
      from public.votes
     where created_at > now() - interval '48 hours'
     group by 1 order by min(created_at)
  ) t;

  -- आख़िरी 60 मिनट
  select count(*)::int into strict v_recent from public.votes
   where created_at > now() - interval '60 minutes';

  return json_build_object(
    'grand',   (select count(*)::int from public.votes),
    'ward_votes', (select count(*)::int from public.votes where ward > 0),
    'last_hour', v_recent,
    'devices', (select count(distinct device_hash)::int from public.votes),
    'first',   (select min(created_at) from public.votes),
    'last',    (select max(created_at) from public.votes),
    'wards',   v_wards,
    'adhyaksh',v_adh,
    'hourly',  v_hourly
  );
end $$;

revoke execute on function public.admin_stats() from anon, public;
grant  execute on function public.admin_stats() to authenticated;
