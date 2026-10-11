-- Pilot-only tests. Transaction rollback leaves no identities or business records.
begin;
set local statement_timeout='30s';
create temporary table admin_fixture(k text primary key,v uuid not null);
insert into admin_fixture select k,gen_random_uuid() from unnest(array['user_a','user_b','a','b','cat_a','cat_b','prod_a','prod_b']) as k;
create temporary table admin_checks(label text primary key);
do $$ begin execute format('grant usage on schema %I to authenticated,anon',(select nspname from pg_namespace where oid=pg_my_temp_schema()));end $$;
grant select on admin_fixture to authenticated,anon;
grant select,insert on admin_checks to authenticated,anon;
create function pg_temp.admin_assert(ok boolean,label text) returns void language plpgsql as $$ begin
 if ok is distinct from true then raise exception 'FAILED: %',label;end if;insert into admin_checks values(label);end $$;
insert into auth.users(id,aud,role,email) select v,'authenticated','authenticated','admin-test-'||v::text||'@example.invalid' from admin_fixture where k in ('user_a','user_b');
insert into public.restaurants(id,name,slug) values
 ((select v from admin_fixture where k='a'),'Admin Test A','admin-test-a-'||(select v from admin_fixture where k='a')::text),
 ((select v from admin_fixture where k='b'),'Admin Test B','admin-test-b-'||(select v from admin_fixture where k='b')::text);
insert into public.restaurant_members(restaurant_id,user_id,role) values
 ((select v from admin_fixture where k='a'),(select v from admin_fixture where k='user_a'),'owner'),
 ((select v from admin_fixture where k='b'),(select v from admin_fixture where k='user_b'),'owner');
insert into public.categories(id,restaurant_id,name) values
 ((select v from admin_fixture where k='cat_a'),(select v from admin_fixture where k='a'),'Comidas'),
 ((select v from admin_fixture where k='cat_b'),(select v from admin_fixture where k='b'),'Comidas');
insert into public.products(id,restaurant_id,category_id,name,price) values
 ((select v from admin_fixture where k='prod_a'),(select v from admin_fixture where k='a'),(select v from admin_fixture where k='cat_a'),'Producto A',25),
 ((select v from admin_fixture where k='prod_b'),(select v from admin_fixture where k='b'),(select v from admin_fixture where k='cat_b'),'Producto B',99);
select set_config('request.jwt.claim.sub',(select v::text from admin_fixture where k='user_a'),true);
set local role authenticated;
do $$ declare created jsonb;saved jsonb;rid uuid:=(select v from admin_fixture where k='a');pid uuid;stamp timestamptz;begin
 created=public.kb_create_restaurant('Cervecería Demo','admin-test-created-'||gen_random_uuid()::text);
 perform pg_temp.admin_assert(exists(select 1 from public.restaurant_members where restaurant_id=(created->>'id')::uuid and user_id=auth.uid() and role='owner'),'new business assigns authenticated owner');
 perform pg_temp.admin_assert(not (created->>'published')::boolean,'new business starts unpublished');
 saved=public.kb_save_promotion(rid,null,null,array[(select v from admin_fixture where k='prod_a')],
  'Combo', 'Promoción ficticia', 'combo','Solo prueba',30,now()-interval '1 hour',now()+interval '1 hour','{}'::integer[],null::time,null::time,true,true);
 pid=(saved->>'id')::uuid;stamp=(saved->>'updated_at')::timestamptz;
 perform pg_temp.admin_assert(exists(select 1 from public.promotion_products where restaurant_id=rid and promotion_id=pid and product_id=(select v from admin_fixture where k='prod_a')),'promotion saves participating products');
 begin
  perform public.kb_save_promotion(rid,pid,stamp,array[(select v from admin_fixture where k='prod_b')],
   'Invalid','Attempted cross business','combo','',1,now()-interval '1 hour',now()+interval '1 hour','{}'::integer[],null::time,null::time,true,true);
  raise exception 'FAILED: cross-business promotion product accepted';
 exception when foreign_key_violation then insert into admin_checks values('cross-business promotion product rejected');end;
 perform pg_temp.admin_assert((select price from public.promotions where id=pid)=30,'failed link update preserves promotion price');
 perform pg_temp.admin_assert(exists(select 1 from public.promotion_products where promotion_id=pid and product_id=(select v from admin_fixture where k='prod_a')),'failed link update preserves original products');
 begin
  perform public.kb_save_promotion(rid,pid,stamp-interval '1 second','{}'::uuid[],
   'Stale','','combo','',1,now()-interval '1 hour',now()+interval '1 hour','{}'::integer[],null::time,null::time,true,true);
  raise exception 'FAILED: stale promotion edit accepted';
 exception when no_data_found then insert into admin_checks values('stale promotion edit rejected');end;
 begin
  perform public.kb_save_promotion((select v from admin_fixture where k='b'),null,null,'{}'::uuid[],
   'Intrusion','','combo','',1,now()-interval '1 hour',now()+interval '1 hour','{}'::integer[],null::time,null::time,true,true);
  raise exception 'FAILED: promotion in other business accepted';
 exception when insufficient_privilege then insert into admin_checks values('other business promotion write denied');end;
 saved=public.kb_save_promotion(rid,pid,stamp,array[(select v from admin_fixture where k='prod_a')],
  'Vencida','','combo','',30,now()-interval '2 days',now()-interval '1 day','{}'::integer[],null::time,null::time,true,true);
 perform pg_temp.admin_assert(not public.promotion_now((select p from public.promotions p where id=pid)),'expired promotion is never current');
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$ begin
 begin perform public.kb_create_restaurant('Intrusion','forbidden-anon');raise exception 'FAILED: anonymous restaurant creation';
 exception when insufficient_privilege then insert into admin_checks values('anonymous restaurant creation denied');end;
end $$;
reset role;
select 'PASS: '||count(*)||' admin checks; synthetic data rolled back' as result from admin_checks;
rollback;
