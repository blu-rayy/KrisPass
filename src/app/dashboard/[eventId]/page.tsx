import { notFound, redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { DashboardClient } from './DashboardClient'

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

  const { count: total } = await service
    .from('event_roster')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', params.eventId)

  const { data: attendances } = await service
    .from('attendances')
    .select(`
      id,
      participant_id,
      scanned_at,
      participants (last_name, first_name)
    `)
    .eq('event_id', params.eventId)
    .order('scanned_at', { ascending: false })

  const initialAttendances = (attendances ?? []).map((a) => {
    const p = a.participants as unknown as { last_name: string; first_name: string } | null
    return {
      id: a.id,
      participant_id: a.participant_id,
      scanned_at: a.scanned_at,
      participant_name: p ? `${p.last_name}, ${p.first_name}` : 'Unknown',
      team_name: null,
    }
  })

  return (
    <DashboardClient
      event={event}
      total={total ?? 0}
      initialAttendances={initialAttendances}
    />
  )
}
