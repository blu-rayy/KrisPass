export type Role = 'admin' | 'organizer'

export interface Profile {
  id: string
  email: string
  role: Role
  full_name: string | null
  created_at: string
}

export interface Event {
  id: string
  name: string
  description: string | null
  event_date: string
  location: string | null
  created_by: string
  created_at: string
}

export interface EventWithStats extends Event {
  participant_count: number
  checked_in_count: number
}

export interface Participant {
  id: string
  event_id: string
  full_name: string
  email: string
  team: string | null
  student_id: string | null
  qr_token: string
  checked_in: boolean
  checked_in_at: string | null
  checked_in_by: string | null
  created_at: string
}

export interface ScanLog {
  id: string
  participant_id: string | null
  event_id: string
  scanned_by: string | null
  scanned_at: string
  result: 'success' | 'duplicate' | 'not_found'
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
