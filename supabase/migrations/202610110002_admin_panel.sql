-- Development pilot only. No changes to published MenuIA or existing RLS policies.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';

create function public.kb_create_restaurant(display_name text,requested_slug text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); created public.restaurants;
begin
  if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if length(btrim(display_name)) not between 1 and 200 or length(requested_slug)>100
    or requested_slug!~'^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Invalid restaurant' using errcode='22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,1));
  if (select count(*) from public.restaurant_members where user_id=uid and role='owner')>=10 then
    raise exception 'Development limit reached' using errcode='22023';
  end if;
  insert into public.restaurants(name,slug,published) values(btrim(display_name),requested_slug,false)
    returning * into created;
  insert into public.restaurant_members(restaurant_id,user_id,role) values(created.id,uid,'owner');
  return pg_catalog.to_jsonb(created);
end $$;
revoke all on function public.kb_create_restaurant(text,text) from public,anon,authenticated;
grant execute on function public.kb_create_restaurant(text,text) to authenticated;

-- Invoker permissions preserve RLS. Promotion and participating products change atomically.
create function public.kb_save_promotion(
 r_id uuid,p_id uuid,expected_updated_at timestamptz,selected_products uuid[],
 p_title text,p_description text,p_type text,p_conditions text,p_price numeric,
 p_starts_at timestamptz,p_ends_at timestamptz,p_days integer[],p_start_time time,
 p_end_time time,p_active boolean,p_require_available boolean
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare saved public.promotions; prod uuid;
begin
  if not public.can_edit(r_id) then raise exception 'Not authorized' using errcode='42501'; end if;
  if length(btrim(p_title)) not between 1 and 200 or length(p_description)>5000
    or length(p_conditions)>5000 or cardinality(selected_products)>30
    or selected_products is null or p_starts_at is null or p_ends_at is null
    or p_starts_at>=p_ends_at or p_price<0 or p_price>100000
    or p_price<>round(p_price,2)
    or ((p_start_time is null)<>(p_end_time is null))
    or (p_start_time is not null and p_start_time=p_end_time) then
    raise exception 'Invalid promotion' using errcode='22023';
  end if;
  if p_id is null then
    insert into public.promotions(restaurant_id,title,description,type,conditions,price,starts_at,ends_at,days,start_time,end_time,active,require_available)
      values(r_id,btrim(p_title),p_description,p_type,p_conditions,p_price,p_starts_at,p_ends_at,p_days,p_start_time,p_end_time,p_active,p_require_available)
      returning * into saved;
  else
    update public.promotions set title=btrim(p_title),description=p_description,type=p_type,
      conditions=p_conditions,price=p_price,starts_at=p_starts_at,ends_at=p_ends_at,days=p_days,
      start_time=p_start_time,end_time=p_end_time,active=p_active,require_available=p_require_available,updated_at=now()
      where id=p_id and restaurant_id=r_id and updated_at=expected_updated_at returning * into saved;
    if not found then raise exception 'Concurrent edit or missing promotion' using errcode='P0002'; end if;
  end if;
  delete from public.promotion_products where promotion_id=saved.id and restaurant_id=r_id;
  foreach prod in array selected_products loop
    if prod is null then raise exception 'Invalid product' using errcode='22023'; end if;
    insert into public.promotion_products(restaurant_id,promotion_id,product_id) values(r_id,saved.id,prod);
  end loop;
  return pg_catalog.to_jsonb(saved);
end $$;
revoke all on function public.kb_save_promotion(uuid,uuid,timestamptz,uuid[],text,text,text,text,numeric,timestamptz,timestamptz,integer[],time,time,boolean,boolean) from public,anon,authenticated;
grant execute on function public.kb_save_promotion(uuid,uuid,timestamptz,uuid[],text,text,text,text,numeric,timestamptz,timestamptz,integer[],time,time,boolean,boolean) to authenticated;
insert into public.menuia_kb_migrations(version) values('202610110002');
commit;
