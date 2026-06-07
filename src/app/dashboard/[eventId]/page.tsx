import { notFound, redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { DashboardClient } from './DashboardClient'
import { Participant } from '@/types'

export default async function DashboardPage({ params }: { params: { eventId: string } }) {
  const profile = await getProfile()
  if (!profile) redirect('/login')

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
    .order('checked_in_at', { ascending: false })

  return (
    <DashboardClient
      event={event}
      initialParticipants={(participants ?? []) as Participant[]}
    />
  )
}
