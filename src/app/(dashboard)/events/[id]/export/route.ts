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
    .select('name, event_sessions ( id, name, starts_at )')
    .eq('id', id)
    .single<{ name: string; event_sessions: { id: string; name: string | null; starts_at: string }[] }>()

  if (!event) return new NextResponse('Event not found', { status: 404 })

  const sessionIds = event.event_sessions.map((s) => s.id)
  const sessionById = new Map(event.event_sessions.map((s) => [s.id, s.name ?? s.starts_at]))

  if (sessionIds.length === 0) {
    const csv = Papa.unparse([{ message: 'No sessions for this event.' }])
    return csvResponse(csv, event.name)
  }

  // Fetch all attendances with participant and scanned-by info
  const { data: attendances } = await supabase
    .from('attendances')
    .select(`
      id, event_session_id, scanned_at, scanned_by,
      participants ( first_name, last_name, student_number, school_email, participant_type ),
      profiles:scanned_by ( full_name )
    `)
    .in('event_session_id', sessionIds)
    .order('scanned_at', { ascending: true })

  if (!attendances || attendances.length === 0) {
    const csv = Papa.unparse([{ message: 'No attendance records for this event.' }])
    return csvResponse(csv, event.name)
  }

  const rows = attendances.map((a: any) => ({
    last_name: a.participants?.last_name ?? '',
    first_name: a.participants?.first_name ?? '',
    student_number: a.participants?.student_number ?? '',
    school_email: a.participants?.school_email ?? '',
    participant_type: a.participants?.participant_type ?? '',
    session: sessionById.get(a.event_session_id) ?? '',
    scanned_at: a.scanned_at
      ? new Date(a.scanned_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
      : '',
    scanned_by: a.profiles?.full_name ?? '',
  }))

  const csv = Papa.unparse(rows, {
    columns: [
      'last_name', 'first_name', 'student_number', 'school_email',
      'participant_type', 'session', 'scanned_at', 'scanned_by',
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
