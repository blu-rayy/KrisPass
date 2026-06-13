import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'
import { CalendarPlus, MapPin, Users, CalendarDays } from 'lucide-react'

type EventListItem = {
  id: string
  name: string
  description: string | null
  location: string | null
  created_at: string
  event_sessions: { id: string; starts_at: string }[]
  event_roster: { participant_id: string }[]
}

function sessionRange(sessions: { starts_at: string }[]): string {
  if (sessions.length === 0) return 'No sessions'
  const sorted = [...sessions].sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  const first = new Date(sorted[0].starts_at)
  const last = new Date(sorted[sorted.length - 1].starts_at)
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  if (sessions.length === 1) return fmt(first)
  return `${fmt(first)} – ${fmt(last)}`
}

export default async function EventsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: events } = await supabase
    .from('events')
    .select('id, name, description, location, created_at, event_sessions(id, starts_at), event_roster(participant_id)')
    .order('created_at', { ascending: false })
    .returns<EventListItem[]>()

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Events</h1>
        <Link href="/events/new">
          <Button size="sm">
            <CalendarPlus size={14} />
            New event
          </Button>
        </Link>
      </div>

      {events && events.length > 0 ? (
        <div className="space-y-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-violet-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-gray-900 truncate">{event.name}</h2>
                  {event.description && (
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{event.description}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
                {event.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={11} />
                    {event.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <CalendarDays size={11} />
                  {sessionRange(event.event_sessions)}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={11} />
                  {event.event_roster.length} rostered
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <CalendarDays size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">No events yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Create your first event to get started.</p>
          <Link href="/events/new">
            <Button size="sm">
              <CalendarPlus size={14} />
              New event
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
