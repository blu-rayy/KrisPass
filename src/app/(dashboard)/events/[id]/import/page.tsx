import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'
import { ImportForm } from './ImportForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ImportPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (currentProfile?.role !== 'admin') redirect(`/events/${id}`)

  const { data: event } = await supabase
    .from('events')
    .select('id, name')
    .eq('id', id)
    .single()

  if (!event) notFound()

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <Link
        href={`/events/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft size={14} />
        {event.name}
      </Link>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Import participants</h1>
      <p className="text-sm text-gray-500 mb-6">
        Upload a CSV to add participants to this event. Existing participants (matched by school email) will be updated.
      </p>
      <ImportForm eventId={id} />
    </div>
  )
}
