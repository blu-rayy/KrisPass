export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: caller } = await service.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { profile_id, event_id } = await request.json()
  if (!profile_id || !event_id) return NextResponse.json({ error: 'profile_id and event_id required' }, { status: 400 })

  // Get the organizer's profile
  const { data: profile } = await service
    .from('profiles')
    .select('first_name, last_name, middle_initial, school_email, student_number, degree_program')
    .eq('id', profile_id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (!profile.school_email) return NextResponse.json({ error: 'Profile has no school email' }, { status: 400 })

  // Find or create shadow participant from profile data
  const { data: existing } = await service
    .from('participants')
    .select('id')
    .eq('school_email', profile.school_email)
    .maybeSingle()

  let participantId: string

  if (existing) {
    participantId = existing.id
  } else {
    const { data: newP, error } = await service
      .from('participants')
      .insert({
        first_name: profile.first_name,
        last_name: profile.last_name,
        middle_name: profile.middle_initial ?? null,
        school_email: profile.school_email,
        personal_email: profile.school_email,
        student_number: profile.student_number ?? null,
        degree_program: profile.degree_program ?? null,
      })
      .select('id')
      .single()

    if (error || !newP) return NextResponse.json({ error: error?.message ?? 'Failed to create participant' }, { status: 500 })
    participantId = newP.id
  }

  // Add to event_roster if not already there
  const { data: existingRoster } = await service
    .from('event_roster')
    .select('qr_token')
    .eq('event_id', event_id)
    .eq('participant_id', participantId)
    .maybeSingle()

  if (existingRoster) {
    return NextResponse.json({ qr_token: existingRoster.qr_token, already_assigned: true })
  }

  const qr_token = crypto.randomUUID()
  await service.from('event_roster').insert({ event_id, participant_id: participantId, qr_token })

  return NextResponse.json({ qr_token, already_assigned: false })
}

export async function DELETE(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: caller } = await service.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { profile_id, event_id } = await request.json()

  const { data: profile } = await service.from('profiles').select('school_email').eq('id', profile_id).single()
  if (!profile?.school_email) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { data: participant } = await service.from('participants').select('id').eq('school_email', profile.school_email).maybeSingle()
  if (!participant) return NextResponse.json({ ok: true })

  await service.from('event_roster').delete().eq('event_id', event_id).eq('participant_id', participant.id)

  return NextResponse.json({ ok: true })
}
