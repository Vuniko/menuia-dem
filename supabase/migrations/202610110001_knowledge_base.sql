-- MenuIA KB V1: additive migration for the audited menuia-piloto schema.
-- Run only on the development project secknmhqqzjlirwwnsnf.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$ begin
  if to_regclass('public.restaurants') is null or to_regclass('public.products') is null
    or to_regprocedure('public.is_member(uuid)') is null
    or to_regprocedure('public.can_edit(uuid)') is null then
    raise exception 'Existing MenuIA schema required; migration aborted';
  end if;
end $$;

create table public.menuia_kb_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);
alter table public.menuia_kb_migrations enable row level security;
revoke all on public.menuia_kb_migrations from public, anon, authenticated;

alter table public.restaurants
  add column business_type text not null default '',
  add column address text not null default '',
  add column phone text not null default '',
  add column whatsapp text not null default '',
  add column social_links jsonb not null default '{}'::jsonb,
  add column payment_methods text[] not null default '{}',
  add column payments_verified_at timestamptz,
  add column business_policies text not null default '',
  add constraint kb_social_links_object check (jsonb_typeof(social_links) = 'object'),
  add constraint kb_business_text_limits check (
    length(business_type)<=100 and length(address)<=500 and length(phone)<=50
    and length(whatsapp)<=50 and length(business_policies)<=5000
    and octet_length(social_links::text)<=5000 and cardinality(payment_methods)<=20
  );

-- Never infer verified stock or allergen safety from existing booleans/arrays.
alter table public.products
  add column availability_verified_at timestamptz,
  add column availability_valid_until timestamptz,
  add column allergens_verified_at timestamptz,
  add column ingredients_verified_at timestamptz,
  add constraint kb_stock_verification_window check (
    (availability_verified_at is null and availability_valid_until is null)
    or (availability_verified_at is not null and availability_valid_until is not null
      and availability_valid_until>availability_verified_at)
  );

-- Pairings use composite FKs rather than trusting an arbitrary array of UUIDs.
create table public.product_pairings (
  restaurant_id uuid not null references public.restaurants(id),
  product_id uuid not null,
  paired_product_id uuid not null,
  note text not null default '' check (length(note)<=1000),
  primary key (restaurant_id, product_id, paired_product_id),
  foreign key (product_id,restaurant_id) references public.products(id,restaurant_id),
  foreign key (paired_product_id,restaurant_id) references public.products(id,restaurant_id),
  check (product_id<>paired_product_id)
);

create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id),
  day_of_week smallint not null check (day_of_week between 0 and 6),
  opens_at time not null,
  closes_at time not null,
  closes_next_day boolean not null default false,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  check ((not closes_next_day and closes_at>opens_at)
    or (closes_next_day and closes_at<=opens_at)),
  unique (restaurant_id,day_of_week,opens_at)
);

create table public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id),
  title text not null check (length(btrim(title)) between 1 and 200),
  content text not null check (length(btrim(content)) between 1 and 12000),
  published boolean not null default false,
  active boolean not null default true,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id,restaurant_id)
);

create table public.training_runs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id),
  created_by uuid not null default auth.uid() references auth.users(id),
  idempotency_key uuid not null,
  status text not null default 'pending'
    check (status in ('pending','running','completed','cancelled','error')),
  question_count integer not null check (question_count between 1 and 10),
  knowledge_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(knowledge_snapshot)='object' and octet_length(knowledge_snapshot::text)<=200000),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id,restaurant_id),
  unique (restaurant_id,idempotency_key),
  check (completed_at is null or (started_at is not null and completed_at>=started_at))
);

create table public.training_results (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id),
  run_id uuid not null,
  ordinal smallint not null check (ordinal between 1 and 10),
  question text not null check (length(btrim(question)) between 1 and 500),
  category text not null default '' check (length(category)<=100),
  expected_answer text not null default '' check (length(expected_answer)<=10000),
  answer text not null default '' check (length(answer)<=10000),
  verdict text not null default 'review' check (verdict in ('pass','fail','review','error','cancelled')),
  critical boolean not null default false,
  reason text not null default '' check (length(reason)<=2000),
  suggested_correction text not null default '' check (length(suggested_correction)<=2000),
  provider text check (provider in ('structured','gemini','ollama')),
  model text check (length(model)<=100),
  latency_ms integer not null default 0 check (latency_ms>=0),
  facts_used jsonb not null default '{}'::jsonb
    check (jsonb_typeof(facts_used)='object' and octet_length(facts_used::text)<=200000),
  error_code text check (length(error_code)<=100),
  created_at timestamptz not null default now(),
  foreign key (run_id,restaurant_id) references public.training_runs(id,restaurant_id),
  unique (run_id,ordinal)
);

create index kb_documents_restaurant on public.knowledge_documents(restaurant_id,active,published);
create index kb_hours_restaurant on public.business_hours(restaurant_id,day_of_week);
create index kb_runs_restaurant_date on public.training_runs(restaurant_id,created_at desc);
create index kb_results_restaurant_run on public.training_results(restaurant_id,run_id);
create index kb_pairings_paired on public.product_pairings(restaurant_id,paired_product_id);

create function public.kb_touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at=now(); return new; end $$;
revoke all on function public.kb_touch_updated_at() from public,anon,authenticated;
create trigger kb_documents_updated before update on public.knowledge_documents
  for each row execute function public.kb_touch_updated_at();
create trigger kb_hours_updated before update on public.business_hours
  for each row execute function public.kb_touch_updated_at();

create function public.kb_protect_run() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (new.id,new.restaurant_id,new.created_by,new.idempotency_key,new.question_count,new.knowledge_snapshot,new.created_at)
    is distinct from (old.id,old.restaurant_id,old.created_by,old.idempotency_key,old.question_count,old.knowledge_snapshot,old.created_at) then
    raise exception 'Run identity and knowledge snapshot are immutable' using errcode='23514';
  end if;
  return new;
end $$;
revoke all on function public.kb_protect_run() from public,anon,authenticated;
create trigger kb_run_identity before update on public.training_runs
  for each row execute function public.kb_protect_run();

create function public.kb_check_result() returns trigger
language plpgsql set search_path = '' as $$
declare max_ordinal integer;
begin
  if tg_op='UPDATE' and (new.id,new.restaurant_id,new.run_id,new.ordinal,new.question,new.created_at)
    is distinct from (old.id,old.restaurant_id,old.run_id,old.ordinal,old.question,old.created_at) then
    raise exception 'Result identity and question are immutable' using errcode='23514';
  end if;
  select question_count into max_ordinal from public.training_runs
    where id=new.run_id and restaurant_id=new.restaurant_id;
  -- Missing/inaccessible parent is rejected by the composite FK.
  if max_ordinal is not null and new.ordinal>max_ordinal then
    raise exception 'Result exceeds run question count' using errcode='23514';
  end if;
  return new;
end $$;
revoke all on function public.kb_check_result() from public,anon,authenticated;
create trigger kb_result_identity before insert or update on public.training_results
  for each row execute function public.kb_check_result();

alter table public.product_pairings enable row level security;
alter table public.business_hours enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.training_runs enable row level security;
alter table public.training_results enable row level security;

revoke all on public.product_pairings,public.business_hours,public.knowledge_documents,
  public.training_runs,public.training_results from public,anon,authenticated;
grant select on public.product_pairings,public.business_hours,public.knowledge_documents to anon;
grant select,insert,update,delete on public.product_pairings,public.business_hours,public.knowledge_documents to authenticated;
grant select,insert,update on public.training_runs,public.training_results to authenticated;

create policy kb_pairings_read on public.product_pairings for select to authenticated
  using (public.is_member(restaurant_id));
create policy kb_pairings_public on public.product_pairings for select to anon,authenticated
  using (public.is_public(restaurant_id) and exists (
    select 1 from public.products p join public.categories c on c.id=p.category_id and c.restaurant_id=p.restaurant_id
    where p.restaurant_id=product_pairings.restaurant_id and p.id=product_pairings.product_id and p.published and c.published
  ) and exists (
    select 1 from public.products p join public.categories c on c.id=p.category_id and c.restaurant_id=p.restaurant_id
    where p.restaurant_id=product_pairings.restaurant_id and p.id=product_pairings.paired_product_id and p.published and c.published
  ));
create policy kb_pairings_write on public.product_pairings for all to authenticated
  using (public.can_edit(restaurant_id)) with check (public.can_edit(restaurant_id));

create policy kb_hours_read on public.business_hours for select to authenticated
  using (public.is_member(restaurant_id));
create policy kb_hours_public on public.business_hours for select to anon,authenticated
  using (active and public.is_public(restaurant_id));
create policy kb_hours_write on public.business_hours for all to authenticated
  using (public.can_edit(restaurant_id)) with check (public.can_edit(restaurant_id));

create policy kb_documents_read on public.knowledge_documents for select to authenticated
  using (public.is_member(restaurant_id));
create policy kb_documents_public on public.knowledge_documents for select to anon,authenticated
  using (active and published and public.is_public(restaurant_id));
create policy kb_documents_write on public.knowledge_documents for all to authenticated
  using (public.can_edit(restaurant_id)) with check (public.can_edit(restaurant_id));

create policy kb_runs_read on public.training_runs for select to authenticated using (public.is_member(restaurant_id));
create policy kb_runs_insert on public.training_runs for insert to authenticated
  with check (public.can_edit(restaurant_id) and created_by=auth.uid());
create policy kb_runs_update on public.training_runs for update to authenticated
  using (public.can_edit(restaurant_id)) with check (public.can_edit(restaurant_id));
create policy kb_results_read on public.training_results for select to authenticated using (public.is_member(restaurant_id));
create policy kb_results_insert on public.training_results for insert to authenticated with check (public.can_edit(restaurant_id));
create policy kb_results_update on public.training_results for update to authenticated
  using (public.can_edit(restaurant_id)) with check (public.can_edit(restaurant_id));

comment on table public.training_runs is 'Admin audit data. Max 10 questions per run; durable usage quotas must also be enforced by the evaluation API.';
comment on column public.products.availability_valid_until is 'Stock may be recommended only when available=true and both verification dates enclose server time.';
comment on column public.products.allergens_verified_at is 'Verification metadata does not certify absence of cross contamination.';
insert into public.menuia_kb_migrations(version) values ('202610110001');
commit;
