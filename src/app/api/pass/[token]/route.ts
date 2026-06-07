export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(_: Request, { params }: { params: { token: string } }) {
  const service = createServiceClient()

  const { data: roster } = await service
    .from('event_roster')
    .select('qr_token, participant_id, event_id')
    .eq('qr_token', params.token)
    .single()

  if (!roster) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: participant } = await service
    .from('participants')
    .select('first_name, last_name, middle_name, suffix, school_email, school, student_number')
    .eq('id', roster.participant_id)
    .single()

  const { data: event } = await service
    .from('events')
    .select('name, event_date, location')
    .eq('id', roster.event_id)
    .single()

  return NextResponse.json({
    qr_token: roster.qr_token,
    participant: participant ?? null,
    event: event ?? null,
  })
}
