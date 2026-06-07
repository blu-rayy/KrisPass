export type Role = 'admin' | 'organizer' | 'scanner'

export interface Profile {
  id: string
  last_name: string
  first_name: string
  middle_initial: string | null
  suffix: string | null
  student_number: string | null
  school_email: string | null
  year_level: string | null
  degree_program: string | null
  blocks: string | null
  role: Role
  committee: string | null
  created_at: string
}

export interface Participant {
  id: string
  last_name: string
  first_name: string
  middle_name: string | null
  suffix: string | null
  school_email: string
  personal_email: string
  contact_no: string | null
  school: string | null
  student_number: string | null
  created_at: string
  updated_at: string
}

export interface Block {
  id: string
  code: string
}

export interface Event {
  id: string
  name: string
  event_date: string
  location: string | null
  created_by: string | null
  created_at: string
}

export interface EventWithStats extends Event {
  roster_count: number
  attendance_count: number
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
  event_id: string
  participant_id: string
  scanned_at: string
  scanned_by: string | null
}

export type ScanResult = 'success' | 'duplicate' | 'not_found'

export interface CheckInResponse {
  result: ScanResult
  participant?: Participant
}

export interface CsvRowError {
  row: number
  message: string
}

export interface ImportResult {
  inserted: number
  updated: number
  errors: CsvRowError[]
}

export type ParticipantWithRoster = Participant & {
  qr_token: string
  attended: boolean
  scanned_at: string | null
  team_name: string | null
}
