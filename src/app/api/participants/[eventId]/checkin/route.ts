import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request, { params }: { params: { eventId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await request.json()
  if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 })

  const service = createServiceClient()

  const { data: participant } = await service
    .from('participants')
    .select('*')
    .eq('qr_token', token)
    .eq('event_id', params.eventId)
    .single()

  if (!participant) {
    await service.from('scan_log').insert({
      event_id: params.eventId,
      scanned_by: user.id,
      result: 'not_found',
    })
    return NextResponse.json({ result: 'not_found' }, { status: 404 })
  }

  if (participant.checked_in) {
    await service.from('scan_log').insert({
      participant_id: participant.id,
      event_id: params.eventId,
      scanned_by: user.id,
      result: 'duplicate',
    })
    return NextResponse.json({ result: 'duplicate', participant }, { status: 409 })
  }

  const now = new Date().toISOString()
  await service
    .from('participants')
    .update({ checked_in: true, checked_in_at: now, checked_in_by: user.id })
    .eq('id', participant.id)

  await service.from('scan_log').insert({
    participant_id: participant.id,
    event_id: params.eventId,
    scanned_by: user.id,
    result: 'success',
  })

  return NextResponse.json({ result: 'success', participant: { ...participant, checked_in: true, checked_in_at: now } })
}
