import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Pencil, MapPin, Upload, Ticket, Radio,
  Download, CheckCircle2, Clock, Users, UserCheck,
} from 'lucide-react'
import { SessionManager } from './SessionManager'
import { StaffManager } from './StaffManager'
import { ScanQrButton } from './ScanQrButton'
import { formatDateTime } from '@/lib/utils'

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
  event_staff: StaffMember[]
}

type RosterEntry = {
  participant_id: string
  participants: {
    id: string
    first_name: string
    last_name: string
    student_number: string
    school_email: string
    participant_type: string
  } | null
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

  // Core event data
  const { data: event } = await supabase
    .from('events')
    .select(`
      id, name, description, location, created_by, created_at,
      event_sessions ( id, name, starts_at, ends_at, created_at ),
      event_staff ( profile_id, assigned_at, profiles ( id, full_name, role, committee ) )
    `)
    .eq('id', id)
    .order('starts_at', { referencedTable: 'event_sessions', ascending: true })
    .single<EventDetail>()

  if (!event) notFound()

  const sessionIds = event.event_sessions.map((s) => s.id)

  // Parallel fetches
  const [rosterResult, attendancesResult, profilesResult] = await Promise.all([
    supabase
      .from('event_roster')
      .select('participant_id, participants ( id, first_name, last_name, student_number, school_email, participant_type )')
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
  ])

  const rosterEntries = rosterResult.data ?? []
  const allAttendances = attendancesResult.data ?? []
  const allProfiles = profilesResult.data ?? []
  const recentCheckIns = allAttendances.slice(0, 15)

  // Scanned-by names for recent check-ins
  const scannedByIds = [...new Set(recentCheckIns.map((c) => c.scanned_by).filter(Boolean) as string[])]
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
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-gray-900">{event.name}</h1>
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

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Attendees', value: attendees.length, icon: Users, color: 'text-blue-600' },
          { label: 'Officers', value: officers.length, icon: Users, color: 'text-violet-600' },
          { label: 'Checked In', value: checkedInIds.size, icon: UserCheck, color: 'text-green-600' },
          { label: 'Organizers', value: event.event_staff.length, icon: Users, color: 'text-gray-600' },
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

      {/* ── Quick actions ── */}
      <div className="flex flex-wrap gap-2">
        {isAdmin && (
          <Link
            href={`/events/${id}/import`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:border-violet-300 hover:text-violet-700 transition-all"
          >
            <Upload size={14} /> Import CSV
          </Link>
        )}
        <Link
          href={`/events/${id}/passes`}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:border-violet-300 hover:text-violet-700 transition-all"
        >
          <Ticket size={14} /> View Passes
        </Link>
        <a
          href={`/events/${id}/export`}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:border-green-300 hover:text-green-700 transition-all"
        >
          <Download size={14} /> Export Attendance
        </a>
        <ScanQrButton eventId={id} sessions={event.event_sessions} />
        <Link
          href={`/events/${id}/live`}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:border-violet-300 hover:text-violet-700 transition-all"
        >
          <Radio size={14} /> Live Dashboard
        </Link>
      </div>

      {/* ── Recent check-ins ── */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Clock size={15} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Recent check-ins</h2>
          <span className="ml-auto text-xs text-gray-400">{allAttendances.length} total</span>
        </div>
        {recentCheckIns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Name</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Type</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 hidden sm:table-cell">Session</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Time</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 hidden md:table-cell">Scanned by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentCheckIns.map((c) => (
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
          rows={attendees}
          checkedInIds={checkedInIds}
        />
        <ParticipantTable
          title="Officers"
          rows={officers}
          checkedInIds={checkedInIds}
        />
      </div>

      {/* ── Sessions ── */}
      <SessionManager eventId={id} sessions={event.event_sessions} />

      {/* ── Staff ── */}
      <StaffManager
        eventId={id}
        staff={event.event_staff}
        allProfiles={allProfiles}
        isAdmin={isAdmin}
      />
    </div>
  )
}

// ── sub-component (server) ─────────────────────────────────────────────────

function ParticipantTable({
  title,
  rows,
  checkedInIds,
}: {
  title: string
  rows: { participant_id: string; participants: RosterEntry['participants'] }[]
  checkedInIds: Set<string>
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
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 hidden sm:table-cell">Student No.</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 hidden md:table-cell">Email</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(({ participant_id, participants: p }) => (
                <tr key={participant_id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">
                    {p ? `${p.last_name}, ${p.first_name}` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 font-mono text-xs hidden sm:table-cell">
                    {p?.student_number ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs hidden md:table-cell">
                    {p?.school_email ?? '—'}
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
