import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data, error } = await service
    .from('events')
    .select(`
      *,
      participant_count:participants(count),
      checked_in_count:participants(count)
    `)
    .order('event_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Flatten counts
  const events = (data ?? []).map((e: Record<string, unknown>) => ({
    ...e,
    participant_count: (e.participant_count as { count: number }[])?.[0]?.count ?? 0,
    checked_in_count: 0,
  }))

  return NextResponse.json(events)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: profile } = await service.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { name, description, event_date, location } = body

  if (!name || !event_date) {
    return NextResponse.json({ error: 'name and event_date are required' }, { status: 400 })
  }

  const { data, error } = await service
    .from('events')
    .insert({ name, description, event_date, location, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
