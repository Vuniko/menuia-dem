-- OFFLINE ONLY. A finding reproduction, not an approval or migration.
-- All IDs and business data are synthetic. This file is not run remotely.
begin;
create temporary table oracle_fixture(r uuid,c uuid,p uuid,promo uuid);
insert into oracle_fixture values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid());
insert into public.restaurants(id,name,slug,published) select r,'Private offline fixture','private-probe-'||r::text,false from oracle_fixture;
insert into public.categories(id,restaurant_id,name,published) select c,r,'Private category',false from oracle_fixture;
insert into public.products(id,restaurant_id,category_id,name,price,available,published) select p,r,c,'Private product',10,false,false from oracle_fixture;
insert into public.promotions(id,restaurant_id,title,type,starts_at,ends_at,active,require_available)
 select promo,r,'Private promotion','combo',now()-interval '1 hour',now()+interval '1 hour',true,true from oracle_fixture;
insert into public.promotion_products(restaurant_id,promotion_id,product_id) select r,promo,p from oracle_fixture;
-- An RPC caller can supply a composite promotion value. Giving the fixture
-- candidate explicitly models this caller-controlled input, not row access.
create temporary table oracle_input(candidate public.promotions);
insert into oracle_input select promotions from public.promotions where id=(select promo from oracle_fixture);
do $$begin execute format('grant usage on schema %I to anon',(select nspname from pg_namespace where oid=pg_my_temp_schema()));end $$;
grant select on oracle_input to anon;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select count(*) as visible_private_promotions from public.promotions where title='Private promotion';
do $$begin
 if exists(select 1 from public.promotions where title='Private promotion') then raise exception 'Private fixture is visible';end if;
 if public.promotion_now((select candidate from oracle_input)) is distinct from false then raise exception 'Unavailable fixture unexpectedly current';end if;
end $$;
select 'anonymous RPC observes unavailable private product' as finding,public.promotion_now(candidate) as rpc_result from oracle_input;
reset role;
update public.products set available=true,published=true where id=(select p from oracle_fixture);
update public.categories set published=true where id=(select c from oracle_fixture);
-- Business stays unpublished: no new anonymous visibility is granted.
set local role anon;
select count(*) as visible_private_promotions from public.promotions where title='Private promotion';
select 'anonymous RPC changes result when private product state changes' as finding,public.promotion_now(candidate) as rpc_result from oracle_input;
do $$begin
 if exists(select 1 from public.promotions where title='Private promotion') then raise exception 'Private fixture is visible';end if;
 if public.promotion_now((select candidate from oracle_input)) is distinct from (current_setting('menuia.probe.expected_protected')<>'true') then raise exception 'Unexpected private-state result';end if;
end $$;
reset role;
-- A genuinely public promotion must retain its normal behavior.
update public.restaurants set published=true where id=(select r from oracle_fixture);
set local role anon;
do $$begin if public.promotion_now((select candidate from oracle_input)) is distinct from true then raise exception 'Public promotion broken';end if;end $$;
reset role;
rollback;
