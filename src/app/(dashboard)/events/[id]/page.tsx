import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Pencil, MapPin, Upload, Ticket, Radio,
  Download, CheckCircle2, Clock, Users, UserCheck, X,
} from 'lucide-react'
import { SessionManager } from './SessionManager'
import { StaffManager } from './StaffManager'
import { ScanQrButton } from './ScanQrButton'
import { formatDateTime } from '@/lib/utils'
import { removeFromRoster } from '@/lib/actions/events'
import { deleteAttendance } from '@/lib/actions/attendance'

// ── types ─────────────────────────────────────────────────────────────────

type Session = {
  id: string
  name: string | null
  starts_at: string
  ends_at: string | null
  created_at: string
}

type StaffMember = {
  profile_id: string
  assigned_at: string
  profiles: { id: string; full_name: string; role: string; committee: string | null }
}

type EventDetail = {
  id: string
  name: string
  description: string | null
  location: string | null
  created_by: string | null
  created_at: string
  event_sessions: Session[]
}

type RosterEntry = {
  participant_id: string
  participants: {
    id: string
    first_name: string
    last_name: string
    middle_name: string | null
    suffix: string | null
    student_number: string
    school_email: string
    school: string | null
    degree_program: string | null
    participant_type: string
    profile_id: string | null
    profiles: { committee: string | null } | null
  } | null
}

type TeamAssignment = {
  participant_id: string
  teams: { name: string } | null
}

type CheckIn = {
  id: string
  participant_id: string
  scanned_at: string
  scanned_by: string | null
  participants: { first_name: string; last_name: string; participant_type: string } | null
  event_sessions: { name: string | null } | null
}

type ProfileOption = { id: string; full_name: string; role: string; committee: string | null }

interface Props {
  params: Promise<{ id: string }>
}

// ── page ──────────────────────────────────────────────────────────────────

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = currentProfile?.role === 'admin'

  // Core event data — keep this query simple (no nested staff→profiles join)
  // to avoid intermittent PostgREST errors that would trigger a false 404
  const { data: event } = await supabase
    .from('events')
    .select(`
      id, name, description, location, created_by, created_at,
      event_sessions ( id, name, starts_at, ends_at, created_at )
    `)
    .eq('id', id)
    .order('starts_at', { referencedTable: 'event_sessions', ascending: true })
    .single<EventDetail>()

  if (!event) notFound()

  // Staff query separate so a failure here degrades to empty list, not 404
  const { data: eventStaff } = await supabase
    .from('event_staff')
    .select('profile_id, assigned_at, profiles ( id, full_name, role, committee )')
    .eq('event_id', id)
    .returns<StaffMember[]>()

  const sessionIds = event.event_sessions.map((s) => s.id)

  // Parallel fetches
  const [rosterResult, attendancesResult, profilesResult, teamsResult] = await Promise.all([
    supabase
      .from('event_roster')
      .select(`
        participant_id,
        participants (
          id, first_name, last_name, middle_name, suffix,
          student_number, school_email, school, degree_program,
          participant_type, profile_id,
          profiles ( committee )
        )
      `)
      .eq('event_id', id)
      .returns<RosterEntry[]>(),

    sessionIds.length > 0
      ? supabase
          .from('attendances')
          .select('id, participant_id, scanned_at, scanned_by, event_sessions ( name ), participants ( first_name, last_name, participant_type )')
          .in('event_session_id', sessionIds)
          .order('scanned_at', { ascending: false })
          .returns<CheckIn[]>()
      : { data: [] as CheckIn[] },

    supabase
      .from('profiles')
      .select('id, full_name, role, committee')
      .order('full_name')
      .returns<ProfileOption[]>(),

    supabase
      .from('event_teams')
      .select('participant_id, teams ( name )')
      .eq('event_id', id)
      .returns<TeamAssignment[]>(),
  ])

  const rosterEntries = rosterResult.data ?? []
  const allAttendances = attendancesResult.data ?? []
  const allProfiles = profilesResult.data ?? []
  const teamByParticipant = new Map(
    (teamsResult.data ?? []).map((t) => [t.participant_id, t.teams?.name ?? null])
  )

  // Scanned-by names for check-ins
  const scannedByIds = [...new Set(allAttendances.map((c) => c.scanned_by).filter(Boolean) as string[])]
  const staffById = new Map<string, string>()
  if (scannedByIds.length > 0) {
    const { data: sp } = await supabase.from('profiles').select('id, full_name').in('id', scannedByIds)
    sp?.forEach((p) => staffById.set(p.id, p.full_name))
  }

  // Stats
  const checkedInIds = new Set(allAttendances.map((a) => a.participant_id))
  const attendees = rosterEntries
    .filter((r) => r.participants?.participant_type === 'attendee')
    .sort((a, b) => (a.participants?.last_name ?? '').localeCompare(b.participants?.last_name ?? ''))
  const officers = rosterEntries
    .filter((r) => r.participants?.participant_type === 'officer')
    .sort((a, b) => (a.participants?.last_name ?? '').localeCompare(b.participants?.last_name ?? ''))

  // ── render ──────────────────────────────────────────────────────────────

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-gray-900 break-words">{event.name}</h1>
          {event.location && (
            <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
              <MapPin size={13} /> {event.location}
            </p>
          )}
          {event.description && (
            <p className="text-sm text-gray-600 mt-2">{event.description}</p>
          )}
        </div>
        <Link
          href={`/events/${id}/edit`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 shrink-0 transition-colors"
        >
          <Pencil size={14} /> Edit
        </Link>
      </div>

      {/* ── Primary actions (above stats) ── */}
      <div className="flex items-center justify-end gap-2">
        <Link
          href={`/events/${id}/passes`}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 transition-colors"
        >
          <Ticket size={14} /> View Passes
        </Link>
        <ScanQrButton eventId={id} sessions={event.event_sessions} colored />
        <Link
          href={`/events/${id}/live`}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 transition-colors"
        >
          <Radio size={14} /> Live Dashboard
        </Link>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Attendees', value: attendees.length, icon: Users, color: 'text-blue-600' },
          { label: 'Officers', value: officers.length, icon: Users, color: 'text-violet-600' },
          { label: 'Checked In', value: checkedInIds.size, icon: UserCheck, color: 'text-green-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon size={13} className={color} />
              <p className="text-xs text-gray-500">{label}</p>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Check-ins ── */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Clock size={15} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Check-ins</h2>
          <span className="ml-auto text-xs text-gray-400">{allAttendances.length} total</span>
        </div>
        {allAttendances.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Name</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Type</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 hidden sm:table-cell">Session</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Time</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 hidden md:table-cell">Scanned by</th>
                  {isAdmin && <th className="px-2 py-2.5" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allAttendances.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">
                      {c.participants ? `${c.participants.last_name}, ${c.participants.first_name}` : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      {c.participants && (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                          c.participants.participant_type === 'officer'
                            ? 'bg-violet-100 text-violet-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {c.participants.participant_type}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs hidden sm:table-cell">
                      {c.event_sessions?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                      {formatDateTime(c.scanned_at)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs hidden md:table-cell">
                      {c.scanned_by ? (staffById.get(c.scanned_by) ?? '—') : '—'}
                    </td>
                    {isAdmin && (
                      <td className="px-2 py-2.5">
                        <form action={deleteAttendance}>
                          <input type="hidden" name="attendance_id" value={c.id} />
                          <input type="hidden" name="event_id" value={id} />
                          <button
                            type="submit"
                            title="Delete check-in"
                            className="text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-6 text-sm text-gray-400 text-center">No check-ins yet.</p>
        )}
      </div>

      {/* ── Participants ── */}
      <div className="space-y-4">
        <ParticipantTable
          title="Attendees"
          variant="attendee"
          rows={attendees}
          checkedInIds={checkedInIds}
          teamByParticipant={teamByParticipant}
          eventId={id}
          isAdmin={isAdmin}
        />
        <ParticipantTable
          title="Officers"
          variant="officer"
          rows={officers}
          checkedInIds={checkedInIds}
          teamByParticipant={teamByParticipant}
          eventId={id}
          isAdmin={isAdmin}
        />
      </div>

      {/* ── Sessions ── */}
      <SessionManager eventId={id} sessions={event.event_sessions} />

      {/* ── Staff ── */}
      <StaffManager
        eventId={id}
        staff={eventStaff ?? []}
        allProfiles={allProfiles}
        isAdmin={isAdmin}
      />

      {/* ── Bottom actions ── */}
      <div className="flex items-center justify-end gap-2">
        {isAdmin && (
          <Link
            href={`/events/${id}/import`}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 transition-colors"
          >
            <Upload size={14} /> Import Participants
          </Link>
        )}
        <a
          href={`/events/${id}/export`}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 transition-colors"
        >
          <Download size={14} /> Export Attendance
        </a>
      </div>
    </div>
  )
}

// ── sub-component (server) ─────────────────────────────────────────────────

function formatName(p: RosterEntry['participants']): string {
  if (!p) return '—'
  const parts = [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ')
  return p.suffix ? `${parts} ${p.suffix}` : parts
}

function ParticipantTable({
  title,
  variant,
  rows,
  checkedInIds,
  teamByParticipant,
  eventId,
  isAdmin,
}: {
  title: string
  variant: 'attendee' | 'officer'
  rows: { participant_id: string; participants: RosterEntry['participants'] }[]
  checkedInIds: Set<string>
  teamByParticipant: Map<string, string | null>
  eventId: string
  isAdmin: boolean
}) {
  const checkedIn = rows.filter((r) => checkedInIds.has(r.participant_id)).length

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <span className="ml-2 text-xs text-gray-400">{rows.length} total</span>
        <span className="ml-auto text-xs text-green-600 font-medium">{checkedIn} checked in</span>
      </div>
      {rows.length > 0 ? (
        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[200px]" />
              <col className="w-[120px] hidden sm:table-column" />
              <col className="w-[180px] hidden md:table-column" />
              <col className="w-[100px] hidden lg:table-column" />
              <col className="w-[100px]" />
              {isAdmin && <col className="w-[36px]" />}
            </colgroup>
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 hidden sm:table-cell">
                  {variant === 'attendee' ? 'Team' : 'Committee'}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 hidden md:table-cell">
                  {variant === 'attendee' ? 'School' : 'Student No.'}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 hidden lg:table-cell">Program</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Status</th>
                {isAdmin && <th className="px-2 py-2.5" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(({ participant_id, participants: p }) => (
                <tr key={participant_id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900 truncate">
                    {formatName(p)}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs hidden sm:table-cell truncate">
                    {variant === 'attendee'
                      ? (teamByParticipant.get(participant_id) ?? <span className="text-gray-300">—</span>)
                      : ((p?.profiles as { committee: string | null } | null)?.committee ?? <span className="text-gray-300">—</span>)
                    }
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs hidden md:table-cell truncate">
                    {variant === 'attendee'
                      ? (p?.school ?? <span className="text-gray-300">—</span>)
                      : (p?.student_number ?? <span className="text-gray-300">—</span>)
                    }
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs hidden lg:table-cell truncate">
                    {p?.degree_program ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    {checkedInIds.has(participant_id) ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                        <CheckCircle2 size={12} /> Checked in
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-2.5">
                      <form action={removeFromRoster}>
                        <input type="hidden" name="event_id" value={eventId} />
                        <input type="hidden" name="participant_id" value={participant_id} />
                        <button
                          type="submit"
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded"
                          title="Remove from roster"
                        >
                          <X size={13} />
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-5 py-5 text-sm text-gray-400 text-center">No {title.toLowerCase()} rostered.</p>
      )}
    </div>
  )
}
