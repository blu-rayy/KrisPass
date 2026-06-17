import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderPass, renderPassAsPdf, passFilename, eventDateRange } from '@/lib/pass/render'

interface Params {
  params: Promise<{ id: string; profileId: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  const { id: eventId, profileId } = await params
  const format = req.nextUrl.searchParams.get('format') === 'pdf' ? 'pdf' : 'png'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: event } = await supabase
    .from('events')
    .select('name, event_sessions ( starts_at )')
    .eq('id', eventId)
    .single<{ name: string; event_sessions: { starts_at: string }[] }>()

  if (!event) return new NextResponse('Event not found', { status: 404 })

  // Verify this profile is actually assigned to the event
  const { data: staffEntry } = await supabase
    .from('event_staff')
    .select('profile_id')
    .eq('event_id', eventId)
    .eq('profile_id', profileId)
    .maybeSingle()

  if (!staffEntry) return new NextResponse('Staff member not assigned to this event', { status: 404 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, committee')
    .eq('id', profileId)
    .single<{ full_name: string; role: string; committee: string | null }>()

  if (!profile) return new NextResponse('Profile not found', { status: 404 })

  const roleLabel = profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
  const identifier = profile.committee ? `${roleLabel} · ${profile.committee}` : roleLabel

  // Split full_name: first word = firstName, rest = lastName for display
  const parts = profile.full_name.trim().split(/\s+/)
  const firstName = parts.length > 1 ? parts[0] : ''
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : parts[0]

  const passData = {
    firstName,
    lastName,
    studentNumber: identifier,
    blocks: [],
    teamName: null,
    participantType: 'organizer' as const,
    qrToken: profileId,
    eventName: event.name,
    eventDateRange: eventDateRange(event.event_sessions),
  }

  const buffer = format === 'pdf' ? await renderPassAsPdf(passData) : await renderPass(passData)
  const filename = passFilename(event.name, lastName, firstName || lastName, format)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': format === 'pdf' ? 'application/pdf' : 'image/png',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
