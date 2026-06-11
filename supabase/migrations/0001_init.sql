-- ============================================================
-- KrisPass v2 — Initial Schema
-- ============================================================
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- profiles : authenticated staff (admins, organizers)
-- ------------------------------------------------------------
create table profiles (
  id                    uuid primary key references auth.users on delete cascade,
  full_name             text not null,
  role                  text not null check (role in ('admin', 'organizer')),
  committee             text,
  must_change_password  boolean not null default true,

  last_name             text,
  first_name            text,
  middle_name           text,
  suffix                text,
  school_email          text unique,
  personal_email        text,
  contact_no            text,
  school                text,
  student_number        text unique,
  degree_program        text,
  blocks                text[] not null default '{}',

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ------------------------------------------------------------
-- participants : event attendees and officers (no auth required)
-- ------------------------------------------------------------
create table participants (
  id                uuid primary key default gen_random_uuid(),
  participant_type  text not null check (participant_type in ('attendee', 'officer')),
  profile_id        uuid references profiles on delete set null,

  last_name         text not null,
  first_name        text not null,
  middle_name       text,
  suffix            text,

  school_email      text not null unique,
  personal_email    text not null,
  contact_no        text,

  school            text,
  student_number    text not null unique,
  degree_program    text,
  blocks            text[] not null default '{}',

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index participants_student_number_idx on participants (student_number);
create index participants_school_email_idx on participants (school_email);
create index participants_last_name_idx on participants (last_name);
create index participants_blocks_idx on participants using gin (blocks);

create unique index participants_profile_id_unique
  on participants (profile_id) where profile_id is not null;

-- ------------------------------------------------------------
-- events
-- ------------------------------------------------------------
create table events (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  location    text,
  created_by  uuid references profiles,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- event_sessions : one row per day/session within an event
-- ------------------------------------------------------------
create table event_sessions (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events on delete cascade,
  name        text,
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index event_sessions_event_id_idx on event_sessions (event_id);
create index event_sessions_starts_at_idx on event_sessions (starts_at);

-- ------------------------------------------------------------
-- event_roster : who is allowed at this event + per-event QR
-- ------------------------------------------------------------
create table event_roster (
  event_id        uuid not null references events on delete cascade,
  participant_id  uuid not null references participants on delete cascade,
  qr_token        text not null unique,
  created_at      timestamptz not null default now(),
  primary key (event_id, participant_id)
);

create index event_roster_qr_token_idx on event_roster (qr_token);

-- ------------------------------------------------------------
-- teams : per-event team assignments
-- ------------------------------------------------------------
create table teams (
  id        uuid primary key default gen_random_uuid(),
  event_id  uuid not null references events on delete cascade,
  name      text not null,
  unique (event_id, name)
);

create table event_teams (
  event_id        uuid not null references events on delete cascade,
  participant_id  uuid not null references participants on delete cascade,
  team_id         uuid not null references teams on delete cascade,
  primary key (event_id, participant_id)
);

-- ------------------------------------------------------------
-- event_staff : staff users assigned to events
-- NOT used for scanning access control — any staff can scan any event.
-- ------------------------------------------------------------
create table event_staff (
  event_id     uuid not null references events on delete cascade,
  profile_id   uuid not null references profiles on delete cascade,
  assigned_at  timestamptz not null default now(),
  assigned_by  uuid references profiles,
  primary key (event_id, profile_id)
);

-- ------------------------------------------------------------
-- attendances : check-in records, scoped per session
-- ------------------------------------------------------------
create table attendances (
  id                uuid primary key default gen_random_uuid(),
  event_session_id  uuid not null references event_sessions on delete cascade,
  participant_id    uuid not null references participants on delete cascade,
  scanned_at        timestamptz not null default now(),
  scanned_by        uuid references profiles,
  unique (event_session_id, participant_id)
);

create index attendances_session_idx on attendances (event_session_id);
create index attendances_scanned_at_idx on attendances (scanned_at desc);

-- ------------------------------------------------------------
-- updated_at triggers
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger participants_updated_at before update on participants
  for each row execute function set_updated_at();
create trigger events_updated_at before update on events
  for each row execute function set_updated_at();
