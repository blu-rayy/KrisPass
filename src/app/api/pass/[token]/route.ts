import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(_: Request, { params }: { params: { token: string } }) {
  const service = createServiceClient()

  const { data: participant } = await service
    .from('participants')
    .select('full_name, qr_token, event_id')
    .eq('qr_token', params.token)
    .single()

  if (!participant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: event } = await service
    .from('events')
    .select('name, event_date, location')
    .eq('id', participant.event_id)
    .single()

  return NextResponse.json({
    full_name: participant.full_name,
    qr_token: participant.qr_token,
    event: event ?? null,
  })
}
