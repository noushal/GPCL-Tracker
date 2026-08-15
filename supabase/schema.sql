-- Run once in the Supabase SQL editor for a new project.

create extension if not exists pg_trgm;

create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

create table transfer_logs (
  id uuid primary key default gen_random_uuid(),
  team text not null,
  player text not null,
  fee numeric default 0,
  season text not null,
  transfer_window text not null,
  purchase_date date not null,
  sale_eligibility text,
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

alter table teams enable row level security;
alter table transfer_logs enable row level security;
alter table players enable row level security;

create policy "public read teams" on teams for select using (true);
create policy "auth write teams" on teams for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read logs" on transfer_logs for select using (true);
create policy "auth write logs" on transfer_logs for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read players" on players for select using (true);
-- no public write policy on players; only the service-role key (scraper) can write, bypassing RLS
