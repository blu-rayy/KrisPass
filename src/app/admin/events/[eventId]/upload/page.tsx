import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { CsvUploader } from '@/components/participants/CsvUploader'

export default async function UploadPage({ params }: { params: { eventId: string } }) {
  const service = createServiceClient()
  const { data: event } = await service.from('events').select('name').eq('id', params.eventId).single()
  if (!event) notFound()

  return (
    <div className="max-w-2xl">
      <nav className="text-sm text-gray-400 mb-1">
        <Link href="/admin/events" className="hover:text-gray-600">Events</Link>
        <span className="mx-2">/</span>
        <Link href={`/admin/events/${params.eventId}`} className="hover:text-gray-600">{event.name}</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-600">Import CSV</span>
      </nav>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Import participants</h1>
      <CsvUploader eventId={params.eventId} />
    </div>
  )
}
