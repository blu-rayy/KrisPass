import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderPass, renderPassAsPdf, passFilename, eventDateRange } from '@/lib/pass/render'

interface Params {
  params: Promise<{ id: string; participantId: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  const { id: eventId, participantId } = await params
  const format = req.nextUrl.searchParams.get('format') === 'pdf' ? 'pdf' : 'png'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  // Fetch event + sessions
  const { data: event } = await supabase
    .from('events')
    .select('name, event_sessions ( starts_at )')
    .eq('id', eventId)
    .single<{ name: string; event_sessions: { starts_at: string }[] }>()

  if (!event) return new NextResponse('Event not found', { status: 404 })

  // Fetch roster entry (qr_token) for this participant
  const { data: rosterEntry } = await supabase
    .from('event_roster')
    .select('qr_token')
    .eq('event_id', eventId)
    .eq('participant_id', participantId)
    .single<{ qr_token: string }>()

  if (!rosterEntry) return new NextResponse('Participant not rostered', { status: 404 })

  // Fetch participant
  const { data: participant } = await supabase
    .from('participants')
    .select('first_name, last_name, middle_name, suffix, student_number, participant_type, blocks, committee')
    .eq('id', participantId)
    .single<{
      first_name: string
      last_name: string
      middle_name: string | null
      suffix: string | null
      student_number: string
      participant_type: string
      blocks: string[]
      committee: string | null
    }>()

  if (!participant) return new NextResponse('Participant not found', { status: 404 })

  // Fetch team (if any)
  const { data: teamEntry } = await supabase
    .from('event_teams')
    .select('teams ( name )')
    .eq('event_id', eventId)
    .eq('participant_id', participantId)
    .maybeSingle<{ teams: { name: string } | null }>()

  const passData = {
    firstName: participant.first_name,
    lastName: participant.last_name,
    middleName: participant.middle_name,
    suffix: participant.suffix,
    studentNumber: participant.student_number,
    blocks: participant.blocks ?? [],
    teamName: teamEntry?.teams?.name ?? null,
    committee: participant.committee,
    participantType: participant.participant_type as 'attendee' | 'officer',
    qrToken: rosterEntry.qr_token,
    eventName: event.name,
    eventDateRange: eventDateRange(event.event_sessions),
  }

  const buffer = format === 'pdf' ? await renderPassAsPdf(passData) : await renderPass(passData)
  const filename = passFilename(event.name, participant.last_name, participant.first_name, format)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': format === 'pdf' ? 'application/pdf' : 'image/png',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
