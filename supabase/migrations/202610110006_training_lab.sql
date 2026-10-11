begin;
set local lock_timeout='5s';set local statement_timeout='30s';
create function public.kb_start_training(r_id uuid,key_id uuid,snapshot jsonb,questions jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare job public.training_runs;item jsonb;n integer:=0;
begin
 if auth.uid() is null or not public.can_edit(r_id) then raise exception 'Editor required' using errcode='42501';end if;
 if jsonb_typeof(questions)<>'array' or jsonb_array_length(questions) not between 1 and 10 then raise exception 'Invalid batch';end if;
 perform 1 from public.restaurants where id=r_id for update;
 select * into job from public.training_runs where restaurant_id=r_id and idempotency_key=key_id;
 if found then return to_jsonb(job);end if;
 if exists(select 1 from public.training_runs where restaurant_id=r_id and status in('pending','running') and started_at>clock_timestamp()-interval '10 minutes') then raise exception 'Active batch' using errcode='P0001';end if;
 if (select count(*) from public.training_runs where restaurant_id=r_id and created_at>=date_trunc('day',now() at time zone 'America/Lima') at time zone 'America/Lima')>=50 then raise exception 'Daily batch limit' using errcode='P0001';end if;
 insert into public.training_runs(restaurant_id,idempotency_key,question_count,knowledge_snapshot,started_at) values(r_id,key_id,jsonb_array_length(questions),snapshot,clock_timestamp()) returning * into job;
 for item in select value from jsonb_array_elements(questions) loop n:=n+1;
  insert into public.training_results(restaurant_id,run_id,ordinal,question,expected_answer,category) values(r_id,job.id,n,item->>'question',coalesce(item->>'expected_answer',''),coalesce(item->>'category',''));
 end loop;
 return to_jsonb(job);
end $$;
create function public.kb_claim_training(r_id uuid,run_id uuid,question_ordinal integer) returns boolean
language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or not public.can_edit(r_id) then raise exception 'Editor required' using errcode='42501';end if;
 perform 1 from public.training_runs j where j.restaurant_id=r_id and j.id=kb_claim_training.run_id and j.status in('pending','running') and j.started_at>clock_timestamp()-interval '10 minutes' for update;
 if not found then return false;end if;
 if exists(select 1 from public.training_results t where t.run_id=kb_claim_training.run_id and t.restaurant_id=r_id and t.error_code='running') then return false;end if;
 update public.training_results t set error_code='running' where t.restaurant_id=r_id and t.run_id=kb_claim_training.run_id and t.ordinal=question_ordinal and t.error_code is null and t.answer='' and t.provider is null and t.verdict='review';
 if not found then return false;end if;
 update public.training_runs j set status='running' where j.restaurant_id=r_id and j.id=kb_claim_training.run_id;
 return true;
end $$;
create function public.kb_finish_training(r_id uuid,run_id uuid,question_ordinal integer,result_values jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare saved public.training_results;
begin
 if auth.uid() is null or not public.can_edit(r_id) then raise exception 'Editor required' using errcode='42501';end if;
 perform 1 from public.training_runs j where j.restaurant_id=r_id and j.id=kb_finish_training.run_id for update;
 update public.training_results t set answer=result_values->>'answer',provider=result_values->>'provider',model=result_values->>'model',verdict=result_values->>'verdict',error_code=result_values->>'error_code',reason=result_values->>'reason',latency_ms=(result_values->>'latency_ms')::integer
 where t.restaurant_id=r_id and t.run_id=kb_finish_training.run_id and t.ordinal=question_ordinal and t.error_code='running' returning t.* into saved;
 if not found then raise exception 'Question not claimed';end if;
 if not exists(select 1 from public.training_results t where t.restaurant_id=r_id and t.run_id=kb_finish_training.run_id and (t.error_code='running' or (t.answer='' and t.verdict='review'))) then
  update public.training_runs j set status='completed',completed_at=clock_timestamp() where j.restaurant_id=r_id and j.id=kb_finish_training.run_id and j.status in('pending','running');
 end if;
 return to_jsonb(saved);
end $$;
revoke all on function public.kb_start_training(uuid,uuid,jsonb,jsonb),public.kb_claim_training(uuid,uuid,integer),public.kb_finish_training(uuid,uuid,integer,jsonb) from public,anon;
grant execute on function public.kb_start_training(uuid,uuid,jsonb,jsonb),public.kb_claim_training(uuid,uuid,integer),public.kb_finish_training(uuid,uuid,integer,jsonb) to authenticated;
insert into public.menuia_kb_migrations(version) values('202610110006');
commit;
