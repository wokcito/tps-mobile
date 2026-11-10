-- Apply once to a fresh Supabase project. All geometry uses GeoJSON [longitude, latitude].
create extension if not exists pgcrypto;
create table public.organizations(id uuid primary key default gen_random_uuid(), name text not null, region text);
create table public.memberships(user_id uuid references auth.users on delete cascade, organization_id uuid references public.organizations on delete cascade, role text not null check(role in ('producer','operator','advisor')), primary key(user_id,organization_id));
create table public.plots(id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations, name text not null, crop text, geom jsonb not null check(geom->>'type'='Polygon'), threshold_min numeric not null default 25, threshold_max numeric not null default 45, check(threshold_min>=0 and threshold_max<=100 and threshold_min<=threshold_max));
create table public.stations(id uuid primary key default gen_random_uuid(),plot_id uuid not null references public.plots,name text not null,lat double precision not null,lng double precision not null);
create table public.readings(id uuid primary key default gen_random_uuid(),station_id uuid not null references public.stations,measured_at timestamptz not null,moisture_pct numeric not null check(moisture_pct between 0 and 100),temp_c numeric,rain_mm numeric check(rain_mm>=0),source text not null check(source in ('sensor','manual')),client_request_id uuid unique,note text,lat double precision,lng double precision,requested_by uuid references auth.users,unique(station_id,measured_at,source),check(source <> 'manual' or client_request_id is not null));
create index readings_station_measured on public.readings(station_id,measured_at desc);
create table public.valves(id uuid primary key default gen_random_uuid(),plot_id uuid not null references public.plots,name text not null,status text not null default 'closed' check(status in ('open','closed')),close_at timestamptz);
create table public.irrigation_commands(id uuid primary key default gen_random_uuid(),valve_id uuid not null references public.valves,requested_by uuid not null references auth.users,action text not null check(action in ('open','close')),duration_min integer check(duration_min between 1 and 120),status text not null default 'pending' check(status in ('pending','applied','failed','cancelled')),client_request_id uuid not null unique,created_at timestamptz not null default now(),applied_at timestamptz,failure_reason text,check(action='open' or duration_min is null));
create unique index one_pending_per_valve on public.irrigation_commands(valve_id) where status='pending';
create table public.alerts(id uuid primary key default gen_random_uuid(),plot_id uuid not null references public.plots,type text not null check(type in ('dry','stale')),payload jsonb not null default '{}',created_at timestamptz not null default now(),read_at timestamptz);
create unique index one_unread_alert on public.alerts(plot_id,type) where read_at is null;

create function public.has_membership(org uuid,write_access boolean default false) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from memberships where user_id=auth.uid() and organization_id=org and (not write_access or role in ('producer','operator'))) $$;
create function public.plot_access(plot uuid,write_access boolean default false) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from plots where id=plot and has_membership(organization_id,write_access)) $$;
create function public.station_access(station uuid,write_access boolean default false) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from stations where id=station and plot_access(plot_id,write_access)) $$;
create function public.valve_access(valve uuid,write_access boolean default false) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from valves where id=valve and plot_access(plot_id,write_access)) $$;

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.plots enable row level security;
alter table public.stations enable row level security;
alter table public.readings enable row level security;
alter table public.valves enable row level security;
alter table public.irrigation_commands enable row level security;
alter table public.alerts enable row level security;
create policy organizations_read on public.organizations for select to authenticated using(has_membership(id));
create policy memberships_read on public.memberships for select to authenticated using(user_id=auth.uid());
create policy plots_read on public.plots for select to authenticated using(has_membership(organization_id));
create policy plots_insert on public.plots for insert to authenticated with check(has_membership(organization_id,true));
create policy plots_update on public.plots for update to authenticated using(has_membership(organization_id,true)) with check(has_membership(organization_id,true));
create policy stations_read on public.stations for select to authenticated using(plot_access(plot_id));
create policy readings_read on public.readings for select to authenticated using(station_access(station_id));
create policy manual_insert on public.readings for insert to authenticated with check(source='manual' and requested_by=auth.uid() and station_access(station_id,true));
create policy valves_read on public.valves for select to authenticated using(plot_access(plot_id));
create policy commands_read on public.irrigation_commands for select to authenticated using(valve_access(valve_id));
create policy commands_insert on public.irrigation_commands for insert to authenticated with check(valve_access(valve_id,true) and requested_by=auth.uid() and status='pending' and applied_at is null and failure_reason is null);
create policy commands_cancel on public.irrigation_commands for update to authenticated using(valve_access(valve_id,true) and status='pending') with check(valve_access(valve_id,true) and status='cancelled');
create policy alerts_read on public.alerts for select to authenticated using(plot_access(plot_id));
create policy alerts_update on public.alerts for update to authenticated using(plot_access(plot_id,true)) with check(plot_access(plot_id,true));
-- Column privileges prevent a cancellation from modifying another command's identity/action.
revoke all on public.organizations,public.memberships,public.plots,public.stations,public.readings,public.valves,public.irrigation_commands,public.alerts from anon,authenticated;
grant select on public.organizations,public.memberships,public.plots,public.stations,public.readings,public.valves,public.irrigation_commands,public.alerts to authenticated;
grant insert on public.plots,public.readings,public.irrigation_commands to authenticated;
grant update(name,crop,geom,threshold_min,threshold_max) on public.plots to authenticated;
grant update(status) on public.irrigation_commands to authenticated;
grant update(read_at) on public.alerts to authenticated;
grant all on public.organizations,public.memberships,public.plots,public.stations,public.readings,public.valves,public.irrigation_commands,public.alerts to service_role;

create view public.plot_status with (security_invoker=true) as
 select p.*,r.moisture_pct,r.measured_at,r.temp_c,r.rain_mm,
 case when r.measured_at is null or now()-r.measured_at>interval '15 minutes' then 'stale' when r.moisture_pct<coalesce(p.threshold_min,25) then 'dry' when r.moisture_pct>coalesce(p.threshold_max,45) then 'wet' else 'optimal' end as status
 from public.plots p left join lateral(select r.* from public.readings r join public.stations s on s.id=r.station_id where s.plot_id=p.id order by r.measured_at desc limit 1) r on true;
grant select on public.plot_status to authenticated,service_role;

-- Idempotent manual insert: duplicates return the original id; never overwrite somebody else's row.
create function public.submit_manual(station uuid,request uuid,measured timestamptz,moisture numeric,note_text text,latitude double precision,longitude double precision,actor uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid;
begin
 if actor is distinct from auth.uid() or not station_access(station,true) then raise exception 'Acceso denegado' using errcode='42501'; end if;
 insert into readings(station_id,client_request_id,measured_at,moisture_pct,note,lat,lng,source,requested_by) values(station,request,measured,moisture,note_text,latitude,longitude,'manual',auth.uid()) on conflict(client_request_id) do nothing returning id into result;
 if result is null then select id into result from readings where client_request_id=request and requested_by=auth.uid() and station_id=station; end if;
 if result is null then raise exception 'Identificador de cliente en conflicto'; end if;
 return result;
end $$;
revoke all on function public.submit_manual(uuid,uuid,timestamptz,numeric,text,double precision,double precision,uuid) from public;
grant execute on function public.submit_manual(uuid,uuid,timestamptz,numeric,text,double precision,double precision,uuid) to authenticated;

-- Worker uses this atomic transaction after its 1–4 second delay. Cancellation wins if committed first.
create function public.apply_command(command uuid,fail boolean) returns jsonb language plpgsql security definer set search_path=public as $$
declare c irrigation_commands; v valves;
begin
 select * into c from irrigation_commands where id=command for update;
 if c.id is null or c.status<>'pending' then return null; end if;
 if fail then update irrigation_commands set status='failed',failure_reason='valve_timeout' where id=c.id; return jsonb_build_object('status','failed'); end if;
 update valves set status=case c.action when 'open' then 'open' else 'closed' end,close_at=case when c.action='open' and c.duration_min is not null then now()+make_interval(mins=>c.duration_min) else null end where id=c.valve_id returning * into v;
 update irrigation_commands set status='applied',applied_at=now() where id=c.id;
 return jsonb_build_object('valve_id',v.id,'status',v.status,'command_id',c.id,'ts',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
end $$;
revoke all on function public.apply_command(uuid,boolean) from public,anon,authenticated;
grant execute on function public.apply_command(uuid,boolean) to service_role;

create function public.maintenance() returns void language plpgsql security definer set search_path=public as $$
begin
 delete from readings where measured_at<now()-interval '48 hours';
 update valves set status='closed',close_at=null where close_at<=now();
 -- Resolve old alerts so a new transition can be reported.
 update alerts a set read_at=now() from plot_status p where p.id=a.plot_id and a.read_at is null and p.status<>a.type;
 insert into alerts(plot_id,type,payload) select id,status,jsonb_build_object('moisture_pct',moisture_pct,'measured_at',measured_at) from plot_status where status in ('dry','stale') on conflict(plot_id,type) where read_at is null do nothing;
end $$;
revoke all on function public.maintenance() from public,anon,authenticated;
grant execute on function public.maintenance() to service_role;
alter publication supabase_realtime add table public.readings,public.valves,public.irrigation_commands,public.alerts;
