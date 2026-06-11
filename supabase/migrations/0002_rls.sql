-- ============================================================
-- KrisPass v2 — Row Level Security
-- ============================================================

alter table profiles enable row level security;
alter table participants enable row level security;
alter table events enable row level security;
alter table event_sessions enable row level security;
alter table event_roster enable row level security;
alter table teams enable row level security;
alter table event_teams enable row level security;
alter table event_staff enable row level security;
alter table attendances enable row level security;

-- ------------------------------------------------------------
-- Helper functions
-- ------------------------------------------------------------
create or replace function is_admin()
returns boolean as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$ language sql security definer stable;

create or replace function is_staff()
returns boolean as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'organizer'));
$$ language sql security definer stable;

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
create policy profiles_select on profiles for select using (auth.uid() is not null);
create policy profiles_insert on profiles for insert with check (is_admin());
create policy profiles_update on profiles for update using (is_admin() or id = auth.uid());
create policy profiles_delete on profiles for delete using (is_admin());

-- ------------------------------------------------------------
-- events
-- ------------------------------------------------------------
create policy events_select on events for select using (is_staff());
create policy events_insert on events for insert with check (is_staff());
create policy events_update on events for update using (is_staff());
create policy events_delete on events for delete using (is_admin());

-- ------------------------------------------------------------
-- participants (admin-only create/update/delete)
-- ------------------------------------------------------------
create policy participants_select on participants for select using (is_staff());
create policy participants_insert on participants for insert with check (is_admin());
create policy participants_update on participants for update using (is_admin());
create policy participants_delete on participants for delete using (is_admin());

-- ------------------------------------------------------------
-- event_sessions
-- ------------------------------------------------------------
create policy event_sessions_all on event_sessions for all
  using (is_staff()) with check (is_staff());

-- ------------------------------------------------------------
-- event_roster (admin-only bulk insert; both can update)
-- ------------------------------------------------------------
create policy event_roster_select on event_roster for select using (is_staff());
create policy event_roster_insert on event_roster for insert with check (is_admin());
create policy event_roster_update on event_roster for update using (is_staff());
create policy event_roster_delete on event_roster for delete using (is_admin());

-- ------------------------------------------------------------
-- teams, event_teams, attendances
-- ------------------------------------------------------------
create policy teams_all on teams for all using (is_staff()) with check (is_staff());
create policy event_teams_all on event_teams for all using (is_staff()) with check (is_staff());
create policy attendances_all on attendances for all using (is_staff()) with check (is_staff());

-- ------------------------------------------------------------
-- event_staff (admin-only management; staff can view)
-- ------------------------------------------------------------
create policy event_staff_select on event_staff for select using (is_staff());
create policy event_staff_insert on event_staff for insert with check (is_admin());
create policy event_staff_delete on event_staff for delete using (is_admin());
