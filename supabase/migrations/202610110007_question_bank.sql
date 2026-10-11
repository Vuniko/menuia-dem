begin;set local lock_timeout='5s';set local statement_timeout='30s';
create table public.training_question_banks(
 restaurant_id uuid primary key references public.restaurants(id),
 rows jsonb not null default '[]',previous_rows jsonb not null default '[]',
 updated_at timestamptz not null default now(),
 check(jsonb_typeof(rows)='array' and jsonb_array_length(rows)<=5000 and octet_length(rows::text)<=2000000),
 check(jsonb_typeof(previous_rows)='array' and jsonb_array_length(previous_rows)<=5000 and octet_length(previous_rows::text)<=2000000)
);
alter table public.training_question_banks enable row level security;
revoke all on public.training_question_banks from public,anon,authenticated;
grant select,insert,update on public.training_question_banks to authenticated;
create policy training_bank_read on public.training_question_banks for select to authenticated using(public.is_member(restaurant_id));
create policy training_bank_insert on public.training_question_banks for insert to authenticated with check(public.can_edit(restaurant_id));
create policy training_bank_update on public.training_question_banks for update to authenticated using(public.can_edit(restaurant_id)) with check(public.can_edit(restaurant_id));
create trigger training_bank_timestamp before update on public.training_question_banks for each row execute function public.kb_touch_updated_at();
create function public.kb_save_training_bank(r_id uuid,bank_rows jsonb,expected_updated_at timestamptz) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare bank public.training_question_banks;
begin
 if auth.uid() is null or not public.can_edit(r_id) then raise exception 'Editor required' using errcode='42501';end if;
 perform 1 from public.restaurants where id=r_id for update;
 select * into bank from public.training_question_banks where restaurant_id=r_id for update;
 if found then
  if expected_updated_at is null or bank.updated_at<>expected_updated_at then raise exception 'Bank changed' using errcode='P0002';end if;
  if bank.rows=bank_rows then return to_jsonb(bank);end if;
  update public.training_question_banks set previous_rows=rows,rows=bank_rows where restaurant_id=r_id returning * into bank;
 else
  if expected_updated_at is not null then raise exception 'Bank changed' using errcode='P0002';end if;
  insert into public.training_question_banks(restaurant_id,rows) values(r_id,bank_rows) returning * into bank;
 end if;
 return to_jsonb(bank);
end $$;
revoke all on function public.kb_save_training_bank(uuid,jsonb,timestamptz) from public,anon;
grant execute on function public.kb_save_training_bank(uuid,jsonb,timestamptz) to authenticated;
-- Recover the demo questions from the latest saved evaluation without inventing a bank.
insert into public.training_question_banks(restaurant_id,rows)
select j.restaurant_id,(select jsonb_agg(jsonb_build_object('question',q->>'question','answer',q->>'expected_answer','category',q->>'category','intent',q->>'category','variant','recuperada','source','Evaluación guardada','sourceRow',n+1,'reviewStatus','pendiente') order by n) from jsonb_array_elements(j.knowledge_snapshot->'questions') with ordinality as x(q,n))
from (select t.* from public.training_runs t join public.restaurants r on r.id=t.restaurant_id where r.slug='cerveceria-demo' and jsonb_typeof(t.knowledge_snapshot->'questions')='array' and jsonb_array_length(t.knowledge_snapshot->'questions')>0 order by t.created_at desc limit 1) j;
insert into public.menuia_kb_migrations(version) values('202610110007');
commit;
