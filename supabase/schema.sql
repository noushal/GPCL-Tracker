-- Run once in the Supabase SQL editor for a new project.

create extension if not exists pg_trgm;

create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

create table players (
  id bigint primary key,       -- pesdb.net player id
  name text not null,
  team text,
  position text,
  nationality text,
  rating int,
  updated_at timestamptz default now()
);
create index players_name_trgm_idx on players using gin (name gin_trgm_ops);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  created_at timestamptz default now()
);

create table transfer_logs (
  id uuid primary key default gen_random_uuid(),
  team text not null,
  player text not null,
  player_id bigint references players(id) on delete set null,
  fee numeric default 0,
  season text not null,
  transfer_window text not null,
  purchase_date date not null,
  sale_eligibility text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Tamper-resistant audit trail: every insert/update/delete on teams and
-- transfer_logs is recorded automatically by a DB trigger (not the client),
-- so it can't be skipped, faked, or omitted. No client role gets an
-- insert/update/delete policy on this table — the SECURITY DEFINER trigger
-- function below bypasses RLS to write, but nothing else can. Rows can only
-- be removed directly in the Supabase dashboard (or via the service-role
-- key), never through the app.
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete set null,
  actor_username text,
  action text not null check (action in ('insert', 'update', 'delete')),
  entity_type text not null,
  entity_summary text,
  created_at timestamptz default now()
);

alter table teams enable row level security;
alter table transfer_logs enable row level security;
alter table players enable row level security;
alter table profiles enable row level security;
alter table activity_log enable row level security;

create policy "public read teams" on teams for select using (true);
create policy "auth write teams" on teams for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read logs" on transfer_logs for select using (true);
create policy "auth write logs" on transfer_logs for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read players" on players for select using (true);
-- no public write policy on players; only the service-role key (scraper) can write, bypassing RLS

create policy "public read profiles" on profiles for select using (true);
create policy "user insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "user update own profile" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "auth read activity log" on activity_log for select using (auth.role() = 'authenticated');

create or replace function log_activity() returns trigger as $$
declare
  actor uuid := auth.uid();
  actor_name text;
  summary text;
begin
  select username into actor_name from profiles where id = actor;

  if TG_TABLE_NAME = 'transfer_logs' then
    if TG_OP = 'INSERT' then
      summary := format('Logged transfer: %s to %s (£%s)', NEW.player, NEW.team, NEW.fee);
    elsif TG_OP = 'UPDATE' then
      summary := format('Updated transfer: %s (%s)', NEW.player, NEW.team);
    elsif TG_OP = 'DELETE' then
      summary := format('Deleted transfer: %s (%s)', OLD.player, OLD.team);
    end if;
  elsif TG_TABLE_NAME = 'teams' then
    if TG_OP = 'INSERT' then
      summary := format('Added team: %s', NEW.name);
    elsif TG_OP = 'UPDATE' then
      summary := format('Renamed team: %s -> %s', OLD.name, NEW.name);
    elsif TG_OP = 'DELETE' then
      summary := format('Removed team: %s', OLD.name);
    end if;
  end if;

  insert into activity_log (actor_id, actor_username, action, entity_type, entity_summary)
  values (actor, coalesce(actor_name, 'unknown'), lower(TG_OP), TG_TABLE_NAME, summary);

  return coalesce(NEW, OLD);
end;
$$ language plpgsql security definer set search_path = public;

create trigger transfer_logs_activity
  after insert or update or delete on transfer_logs
  for each row execute function log_activity();

create trigger teams_activity
  after insert or update or delete on teams
  for each row execute function log_activity();

-- Live push updates: without this, changes only appear for the tab that
-- made them until everyone else manually refreshes.
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table transfer_logs;
alter publication supabase_realtime add table activity_log;
