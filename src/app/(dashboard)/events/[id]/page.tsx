import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Pencil, MapPin, Upload, QrCode, Ticket, Radio } from 'lucide-react'
import { SessionManager } from './SessionManager'
import { StaffManager } from './StaffManager'

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
  profiles: {
    id: string
    full_name: string
    role: string
    committee: string | null
  }
}

type EventDetail = {
  id: string
  name: string
  description: string | null
  location: string | null
  created_by: string | null
  created_at: string
  event_sessions: Session[]
  event_roster: { participant_id: string }[]
  event_staff: StaffMember[]
}

type ProfileOption = {
  id: string
  full_name: string
  role: string
  committee: string | null
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = currentProfile?.role === 'admin'

  const { data: event } = await supabase
    .from('events')
    .select(`
      id, name, description, location, created_by, created_at,
      event_sessions ( id, name, starts_at, ends_at, created_at ),
      event_roster ( participant_id ),
      event_staff ( profile_id, assigned_at, profiles ( id, full_name, role, committee ) )
    `)
    .eq('id', id)
    .order('starts_at', { referencedTable: 'event_sessions', ascending: true })
    .single<EventDetail>()

  if (!event) notFound()

  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, role, committee')
    .order('full_name')
    .returns<ProfileOption[]>()

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-gray-900">{event.name}</h1>
          {event.location && (
            <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
              <MapPin size={13} />
              {event.location}
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
          <Pencil size={14} />
          Edit
        </Link>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Sessions</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{event.event_sessions.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Rostered</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{event.event_roster.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Staff</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{event.event_staff.length}</p>
        </div>
      </div>

      {/* Sessions */}
      <SessionManager eventId={id} sessions={event.event_sessions} />

      {/* Staff */}
      <StaffManager
        eventId={id}
        staff={event.event_staff}
        allProfiles={allProfiles ?? []}
        isAdmin={isAdmin}
      />

      {/* Feature links */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">More features</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Link
            href={`/events/${id}/import`}
            className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-4 text-center hover:border-violet-300 hover:bg-violet-50 transition-all"
          >
            <Upload size={18} className="text-violet-500" />
            <span className="text-xs font-medium text-gray-700">Import</span>
            <span className="text-xs text-gray-400">Phase 5</span>
          </Link>
          <Link
            href={`/events/${id}/passes`}
            className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-4 text-center hover:border-violet-300 hover:bg-violet-50 transition-all"
          >
            <Ticket size={18} className="text-violet-500" />
            <span className="text-xs font-medium text-gray-700">Passes</span>
            <span className="text-xs text-gray-400">Phase 7</span>
          </Link>
          <Link
            href={event.event_sessions[0]
              ? `/events/${id}/sessions/${event.event_sessions[0].id}/scan`
              : '#'}
            className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-4 text-center hover:border-violet-300 hover:bg-violet-50 transition-all"
          >
            <QrCode size={18} className="text-violet-500" />
            <span className="text-xs font-medium text-gray-700">Scan</span>
            <span className="text-xs text-gray-400">Phase 8</span>
          </Link>
          <Link
            href={`/events/${id}/live`}
            className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-4 text-center hover:border-violet-300 hover:bg-violet-50 transition-all"
          >
            <Radio size={18} className="text-violet-500" />
            <span className="text-xs font-medium text-gray-700">Live</span>
            <span className="text-xs text-gray-400">Phase 9</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
