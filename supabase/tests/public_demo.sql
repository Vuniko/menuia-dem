begin;
set local statement_timeout='30s';
create temporary table public_demo_fixture(id uuid,request_id uuid);
insert into public_demo_fixture select id,gen_random_uuid() from public.restaurants where slug='cerveceria-demo';
do $$ begin if (select count(*) from public_demo_fixture)<>1 then raise exception 'Demo required';end if;execute format('grant usage on schema %I to anon',(select nspname from pg_namespace where oid=pg_my_temp_schema()));end $$;
grant select on public_demo_fixture to anon;
update public.restaurants set published=true where id=(select id from public_demo_fixture);
-- Discarded inside this transaction; no real model calls or lasting changes.
update public.kb_assistant_reservations set created_at=clock_timestamp()-interval '6 seconds' where restaurant_id=(select id from public_demo_fixture);
set local role anon;
do $$ declare r uuid:=(select id from public_demo_fixture);q uuid:=(select request_id from public_demo_fixture);begin
 if public.kb_reserve_public_assistant(r,q) is distinct from true then raise exception 'First request denied';end if;
 if public.kb_reserve_public_assistant(r,q) is distinct from false then raise exception 'Duplicate allowed';end if;
 if public.kb_reserve_public_assistant(r,gen_random_uuid()) is distinct from false then raise exception 'Cooldown bypass';end if;
 begin perform public.kb_reserve_public_assistant(gen_random_uuid(),gen_random_uuid());raise exception 'Other business allowed';exception when insufficient_privilege then null;end;
 begin perform count(*) from public.kb_assistant_reservations;raise exception 'Reservations exposed';exception when insufficient_privilege then null;end;
end $$;
reset role;
update public.restaurants set published=false where id=(select id from public_demo_fixture);
set local role anon;
do $$ begin begin perform public.kb_reserve_public_assistant((select id from public_demo_fixture),gen_random_uuid());raise exception 'Draft allowed';exception when insufficient_privilege then null;end;end $$;
reset role;
select 'PASS: 6 public quota checks; all changes rolled back' as result;
rollback;
