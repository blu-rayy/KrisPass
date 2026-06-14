'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
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

  const { error } = await ctx.supabase
    .from('event_staff')
    .insert({ event_id: eventId, profile_id, assigned_by: ctx.user.id })

  if (error) {
    if (error.code === '23505') return { ok: false, error: 'User is already assigned.' }
    return { ok: false, error: error.message }
  }

  revalidatePath(`/events/${eventId}`)
  return { ok: true, data: undefined }
}

// Direct form action — no useActionState
export async function removeFromRoster(formData: FormData) {
  const ctx = await requireAdmin()
  if (!ctx) return

  const eventId = formData.get('event_id') as string
  const participantId = formData.get('participant_id') as string

  await ctx.supabase
    .from('event_roster')
    .delete()
    .eq('event_id', eventId)
    .eq('participant_id', participantId)

  revalidatePath(`/events/${eventId}`)
}

// Direct form action — no useActionState
export async function removeStaff(formData: FormData) {
  const ctx = await requireAdmin()
  if (!ctx) return

  const eventId = formData.get('event_id') as string
  const profileId = formData.get('profile_id') as string

  await ctx.supabase
    .from('event_staff')
    .delete()
    .eq('event_id', eventId)
    .eq('profile_id', profileId)

  revalidatePath(`/events/${eventId}`)
}
