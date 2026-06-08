import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { PassListClient } from './PassListClient'

export default async function PassesPage({ params }: { params: { eventId: string } }) {
  const service = createServiceClient()
  const { data: event } = await service.from('events').select('name').eq('id', params.eventId).single()
  if (!event) notFound()

  const { data: roster } = await service
    .from('event_roster')
    .select(`
      qr_token,
      participants (
        id, last_name, first_name, middle_name, suffix, school_email, student_number
      )
    `)
    .eq('event_id', params.eventId)

  const rows = (roster ?? []).map((r) => {
    const p = r.participants as unknown as Record<string, string | null>
    return {
      id: p.id as string,
      last_name: p.last_name as string,
      first_name: p.first_name as string,
      middle_name: p.middle_name,
      suffix: p.suffix,
      school_email: p.school_email as string,
      student_number: p.student_number,
      qr_token: r.qr_token,
    }
  }).sort((a, b) => a.last_name.localeCompare(b.last_name))

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  return (
    <div>
      <nav className="text-sm text-gray-400 mb-1">
        <Link href="/admin/events" className="hover:text-gray-600">Events</Link>
        <span className="mx-2">/</span>
        <Link href={`/admin/events/${params.eventId}`} className="hover:text-gray-600">{event.name}</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-600">Passes</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Participant passes</h1>
        <a
          href={`/api/participants/${params.eventId}?export=csv`}
          className="text-sm font-medium px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Export CSV
        </a>
      </div>

      <PassListClient rows={rows} appUrl={appUrl} eventName={event.name} />
    </div>
  )
}
