import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: profile } = await service.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, password, full_name, role } = await request.json()
  if (!email || !password) return NextResponse.json({ error: 'email and password are required' }, { status: 400 })

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
    email,
    full_name: full_name || null,
    role: role === 'admin' ? 'admin' : 'organizer',
  })

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ id: newUser.user.id }, { status: 201 })
}
