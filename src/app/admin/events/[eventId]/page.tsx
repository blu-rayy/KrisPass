import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'

export default async function EventDetailPage({ params }: { params: { eventId: string } }) {
  const service = createServiceClient()

  const { data: event } = await service
    .from('events')
    .select('*')
    .eq('id', params.eventId)
    .single()

  if (!event) notFound()

  const { data: roster } = await service
    .from('event_roster')
    .select(`
      qr_token,
      participant_id,
      participants (
        id, last_name, first_name, middle_name, suffix, school_email, student_number
      )
    `)
    .eq('event_id', params.eventId)

  const { data: attendances } = await service
    .from('attendances')
    .select('participant_id, scanned_at')
    .eq('event_id', params.eventId)

  const attendanceMap = new Map(
    (attendances ?? []).map((a) => [a.participant_id, a.scanned_at])
  )

  const total = roster?.length ?? 0
  const attended = attendances?.length ?? 0

  const rows = (roster ?? [])
    .map((r) => {
      const p = r.participants as unknown as Record<string, string | null>
      return {
        id: p.id,
        last_name: p.last_name,
        first_name: p.first_name,
        middle_name: p.middle_name,
        suffix: p.suffix,
        school_email: p.school_email,
        student_number: p.student_number,
        qr_token: r.qr_token,
        attended: attendanceMap.has(p.id as string),
        scanned_at: attendanceMap.get(p.id as string) ?? null,
      }
    })
    .sort((a, b) => (a.last_name ?? '').localeCompare(b.last_name ?? ''))

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
          { label: 'Total on roster', value: total },
          { label: 'Attended', value: attended },
          { label: 'Absent', value: total - attended },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {total === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center text-gray-400">
          <p className="font-medium">No participants on roster yet</p>
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
                <th className="text-left px-5 py-3 font-medium text-gray-600">School email</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Student no.</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Scanned at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((p) => (
                <tr key={p.id as string} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {p.last_name}, {p.first_name}{p.middle_name ? ` ${p.middle_name}` : ''}{p.suffix ? ` ${p.suffix}` : ''}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{p.school_email}</td>
                  <td className="px-5 py-3 text-gray-500">{p.student_number ?? '—'}</td>
                  <td className="px-5 py-3">
                    <Badge variant={p.attended ? 'green' : 'gray'}>
                      {p.attended ? 'Attended' : 'Absent'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {p.scanned_at
                      ? new Date(p.scanned_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
                      : '—'}
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
