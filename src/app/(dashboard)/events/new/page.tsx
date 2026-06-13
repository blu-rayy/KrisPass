import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'
import { NewEventForm } from './NewEventForm'

export default async function NewEventPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <Link
        href="/events"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to events
      </Link>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">New event</h1>
      <NewEventForm />
    </div>
  )
}
