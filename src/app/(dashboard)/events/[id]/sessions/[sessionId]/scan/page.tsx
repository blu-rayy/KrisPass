import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ScannerView } from './ScannerView'

type SessionRow = {
  id: string
  name: string | null
  starts_at: string
  ends_at: string | null
  events: { id: string; name: string }
}

export default async function ScanPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>
}) {
  const { id, sessionId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: session } = await supabase
    .from('event_sessions')
    .select('id, name, starts_at, ends_at, events ( id, name )')
    .eq('id', sessionId)
    .eq('event_id', id)
    .maybeSingle<SessionRow>()

  if (!session) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <ScannerView
        eventId={id}
        sessionId={sessionId}
        sessionName={session.name ?? 'Session'}
        eventName={session.events.name}
        scannerName={profile?.full_name ?? 'Staff'}
      />
    </div>
  )
}
