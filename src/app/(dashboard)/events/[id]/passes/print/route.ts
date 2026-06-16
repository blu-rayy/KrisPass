import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderPass, eventDateRange } from '@/lib/pass/render'
import React from 'react'
import { renderToBuffer, Document, Page, Image, View, StyleSheet } from '@react-pdf/renderer'

export const maxDuration = 300

async function renderBatched<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = await Promise.all(items.slice(i, i + concurrency).map(fn))
    results.push(...batch)
  }
  return results
}

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

const styles = StyleSheet.create({
  page: { flexDirection: 'row', flexWrap: 'wrap', padding: 20, gap: 10 },
  pass: { width: '48%' },
})

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: eventId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: event } = await supabase
    .from('events')
    .select('name, event_sessions ( starts_at )')
    .eq('id', eventId)
    .single<{ name: string; event_sessions: { starts_at: string }[] }>()

  if (!event) return new NextResponse('Event not found', { status: 404 })

  const dateRange = eventDateRange(event.event_sessions)

  const { data: roster } = await supabase
    .from('event_roster')
    .select('participant_id, qr_token, participants ( first_name, last_name, middle_name, suffix, student_number, participant_type, blocks )')
    .eq('event_id', eventId)
    .returns<RosterRow[]>()

  if (!roster || roster.length === 0) return new NextResponse('No participants', { status: 404 })

  const { data: teamEntries } = await supabase
    .from('event_teams')
    .select('participant_id, teams ( name )')
    .eq('event_id', eventId)
    .returns<{ participant_id: string; teams: { name: string } | null }[]>()

  const teamByParticipant = new Map<string, string>()
  teamEntries?.forEach((t) => {
    if (t.teams?.name) teamByParticipant.set(t.participant_id, t.teams.name)
  })

  const passImages = await renderBatched(roster, 8, async (row) => {
    const p = row.participants
    if (!p) return null
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
    return `data:image/png;base64,${png.toString('base64')}`
  })

  const validImages = passImages.filter(Boolean) as string[]

  const pdf = await renderToBuffer(
    React.createElement(
      Document,
      { title: `${event.name} — Passes` },
      React.createElement(
        Page,
        { size: 'A4', style: styles.page },
        ...validImages.map((src, i) =>
          React.createElement(View, { key: i, style: styles.pass },
            React.createElement(Image, { src })
          )
        )
      )
    )
  )

  const eventSlug = event.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="print-passes-${eventSlug}.pdf"`,
    },
  })
}
