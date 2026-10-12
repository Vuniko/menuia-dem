-- REVIEW DRAFT ONLY: not a migration and not applied to Supabase.
-- Validate environment and dependencies before creating an approved migration.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
alter function public.touch_updated() set search_path='';
-- Public clients read published menus; they have no legitimate write path.
revoke insert,update,delete on public.restaurants,public.restaurant_members,
 public.categories,public.products,public.beer_details,public.promotions,
 public.promotion_products,public.restaurant_faqs,public.menu_views,
 public.ai_interactions,public.ai_usage,public.product_events from anon;
revoke all on public.rate_limits from anon,authenticated;

-- This function is called by public RLS. Do not revoke its EXECUTE blindly.
-- Bind caller-supplied values to a stored promotion in an accessible business.
create or replace function public.promotion_now(p public.promotions)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare
 wanted_id uuid:=p.id; wanted_restaurant uuid:=p.restaurant_id;
 local_now timestamp:=now() at time zone 'America/Lima';
 d integer:=extract(dow from local_now); tm time:=local_now::time;
begin
 if not (public.is_public(wanted_restaurant) or public.is_member(wanted_restaurant)) then return false;end if;
 select stored.* into p from public.promotions stored where stored.id=wanted_id and stored.restaurant_id=wanted_restaurant;
 if not found then return false;end if;
 if not p.active or now()<p.starts_at or now()>=p.ends_at then return false;end if;
 if p.start_time is not null then
  if p.start_time>p.end_time then
   if tm<p.end_time then d=(d+6)%7;elsif tm<p.start_time then return false;end if;
  elsif tm<p.start_time or tm>=p.end_time then return false;end if;
 end if;
 if cardinality(p.days)>0 and not d=any(p.days) then return false;end if;
 if p.require_available and exists(
  select 1 from public.promotion_products pp
  join public.products pr on pr.id=pp.product_id and pr.restaurant_id=pp.restaurant_id
  join public.categories c on c.id=pr.category_id and c.restaurant_id=pr.restaurant_id
  where pp.promotion_id=p.id and pp.restaurant_id=p.restaurant_id
   and (not pr.available or not pr.published or not c.published)
 ) then return false;end if;
 return true;
end $$;
commit;
