export type Role = 'admin' | 'organizer'

export interface Profile {
  id: string
  full_name: string
  role: Role
  committee: string | null
  must_change_password: boolean
  last_name: string | null
  first_name: string | null
  middle_name: string | null
  suffix: string | null
  school_email: string | null
  personal_email: string | null
  contact_no: string | null
  school: string | null
  student_number: string | null
  degree_program: string | null
  year_level: string | null
  blocks: string[]
  created_at: string
  updated_at: string
}

export type ParticipantType = 'attendee' | 'officer'

export interface Participant {
  id: string
  participant_type: ParticipantType
  profile_id: string | null
  last_name: string
  first_name: string
  middle_name: string | null
  suffix: string | null
  school_email: string
  personal_email: string
  contact_no: string | null
  school: string | null
  student_number: string
  degree_program: string | null
  year_level: string | null
  blocks: string[]
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  name: string
  description: string | null
  location: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface EventSession {
  id: string
  event_id: string
  name: string | null
  starts_at: string
  ends_at: string | null
  created_at: string
}

export interface EventRoster {
  event_id: string
  participant_id: string
  qr_token: string
  created_at: string
}

export interface Team {
  id: string
  event_id: string
  name: string
}

export interface Attendance {
  id: string
  event_session_id: string
  participant_id: string
  scanned_at: string
  scanned_by: string | null
}

export interface EventStaff {
  event_id: string
  profile_id: string
  assigned_at: string
  assigned_by: string | null
}

export type ScanResult = 'success' | 'already_scanned' | 'not_found'

export interface CheckInResponse {
  result: ScanResult
  participant?: Pick<Participant, 'id' | 'first_name' | 'last_name'>
  team_name?: string | null
  scanned_at?: string
}

export interface CsvRowError {
  row: number
  message: string
}

export interface ImportResult {
  inserted: number
  updated: number
  added_to_roster: number
  errors: CsvRowError[]
}

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }
