begin;set local statement_timeout='30s';
create temporary table bank_fixture(k text primary key,v uuid);
insert into bank_fixture select k,gen_random_uuid() from unnest(array['user','business','foreign']) k;
do $$ begin execute format('grant usage on schema %I to authenticated,anon',(select nspname from pg_namespace where oid=pg_my_temp_schema()));end $$;grant select on bank_fixture to authenticated,anon;
insert into auth.users(id,aud,role,email) select v,'authenticated','authenticated',v::text||'@example.invalid' from bank_fixture where k='user';
insert into public.restaurants(id,name,slug) select v,'Bank test',v::text from bank_fixture where k in('business','foreign');
insert into public.restaurant_members(restaurant_id,user_id,role) values((select v from bank_fixture where k='business'),(select v from bank_fixture where k='user'),'owner');
insert into public.training_question_banks(restaurant_id,rows) values((select v from bank_fixture where k='foreign'),'[{"question":"private foreign bank"}]');
select set_config('request.jwt.claim.sub',(select v::text from bank_fixture where k='user'),true);set local role authenticated;
do $$ declare r uuid:=(select v from bank_fixture where k='business');bank jsonb;stamp timestamptz;begin
 bank=public.kb_save_training_bank(r,'[{"question":"hola","answer":"saludo","original":{"extra":"conservar"}}]',null);stamp=(bank->>'updated_at')::timestamptz;
 if bank->'rows'->0->'original'->>'extra'<>'conservar' then raise exception 'Metadata lost';end if;
 bank=public.kb_save_training_bank(r,'[]',stamp);
 if jsonb_array_length(bank->'previous_rows')<>1 then raise exception 'Previous bank lost';end if;
 begin perform public.kb_save_training_bank(r,'[]',stamp-interval '1 second');raise exception 'Stale write accepted';exception when no_data_found then null;end;
 begin perform public.kb_save_training_bank((select v from bank_fixture where k='foreign'),'[]',null);raise exception 'Foreign write accepted';exception when insufficient_privilege then null;end;
 if exists(select 1 from public.training_question_banks where restaurant_id=(select v from bank_fixture where k='foreign')) then raise exception 'Foreign bank readable';end if;
end $$;
reset role;update public.restaurant_members set role='viewer' where restaurant_id=(select v from bank_fixture where k='business');set local role authenticated;
do $$ begin
 if not exists(select 1 from public.training_question_banks where restaurant_id=(select v from bank_fixture where k='business')) then raise exception 'Viewer cannot read own bank';end if;
 begin perform public.kb_save_training_bank((select v from bank_fixture where k='business'),'[]',null);raise exception 'Viewer write accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;set local role anon;
do $$ begin begin perform count(*) from public.training_question_banks;raise exception 'Anonymous bank readable';exception when insufficient_privilege then null;end;end $$;
reset role;select 'PASS: 8 bank checks; synthetic data rolled back' as result;rollback;
