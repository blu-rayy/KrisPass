export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: profile } = await service.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const {
    email, password,
    last_name, first_name, middle_initial, suffix,
    student_number, school_email, year_level, degree_program, blocks,
    committee, role,
  } = await request.json()

  if (!email || !password || !last_name || !first_name) {
    return NextResponse.json({ error: 'email, password, last_name, and first_name are required' }, { status: 400 })
  }

  const validRoles = ['admin', 'organizer', 'scanner']
  const assignedRole = validRoles.includes(role) ? role : 'organizer'

  const { data: newUser, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError || !newUser.user) {
    return NextResponse.json({ error: createError?.message ?? 'Failed to create user' }, { status: 500 })
  }

  const { error: profileError } = await service.from('profiles').insert({
    id: newUser.user.id,
    last_name,
    first_name,
    middle_initial: middle_initial || null,
    suffix: suffix || null,
    student_number: student_number || null,
    school_email: school_email || null,
    year_level: year_level || null,
    degree_program: degree_program || null,
    blocks: blocks || null,
    committee: committee || null,
    role: assignedRole,
  })

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ id: newUser.user.id }, { status: 201 })
}
