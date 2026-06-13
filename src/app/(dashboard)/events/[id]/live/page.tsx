import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LiveDashboard } from './LiveDashboard'

type Session = {
  id: string
  name: string | null
  starts_at: string
  ends_at: string | null
}

type AttendanceRow = {
  id: string
  participant_id: string
  scanned_at: string
  scanned_by: string | null
  participants: { first_name: string; last_name: string } | null
}

type RosterEntry = { participant_id: string }

type EventTeamRow = {
  participant_id: string
  teams: { name: string } | null
}

type Profile = { id: string; full_name: string }

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ session?: string }>
}

export default async function LiveDashboardPage({ params, searchParams }: Props) {
  const { id } = await params
  const { session: sessionParam } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: event } = await supabase
    .from('events')
    .select('id, name, event_sessions(id, name, starts_at, ends_at)')
    .eq('id', id)
    .order('starts_at', { referencedTable: 'event_sessions', ascending: true })
    .single()

  if (!event) notFound()

  const sessions: Session[] = (event.event_sessions as Session[]) ?? []
  const initialSession =
    sessions.find((s) => s.id === sessionParam) ?? sessions[0] ?? null

  // Parallel: roster + team assignments + all profiles
  const [rosterResult, teamResult, profileResult] = await Promise.all([
    supabase
      .from('event_roster')
      .select('participant_id')
      .eq('event_id', id)
      .returns<RosterEntry[]>(),

    supabase
      .from('event_teams')
      .select('participant_id, teams(name)')
      .eq('event_id', id)
      .returns<EventTeamRow[]>(),

    supabase.from('profiles').select('id, full_name').returns<Profile[]>(),
  ])

  const roster = rosterResult.data ?? []
  const teamRows = teamResult.data ?? []
  const profiles = profileResult.data ?? []

  const participantTeamMap: Record<string, string> = {}
  for (const row of teamRows) {
    if (row.teams?.name) participantTeamMap[row.participant_id] = row.teams.name
  }

  const profileMap: Record<string, string> = {}
  for (const p of profiles) profileMap[p.id] = p.full_name

  const teamRosterCounts: Record<string, number> = {}
  for (const entry of roster) {
    const team = participantTeamMap[entry.participant_id]
    if (team) teamRosterCounts[team] = (teamRosterCounts[team] ?? 0) + 1
  }

  // Initial attendance for the default session
  let initialAttendances: AttendanceRow[] = []
  if (initialSession) {
    const { data } = await supabase
      .from('attendances')
      .select(
        'id, participant_id, scanned_at, scanned_by, participants(first_name, last_name)',
      )
      .eq('event_session_id', initialSession.id)
      .order('scanned_at', { ascending: false })
      .returns<AttendanceRow[]>()
    initialAttendances = data ?? []
  }

  return (
    <LiveDashboard
      event={{ id: event.id, name: event.name as string }}
      sessions={sessions}
      initialSessionId={initialSession?.id ?? null}
      initialAttendances={initialAttendances.map((a) => ({
        id: a.id,
        participant_id: a.participant_id,
        scanned_at: a.scanned_at,
        scanned_by: a.scanned_by,
        participantName: a.participants
          ? `${a.participants.last_name}, ${a.participants.first_name}`
          : 'Unknown',
        teamName: participantTeamMap[a.participant_id] ?? null,
        scannerName: a.scanned_by ? (profileMap[a.scanned_by] ?? null) : null,
      }))}
      rosterCount={roster.length}
      participantTeamMap={participantTeamMap}
      profileMap={profileMap}
      teamRosterCounts={teamRosterCounts}
    />
  )
}
