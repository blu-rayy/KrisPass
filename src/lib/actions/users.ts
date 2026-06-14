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
  const first_name = (formData.get('first_name') as string).trim() || null
  const last_name = (formData.get('last_name') as string).trim() || null
  const middle_name = (formData.get('middle_name') as string).trim() || null
  const suffix = (formData.get('suffix') as string).trim() || null
  const personal_email = (formData.get('personal_email') as string).trim().toLowerCase() || null
  const contact_no = (formData.get('contact_no') as string).trim() || null
  const student_number = (formData.get('student_number') as string).trim() || null
  const school = (formData.get('school') as string).trim() || null
  const degree_program = (formData.get('degree_program') as string).trim() || null
  const blocksRaw = (formData.get('blocks') as string).trim()
  const blocks = blocksRaw ? blocksRaw.split(',').map((b) => b.trim()).filter(Boolean) : []

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
      first_name,
      last_name,
      middle_name,
      suffix,
      personal_email,
      contact_no,
      student_number,
      school,
      degree_program,
      blocks,
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

export async function setUserEventAssignments(
  userId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const actor = await requireAdmin()
  if (!actor) return { ok: false, error: 'Unauthorized.' }

  const newEventIds = formData.getAll('event_ids') as string[]

  const admin = createAdminClient()

  const { data: current } = await admin
    .from('event_staff')
    .select('event_id')
    .eq('profile_id', userId)

  const currentIds = new Set((current ?? []).map((r) => r.event_id as string))
  const newIds = new Set(newEventIds)

  const toRemove = [...currentIds].filter((id) => !newIds.has(id))
  const toAdd = [...newIds].filter((id) => !currentIds.has(id))

  if (toRemove.length > 0) {
    await admin.from('event_staff').delete()
      .eq('profile_id', userId)
      .in('event_id', toRemove)
  }

  if (toAdd.length > 0) {
    const { data: profile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!profile) return { ok: false, error: 'Profile not found.' }

    // Find or create the participant record linked to this staff user
    let participantId: string | null = null

    const { data: existing } = await admin
      .from('participants')
      .select('id')
      .eq('profile_id', userId)
      .maybeSingle()

    if (existing) {
      participantId = existing.id
    } else if (profile.school_email && profile.student_number) {
      const nameParts = profile.full_name.trim().split(/\s+/)
      const { data: created, error: createErr } = await admin
        .from('participants')
        .upsert(
          {
            profile_id: userId,
            participant_type: 'officer',
            last_name: profile.last_name ?? nameParts[nameParts.length - 1] ?? profile.full_name,
            first_name: profile.first_name ?? nameParts[0] ?? '',
            middle_name: profile.middle_name ?? null,
            suffix: profile.suffix ?? null,
            school_email: profile.school_email,
            personal_email: profile.personal_email ?? profile.school_email,
            contact_no: profile.contact_no ?? null,
            school: profile.school ?? null,
            student_number: profile.student_number,
            degree_program: profile.degree_program ?? null,
            blocks: profile.blocks ?? [],
          },
          { onConflict: 'school_email' }
        )
        .select('id')
        .single()

      if (createErr) return { ok: false, error: `Could not create officer participant: ${createErr.message}` }
      participantId = created.id
    }

    for (const eventId of toAdd) {
      await admin.from('event_staff').insert({
        event_id: eventId,
        profile_id: userId,
        assigned_by: actor.id,
      })

      if (participantId) {
        const { data: existingRoster } = await admin
          .from('event_roster')
          .select('qr_token')
          .eq('event_id', eventId)
          .eq('participant_id', participantId)
          .maybeSingle()

        if (!existingRoster) {
          await admin.from('event_roster').insert({
            event_id: eventId,
            participant_id: participantId,
            qr_token: nanoid(),
          })
        }
      }
    }
  }

  return { ok: true, data: undefined }
}
