'use server'

import { redirect } from 'next/navigation'
import { nanoid } from 'nanoid'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionResult, Role } from '@/types'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return null
  return user
}

function makeTempPassword(): string {
  return nanoid(14)
}

export async function createUser(
  _prev: ActionResult<{ tempPassword: string }> | null,
  formData: FormData
): Promise<ActionResult<{ tempPassword: string }>> {
  const actor = await requireAdmin()
  if (!actor) return { ok: false, error: 'Unauthorized.' }

  const email = (formData.get('email') as string).trim().toLowerCase()
  const full_name = (formData.get('full_name') as string).trim()
  const role = formData.get('role') as Role
  const committee = (formData.get('committee') as string).trim() || null

  const pass = makeTempPassword()
  const admin = createAdminClient()

  const { data, error: authErr } = await admin.auth.admin.createUser({
    email,
    password: pass,
    email_confirm: true,
  })
  if (authErr) return { ok: false, error: authErr.message }

  const { error: profileErr } = await admin
    .from('profiles')
    .insert({
      id: data.user.id,
      full_name,
      role,
      committee,
      school_email: email,
      must_change_password: true,
    })

  if (profileErr) {
    await admin.auth.admin.deleteUser(data.user.id)
    return { ok: false, error: profileErr.message }
  }

  return { ok: true, data: { tempPassword: pass } }
}

export async function updateUser(
  id: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const actor = await requireAdmin()
  if (!actor) return { ok: false, error: 'Unauthorized.' }

  const full_name = (formData.get('full_name') as string).trim()
  const role = formData.get('role') as Role
  const committee = (formData.get('committee') as string).trim() || null

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ full_name, role, committee })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: undefined }
}

export async function resetUserPassword(
  id: string,
  _prev: ActionResult<{ tempPassword: string }> | null,
  _formData: FormData
): Promise<ActionResult<{ tempPassword: string }>> {
  const actor = await requireAdmin()
  if (!actor) return { ok: false, error: 'Unauthorized.' }

  const pass = makeTempPassword()
  const admin = createAdminClient()

  const { error: authErr } = await admin.auth.admin.updateUserById(id, { password: pass })
  if (authErr) return { ok: false, error: authErr.message }

  await admin.from('profiles').update({ must_change_password: true }).eq('id', id)

  return { ok: true, data: { tempPassword: pass } }
}

export async function deleteUser(
  id: string,
  _prev: ActionResult | null,
  _formData: FormData
): Promise<ActionResult> {
  const actor = await requireAdmin()
  if (!actor) return { ok: false, error: 'Unauthorized.' }
  if (id === actor.id) return { ok: false, error: 'Cannot delete your own account.' }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return { ok: false, error: error.message }

  redirect('/users')
}
