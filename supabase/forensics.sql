-- किसी एक वार्ड के अंदर हर प्रत्याशी का अलग-अलग फ़ॉरेंसिक ब्यौरा।
-- सिर्फ़ admin के लिए। Supabase SQL Editor में चलाएँ।

create or replace function public.admin_ward_forensics(p_ward smallint)
returns json
language plpgsql stable security definer set search_path = public as $$
declare v_by_choice json; v_bursts json;
begin
  -- हर प्रत्याशी: कुल वोट, अलग-अलग फ़ोन, अलग-अलग IP, पहला-आख़िरी वोट कब
  select coalesce(json_agg(t order by t.total desc), '[]'::json) into v_by_choice from (
    select choice,
           count(*)::int total,
           count(distinct device_hash)::int devices,
           count(distinct ip_hash)::int ips,
           min(created_at) pehla,
           max(created_at) aakhri
      from public.votes
     where ward = p_ward
     group by choice
  ) t;

  -- हर 10 मिनट में किस प्रत्याशी को कितने वोट — अचानक बाढ़ पकड़ने के लिए
  select coalesce(json_agg(t order by t.bucket, t.choice), '[]'::json) into v_bursts from (
    select choice,
           to_char(date_trunc('hour', created_at at time zone 'Asia/Kolkata')
                    + floor(extract(minute from created_at at time zone 'Asia/Kolkata')/10)*interval '10 min',
                   'DD/MM HH24:MI') bucket,
           count(*)::int c
      from public.votes
     where ward = p_ward
     group by 1, 2
    having count(*) >= 5   -- सिर्फ़ वे 10-मिनट के हिस्से जहाँ 5+ वोट किसी एक को मिले
  ) t;

  return json_build_object('ward', p_ward, 'by_choice', v_by_choice, 'bursts', v_bursts);
end $$;
revoke execute on function public.admin_ward_forensics(smallint) from anon, public;
grant execute on function public.admin_ward_forensics(smallint) to authenticated;

-- किसी वार्ड में किसी एक प्रत्याशी को हर IP से कितने वोट मिले — असली गिनती के लिए
create or replace function public.admin_ip_breakdown(p_ward smallint, p_choice text)
returns json
language plpgsql stable security definer set search_path = public as $$
declare v_rows json;
begin
  select coalesce(json_agg(t order by t.c desc), '[]'::json) into v_rows from (
    select ip_hash, count(*)::int c
      from public.votes
     where ward = p_ward and choice = p_choice
     group by ip_hash
  ) t;
  return json_build_object('ward', p_ward, 'choice', p_choice, 'ips', v_rows);
end $$;
revoke execute on function public.admin_ip_breakdown(smallint, text) from anon, public;
grant execute on function public.admin_ip_breakdown(smallint, text) to authenticated;

-- हर वार्ड के हर प्रत्याशी का वोट/IP अनुपात — एक साथ, पूरे चुनाव के लिए।
-- /admin के "धांधली की जाँच" में अपने आप दिखता है, दोबारा माँगना नहीं पड़ता।
create or replace function public.admin_candidate_fraud()
returns json
language plpgsql stable security definer set search_path = public as $$
declare v_rows json;
begin
  select coalesce(json_agg(t order by t.ratio desc), '[]'::json) into v_rows from (
    select ward, choice,
           count(*)::int total,
           count(distinct ip_hash)::int ips,
           round(count(*)::numeric / greatest(count(distinct ip_hash),1), 2) ratio
      from public.votes
     group by ward, choice
    having count(*) >= 15
       and count(*)::numeric / greatest(count(distinct ip_hash),1) >= 2.0
  ) t;
  return json_build_object('flags', v_rows);
end $$;
revoke execute on function public.admin_candidate_fraud() from anon, public;
grant execute on function public.admin_candidate_fraud() to authenticated;
