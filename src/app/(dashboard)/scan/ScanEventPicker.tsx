'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronRight, Clock, ArrowLeft } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

type Session = { id: string; name: string | null; starts_at: string }
type EventItem = {
  id: string
  name: string
  location: string | null
  event_sessions: Session[]
}

export function ScanEventPicker({ events }: { events: EventItem[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return events.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.location ?? '').toLowerCase().includes(q),
    )
  }, [events, query])

  function handleSelectEvent(event: EventItem) {
    const sessions = event.event_sessions
    if (sessions.length === 0) return
    if (sessions.length === 1) {
      router.push(`/events/${event.id}/sessions/${sessions[0].id}/scan`)
      return
    }
    setSelectedEvent(event)
  }

  if (selectedEvent) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedEvent(null)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <span className="text-sm text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-900 truncate">
            {selectedEvent.name}
          </span>
        </div>
        <p className="text-sm text-gray-500">Choose a session to scan:</p>
        <div className="space-y-2">
          {selectedEvent.event_sessions.map((session) => (
            <button
              key={session.id}
              onClick={() =>
                router.push(
                  `/events/${selectedEvent.id}/sessions/${session.id}/scan`,
                )
              }
              className="w-full flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-violet-300 hover:bg-violet-50 transition-all text-left"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {session.name ?? 'Session'}
                </p>
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <Clock size={11} />
                  {formatDateTime(session.starts_at)}
                </p>
              </div>
              <ChevronRight size={16} className="text-gray-400 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search events…"
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No events found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((event) => {
            const sessionCount = event.event_sessions.length
            const hasNoSessions = sessionCount === 0
            return (
              <button
                key={event.id}
                onClick={() => handleSelectEvent(event)}
                disabled={hasNoSessions}
                className="w-full flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-violet-300 hover:bg-violet-50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {event.name}
                  </p>
                  {event.location && (
                    <p className="text-xs text-gray-400 mt-0.5">{event.location}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {hasNoSessions
                      ? 'No sessions'
                      : `${sessionCount} session${sessionCount > 1 ? 's' : ''}`}
                  </p>
                </div>
                <ChevronRight size={16} className="text-gray-400 shrink-0 ml-2" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
