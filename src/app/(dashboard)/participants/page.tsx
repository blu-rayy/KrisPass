import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { UserPlus, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EventPicker } from './EventPicker'
import { RosterActions } from './RosterActions'

// ── types ─────────────────────────────────────────────────────────────────

type EventOption = { id: string; name: string; starts_at: string | null }

type RosterRow = {
  participant_id: string
  qr_token: string
  participants: {
    id: string
    participant_type: string
    last_name: string
    first_name: string
    student_number: string
    school_email: string
    blocks: string[]
  } | null
}

interface Props {
  searchParams: Promise<{ event?: string; tab?: string; q?: string }>
}

// ── page ──────────────────────────────────────────────────────────────────

export default async function ParticipantsPage({ searchParams }: Props) {
  const { event: eventId, tab, q } = await searchParams
  const activeTab: 'attendee' | 'officer' = tab === 'officer' ? 'officer' : 'attendee'
  const query = q?.trim() ?? ''

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = currentProfile?.role === 'admin'

  // Events list for picker (ordered by most recent first)
  const { data: events } = await supabase
    .from('events')
    .select('id, name, event_sessions ( starts_at )')
    .order('created_at', { ascending: false })
    .returns<{ id: string; name: string; event_sessions: { starts_at: string }[] }[]>()

  const eventOptions: EventOption[] = (events ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    starts_at: e.event_sessions?.[0]?.starts_at ?? null,
  }))

  // ── No event selected ──────────────────────────────────────────────────
  if (!eventId) {
    return (
      <div className="px-4 py-6 max-w-5xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Participants</h1>
          <p className="text-sm text-gray-500 mt-1">Select an event to manage its roster.</p>
        </div>
        <EventPicker events={eventOptions} selectedId={null} />
      </div>
    )
  }

  // ── Event selected: fetch roster ───────────────────────────────────────
  const { data: selectedEvent } = await supabase
    .from('events')
    .select('id, name, event_sessions ( id, starts_at )')
    .eq('id', eventId)
    .single<{ id: string; name: string; event_sessions: { id: string; starts_at: string }[] }>()

  if (!selectedEvent) redirect('/participants')

  const [rosterResult, teamResult, attendanceResult] = await Promise.all([
    supabase
      .from('event_roster')
      .select('participant_id, qr_token, participants ( id, participant_type, last_name, first_name, student_number, school_email, blocks )')
      .eq('event_id', eventId)
      .returns<RosterRow[]>(),

    supabase
      .from('event_teams')
      .select('participant_id, teams ( name )')
      .eq('event_id', eventId)
      .returns<{ participant_id: string; teams: { name: string } | null }[]>(),

    supabase
      .from('attendances')
      .select('participant_id, event_session_id')
      .in('event_session_id', selectedEvent.event_sessions.map((s) => s.id))
      .returns<{ participant_id: string; event_session_id: string }[]>(),
  ])

  const allRoster = rosterResult.data ?? []
  const teamMap = new Map<string, string>()
  ;(teamResult.data ?? []).forEach((t) => {
    if (t.teams?.name) teamMap.set(t.participant_id, t.teams.name)
  })

  const sessionCount = selectedEvent.event_sessions.length
  const attendedSessionsByParticipant = new Map<string, number>()
  ;(attendanceResult.data ?? []).forEach((a) => {
    attendedSessionsByParticipant.set(
      a.participant_id,
      (attendedSessionsByParticipant.get(a.participant_id) ?? 0) + 1
    )
  })

  // Filter by tab + search
  let displayed = allRoster.filter(
    (r) => r.participants?.participant_type === activeTab
  )
  if (query) {
    const lower = query.toLowerCase()
    displayed = displayed.filter((r) => {
      const p = r.participants
      if (!p) return false
      return (
        p.last_name.toLowerCase().includes(lower) ||
        p.first_name.toLowerCase().includes(lower) ||
        p.student_number.toLowerCase().includes(lower) ||
        p.school_email.toLowerCase().includes(lower)
      )
    })
  }
  displayed.sort((a, b) =>
    (a.participants?.last_name ?? '').localeCompare(b.participants?.last_name ?? '')
  )

  const attendeeCount = allRoster.filter((r) => r.participants?.participant_type === 'attendee').length
  const officerCount = allRoster.filter((r) => r.participants?.participant_type === 'officer').length

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Participants</h1>
          <p className="text-sm text-gray-500 mt-0.5">{selectedEvent.name}</p>
        </div>
        {isAdmin && (
          <Link href={`/participants/new?event=${eventId}`}>
            <Button size="sm">
              <UserPlus size={14} />
              Add participant
            </Button>
          </Link>
        )}
      </div>

      {/* ── Event picker ── */}
      <EventPicker events={eventOptions} selectedId={eventId} />

      {/* ── Tabs ── */}
      <div className="flex border-b border-gray-200">
        {(['attendee', 'officer'] as const).map((t) => {
          const count = t === 'attendee' ? attendeeCount : officerCount
          return (
            <Link
              key={t}
              href={`/participants?event=${eventId}&tab=${t}${query ? `&q=${encodeURIComponent(query)}` : ''}`}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t
                  ? 'border-violet-600 text-violet-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'attendee' ? 'Attendees' : 'Officers'}
              <span className="ml-1.5 text-xs text-gray-400">({count})</span>
            </Link>
          )
        })}
      </div>

      {/* ── Search ── */}
      <SearchBar eventId={eventId} activeTab={activeTab} defaultValue={query} />

      {/* ── Roster table ── */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {displayed.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 hidden sm:table-cell">Student No.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 hidden md:table-cell">Team</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 hidden lg:table-cell">Blocks</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Sessions</th>
                  {isAdmin && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayed.map(({ participant_id, participants: p }) => {
                  if (!p) return null
                  const team = teamMap.get(participant_id)
                  const attended = attendedSessionsByParticipant.get(participant_id) ?? 0
                  return (
                    <tr key={participant_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{p.last_name}, {p.first_name}</p>
                        <p className="text-xs text-gray-400 sm:hidden">{p.student_number}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs hidden sm:table-cell">
                        {p.student_number}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                        {team ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
                            {team}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">
                        {p.blocks.length > 0 ? p.blocks.join(', ') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${attended > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {sessionCount > 0 ? `${attended}/${sessionCount}` : '—'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-3">
                            <Link
                              href={`/participants/${p.id}/edit`}
                              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
                            >
                              <Pencil size={11} /> Edit
                            </Link>
                            <RosterActions
                              eventId={eventId}
                              participantId={participant_id}
                              participantName={`${p.last_name}, ${p.first_name}`}
                            />
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-gray-400">
              {query
                ? `No ${activeTab === 'attendee' ? 'attendees' : 'officers'} matching "${query}".`
                : `No ${activeTab === 'attendee' ? 'attendees' : 'officers'} rostered yet.`}
            </p>
            {!query && isAdmin && (
              <Link
                href={`/events/${eventId}/import`}
                className="text-sm text-violet-600 hover:underline mt-2 block"
              >
                Import CSV to add participants →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── inline server-compatible search bar ───────────────────────────────────
// Must be a Client Component to handle input — kept minimal here via form GET

function SearchBar({
  eventId,
  activeTab,
  defaultValue,
}: {
  eventId: string
  activeTab: string
  defaultValue: string
}) {
  return (
    <form method="GET" className="flex gap-2">
      <input type="hidden" name="event" value={eventId} />
      <input type="hidden" name="tab" value={activeTab} />
      <input
        name="q"
        defaultValue={defaultValue}
        placeholder="Search by name, student no., email…"
        className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
      />
      {defaultValue && (
        <Link
          href={`/participants?event=${eventId}&tab=${activeTab}`}
          className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Clear
        </Link>
      )}
    </form>
  )
}
