import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { QrCode } from 'lucide-react'
import { ScanEventPicker } from './ScanEventPicker'

type Session = { id: string; name: string | null; starts_at: string }
type EventRow = {
  id: string
  name: string
  location: string | null
  event_sessions: Session[]
}

export default async function ScanIndexPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: events } = await supabase
    .from('events')
    .select('id, name, location, event_sessions ( id, name, starts_at )')
    .order('created_at', { ascending: false })
    .returns<EventRow[]>()

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <QrCode size={18} className="text-violet-600" />
        <h1 className="text-xl font-semibold text-gray-900">Scan QR</h1>
      </div>
      <ScanEventPicker events={events ?? []} />
    </div>
  )
}
