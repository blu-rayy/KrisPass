import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: events, error } = await service
    .from('events')
    .select('*')
    .order('event_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const eventsWithStats = await Promise.all(
    (events ?? []).map(async (event) => {
      const { count: rosterCount } = await service
        .from('event_roster')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)

      const { count: attendanceCount } = await service
        .from('attendances')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)

      return { ...event, roster_count: rosterCount ?? 0, attendance_count: attendanceCount ?? 0 }
    })
  )

  return NextResponse.json(eventsWithStats)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: profile } = await service.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { name, event_date, location } = body

  if (!name || !event_date) {
    return NextResponse.json({ error: 'name and event_date are required' }, { status: 400 })
  }

  const { data, error } = await service
    .from('events')
    .insert({ name, event_date, location, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
