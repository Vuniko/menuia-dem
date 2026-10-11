begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
-- Anonymous reservations have no auth identity. Data remains inaccessible directly.
alter table public.kb_assistant_reservations alter column created_by drop not null;
create function public.kb_reserve_public_assistant(r_id uuid,request_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare stamp timestamptz:=clock_timestamp();
begin
 perform 1 from public.restaurants where id=r_id and slug='cerveceria-demo' and published for update;
 if not found then raise exception 'Public demo required' using errcode='42501';end if;
 if exists(select 1 from public.kb_assistant_reservations q where q.restaurant_id=r_id and q.request_id=kb_reserve_public_assistant.request_id) then return false;end if;
 if (select count(*) from public.kb_assistant_reservations where restaurant_id=r_id and created_at>=date_trunc('day',stamp at time zone 'America/Lima') at time zone 'America/Lima')>=500 then return false;end if;
 if exists(select 1 from public.kb_assistant_reservations where restaurant_id=r_id and created_at>stamp-interval '5 seconds') then return false;end if;
 insert into public.kb_assistant_reservations values(r_id,request_id,null,stamp);
 return true;
end $$;
revoke all on function public.kb_reserve_public_assistant(uuid,uuid) from public;
grant execute on function public.kb_reserve_public_assistant(uuid,uuid) to anon;
insert into public.menuia_kb_migrations(version) values('202610110005');
commit;
