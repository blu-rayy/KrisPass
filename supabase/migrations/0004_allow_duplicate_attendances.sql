-- Allow the same participant to be checked in more than once per session.
-- The primary key (id uuid) still enforces row uniqueness.
ALTER TABLE attendances
  DROP CONSTRAINT IF EXISTS attendances_event_session_id_participant_id_key;
