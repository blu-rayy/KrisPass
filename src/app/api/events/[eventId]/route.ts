export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function getAdminUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const service = createServiceClient()
  const { data: profile } = await service.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return user
}

export async function GET(_: Request, { params }: { params: { eventId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data, error } = await service
    .from('events')
    .select('*')
    .eq('id', params.eventId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { count: rosterCount } = await service
    .from('event_roster')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', params.eventId)

  const { count: attendanceCount } = await service
    .from('attendances')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', params.eventId)

  return NextResponse.json({
    ...data,
    roster_count: rosterCount ?? 0,
    attendance_count: attendanceCount ?? 0,
  })
}

export async function PATCH(request: Request, { params }: { params: { eventId: string } }) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const service = createServiceClient()
  const { data, error } = await service
    .from('events')
    .update(body)
    .eq('id', params.eventId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: { eventId: string } }) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = createServiceClient()
  const { error } = await service.from('events').delete().eq('id', params.eventId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
