begin;
create or replace function public.kb_reserve_assistant(r_id uuid,request_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare stamp timestamptz:=clock_timestamp();
begin
 if auth.uid() is null or not public.is_member(r_id) then raise exception 'Access denied' using errcode='42501'; end if;
 -- Lock the business row so different users/processes share one quota.
 perform 1 from public.restaurants where id=r_id for update;
 if exists(select 1 from public.kb_assistant_reservations q where q.restaurant_id=r_id and q.request_id=kb_reserve_assistant.request_id) then return false; end if;
 if (select count(*) from public.kb_assistant_reservations where restaurant_id=r_id and created_at>=date_trunc('day',stamp at time zone 'America/Lima') at time zone 'America/Lima')>=500 then return false; end if;
 if exists(select 1 from public.kb_assistant_reservations where restaurant_id=r_id and created_at>stamp-interval '5 seconds') then return false; end if;
 insert into public.kb_assistant_reservations values(r_id,request_id,auth.uid(),stamp);
 return true;
end $$;
insert into public.menuia_kb_migrations(version) values('202610110004');
commit;
