-- Bounded-size chart: five-minute buckets keep a six-hour window small without fake points.
create view public.reading_series with (security_invoker=true) as
select station_id::text||':'||date_bin(interval '5 minutes',measured_at,'2020-01-01'::timestamptz)::text as id,station_id,
 max(measured_at) as measured_at,avg(moisture_pct) as moisture_pct,avg(temp_c) as temp_c,sum(rain_mm) as rain_mm,'aggregate'::text as source
from public.readings where measured_at>=now()-interval '6 hours'
group by station_id,date_bin(interval '5 minutes',measured_at,'2020-01-01'::timestamptz);
grant select on public.reading_series to authenticated,service_role;
-- Weather can arrive before soil on another topic. Persist it so either arrival order is valid.
create table public.weather_readings(station_id uuid not null references public.stations,measured_at timestamptz not null,rain_mm numeric not null check(rain_mm>=0),primary key(station_id,measured_at));
alter table public.weather_readings enable row level security;
create policy weather_read on public.weather_readings for select to authenticated using(public.station_access(station_id));
revoke all on public.weather_readings from anon,authenticated;
grant select on public.weather_readings to authenticated;
grant all on public.weather_readings to service_role;
create function public.prune_weather() returns void language sql security definer set search_path=public as $$ delete from weather_readings where measured_at<now()-interval '48 hours' $$;
revoke all on function public.prune_weather() from public,anon,authenticated;
grant execute on function public.prune_weather() to service_role;
