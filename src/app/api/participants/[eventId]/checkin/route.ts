export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request, { params }: { params: { eventId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await request.json()
  if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 })

  const service = createServiceClient()

  // Look up event_roster by qr_token + event_id
  const { data: roster } = await service
    .from('event_roster')
    .select('participant_id')
    .eq('qr_token', token)
    .eq('event_id', params.eventId)
    .single()

  if (!roster) {
    return NextResponse.json({ result: 'not_found' }, { status: 404 })
  }

  const { participant_id } = roster

  // Check for existing attendance (duplicate)
  const { data: existing } = await service
    .from('attendances')
    .select('id, scanned_at')
    .eq('event_id', params.eventId)
    .eq('participant_id', participant_id)
    .maybeSingle()

  if (existing) {
    // Second scan = participant timed out (left), remove their attendance
    await service.from('attendances').delete().eq('id', existing.id)
    const { data: participant } = await service
      .from('participants')
      .select('*')
      .eq('id', participant_id)
      .single()
    return NextResponse.json({ result: 'timeout', participant })
  }

  // Insert attendance record
  const { error: insertError } = await service.from('attendances').insert({
    event_id: params.eventId,
    participant_id,
    scanned_by: user.id,
  })

  if (insertError) {
    if (insertError.code === '23505') {
      await service.from('attendances').delete().eq('event_id', params.eventId).eq('participant_id', participant_id)
      const { data: participant } = await service.from('participants').select('*').eq('id', participant_id).single()
      return NextResponse.json({ result: 'timeout', participant })
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const { data: participant } = await service
    .from('participants')
    .select('*')
    .eq('id', participant_id)
    .single()

  return NextResponse.json({ result: 'success', participant })
}
