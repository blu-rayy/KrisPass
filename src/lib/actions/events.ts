'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { nanoid } from 'nanoid'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from '@/types'

async function requireStaff() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()
  if (!profile) return null
  return { supabase, user, profile }
}

async function requireAdmin() {
  const ctx = await requireStaff()
  if (!ctx || ctx.profile.role !== 'admin') return null
  return ctx
}

export async function createEvent(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const ctx = await requireStaff()
  if (!ctx) return { ok: false, error: 'Unauthorized.' }

  const name = (formData.get('name') as string).trim()
  const description = (formData.get('description') as string).trim() || null
  const location = (formData.get('location') as string).trim() || null

  if (!name) return { ok: false, error: 'Event name is required.' }

  const { data, error } = await ctx.supabase
    .from('events')
    .insert({ name, description, location, created_by: ctx.user.id })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }
  redirect(`/events/${data.id}`)
}

export async function updateEvent(
  id: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const ctx = await requireStaff()
  if (!ctx) return { ok: false, error: 'Unauthorized.' }

  const name = (formData.get('name') as string).trim()
  const description = (formData.get('description') as string).trim() || null
  const location = (formData.get('location') as string).trim() || null

  if (!name) return { ok: false, error: 'Event name is required.' }

  const { error } = await ctx.supabase
    .from('events')
    .update({ name, description, location })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: undefined }
}

export async function deleteEvent(
  id: string,
  _prev: ActionResult | null,
  _formData: FormData
): Promise<ActionResult> {
  const ctx = await requireAdmin()
  if (!ctx) return { ok: false, error: 'Unauthorized.' }

  const { error } = await ctx.supabase
    .from('events')
    .delete()
    .eq('id', id)

  if (error) return { ok: false, error: error.message }
  redirect('/events')
}

export async function addSession(
  eventId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const ctx = await requireStaff()
  if (!ctx) return { ok: false, error: 'Unauthorized.' }

  const name = (formData.get('name') as string).trim() || null
  const starts_at = formData.get('starts_at') as string
  const ends_at = (formData.get('ends_at') as string) || null

  if (!starts_at) return { ok: false, error: 'Start time is required.' }

  const { error } = await ctx.supabase
    .from('event_sessions')
    .insert({ event_id: eventId, name, starts_at, ends_at })

  if (error) return { ok: false, error: error.message }

  revalidatePath(`/events/${eventId}`)
  return { ok: true, data: undefined }
}

// Direct form action — no useActionState, called with hidden inputs
export async function deleteSession(formData: FormData) {
  const ctx = await requireStaff()
  if (!ctx) return

  const sessionId = formData.get('session_id') as string
  const eventId = formData.get('event_id') as string

  await ctx.supabase.from('event_sessions').delete().eq('id', sessionId)
  revalidatePath(`/events/${eventId}`)
}

export async function addStaff(
  eventId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const ctx = await requireAdmin()
  if (!ctx) return { ok: false, error: 'Unauthorized.' }

  const profile_id = formData.get('profile_id') as string
  if (!profile_id) return { ok: false, error: 'Select a user to add.' }

  const admin = createAdminClient()

  // Insert into event_staff
  const { error: staffError } = await ctx.supabase
    .from('event_staff')
    .insert({ event_id: eventId, profile_id, assigned_by: ctx.user.id })

  if (staffError) {
    if (staffError.code === '23505') return { ok: false, error: 'User is already assigned.' }
    return { ok: false, error: staffError.message }
  }

  // Fetch full profile data to create/find participant
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, first_name, last_name, middle_name, suffix, school_email, personal_email, student_number, blocks')
    .eq('id', profile_id)
    .single<{
      full_name: string
      first_name: string | null
      last_name: string | null
      middle_name: string | null
      suffix: string | null
      school_email: string | null
      personal_email: string | null
      student_number: string | null
      blocks: string[]
    }>()

  if (profile) {
    // Check if a participant already exists for this profile
    const { data: existingParticipant } = await admin
      .from('participants')
      .select('id')
      .eq('profile_id', profile_id)
      .maybeSingle<{ id: string }>()

    let participantId: string

    if (existingParticipant) {
      participantId = existingParticipant.id
      // Ensure they are typed as officer
      await admin
        .from('participants')
        .update({ participant_type: 'officer' })
        .eq('id', participantId)
    } else {
      // Derive name parts — prefer explicit fields, fall back to splitting full_name
      const nameParts = profile.full_name.trim().split(/\s+/)
      const firstName = profile.first_name || (nameParts.length > 1 ? nameParts[0] : profile.full_name)
      const lastName = profile.last_name || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : profile.full_name)
      // Derive required-but-missing fields for staff who have no student number / personal email
      const studentNumber = profile.student_number || `STF-${profile_id.replace(/-/g, '').slice(0, 12)}`
      const schoolEmail = profile.school_email || `${profile_id}@staff.krispass`
      const personalEmail = profile.personal_email || schoolEmail

      const { data: created, error: createErr } = await admin
        .from('participants')
        .insert({
          participant_type: 'officer',
          profile_id,
          first_name: firstName,
          last_name: lastName,
          middle_name: profile.middle_name,
          suffix: profile.suffix,
          school_email: schoolEmail,
          personal_email: personalEmail,
          student_number: studentNumber,
          blocks: profile.blocks ?? [],
        })
        .select('id')
        .single<{ id: string }>()

      if (createErr || !created) {
        // Staff is assigned but participant creation failed — non-fatal
        revalidatePath(`/events/${eventId}`)
        return { ok: true, data: undefined }
      }

      participantId = created.id
    }

    // Add to event roster if not already rostered
    const { data: existingRoster } = await admin
      .from('event_roster')
      .select('qr_token')
      .eq('event_id', eventId)
      .eq('participant_id', participantId)
      .maybeSingle()

    if (!existingRoster) {
      await admin
        .from('event_roster')
        .insert({ event_id: eventId, participant_id: participantId, qr_token: nanoid() })
    }
  }

  revalidatePath(`/events/${eventId}`)
  return { ok: true, data: undefined }
}

// Direct form action — no useActionState
export async function removeStaff(formData: FormData) {
  const ctx = await requireAdmin()
  if (!ctx) return

  const eventId = formData.get('event_id') as string
  const profileId = formData.get('profile_id') as string

  const admin = createAdminClient()

  // Find the participant linked to this profile
  const { data: participant } = await admin
    .from('participants')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle<{ id: string }>()

  if (participant) {
    // Remove from this event's roster + cascade attendances and teams
    const { data: sessions } = await admin
      .from('event_sessions')
      .select('id')
      .eq('event_id', eventId)

    const sessionIds = (sessions ?? []).map((s) => s.id as string)
    if (sessionIds.length > 0) {
      await admin
        .from('attendances')
        .delete()
        .eq('participant_id', participant.id)
        .in('event_session_id', sessionIds)
    }

    await admin
      .from('event_teams')
      .delete()
      .eq('event_id', eventId)
      .eq('participant_id', participant.id)

    await admin
      .from('event_roster')
      .delete()
      .eq('event_id', eventId)
      .eq('participant_id', participant.id)
  }

  await admin
    .from('event_staff')
    .delete()
    .eq('event_id', eventId)
    .eq('profile_id', profileId)

  revalidatePath(`/events/${eventId}`)
}

// Direct form action — no useActionState
export async function removeFromRoster(formData: FormData) {
  const ctx = await requireAdmin()
  if (!ctx) return

  const eventId = formData.get('event_id') as string
  const participantId = formData.get('participant_id') as string

  const admin = createAdminClient()

  // If this participant is a staff member, also remove from event_staff
  const { data: participant } = await admin
    .from('participants')
    .select('profile_id')
    .eq('id', participantId)
    .maybeSingle<{ profile_id: string | null }>()

  if (participant?.profile_id) {
    await admin
      .from('event_staff')
      .delete()
      .eq('event_id', eventId)
      .eq('profile_id', participant.profile_id)
  }

  const { data: sessions } = await admin
    .from('event_sessions')
    .select('id')
    .eq('event_id', eventId)

  const sessionIds = (sessions ?? []).map((s) => s.id as string)
  if (sessionIds.length > 0) {
    await admin
      .from('attendances')
      .delete()
      .eq('participant_id', participantId)
      .in('event_session_id', sessionIds)
  }

  await admin
    .from('event_teams')
    .delete()
    .eq('event_id', eventId)
    .eq('participant_id', participantId)

  await admin
    .from('event_roster')
    .delete()
    .eq('event_id', eventId)
    .eq('participant_id', participantId)

  revalidatePath(`/events/${eventId}`)
}
