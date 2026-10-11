-- Development only. All synthetic users/data are rolled back, even on success.
begin;
set local statement_timeout='30s';
create temporary table kb_fixture(k text primary key, v uuid not null);
insert into kb_fixture(k,v) select k,gen_random_uuid() from unnest(array['user_a','user_b','viewer','restaurant_a','restaurant_b','category_a','category_b','product_a','product_b','document_a','document_b','run_a','run_b']) as k;
create temporary table kb_checks(label text primary key);
do $$ begin
  execute format('grant usage on schema %I to authenticated,anon',
    (select nspname from pg_namespace where oid=pg_my_temp_schema()));
end $$;
grant select on kb_fixture to authenticated,anon;
grant select,insert on kb_checks to authenticated,anon;
create function pg_temp.kb_assert(ok boolean,label text) returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'FAILED: %',label; end if;
  insert into kb_checks values(label);
end $$;

insert into auth.users(id,aud,role,email)
  select v,'authenticated','authenticated','kb-'||v::text||'@example.invalid'
  from kb_fixture where k in ('user_a','user_b','viewer');
insert into public.restaurants(id,slug,name,published) values
  ((select v from kb_fixture where k='restaurant_a'),'kb-a-'||(select v from kb_fixture where k='restaurant_a')::text,'Cervecería Demo A',false),
  ((select v from kb_fixture where k='restaurant_b'),'kb-b-'||(select v from kb_fixture where k='restaurant_b')::text,'Cervecería Demo B',false);
insert into public.restaurant_members(restaurant_id,user_id,role) values
  ((select v from kb_fixture where k='restaurant_a'),(select v from kb_fixture where k='user_a'),'owner'),
  ((select v from kb_fixture where k='restaurant_b'),(select v from kb_fixture where k='user_b'),'owner'),
  ((select v from kb_fixture where k='restaurant_a'),(select v from kb_fixture where k='viewer'),'viewer');
insert into public.categories(id,restaurant_id,name,published) values
  ((select v from kb_fixture where k='category_a'),(select v from kb_fixture where k='restaurant_a'),'Comidas',true),
  ((select v from kb_fixture where k='category_b'),(select v from kb_fixture where k='restaurant_b'),'Comidas',true);
insert into public.products(id,restaurant_id,category_id,name,price,published,available) values
  ((select v from kb_fixture where k='product_a'),(select v from kb_fixture where k='restaurant_a'),(select v from kb_fixture where k='category_a'),'Hamburguesa clásica',25,true,true),
  ((select v from kb_fixture where k='product_b'),(select v from kb_fixture where k='restaurant_b'),(select v from kb_fixture where k='category_b'),'Hamburguesa clásica',99,true,true);
insert into public.knowledge_documents(id,restaurant_id,title,content,published) values
  ((select v from kb_fixture where k='document_a'),(select v from kb_fixture where k='restaurant_a'),'Documento A','Dato privado A',false),
  ((select v from kb_fixture where k='document_b'),(select v from kb_fixture where k='restaurant_b'),'Documento B','Dato privado B',false);

select set_config('request.jwt.claim.sub',(select v::text from kb_fixture where k='user_a'),true);
set local role authenticated;
select pg_temp.kb_assert((select count(*) from public.products where id=(select v from kb_fixture where k='product_a'))=1,'owner reads own product');
select pg_temp.kb_assert((select count(*) from public.products where id=(select v from kb_fixture where k='product_b'))=0,'owner cannot read private product B');
select pg_temp.kb_assert((select count(*) from public.knowledge_documents where id=(select v from kb_fixture where k='document_b'))=0,'owner cannot read private document B');
update public.products set price=26 where id=(select v from kb_fixture where k='product_a');
select pg_temp.kb_assert((select price from public.products where id=(select v from kb_fixture where k='product_a'))=26,'owner changes own price');
update public.products set price=1 where id=(select v from kb_fixture where k='product_b');
select pg_temp.kb_assert(not exists(select 1 from public.products where id=(select v from kb_fixture where k='product_b')),'cross-business update has no visible target');

do $$ begin
  begin
    insert into public.knowledge_documents(restaurant_id,title,content) values ((select v from kb_fixture where k='restaurant_b'),'Intrusion','Forbidden');
    raise exception 'FAILED: cross-business document insert';
  exception when insufficient_privilege then insert into kb_checks values('cross-business document insert denied'); end;
  begin
    insert into public.products(restaurant_id,category_id,name,price) values ((select v from kb_fixture where k='restaurant_a'),(select v from kb_fixture where k='category_b'),'Cross category',1);
    raise exception 'FAILED: cross-business category FK';
  exception when foreign_key_violation then insert into kb_checks values('cross-business category FK denied'); end;
  begin
    insert into public.product_pairings(restaurant_id,product_id,paired_product_id) values ((select v from kb_fixture where k='restaurant_a'),(select v from kb_fixture where k='product_a'),(select v from kb_fixture where k='product_b'));
    raise exception 'FAILED: cross-business pairing FK';
  exception when foreign_key_violation then insert into kb_checks values('cross-business pairing FK denied'); end;
end $$;
insert into public.training_runs(id,restaurant_id,idempotency_key,question_count) values
  ((select v from kb_fixture where k='run_a'),(select v from kb_fixture where k='restaurant_a'),gen_random_uuid(),1);
select pg_temp.kb_assert((select created_by from public.training_runs where id=(select v from kb_fixture where k='run_a'))=auth.uid(),'run records authenticated user');
do $$ begin
  begin
    update public.training_runs set knowledge_snapshot='{"changed":true}'::jsonb where id=(select v from kb_fixture where k='run_a');
    raise exception 'FAILED: run snapshot changed';
  exception when check_violation then insert into kb_checks values('run snapshot immutable'); end;
  begin
    insert into public.training_results(restaurant_id,run_id,ordinal,question) values ((select v from kb_fixture where k='restaurant_a'),(select v from kb_fixture where k='run_a'),2,'Beyond declared question count');
    raise exception 'FAILED: extra result accepted';
  exception when check_violation then insert into kb_checks values('result count constrained to run size'); end;
  begin
    insert into public.training_runs(restaurant_id,idempotency_key,question_count)
      select restaurant_id,idempotency_key,question_count from public.training_runs where id=(select v from kb_fixture where k='run_a');
    raise exception 'FAILED: duplicate run accepted';
  exception when unique_violation then insert into kb_checks values('duplicate run key denied'); end;
  begin
    insert into public.training_runs(restaurant_id,created_by,idempotency_key,question_count)
      values ((select v from kb_fixture where k='restaurant_a'),(select v from kb_fixture where k='user_b'),gen_random_uuid(),1);
    raise exception 'FAILED: impersonated run accepted';
  exception when insufficient_privilege then insert into kb_checks values('run creator impersonation denied'); end;
  begin
    update public.products set availability_verified_at=now(),availability_valid_until=now()-interval '1 minute'
      where id=(select v from kb_fixture where k='product_a');
    raise exception 'FAILED: invalid stock verification window';
  exception when check_violation then insert into kb_checks values('invalid stock verification window denied'); end;
end $$;
select pg_temp.kb_assert((select availability_verified_at is null from public.products where id=(select v from kb_fixture where k='product_a')),'existing stock remains unverified');
reset role;
select set_config('request.jwt.claim.sub',(select v::text from kb_fixture where k='user_b'),true);
set local role authenticated;
select pg_temp.kb_assert((select price from public.products where id=(select v from kb_fixture where k='product_b'))=99,'business B price unchanged');
select pg_temp.kb_assert(not exists(select 1 from public.training_runs where id=(select v from kb_fixture where k='run_a')),'business B cannot read run A');
insert into public.training_runs(id,restaurant_id,idempotency_key,question_count) values
  ((select v from kb_fixture where k='run_b'),(select v from kb_fixture where k='restaurant_b'),gen_random_uuid(),1);
do $$ begin
  begin
    insert into public.training_results(restaurant_id,run_id,ordinal,question) values ((select v from kb_fixture where k='restaurant_b'),(select v from kb_fixture where k='run_a'),1,'Cross run');
    raise exception 'FAILED: cross-business result FK';
  exception when foreign_key_violation then insert into kb_checks values('cross-business result FK denied'); end;
end $$;

reset role;
select set_config('request.jwt.claim.sub',(select v::text from kb_fixture where k='viewer'),true);
set local role authenticated;
select pg_temp.kb_assert(exists(select 1 from public.knowledge_documents where id=(select v from kb_fixture where k='document_a')),'viewer reads own document');
do $$ begin
  begin
    insert into public.knowledge_documents(restaurant_id,title,content) values ((select v from kb_fixture where k='restaurant_a'),'Viewer edit','Forbidden');
    raise exception 'FAILED: viewer writes';
  exception when insufficient_privilege then insert into kb_checks values('viewer write denied'); end;
end $$;

reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.kb_assert(not exists(select 1 from public.knowledge_documents where id in (select v from kb_fixture where k in ('document_a','document_b'))),'anon cannot read private documents');
do $$ begin
  begin perform 1 from public.training_runs; raise exception 'FAILED: anon reads runs';
  exception when insufficient_privilege then insert into kb_checks values('anon cannot access training runs'); end;
end $$;
reset role;
update public.restaurants set published=true where id=(select v from kb_fixture where k='restaurant_a');
update public.knowledge_documents set published=true where id=(select v from kb_fixture where k='document_a');
set local role anon;
select pg_temp.kb_assert(exists(select 1 from public.knowledge_documents where id=(select v from kb_fixture where k='document_a')),'anon reads explicitly published document');
select pg_temp.kb_assert(not exists(select 1 from public.knowledge_documents where id=(select v from kb_fixture where k='document_b')),'private business B remains hidden');
reset role;
select 'PASS: '||count(*)||' checks; synthetic data rolled back' as result from kb_checks;
rollback;
