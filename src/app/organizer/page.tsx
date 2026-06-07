import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'

export default async function OrganizerPage() {
  const service = createServiceClient()
  const { data: events } = await service
    .from('events')
    .select('*')
    .order('event_date', { ascending: false })

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Select an event to scan</h1>

      {!events || events.length === 0 ? (
        <p className="text-gray-400 text-sm">No events available.</p>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/organizer/scan/${event.id}`}
              className="block bg-white rounded-xl border border-gray-200 px-5 py-4 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <p className="font-semibold text-gray-900">{event.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">{formatDate(event.event_date)}</p>
              {event.location && <p className="text-xs text-gray-400 mt-0.5">{event.location}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
