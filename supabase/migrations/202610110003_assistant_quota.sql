-- Preview pilot only. Atomic reservations across server instances.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
create table public.kb_assistant_reservations (
 restaurant_id uuid not null references public.restaurants(id),
 request_id uuid not null,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 primary key(restaurant_id,request_id)
);
create index kb_assistant_daily on public.kb_assistant_reservations(restaurant_id,created_at);
alter table public.kb_assistant_reservations enable row level security;
revoke all on public.kb_assistant_reservations from public,anon,authenticated;
create function public.kb_reserve_assistant(r_id uuid,request_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare stamp timestamptz:=clock_timestamp();
begin
 if auth.uid() is null or not public.is_member(r_id) then raise exception 'Access denied' using errcode='42501'; end if;
 -- Lock the business row so different users/processes share one quota.
 perform 1 from public.restaurants where id=r_id for update;
 if exists(select 1 from public.kb_assistant_reservations q where q.restaurant_id=r_id and q.request_id=kb_reserve_assistant.request_id) then return false; end if;
 if (select count(*) from public.kb_assistant_reservations where restaurant_id=r_id and created_at>=date_trunc('day',stamp at time zone 'America/Lima') at time zone 'America/Lima')>=20 then return false; end if;
 if exists(select 1 from public.kb_assistant_reservations where restaurant_id=r_id and created_at>stamp-interval '45 seconds') then return false; end if;
 insert into public.kb_assistant_reservations values(r_id,request_id,auth.uid(),stamp);
 return true;
end $$;
revoke all on function public.kb_reserve_assistant(uuid,uuid) from public,anon;
grant execute on function public.kb_reserve_assistant(uuid,uuid) to authenticated;
insert into public.menuia_kb_migrations(version) values('202610110003');
commit;
