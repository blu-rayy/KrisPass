import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { formatDateShort } from '@/lib/utils'

export default async function EventsPage() {
  const service = createServiceClient()
  const { data: events } = await service
    .from('events')
    .select('*')
    .order('event_date', { ascending: false })

  const eventsWithStats = await Promise.all(
    (events ?? []).map(async (event) => {
      const { count: rosterCount } = await service
        .from('event_roster')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)

      const { count: attendanceCount } = await service
        .from('attendances')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)

      return { ...event, roster_count: rosterCount ?? 0, attendance_count: attendanceCount ?? 0 }
    })
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <Link
          href="/admin/events/new"
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          New event
        </Link>
      </div>

      {eventsWithStats.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No events yet</p>
          <p className="text-sm mt-1">Create your first event to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Event</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Date</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Roster</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Attended</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {eventsWithStats.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    <Link href={`/admin/events/${event.id}`} className="hover:text-blue-600">
                      {event.name}
                    </Link>
                    {event.location && (
                      <p className="text-xs text-gray-400 font-normal mt-0.5">{event.location}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{formatDateShort(event.event_date)}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{event.roster_count}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-gray-700">{event.attendance_count}</span>
                    {event.roster_count > 0 && (
                      <span className="text-gray-400 ml-1">
                        ({Math.round((event.attendance_count / event.roster_count) * 100)}%)
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/dashboard/${event.id}`}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Dashboard →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
