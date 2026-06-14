import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderPass, passFilename, eventDateRange } from '@/lib/pass/render'
import JSZip from 'jszip'

interface Params {
  params: Promise<{ id: string }>
}

type RosterRow = {
  participant_id: string
  qr_token: string
  participants: {
    first_name: string
    last_name: string
    middle_name: string | null
    suffix: string | null
    student_number: string
    participant_type: string
    blocks: string[]
  } | null
}

export async function GET(req: NextRequest, { params }: Params) {
  const { id: eventId } = await params
  const type = req.nextUrl.searchParams.get('type') // 'attendee' | 'officer' | null (= all)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  // Fetch event
  const { data: event } = await supabase
    .from('events')
    .select('name, event_sessions ( starts_at )')
    .eq('id', eventId)
    .single<{ name: string; event_sessions: { starts_at: string }[] }>()

  if (!event) return new NextResponse('Event not found', { status: 404 })

  const dateRange = eventDateRange(event.event_sessions)

  // Fetch roster
  const rosterQ = supabase
    .from('event_roster')
    .select('participant_id, qr_token, participants ( first_name, last_name, middle_name, suffix, student_number, participant_type, blocks )')
    .eq('event_id', eventId)

  const { data: roster } = await rosterQ.returns<RosterRow[]>()
  if (!roster || roster.length === 0) return new NextResponse('No participants in roster', { status: 404 })

  // Filter by type if requested
  const rows = type
    ? roster.filter((r) => r.participants?.participant_type === type)
    : roster

  if (rows.length === 0) return new NextResponse('No participants matched', { status: 404 })

  // Fetch all teams for this event
  const { data: teamEntries } = await supabase
    .from('event_teams')
    .select('participant_id, teams ( name )')
    .eq('event_id', eventId)
    .returns<{ participant_id: string; teams: { name: string } | null }[]>()

  const teamByParticipant = new Map<string, string>()
  teamEntries?.forEach((t) => {
    if (t.teams?.name) teamByParticipant.set(t.participant_id, t.teams.name)
  })

  // Render all passes and add to ZIP
  const zip = new JSZip()
  const folder = zip.folder(event.name.replace(/[^a-z0-9 ]/gi, '').trim()) ?? zip

  await Promise.all(
    rows.map(async (row) => {
      const p = row.participants
      if (!p) return

      const png = await renderPass({
        firstName: p.first_name,
        lastName: p.last_name,
        middleName: p.middle_name,
        suffix: p.suffix,
        studentNumber: p.student_number,
        blocks: p.blocks ?? [],
        teamName: teamByParticipant.get(row.participant_id) ?? null,
        participantType: p.participant_type as 'attendee' | 'officer',
        qrToken: row.qr_token,
        eventName: event.name,
        eventDateRange: dateRange,
      })

      folder.file(passFilename(p.last_name, p.first_name), png)
    })
  )

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  const suffix = type ? `-${type}s` : ''
  const eventSlug = event.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="passes-${eventSlug}${suffix}.zip"`,
    },
  })
}
