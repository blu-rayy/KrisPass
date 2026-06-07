-- ============================================================
-- KrisPass — Revised Schema (migration 0002)
-- Drop old tables and recreate with correct structure.
-- Run this in the Supabase SQL Editor AFTER 0001 if you already
-- ran that, otherwise just run this file alone.
-- ============================================================

-- Drop old tables (order matters due to FK constraints)
drop table if exists scan_log cascade;
drop table if exists participants cascade;
drop table if exists events cascade;
drop table if exists profiles cascade;

-- ── Profiles ────────────────────────────────────────────────
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text not null,
  role        text not null check (role in ('admin', 'organizer', 'scanner')),
  committee   text,
  created_at  timestamptz default now()
);

alter table profiles enable row level security;

create policy "users can read own profile"
  on profiles for select using (auth.uid() = id);

create policy "admins can read all profiles"
  on profiles for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "admins can insert profiles"
  on profiles for insert with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "admins can update profiles"
  on profiles for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ── Participants (data-only, no auth) ───────────────────────
create table participants (
  id              uuid primary key default gen_random_uuid(),
  last_name       text not null,
  first_name      text not null,
  middle_name     text,
  suffix          text,
  school_email    text not null unique,
  personal_email  text not null,
  contact_no      text,
  school          text,
  student_number  text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table participants enable row level security;

create policy "authenticated users can read participants"
  on participants for select using (auth.role() = 'authenticated');

create policy "admins can insert participants"
  on participants for insert with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "admins can update participants"
  on participants for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "admins can delete participants"
  on participants for delete using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ── Blocks / Sections ───────────────────────────────────────
create table blocks (
  id    uuid primary key default gen_random_uuid(),
  code  text not null unique
);

alter table blocks enable row level security;

create policy "authenticated users can read blocks"
  on blocks for select using (auth.role() = 'authenticated');

create policy "admins can manage blocks"
  on blocks for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create table participant_blocks (
  participant_id  uuid references participants on delete cascade,
  block_id        uuid references blocks on delete cascade,
  primary key (participant_id, block_id)
);

alter table participant_blocks enable row level security;

create policy "authenticated users can read participant_blocks"
  on participant_blocks for select using (auth.role() = 'authenticated');

create policy "admins can manage participant_blocks"
  on participant_blocks for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ── Events ──────────────────────────────────────────────────
create table events (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  event_date  timestamptz not null,
  location    text,
  created_by  uuid references profiles,
  created_at  timestamptz default now()
);

alter table events enable row level security;

create policy "authenticated users can read events"
  on events for select using (auth.role() = 'authenticated');

create policy "admins can insert events"
  on events for insert with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "admins can update events"
  on events for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "admins can delete events"
  on events for delete using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ── Event Roster (who's allowed + their per-event QR) ───────
create table event_roster (
  event_id        uuid references events on delete cascade,
  participant_id  uuid references participants on delete cascade,
  qr_token        text not null unique default gen_random_uuid()::text,
  created_at      timestamptz default now(),
  primary key (event_id, participant_id)
);

alter table event_roster enable row level security;

create policy "authenticated users can read event_roster"
  on event_roster for select using (auth.role() = 'authenticated');

create policy "admins can manage event_roster"
  on event_roster for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ── Teams ───────────────────────────────────────────────────
create table teams (
  id        uuid primary key default gen_random_uuid(),
  event_id  uuid references events on delete cascade,
  name      text not null,
  unique (event_id, name)
);

alter table teams enable row level security;

create policy "authenticated users can read teams"
  on teams for select using (auth.role() = 'authenticated');

create policy "admins can manage teams"
  on teams for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create table event_teams (
  event_id        uuid references events on delete cascade,
  participant_id  uuid references participants on delete cascade,
  team_id         uuid references teams on delete cascade,
  primary key (event_id, participant_id)
);

alter table event_teams enable row level security;

create policy "authenticated users can read event_teams"
  on event_teams for select using (auth.role() = 'authenticated');

create policy "admins can manage event_teams"
  on event_teams for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ── Attendances ─────────────────────────────────────────────
create table attendances (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid references events on delete cascade,
  participant_id  uuid references participants on delete cascade,
  scanned_at      timestamptz default now(),
  scanned_by      uuid references profiles,
  unique (event_id, participant_id)
);

alter table attendances enable row level security;

create policy "authenticated users can read attendances"
  on attendances for select using (auth.role() = 'authenticated');

-- Inserts done via service role in API routes only

-- ── Indexes ─────────────────────────────────────────────────
create index if not exists idx_event_roster_event_id on event_roster(event_id);
create index if not exists idx_event_roster_qr_token on event_roster(qr_token);
create index if not exists idx_attendances_event_id on attendances(event_id);
create index if not exists idx_participants_school_email on participants(school_email);

-- ── Enable Realtime ─────────────────────────────────────────
-- Enable via Supabase Dashboard: Database → Replication → attendances
