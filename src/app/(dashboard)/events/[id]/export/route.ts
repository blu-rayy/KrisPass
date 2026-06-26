import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Papa from 'papaparse'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  // Fetch event name
  const { data: event } = await supabase
    .from('events')
    .select('name, event_sessions ( id, name, starts_at, ends_at )')
    .eq('id', id)
    .single<{ name: string; event_sessions: { id: string; name: string | null; starts_at: string; ends_at: string | null }[] }>()

  if (!event) return new NextResponse('Event not found', { status: 404 })

  const sessionIds = event.event_sessions.map((s) => s.id)
  const sessionById   = new Map(event.event_sessions.map((s) => [s.id, s.name ?? s.starts_at]))
  const sessionEndsAt = new Map(event.event_sessions.map((s) => [s.id, s.ends_at ?? null]))

  if (sessionIds.length === 0) {
    const csv = Papa.unparse([{ message: 'No sessions for this event.' }])
    return csvResponse(csv, event.name)
  }

  type AttendanceRow = {
    id: string
    event_session_id: string
    scanned_at: string
    scanned_by: string | null
    participants: { first_name: string; last_name: string; student_number: string; school_email: string; personal_email: string; participant_type: string; blocks: string[] } | null
    profiles: { full_name: string } | null
  }

  // Fetch all attendances with participant and scanned-by info
  const { data: attendances } = await supabase
    .from('attendances')
    .select(`
      id, event_session_id, scanned_at, scanned_by,
      participants ( first_name, last_name, student_number, school_email, personal_email, participant_type, blocks ),
      profiles:scanned_by ( full_name )
    `)
    .in('event_session_id', sessionIds)
    .order('scanned_at', { ascending: true })
    .returns<AttendanceRow[]>()

  if (!attendances || attendances.length === 0) {
    const csv = Papa.unparse([{ message: 'No attendance records for this event.' }])
    return csvResponse(csv, event.name)
  }

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : ''

  function totalTime(inIso: string, outIso: string | null): string {
    if (!outIso) return ''
    const diffMs = new Date(outIso).getTime() - new Date(inIso).getTime()
    if (diffMs <= 0) return ''
    const totalMins = Math.floor(diffMs / 60000)
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const rows = attendances.map((a) => {
    const endsAt = sessionEndsAt.get(a.event_session_id) ?? null
    return {
      last_name:        a.participants?.last_name ?? '',
      first_name:       a.participants?.first_name ?? '',
      student_number:   a.participants?.student_number ?? '',
      school_email:     a.participants?.school_email ?? '',
      personal_email:   a.participants?.personal_email ?? '',
      participant_type: a.participants?.participant_type ?? '',
      blocks:           (a.participants?.blocks ?? []).join(', '),
      session:          sessionById.get(a.event_session_id) ?? '',
      time_in:          fmt(a.scanned_at),
      time_out:         fmt(endsAt),
      total_time:       totalTime(a.scanned_at, endsAt),
      scanned_by:       a.profiles?.full_name ?? '',
    }
  })

  const csv = Papa.unparse(rows, {
    columns: [
      'last_name', 'first_name', 'student_number', 'school_email', 'personal_email',
      'participant_type', 'blocks', 'session', 'time_in', 'time_out', 'total_time', 'scanned_by',
    ],
  })

  return csvResponse(csv, event.name)
}

function csvResponse(csv: string, eventName: string) {
  const slug = eventName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const filename = `attendance-${slug}.csv`
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
