-- ============================================================
-- KrisPass — Initial Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ── Profiles (extends auth.users) ──────────────────────────
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  role       text not null check (role in ('admin', 'organizer')),
  full_name  text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "users can read own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "admins can read all profiles"
  on profiles for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "admins can insert profiles"
  on profiles for insert
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "admins can update profiles"
  on profiles for update
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── Events ─────────────────────────────────────────────────
create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  event_date  timestamptz not null,
  location    text,
  created_by  uuid not null references profiles(id),
  created_at  timestamptz not null default now()
);

alter table events enable row level security;

create policy "authenticated users can read events"
  on events for select
  using (auth.role() = 'authenticated');

create policy "admins can insert events"
  on events for insert
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "admins can update events"
  on events for update
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "admins can delete events"
  on events for delete
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── Participants ────────────────────────────────────────────
create table if not exists participants (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events(id) on delete cascade,
  full_name     text not null,
  email         text not null,
  team          text,
  student_id    text,
  qr_token      text not null unique default gen_random_uuid()::text,
  checked_in    boolean not null default false,
  checked_in_at timestamptz,
  checked_in_by uuid references profiles(id),
  created_at    timestamptz not null default now(),
  unique(event_id, email)
);

alter table participants enable row level security;

create policy "authenticated users can read participants"
  on participants for select
  using (auth.role() = 'authenticated');

create policy "admins can insert participants"
  on participants for insert
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "admins can update participants"
  on participants for update
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "admins can delete participants"
  on participants for delete
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── Scan Log (append-only audit trail) ─────────────────────
create table if not exists scan_log (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid references participants(id),
  event_id       uuid not null references events(id),
  scanned_by     uuid references profiles(id),
  scanned_at     timestamptz not null default now(),
  result         text not null check (result in ('success', 'duplicate', 'not_found'))
);

alter table scan_log enable row level security;

create policy "authenticated users can read scan_log"
  on scan_log for select
  using (auth.role() = 'authenticated');

-- Inserts are done via service role key in API routes only (no client-side policy needed)

-- ── Indexes ─────────────────────────────────────────────────
create index if not exists idx_participants_event_id on participants(event_id);
create index if not exists idx_participants_qr_token on participants(qr_token);
create index if not exists idx_participants_checked_in on participants(event_id, checked_in);
create index if not exists idx_scan_log_event_id on scan_log(event_id);

-- ── Realtime ────────────────────────────────────────────────
-- Enable Realtime on participants table via Supabase Dashboard:
-- Database → Replication → select "participants" table
-- (Cannot be done via SQL migration)
