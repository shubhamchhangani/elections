-- 6 सितम्बर के सुधार — Supabase SQL Editor में पूरा एक साथ चलाएँ।

-- 1) sponsors टेबल अब सभी जगहों पर बैनर ले सकती है
alter table public.sponsors drop constraint if exists sponsors_slot_check;
alter table public.sponsors add constraint sponsors_slot_check
  check (slot in ('top','after','mid','bottom','stick','footer'));

-- 2) अध्यक्ष पेज के लिए — सार्वजनिक, हर वार्ड में कौन आगे (मौन अवधि में छुपा)
create or replace function public.ward_party_summary()
returns json
language plpgsql stable security definer set search_path = public as $$
declare v_phase text := public.phase(); v_wards json;
begin
  if v_phase = 'frozen' then
    return json_build_object('phase', v_phase, 'wards', null);
  end if;
  select coalesce(json_agg(t order by t.ward), '[]'::json) into v_wards from (
    select ward, sum(c)::int total, json_object_agg(choice, c) counts
      from (select ward, choice, count(*)::int c
              from public.votes where ward > 0 group by 1,2) x
     group by ward
  ) t;
  return json_build_object('phase', v_phase, 'wards', v_wards);
end $$;
grant execute on function public.ward_party_summary() to anon, authenticated;

-- 3) धांधली पकड़ने के लिए — सिर्फ़ admin के लिए
--    हर वार्ड में वोट बनाम अलग-अलग device बनाम अलग-अलग IP।
--    अगर वोट बहुत हों पर IP बहुत कम, तो शक की बात है (एक जगह से बाढ़)।
create or replace function public.admin_fraud_stats()
returns json
language plpgsql stable security definer set search_path = public as $$
declare v_wards json;
begin
  select coalesce(json_agg(t order by t.ward), '[]'::json) into v_wards from (
    select ward,
           count(*)::int total,
           count(distinct device_hash)::int devices,
           count(distinct ip_hash)::int ips
      from public.votes
     group by ward
  ) t;
  return json_build_object('wards', v_wards);
end $$;
revoke execute on function public.admin_fraud_stats() from anon, public;
grant execute on function public.admin_fraud_stats() to authenticated;
