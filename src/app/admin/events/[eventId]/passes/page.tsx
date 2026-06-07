import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { Participant } from '@/types'
import { PassListClient } from './PassListClient'

export default async function PassesPage({ params }: { params: { eventId: string } }) {
  const service = createServiceClient()
  const { data: event } = await service.from('events').select('name').eq('id', params.eventId).single()
  if (!event) notFound()

  const { data: participants } = await service
    .from('participants')
    .select('id, full_name, email, team, qr_token')
    .eq('event_id', params.eventId)
    .order('full_name')

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

      <PassListClient
        participants={(participants ?? []) as Participant[]}
        appUrl={appUrl}
      />
    </div>
  )
}
