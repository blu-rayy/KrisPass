import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { formatDate, formatDateShort } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Participant } from '@/types'

export default async function EventDetailPage({ params }: { params: { eventId: string } }) {
  const service = createServiceClient()

  const { data: event } = await service
    .from('events')
    .select('*')
    .eq('id', params.eventId)
    .single()

  if (!event) notFound()

  const { data: participants } = await service
    .from('participants')
    .select('*')
    .eq('event_id', params.eventId)
    .order('full_name')

  const total = participants?.length ?? 0
  const checkedIn = participants?.filter((p: Participant) => p.checked_in).length ?? 0

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <nav className="text-sm text-gray-400 mb-1">
            <Link href="/admin/events" className="hover:text-gray-600">Events</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-600">{event.name}</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatDate(event.event_date)}{event.location && ` · ${event.location}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/events/${params.eventId}/upload`}
            className="text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Import CSV
          </Link>
          <Link
            href={`/admin/events/${params.eventId}/passes`}
            className="text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            View passes
          </Link>
          <Link
            href={`/dashboard/${params.eventId}`}
            className="text-sm font-medium px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Live dashboard
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total registered', value: total },
          { label: 'Checked in', value: checkedIn },
          { label: 'Remaining', value: total - checkedIn },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {total === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center text-gray-400">
          <p className="font-medium">No participants yet</p>
          <p className="text-sm mt-1">
            <Link href={`/admin/events/${params.eventId}/upload`} className="text-blue-600 hover:underline">
              Import a CSV roster
            </Link>{' '}
            to add participants.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Team</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Checked in at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(participants ?? []).map((p: Participant) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">{p.full_name}</td>
                  <td className="px-5 py-3 text-gray-500">{p.email}</td>
                  <td className="px-5 py-3 text-gray-500">{p.team ?? '—'}</td>
                  <td className="px-5 py-3">
                    <Badge variant={p.checked_in ? 'green' : 'gray'}>
                      {p.checked_in ? 'Checked in' : 'Not yet'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {p.checked_in_at ? formatDateShort(p.checked_in_at) : '—'}
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
